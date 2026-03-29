# 작업: Step 23 — 입고 관리 화면 (B/L + 라인아이템)
harness/RULES.md를 반드시 따를 것. harness/CHECKLIST_TEMPLATE.md 양식으로 보고할 것.
감리 즉시 승인. 지적 0건.

## 화면: InboundPage (/inbound)

B/L 목록 + 상세(기본정보+라인아이템) 구성.

## 입고유형 4가지 + 필드 표시/숨김

| 코드 | 표시 | 통화 | import일 때만 표시하는 필드 |
|------|------|------|--------------------------|
| import | 해외 직수입 | USD | 환율, ETD, ETA, 항구, 포워더, Invoice |
| domestic | 국내 제조사 | KRW | (위 필드 숨김) |
| domestic_foreign | 국내 유통사 | KRW | (위 필드 숨김) |
| group | 그룹 내 | KRW | (최소 필드만) |

## 상태 6단계 (순방향만 허용)

scheduled(회색"예정") -> shipping(파란"선적중") -> arrived(노란"입항") -> customs(주황"통관중") -> completed(초록"완료") -> erp_done(보라"ERP등록")

상태 변경 UI: 드롭다운에 다음 단계만 표시. 역방향 불가. ConfirmDialog.

## API

목록: GET /api/v1/bl-shipments?company_id=X&inbound_type=Y&status=Z
상세: GET /api/v1/bl-shipments/{id}
생성: POST /api/v1/bl-shipments
수정: PUT /api/v1/bl-shipments/{id}
라인아이템 목록: GET /api/v1/bl-line-items?bl_id=X
라인아이템 생성: POST /api/v1/bl-line-items
라인아이템 수정: PUT /api/v1/bl-line-items/{id}

## 파일 구조

frontend/src/
├── pages/InboundPage.tsx (PlaceholderPage 교체)
├── components/inbound/
│   ├── BLListTable.tsx (B/L 목록)
│   ├── BLDetailView.tsx (상세 — 기본정보 + 라인아이템)
│   ├── BLForm.tsx (생성/수정 Dialog)
│   ├── BLLineTable.tsx (라인아이템 테이블)
│   ├── BLLineForm.tsx (라인아이템 생성/수정 Dialog)
│   ├── InboundStatusBadge.tsx (상태 Badge 6단계)
│   └── StatusChanger.tsx (상태 변경 드롭다운 + 확인)
├── hooks/useInbound.ts
└── types/inbound.ts

## types/inbound.ts

BLShipment:
  bl_id, bl_number: string
  po_id?, lc_id?: string (nullable)
  company_id, manufacturer_id: string
  manufacturer_name?: string
  inbound_type: "import"|"domestic"|"domestic_foreign"|"group"
  currency: "USD"|"KRW"
  exchange_rate?: number
  etd?, eta?, actual_arrival?: string
  port?, forwarder?: string
  warehouse_id?: string, warehouse_name?: string
  invoice_number?: string
  status: "scheduled"|"shipping"|"arrived"|"customs"|"completed"|"erp_done"
  erp_registered?: boolean
  memo?: string

BLLineItem:
  bl_line_id, bl_id, product_id: string
  product_name?, product_code?: string
  quantity: number, capacity_kw: number
  item_type: "main"|"spare"
  payment_type: "paid"|"free"
  invoice_amount_usd?: number
  unit_price_usd_wp?: number
  unit_price_krw_wp?: number
  usage_category: string
  memo?: string

## BLForm.tsx

Dialog 기반. 필드:
- bl_number (필수) Input
- inbound_type (필수) Select: 해외직수입/국내제조사/국내유통사/그룹내
  선택에 따라 필드 표시/숨김 (위 표 참조)
- company_id (필수) appStore에서 자동
- manufacturer_id (필수) 제조사 Select (API)
- currency: import이면 USD, 나머지 KRW (자동)
- exchange_rate: import일 때만, 양수
- etd, eta, actual_arrival: Input type="date" (import일 때만)
- port: Input (광양항/부산항/평택항 등)
- forwarder: Input
- warehouse_id: 창고 Select (API)
- invoice_number: Input
- po_id: PO Select (API, 선택)
- lc_id: LC Select (해당 PO의 LC, 선택)
- memo: Textarea

## BLLineForm.tsx

Dialog 기반. 필드:
- product_id (필수) 품번 Select (API). 선택 시 product_name, spec_wp 표시
- quantity (필수, 양수) Input number
- capacity_kw: 자동 = quantity x wattage_kw (읽기전용 표시)
- item_type (필수) Select: 본품(main)/스페어(spare)
- payment_type (필수) Select: 유상(paid)/무상(free)
- invoice_amount_usd: Input number
- unit_price_usd_wp: Input number (import)
- unit_price_krw_wp: Input number (domestic)
- usage_category (필수) Select 9개:
  sale=상품판매, sale_spare=상품판매(스페어), construction=공사사용,
  construction_damage=공사사용(파손), maintenance=유지관리,
  disposal=폐기, transfer=창고이동, adjustment=재고조정, other=기타
- memo: Textarea

## BLDetailView.tsx

상단: 기본정보 카드 (BLShipment 필드 표시)
  상태 Badge + [상태 변경] + [수정] 버튼
하단: 라인아이템 테이블 + [추가] 버튼
  각 행에 [수정] 버튼

## StatusChanger.tsx

현재 상태에서 다음 단계만 표시하는 Select:
- scheduled -> [shipping]
- shipping -> [arrived]
- arrived -> [customs]
- customs -> [completed]
- completed -> [erp_done]
- erp_done -> (변경 불가)
선택 시 ConfirmDialog: "상태를 '{다음상태}'로 변경하시겠습니까?"

## 즉시 수정: PROGRESS.md

harness/PROGRESS.md 현재 상태 요약:
- 프론트엔드: "Step 22 완료" -> "Step 23 완료 (재고+입고)"
- Step 23 완료 기록

## 완료 기준
1. npm run build 성공
2. 로컬 테스트:
   - /inbound -> B/L 목록 (데이터 없으면 EmptyState)
   - [새로 등록] -> BLForm, 입고유형 선택 -> 필드 표시/숨김
   - B/L 행 클릭 -> 상세 (기본정보 + 라인아이템)
   - 상태 변경 -> 다음 단계만 가능
   - 라인아이템 추가/수정
   - 법인 변경 -> 목록 재조회
3. harness/CHECKLIST_TEMPLATE.md 양식으로 보고
4. 전체 파일 코드 보여주기
