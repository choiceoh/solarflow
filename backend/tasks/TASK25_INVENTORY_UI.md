# 작업: Step 22 — 재고 화면 + 수급 전망
harness/RULES.md를 반드시 따를 것. harness/CHECKLIST_TEMPLATE.md 양식으로 보고할 것.
감리 즉시 승인.

## 사전: Tabs 컴포넌트 필요하면 설치
npx shadcn@latest add tabs (이미 있으면 건너뜀)

## 화면 구성: InventoryPage (/inventory) — 3개 탭

탭 1: 재고 현황
- 요약 카드 4개: 물리적 재고, 가용재고, 미착품, 총확보량 (kW + MW 환산)
- 카드 색상: 물리적(파란), 가용(초록), 미착품(노란), 총확보(보라)
- 필터: 제조사 Select + 규격 Select
- 테이블: 제조사|품번|품명|규격(Wp)|크기(mm)|물리적|예약|배정|가용|미착품|미착예약|가용미착|총확보|장기재고
- 정렬: 제조사명->모듈크기(mm)->출력(Wp) (Rust API에서 정렬됨)
- 장기재고 Badge: normal=없음, warning=노란"장기(6M+)", critical=빨간"초장기(12M+)"
- 숫자 포맷: formatKw

탭 2: 미착품
- 요약: 미착품 총량, 미착품예약, 가용미착품
- 테이블: 품번별 미착품 상세

탭 3: 수급 전망 (6개월)
- 품번 선택 드롭다운
- 월별 테이블: 월|기초|입고예정|출고(판매)|출고(공사)|기말|예약|배정|가용
- closing 음수(insufficient=true): 셀 배경 빨간+텍스트 빨간+AlertTriangle 아이콘
- unscheduled 물량: 테이블 하단 별도 섹션
- 품번 여러 개면 Collapsible 구조

## API 호출

재고 (탭1,2): POST /api/v1/calc/inventory
Body: { company_id, manufacturer_id?(필터), product_id?(필터) }

수급 전망 (탭3): POST /api/v1/calc/supply-forecast
Body: { company_id, manufacturer_id?, product_id?, months_ahead: 6 }

법인 선택(appStore) 변경 시 자동 재조회.
제조사 필터 변경 시 자동 재조회.

## 파일 구조

frontend/src/
├── pages/InventoryPage.tsx (기존 빈 페이지 교체)
├── components/inventory/
│   ├── InventorySummaryCards.tsx (요약 카드 4개)
│   ├── InventoryTable.tsx (재고 테이블)
│   ├── IncomingTable.tsx (미착품 테이블)
│   └── ForecastTable.tsx (수급 전망 테이블)
├── hooks/
│   ├── useInventory.ts (POST /api/v1/calc/inventory 호출)
│   └── useForecast.ts (POST /api/v1/calc/supply-forecast 호출)
└── types/inventory.ts (Rust API 응답 타입)

## types/inventory.ts

InventoryResponse: items(InventoryItem[]), summary(InventorySummary), calculated_at
InventoryItem: product_id, product_code, product_name, manufacturer_name, spec_wp, module_width_mm, module_height_mm, physical_kw, reserved_kw, allocated_kw, available_kw, incoming_kw, incoming_reserved_kw, available_incoming_kw, total_secured_kw, long_term_status("normal"|"warning"|"critical")
InventorySummary: total_physical_kw, total_available_kw, total_incoming_kw, total_secured_kw

ForecastResponse: products(ProductForecast[]), summary(ForecastSummary), calculated_at
ProductForecast: product_id, product_code, product_name, manufacturer_name, spec_wp, module_width_mm, module_height_mm, months(MonthForecast[]), unscheduled({sale_kw, construction_kw, incoming_kw})
MonthForecast: month, opening_kw, incoming_kw, outgoing_sale_kw, outgoing_construction_kw, closing_kw, reserved_kw, allocated_kw, available_kw, insufficient(boolean)
ForecastSummary: months(SummaryMonth[])
SummaryMonth: month, total_opening_kw, total_incoming_kw, total_outgoing_kw, total_closing_kw, total_available_kw

## 에러/빈 데이터 처리
- items 빈 배열: EmptyState "등록된 재고 데이터가 없습니다"
- Rust 503: "계산 엔진이 일시적으로 사용할 수 없습니다" 경고
- 로딩: LoadingSpinner

## 완료 기준
1. npm run build 성공
2. 로컬 테스트: /inventory 접근, 3개 탭 전환, 필터 동작, 법인 변경 재조회
3. harness/CHECKLIST_TEMPLATE.md 양식으로 보고
4. 전체 파일 코드 보여주기
