# 작업: Step 27 — 면장/원가 + Landed Cost
harness/RULES.md를 반드시 따를 것. harness/CHECKLIST_TEMPLATE.md 양식으로 보고할 것.
감리 지적 2건 반영 필수.

## 선행 수정 (감리 지적 — Step 27 작업 전에 먼저 처리)

### 지적 1 (중대): price-histories Go 라우트 추가
프론트 Step 24에서 /api/v1/price-histories를 이미 호출 중인데 Go 라우터에 미등록.
1. backend/main.go에서 현재 라우트 확인
2. price-histories 라우트 없으면 추가 (GET/POST/PUT)
3. handler/price_history.go 존재 여부 확인. 없으면 기존 핸들러 패턴으로 생성
4. go build + go test 확인

### 지적 2: 원가 API 경로 수정
Go 라우터에 실제 등록된 경로는 /api/v1/cost-details (declaration-costs 아님).
이 TASK의 프론트 코드에서 원가 API는 반드시 /api/v1/cost-details 사용.

## CustomsPage (/customs) — 3개 탭

탭 1: 수입면장 (목록 + 상세 + 원가 3단계)
탭 2: 부대비용 (목록 + 생성/수정)
탭 3: 환율 비교 (Rust API 연동)

## 탭 1: 수입면장

### 면장 목록
필터: [B/L ▼] [월 ▼]  [새로 등록]
컬럼: 면장번호, B/L번호, 법인, 신고일, 입항일, 반출일, HS코드, 세관, 항구

### 면장 상세 (행 클릭)
상단: 기본정보 카드 + [수정]
하단: 원가 라인아이템 테이블 + [추가]

### 원가 3단계 표시 (시각적 구분)

Stage 1 FOB: fob_unit_usd(cent/Wp), fob_total_usd($), fob_wp_krw(원/Wp)
Stage 2 CIF: cif_total_krw(원), cif_unit_usd, cif_total_usd, cif_wp_krw(원/Wp) ← Badge 파란 "회계 원가"
Stage 3 Landed: tariff_rate(%), tariff_amount, vat_amount, customs_fee, incidental_cost, landed_total_krw, landed_wp_krw(원/Wp) ← Badge 초록 "실무 원가"

안내:
"회계 원가 = 면장 CIF Wp단가 (장부, 회계팀 보고용)"
"실무 원가 = CIF + 부대비용 (판매 의사결정, 마진 계산용)"
"VAT(부가세)는 매입세액공제 대상이므로 원가에 불포함"

### Landed Cost 2단계 (D-025)

[미리보기] 버튼:
POST /api/v1/calc/landed-cost { declaration_id, save: false }
결과를 테이블에 임시 표시 (파란 배경 "미리보기")
allocated_expenses 동적 맵 표시 (D-026)

[저장] 버튼:
ConfirmDialog "Landed Cost를 저장하시겠습니까? 기존 값이 덮어씌워집니다."
POST /api/v1/calc/landed-cost { declaration_id, save: true }
결과를 확정 표시 (초록 배경 "저장완료")

### DeclarationForm.tsx (Dialog)
declaration_number(필수), bl_id(필수 B/L Select), company_id(자동),
declaration_date(필수), arrival_date, release_date, hs_code, customs_office, port, memo

### CostForm.tsx (Dialog)
product_id(필수), quantity(필수,양수), capacity_kw(자동),
exchange_rate(필수), fob_unit_usd, fob_total_usd, fob_wp_krw,
cif_total_krw(필수), cif_unit_usd, cif_total_usd,
cif_wp_krw(자동 읽기전용),
tariff_rate, tariff_amount, vat_amount, customs_fee, incidental_cost,
landed_total_krw(자동 또는 Rust), landed_wp_krw(자동 읽기전용), memo

## 탭 2: 부대비용

### 목록
필터: [B/L ▼] [월 ▼] [비용유형 ▼]  [새로 등록]
컬럼: B/L(또는 월), 법인, 비용유형, 금액, VAT, 합계, 거래처, 메모

비용유형 11개:
dock_charge=도크차지, shuttle=셔틀비, customs_fee=통관수수료, transport=운송비,
storage=보관료, handling=핸들링비, surcharge=할증료, lc_fee=LC개설수수료,
lc_acceptance=LC인수수수료, telegraph=전신료, other=기타

### ExpenseForm.tsx (Dialog)
bl_id(선택), month(YYYY-MM, 선택) — 둘 중 하나 필수
안내: "B/L 또는 월 중 하나는 필수입니다"
company_id(자동), expense_type(필수 Select 11개),
amount(필수,양수), vat, total(자동 읽기전용), vendor, memo

## 탭 3: 환율 비교

POST /api/v1/calc/exchange-compare 연동.
입력: 금액(USD), 환율1, 환율2, [비교] 버튼
결과: 항목|환율1결과|환율2결과|차이|차이율
차이 양수=빨간(원화부담증가), 음수=초록(감소)

## API (지적 2번 반영!)

면장: GET/POST/PUT /api/v1/declarations
원가: GET/POST/PUT /api/v1/cost-details?declaration_id=X (declaration-costs 아님!)
부대비용: GET/POST/PUT /api/v1/expenses
단가이력: GET/POST/PUT /api/v1/price-histories (지적 1번으로 Go에 추가)
Landed Cost (Rust): POST /api/v1/calc/landed-cost
환율 비교 (Rust): POST /api/v1/calc/exchange-compare

## 파일 구조

frontend/src/
├── pages/CustomsPage.tsx
├── components/customs/
│   ├── DeclarationListTable.tsx
│   ├── DeclarationDetailView.tsx
│   ├── DeclarationForm.tsx
│   ├── CostTable.tsx (원가 3단계)
│   ├── CostForm.tsx
│   ├── LandedCostPanel.tsx (미리보기/저장)
│   ├── AllocatedExpensesView.tsx (배분 내역)
│   ├── ExpenseListTable.tsx
│   ├── ExpenseForm.tsx
│   └── ExchangeComparePanel.tsx
├── hooks/
│   ├── useCustoms.ts
│   └── useExchange.ts
└── types/customs.ts

## types/customs.ts

Declaration: declaration_id, declaration_number, bl_id, bl_number?, company_id, company_name?, declaration_date, arrival_date?, release_date?, hs_code?, customs_office?, port?, memo?

DeclarationCost: cost_id, declaration_id, product_id, product_name?, product_code?, spec_wp?, quantity, capacity_kw?, exchange_rate, fob_unit_usd?, fob_total_usd?, fob_wp_krw?, cif_total_krw, cif_unit_usd?, cif_total_usd?, cif_wp_krw, tariff_rate?, tariff_amount?, vat_amount?, customs_fee?, incidental_cost?, landed_total_krw?, landed_wp_krw?, allocated_expenses?(Record<string,number>), memo?

Expense: expense_id, bl_id?, bl_number?, month?, company_id, company_name?, expense_type, amount, vat?, total, vendor?, memo?

ExchangeCompareResult: base_currency, target_currency, comparisons({amount, rate1_result, rate2_result, difference, difference_percent}[])

## PROGRESS.md 업데이트
- Step 27 완료 기록

## 완료 기준
1. Go: go build + go test 성공 (price-histories 라우트 추가 확인)
2. npm run build 성공
3. 로컬 테스트:
   - /customs -> 3개 탭
   - 면장: 목록, 생성, 상세(원가 3단계 Badge)
   - 원가 API가 /api/v1/cost-details 호출 확인
   - Landed Cost: 미리보기(파란)->저장(초록)
   - 부대비용: 목록, 생성(11개 유형), total 자동
   - 환율 비교: 차이 빨간/초록
   - 법인 변경 -> 재조회
4. harness/CHECKLIST_TEMPLATE.md 양식으로 보고
5. 전체 파일 코드 보여주기
