# 작업: Step 25 — 출고/판매 화면
harness/RULES.md를 반드시 따를 것. harness/CHECKLIST_TEMPLATE.md 양식으로 보고할 것.
감리 즉시 승인. 지적 0건.

## OutboundPage (/outbound) — 2개 탭

탭 1: 출고 관리
탭 2: 매출 현황

## 탭 1: 출고 관리

### 출고 목록
필터: [상태 ▼] [용도 ▼] [제조사 ▼]  [새로 등록]
컬럼: 출고일, 품번, 품명, 규격, 수량, 용량(kW), 창고, 용도, 현장명, 수주연결, 그룹거래, 상태

상태 Badge (D-013): active=초록"정상", cancel_pending=주황"취소예정", cancelled=빨간"취소완료"
취소행: cancel_pending=연한 주황 배경, cancelled=연한 회색+취소선

용도 표시 (usage_category 9개, D-014):
sale=상품판매, sale_spare=상품판매(스페어), construction=공사사용,
construction_damage=공사사용(파손), maintenance=유지관리, disposal=폐기,
transfer=창고이동, adjustment=재고조정, other=기타

그룹거래: group_trade=true이면 Badge "그룹" + 상대법인명

### 출고 상세 (행 클릭)
상단: 출고 정보 카드 (전 필드) + [수정][취소예정][ERP등록]
하단: 매출 정보 (있으면 표시, 없으면 [매출 등록] 버튼)

### 출고 취소 3단계 (D-013 핵심!)

active → [취소예정] 버튼:
  ConfirmDialog "출고를 취소 예정으로 변경하시겠습니까? 가용재고에 아직 반영되지 않습니다."
  → status = cancel_pending

cancel_pending → [취소 확정] 또는 [복원]:
  [취소 확정] ConfirmDialog "출고를 최종 취소하시겠습니까? 재고가 복원됩니다. 되돌릴 수 없습니다."
  → status = cancelled
  [복원] ConfirmDialog "출고를 정상 상태로 복원하시겠습니까?"
  → status = active

cancelled → 액션 없음. 읽기전용. 수정/삭제 불가.

## OutboundForm.tsx (Dialog)

필드:
- outbound_date (필수) Input date (기본: 오늘)
- company_id (필수) appStore 자동
- product_id (필수) 품번 Select. 선택 시 product_name, spec_wp, wattage_kw 표시
- quantity (필수, 양수) Input number
- capacity_kw 자동: quantity x wattage_kw (읽기전용)
- warehouse_id (필수) 창고 Select
- usage_category (필수) Select 9개
- order_id 수주 Select (선택). 연결 시 "수주잔량: 500장" 표시
- site_name Input
- site_address Input
- spare_qty Input number
- group_trade Switch
  true이면:
  - target_company_id (필수) 법인 Select (자기 법인 제외)
  - 파란 안내: "그룹내 거래: 상대법인에 자동 입고가 생성됩니다. 세금계산서는 각각 수동 등록합니다."
- erp_outbound_no Input (선택)
- memo Textarea

## SaleForm.tsx (Dialog)

출고 상세에서 [매출 등록] 또는 [매출 수정] 클릭.
필드:
- customer_id (필수) 거래처 Select (customer/both)
- unit_price_wp (필수, 양수) Input number (핵심! 원/Wp)
  입력 시 실시간 자동 계산 표시 (읽기전용):
  - EA단가: unit_price_wp x spec_wp
  - 공급가: EA단가 x quantity
  - 부가세: 공급가 x 0.1
  - 합계: 공급가 + 부가세
- tax_invoice_date Input date. 안내: "출고일과 다를 수 있습니다 (다음달 발행 가능)"
- tax_invoice_email Input email
- erp_closed Switch
- erp_closed_date Input date (erp_closed=true일 때만)
- memo Textarea

세금계산서 상태 Badge:
- 매출+tax_invoice_date 있음: 초록 "계산서 발행"
- 매출+tax_invoice_date 없음: 노란 "계산서 미발행"
- 매출 없음: 회색 "매출 미등록"

## 탭 2: 매출 현황

매출 등록된 출고 목록 (매출 관점).
필터: [거래처 ▼] [월 ▼] [계산서상태 ▼]
컬럼: 출고일, 거래처, 품명, 규격, 수량, Wp단가, 공급가, 부가세, 합계, 계산서일, ERP마감
상단 요약 카드: 월 매출합계, 건수, 계산서 발행률

## API

출고: GET/POST/PUT /api/v1/outbounds
매출: GET/POST/PUT /api/v1/sales
상태변경: PUT /api/v1/outbounds/{id} (status 필드)

## 파일 구조

frontend/src/
├── pages/OutboundPage.tsx
├── components/outbound/
│   ├── OutboundListTable.tsx
│   ├── OutboundDetailView.tsx
│   ├── OutboundForm.tsx
│   ├── OutboundCancelFlow.tsx (취소 3단계 UI)
│   ├── SaleForm.tsx
│   ├── SaleListTable.tsx (매출 현황 탭)
│   ├── SaleSummaryCards.tsx (요약 카드)
│   ├── OutboundStatusBadge.tsx
│   └── InvoiceStatusBadge.tsx
├── hooks/useOutbound.ts
└── types/outbound.ts

## types/outbound.ts

Outbound: outbound_id, outbound_date, company_id, company_name?, product_id, product_name?, product_code?, spec_wp?, wattage_kw?, quantity, capacity_kw, warehouse_id, warehouse_name?, usage_category, order_id?, order_number?, site_name?, site_address?, spare_qty?, group_trade?, target_company_id?, target_company_name?, erp_outbound_no?, status("active"|"cancel_pending"|"cancelled"), memo?, sale?(Sale)

Sale: sale_id, outbound_id, customer_id, customer_name?, unit_price_wp, unit_price_ea?, supply_amount?, vat_amount?, total_amount?, tax_invoice_date?, tax_invoice_email?, erp_closed?, erp_closed_date?, memo?

## PROGRESS.md 업데이트
- Step 25 완료 기록
- 프론트엔드: "Step 25 완료 (재고+입고+발주+출고)"

## 완료 기준
1. npm run build 성공
2. 로컬 테스트:
   - /outbound -> 2개 탭
   - 출고 생성 (9개 usage_category, 그룹거래 Switch)
   - 출고 상세 -> 매출 등록 -> Wp단가 입력 -> 4개 자동 계산
   - 취소 3단계: active->cancel_pending->cancelled/복원
   - cancelled 행 회색+취소선
   - 매출 현황: 요약 카드 + 목록
   - 세금계산서 Badge
   - 법인 변경 -> 재조회
3. harness/CHECKLIST_TEMPLATE.md 양식으로 보고
4. 전체 파일 코드 보여주기
