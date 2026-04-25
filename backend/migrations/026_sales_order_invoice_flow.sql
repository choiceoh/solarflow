-- 026: 출고 전 계산서 지원
-- sales는 기존 outbound 기준 계산서뿐 아니라, 출고 전 order 기준 계산서도 허용한다.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS capacity_kw numeric(10,3);

ALTER TABLE sales
  ALTER COLUMN outbound_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_id_fkey'
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT sales_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(order_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_or_outbound_check'
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT sales_order_or_outbound_check
      CHECK (order_id IS NOT NULL OR outbound_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_quantity_positive_check'
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT sales_quantity_positive_check
      CHECK (quantity IS NULL OR quantity > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_outbound_id ON sales(outbound_id);

ALTER TABLE receipt_matches
  ADD COLUMN IF NOT EXISTS sale_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipt_matches_sale_id_fkey'
  ) THEN
    ALTER TABLE receipt_matches
      ADD CONSTRAINT receipt_matches_sale_id_fkey
      FOREIGN KEY (sale_id) REFERENCES sales(sale_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_receipt_matches_sale_id ON receipt_matches(sale_id);

COMMENT ON COLUMN sales.order_id IS '출고 전 계산서용 수주 연결';
COMMENT ON COLUMN sales.quantity IS '계산서 발행 수량(EA). 출고 전 계산서일 때 금액 산출 기준';
COMMENT ON COLUMN sales.capacity_kw IS '계산서 발행 용량(kW)';
COMMENT ON COLUMN receipt_matches.sale_id IS '수금 매칭의 장기 기준. 기존 outbound_id와 병행 사용';
