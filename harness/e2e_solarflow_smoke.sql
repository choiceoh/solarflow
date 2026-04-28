-- SolarFlow E2E smoke test.
-- 실제 업무 흐름 기준으로 PO -> LC -> BL -> 면장 -> 재고 -> 수주 -> 출고 -> 매출 -> 수금까지
-- 최소 1개 시나리오를 생성하고, SQL 내부 검증 실패 시 RAISE EXCEPTION으로 중단한다.
--
-- 실행:
--   psql -v ON_ERROR_STOP=1 -d solarflow -f harness/e2e_solarflow_smoke.sql
--
-- 전제:
--   - 마스터 데이터: TS 법인, 진코솔라 제조사, 활성 창고, TS 법인 활성 은행 1개 이상
--   - 최신 마이그레이션 적용: lc_line_items, bl_line_items.po_line_id, orders.bl_id,
--     outbounds.bl_id, sales.order_id, receipt_matches.sale_id

DROP TABLE IF EXISTS pg_temp.sf_e2e_smoke_result;

CREATE TEMP TABLE sf_e2e_smoke_result (
  step_order integer NOT NULL,
  step_name text NOT NULL,
  record_key text NOT NULL,
  record_value text NOT NULL,
  amount numeric,
  checked_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  suffix text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');

  v_company uuid;
  v_mfg uuid;
  v_product uuid;
  v_customer uuid;
  v_warehouse uuid;
  v_bank uuid;
  v_po uuid;
  v_po_line uuid;
  v_lc uuid;
  v_lc_line uuid;
  v_bl uuid;
  v_declaration uuid;
  v_cost uuid;
  v_expense uuid;
  v_order uuid;
  v_outbound uuid;
  v_sale uuid;
  v_receipt uuid;

  v_product_code text := 'SF-E2E-JK640-' || suffix;
  v_partner_name text := 'SF-E2E 검증거래처 ' || suffix;
  v_po_number text := 'SF-E2E-PO-' || suffix;
  v_lc_number text := 'SF-E2E-LC-' || suffix;
  v_bl_number text := 'SF-E2E-BL-' || suffix;
  v_declaration_number text := 'SF-E2E-DEC-' || suffix;
  v_invoice_number text := 'SF-E2E-INV-' || suffix;
  v_order_number text := 'SF-E2E-ORD-' || suffix;

  v_qty_purchase integer := 5000;
  v_qty_sale integer := 1000;
  v_spec_wp integer := 640;
  v_purchase_usd_wp numeric := 0.118;
  v_sale_krw_wp numeric := 190;
  v_exchange_rate numeric := 1380;

  v_purchase_kw numeric;
  v_purchase_mw numeric;
  v_sale_kw numeric;
  v_purchase_amount_usd numeric;
  v_supply numeric;
  v_vat numeric;
  v_total numeric;
  v_cif_total_krw numeric;
  v_cif_wp_krw numeric;
  v_expense_amount numeric := 750000;
  v_expense_vat numeric := 75000;
  v_landed_total_krw numeric;
  v_landed_wp_krw numeric;

  v_count integer;
  v_inbound_kw numeric;
  v_outbound_kw numeric;
  v_physical_after_kw numeric;
  v_outstanding numeric;
BEGIN
  v_purchase_kw := v_qty_purchase * v_spec_wp / 1000.0;
  v_purchase_mw := v_purchase_kw / 1000.0;
  v_sale_kw := v_qty_sale * v_spec_wp / 1000.0;
  v_purchase_amount_usd := v_qty_purchase * v_spec_wp * v_purchase_usd_wp;
  v_supply := v_qty_sale * v_spec_wp * v_sale_krw_wp;
  v_vat := round(v_supply * 0.1);
  v_total := v_supply + v_vat;
  v_cif_total_krw := round(v_purchase_amount_usd * v_exchange_rate);
  v_cif_wp_krw := round(v_cif_total_krw / (v_qty_purchase * v_spec_wp), 2);
  v_landed_total_krw := v_cif_total_krw + v_expense_amount;
  v_landed_wp_krw := round(v_landed_total_krw / (v_qty_purchase * v_spec_wp), 2);

  SELECT company_id INTO v_company
  FROM companies
  WHERE company_code = 'TS'
  LIMIT 1;

  SELECT manufacturer_id INTO v_mfg
  FROM manufacturers
  WHERE name_kr = '진코솔라'
  LIMIT 1;

  SELECT warehouse_id INTO v_warehouse
  FROM warehouses
  WHERE is_active
  ORDER BY warehouse_name
  LIMIT 1;

  SELECT bank_id INTO v_bank
  FROM banks
  WHERE company_id = v_company
    AND is_active
  ORDER BY lc_limit_usd DESC NULLS LAST
  LIMIT 1;

  IF v_company IS NULL OR v_mfg IS NULL OR v_warehouse IS NULL OR v_bank IS NULL THEN
    RAISE EXCEPTION 'E2E prerequisite missing: company %, manufacturer %, warehouse %, bank %',
      v_company, v_mfg, v_warehouse, v_bank;
  END IF;

  -- 1. 품번/거래처 준비
  INSERT INTO products (
    product_code, product_name, manufacturer_id, spec_wp, wattage_kw,
    module_width_mm, module_height_mm, module_depth_mm, weight_kg,
    wafer_platform, cell_config, series_name, memo
  ) VALUES (
    v_product_code, 'SF-E2E 진코 640W 검증모듈', v_mfg, v_spec_wp, 0.640,
    2465, 1134, 35, 33.0,
    'N-Type', '78HL4', 'E2E', 'SF-E2E smoke test product'
  ) RETURNING product_id INTO v_product;

  INSERT INTO partners (
    partner_name, partner_type, erp_code, payment_terms, contact_name, contact_email
  ) VALUES (
    v_partner_name, 'customer', substring('E2E' || suffix from 1 for 10),
    '세금계산서 발행 후 입금', '검증담당', 'e2e@example.com'
  ) RETURNING partner_id INTO v_customer;

  -- 2. PO
  INSERT INTO purchase_orders (
    po_number, company_id, manufacturer_id, contract_type, contract_date,
    incoterms, payment_terms, total_qty, total_mw, status, memo
  ) VALUES (
    v_po_number, v_company, v_mfg, 'spot', CURRENT_DATE,
    'FOB', 'T/T 10%, L/C 90%', v_qty_purchase, v_purchase_mw,
    'contracted', 'SF-E2E purchase flow'
  ) RETURNING po_id INTO v_po;

  INSERT INTO po_line_items (
    po_id, product_id, quantity, unit_price_usd, unit_price_usd_wp,
    total_amount_usd, item_type, payment_type, memo
  ) VALUES (
    v_po, v_product, v_qty_purchase, v_spec_wp * v_purchase_usd_wp, v_purchase_usd_wp,
    v_purchase_amount_usd, 'main', 'paid', 'SF-E2E PO line'
  ) RETURNING po_line_id INTO v_po_line;

  INSERT INTO price_histories (
    product_id, manufacturer_id, company_id, change_date, previous_price,
    new_price, reason, related_po_id, memo
  ) VALUES (
    v_product, v_mfg, v_company, CURRENT_DATE, NULL,
    v_purchase_usd_wp, 'SF-E2E 최초계약', v_po, 'SF-E2E price trend smoke'
  );

  -- 3. LC
  INSERT INTO lc_records (
    po_id, lc_number, bank_id, company_id, open_date, amount_usd,
    target_qty, target_mw, usance_days, usance_type, maturity_date, status, memo
  ) VALUES (
    v_po, v_lc_number, v_bank, v_company, CURRENT_DATE,
    v_purchase_amount_usd, v_qty_purchase, v_purchase_mw,
    90, 'buyers', CURRENT_DATE + INTERVAL '90 days', 'opened', 'SF-E2E LC'
  ) RETURNING lc_id INTO v_lc;

  INSERT INTO lc_line_items (
    lc_id, po_line_id, product_id, quantity, capacity_kw, amount_usd,
    unit_price_usd_wp, item_type, payment_type, memo
  ) VALUES (
    v_lc, v_po_line, v_product, v_qty_purchase, v_purchase_kw, v_purchase_amount_usd,
    v_purchase_usd_wp, 'main', 'paid', 'SF-E2E LC line'
  ) RETURNING lc_line_id INTO v_lc_line;

  -- 4. BL
  INSERT INTO bl_shipments (
    bl_number, po_id, lc_id, company_id, manufacturer_id, inbound_type,
    currency, exchange_rate, etd, eta, actual_arrival, port,
    warehouse_id, invoice_number, declaration_number, status, erp_registered,
    payment_terms, incoterms, memo
  ) VALUES (
    v_bl_number, v_po, v_lc, v_company, v_mfg, 'import',
    'USD', v_exchange_rate, CURRENT_DATE - INTERVAL '20 days',
    CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '4 days',
    '부산', v_warehouse, v_invoice_number, v_declaration_number,
    'completed', false, 'L/C 90 days', 'FOB', 'SF-E2E inbound completed'
  ) RETURNING bl_id INTO v_bl;

  INSERT INTO bl_line_items (
    bl_id, product_id, quantity, capacity_kw, item_type, payment_type,
    invoice_amount_usd, unit_price_usd_wp, usage_category, po_line_id, memo
  ) VALUES (
    v_bl, v_product, v_qty_purchase, v_purchase_kw,
    'main', 'paid', v_purchase_amount_usd, v_purchase_usd_wp,
    'sale', v_po_line, 'SF-E2E BL line'
  );

  -- 5. 면장 + 원가 + 부대비용
  INSERT INTO import_declarations (
    declaration_number, bl_id, company_id, declaration_date,
    arrival_date, release_date, hs_code, customs_office, port, memo
  ) VALUES (
    v_declaration_number, v_bl, v_company, CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '2 days',
    '8541.43', '부산세관', '부산', 'SF-E2E import declaration'
  ) RETURNING declaration_id INTO v_declaration;

  INSERT INTO cost_details (
    declaration_id, product_id, quantity, capacity_kw,
    fob_unit_usd, fob_total_usd, fob_wp_krw,
    exchange_rate, cif_unit_usd, cif_total_usd, cif_total_krw, cif_wp_krw,
    tariff_rate, tariff_amount, vat_amount,
    customs_fee, incidental_cost, landed_total_krw, landed_wp_krw, memo
  ) VALUES (
    v_declaration, v_product, v_qty_purchase, v_purchase_kw,
    v_purchase_usd_wp * v_spec_wp, v_purchase_amount_usd,
    round(v_purchase_usd_wp * v_exchange_rate, 2),
    v_exchange_rate, v_purchase_usd_wp * v_spec_wp, v_purchase_amount_usd,
    v_cif_total_krw, v_cif_wp_krw,
    0.00, 0, round(v_cif_total_krw * 0.1),
    0, v_expense_amount, v_landed_total_krw, v_landed_wp_krw,
    'SF-E2E cost detail'
  ) RETURNING cost_id INTO v_cost;

  INSERT INTO incidental_expenses (
    bl_id, company_id, expense_type, amount, vat, total, vendor, memo
  ) VALUES (
    v_bl, v_company, 'customs_fee', v_expense_amount, v_expense_vat,
    v_expense_amount + v_expense_vat, 'SF-E2E 통관사', 'SF-E2E incidental expense'
  ) RETURNING expense_id INTO v_expense;

  -- 6. 수주
  INSERT INTO orders (
    order_number, company_id, customer_id, order_date, receipt_method,
    management_category, fulfillment_source, product_id, quantity, capacity_kw,
    unit_price_wp, site_name, payment_terms, delivery_due, shipped_qty,
    remaining_qty, status, bl_id, memo
  ) VALUES (
    v_order_number, v_company, v_customer, CURRENT_DATE,
    'email', 'sale', 'stock', v_product, v_qty_sale,
    v_sale_kw, v_sale_krw_wp, 'SF-E2E 검증현장',
    '계산서 발행 후 입금', CURRENT_DATE + INTERVAL '7 days',
    v_qty_sale, 0, 'completed', v_bl, 'SF-E2E order'
  ) RETURNING order_id INTO v_order;

  -- 7. 출고
  INSERT INTO outbounds (
    outbound_date, company_id, product_id, quantity, capacity_kw,
    warehouse_id, usage_category, order_id, site_name, status, bl_id, memo
  ) VALUES (
    CURRENT_DATE, v_company, v_product, v_qty_sale, v_sale_kw,
    v_warehouse, 'sale', v_order, 'SF-E2E 검증현장',
    'active', v_bl, 'SF-E2E outbound'
  ) RETURNING outbound_id INTO v_outbound;

  -- 8. 매출
  INSERT INTO sales (
    outbound_id, order_id, customer_id, quantity, capacity_kw,
    unit_price_wp, unit_price_ea, supply_amount, vat_amount, total_amount,
    tax_invoice_date, tax_invoice_email, erp_closed, memo
  ) VALUES (
    v_outbound, v_order, v_customer, v_qty_sale, v_sale_kw,
    v_sale_krw_wp, v_spec_wp * v_sale_krw_wp, v_supply, v_vat, v_total,
    CURRENT_DATE, 'e2e@example.com', false, 'SF-E2E sale'
  ) RETURNING sale_id INTO v_sale;

  -- 9. 수금 + 매칭
  INSERT INTO receipts (
    customer_id, receipt_date, amount, bank_account, memo
  ) VALUES (
    v_customer, CURRENT_DATE, v_total, 'SF-E2E 검증계좌', 'SF-E2E receipt'
  ) RETURNING receipt_id INTO v_receipt;

  INSERT INTO receipt_matches (
    receipt_id, outbound_id, sale_id, matched_amount
  ) VALUES (
    v_receipt, v_outbound, v_sale, v_total
  );

  -- 자동 검증 1: 전체 업무 연결이 끊기지 않았는지 확인
  IF NOT EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN po_line_items pli ON pli.po_id = po.po_id
    JOIN lc_records lc ON lc.po_id = po.po_id
    JOIN lc_line_items lci ON lci.lc_id = lc.lc_id
      AND lci.po_line_id = pli.po_line_id
    JOIN bl_shipments bl ON bl.po_id = po.po_id
      AND bl.lc_id = lc.lc_id
    JOIN bl_line_items bli ON bli.bl_id = bl.bl_id
      AND bli.po_line_id = pli.po_line_id
    JOIN import_declarations decl ON decl.bl_id = bl.bl_id
    JOIN cost_details cd ON cd.declaration_id = decl.declaration_id
      AND cd.product_id = bli.product_id
    JOIN orders ord ON ord.bl_id = bl.bl_id
      AND ord.product_id = bli.product_id
    JOIN outbounds ob ON ob.order_id = ord.order_id
      AND ob.bl_id = bl.bl_id
    JOIN sales s ON s.outbound_id = ob.outbound_id
      AND s.order_id = ord.order_id
    JOIN receipt_matches rm ON rm.sale_id = s.sale_id
      AND rm.outbound_id = ob.outbound_id
    JOIN receipts r ON r.receipt_id = rm.receipt_id
      AND r.customer_id = ord.customer_id
    WHERE po.po_id = v_po
      AND po.po_number = v_po_number
      AND r.receipt_id = v_receipt
  ) THEN
    RAISE EXCEPTION 'E2E chain broken: PO -> LC -> BL -> declaration -> inventory basis -> order -> outbound -> sale -> receipt';
  END IF;

  -- 자동 검증 2: LC 품목 명세가 PO 라인과 1:1로 연결되었는지 확인
  SELECT count(*) INTO v_count
  FROM lc_line_items
  WHERE lc_id = v_lc
    AND po_line_id = v_po_line
    AND product_id = v_product
    AND quantity = v_qty_purchase
    AND capacity_kw = v_purchase_kw;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'LC line item mismatch: expected 1, got %', v_count;
  END IF;

  -- 자동 검증 3: 재고 기준 수량. Rust 재고 엔진과 같은 핵심 기준(completed BL - active outbound)을 확인한다.
  SELECT COALESCE(SUM(bli.capacity_kw), 0) INTO v_inbound_kw
  FROM bl_shipments bl
  JOIN bl_line_items bli ON bli.bl_id = bl.bl_id
  WHERE bl.bl_id = v_bl
    AND bl.status IN ('completed', 'erp_done')
    AND bli.product_id = v_product;

  SELECT COALESCE(SUM(ob.capacity_kw), 0) INTO v_outbound_kw
  FROM outbounds ob
  WHERE ob.outbound_id = v_outbound
    AND ob.status = 'active'
    AND ob.product_id = v_product;

  v_physical_after_kw := v_inbound_kw - v_outbound_kw;

  IF abs(v_inbound_kw - v_purchase_kw) > 0.001 THEN
    RAISE EXCEPTION 'Inventory inbound mismatch: expected % kW, got % kW', v_purchase_kw, v_inbound_kw;
  END IF;

  IF abs(v_outbound_kw - v_sale_kw) > 0.001 THEN
    RAISE EXCEPTION 'Inventory outbound mismatch: expected % kW, got % kW', v_sale_kw, v_outbound_kw;
  END IF;

  IF abs(v_physical_after_kw - (v_purchase_kw - v_sale_kw)) > 0.001 THEN
    RAISE EXCEPTION 'Inventory balance mismatch: expected % kW, got % kW',
      v_purchase_kw - v_sale_kw, v_physical_after_kw;
  END IF;

  -- 자동 검증 4: 수주/출고/매출/수금 금액과 잔액
  SELECT s.total_amount - COALESCE(SUM(rm.matched_amount), 0) INTO v_outstanding
  FROM sales s
  LEFT JOIN receipt_matches rm ON rm.sale_id = s.sale_id
  WHERE s.sale_id = v_sale
  GROUP BY s.total_amount;

  IF v_outstanding <> 0 THEN
    RAISE EXCEPTION 'Receipt matching mismatch: expected outstanding 0, got %', v_outstanding;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM orders
    WHERE order_id = v_order
      AND shipped_qty = v_qty_sale
      AND remaining_qty = 0
      AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Order shipping status mismatch: order % is not completed with zero remaining qty', v_order;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM sales s
    JOIN receipts r ON r.receipt_id = v_receipt
    JOIN receipt_matches rm ON rm.sale_id = s.sale_id
    WHERE s.sale_id = v_sale
      AND s.supply_amount = v_supply
      AND s.vat_amount = v_vat
      AND s.total_amount = v_total
      AND r.amount = v_total
      AND rm.matched_amount = v_total
  ) THEN
    RAISE EXCEPTION 'Sales/receipt amount mismatch: total %', v_total;
  END IF;

  INSERT INTO sf_e2e_smoke_result (step_order, step_name, record_key, record_value, amount)
  VALUES
    (1, 'PO', 'po_number', v_po_number, v_purchase_mw),
    (2, 'LC', 'lc_number', v_lc_number, v_purchase_amount_usd),
    (3, 'BL', 'bl_number', v_bl_number, v_purchase_kw),
    (4, '면장', 'declaration_number', v_declaration_number, v_cif_total_krw),
    (5, '원가', 'landed_wp_krw', v_landed_wp_krw::text, v_landed_total_krw),
    (6, '재고', 'physical_after_kw', v_product_code, v_physical_after_kw),
    (7, '수주', 'order_number', v_order_number, v_sale_kw),
    (8, '출고', 'outbound_id', v_outbound::text, v_outbound_kw),
    (9, '매출', 'sale_id', v_sale::text, v_total),
    (10, '수금', 'receipt_id', v_receipt::text, v_outstanding);

  RAISE NOTICE 'SF-E2E PASS suffix=%, product=%, po=%, lc=%, bl=%, declaration=%, order=%, outbound=%, sale=%, receipt=%',
    suffix, v_product, v_po, v_lc, v_bl, v_declaration, v_order, v_outbound, v_sale, v_receipt;
END $$;

SELECT
  step_order,
  step_name,
  record_key,
  record_value,
  amount,
  checked_at
FROM sf_e2e_smoke_result
ORDER BY step_order;

SELECT
  'PASS' AS result,
  'PO -> LC -> BL -> 면장 -> 재고 -> 수주 -> 출고 -> 매출 -> 수금 smoke scenario verified' AS message,
  now() AS checked_at;
