# 작업: Step 28A — 은행/LC + LC 수요 예측
harness/RULES.md를 반드시 따를 것. harness/CHECKLIST_TEMPLATE.md 양식으로 보고할 것.
감리 지적: Step 28 범위 과대 → 28A(은행/LC) + 28B(대시보드) 분리.
즉시 수정(D-060): PROGRESS.md "Step 27 완료" 반영.

## 즉시 수정: PROGRESS.md
harness/PROGRESS.md "프론트엔드" → "Step 27 완료" 반영

## BankingPage (/banking) — 4개 탭

탭 1: 한도 현황
탭 2: 만기 알림
탭 3: 한도 변경 이력
탭 4: LC 수요 예측 (신규 — Alex 요청, D-062)

## 탭 1: LC 한도 현황

요약 카드 4개: 총한도, 개설잔액, 가용한도, 사용률
사용률 Progress bar: 0~70% 초록, 70~90% 노란, 90~100% 빨간

은행별 테이블:
| 은행 | 한도(USD) | 개설잔액 | 가용한도 | 사용률 | 개설수수료율 | 인수수수료율 |

한도 복원 타임라인 (Rust lc-limit-timeline):
POST /api/v1/calc/lc-limit-timeline { company_id, months_ahead: 3 }
타임라인 이벤트 목록:
  "4/19 하나은행 +$1.15M (LC만기결제)"
  "4/26 산업은행 +$2.31M"
Recharts AreaChart: 월별 projected_available

## 탭 2: LC 만기 알림

Rust lc-maturity-alert:
POST /api/v1/calc/lc-maturity-alert { company_id, days_ahead: 30 }

테이블: LC번호, PO번호, 은행, 금액(USD), 만기일, D-Day, 상태
D-Day Badge: 7일이내=빨간"D-N", 8~14일=주황, 15~30일=노란, 만기경과=빨간"D+N"

LC 수수료 (Rust lc-fee): 행 펼치면 상세
개설: amount x rate x exchange_rate
인수: amount x rate x days/360 x exchange_rate
fee_note: "예상 금액. 실제 청구와 차이 가능" (D-030)

## 탭 3: 한도 변경 이력

테이블 (조회 + 등록만, 수정/삭제 없음):
| 은행 | 변경일 | 이전한도 | 변경한도 | 변동 | 사유 |
변동: 증가=초록 ArrowUp, 감소=빨간 ArrowDown

LimitChangeForm.tsx (Dialog):
bank_id(필수 은행Select), change_date(필수), previous_limit(필수),
new_limit(필수), reason

## 탭 4: LC 수요 예측 (신규 — Alex 요청)

### 비즈니스 규칙 (Alex 확인, D-062)
1. 모든 해외 PO는 T/T 5~10% + 잔액 LC 구조
2. LC 개설 시점: PO 계약 후 약 30일 내
3. 알림: 3개월 전부터 매월 경고

### 상단 요약 카드 3개
LC 미개설 총액 | 가용한도 | 과부족
과부족: 양수=초록, 음수=빨간 "부족"

### PO별 LC 수요 테이블

| PO번호 | 제조사 | PO총액(USD) | TT입금 | LC개설 | LC미개설 | 개설필요시점 |

LC미개설 = PO총액 - TT입금(completed) - LC개설(opened/docs_received)

개설필요시점 = contract_date + 30일
- 이미 지남: Badge 빨간 "즉시"
- 30일 이내: Badge 주황 날짜
- 30일 이후: Badge 회색 날짜

### 3개월 예측 테이블

| 월 | LC 수요 | 한도 복원 | 가용한도(예상) | 과부족 |

과부족 표시:
- 양수: 초록 "충분"
- 가용의 20% 이내: 노란 "주의"
- 음수: 빨간 "부족"

부족 시 대응 방안 안내:
"5월 LC 수요 $8.0M, 가용한도 $0.6M — $7.4M 부족.
대응: (1) 은행 한도 증액 (2) 선적 일정 조정 (3) T/T 비율 상향"

### 데이터 소스 (프론트 조합, D-061 패턴)

1. GET /api/v1/purchase-orders?company_id=X&status=contracted,shipping
2. GET /api/v1/tt-remittances (전체 조회 후 PO별 필터)
3. GET /api/v1/lc-records (전체 조회 후 PO별 필터)
4. POST /api/v1/calc/lc-limit-timeline (월별 가용한도)

## API 호출

한도 변경: GET/POST /api/v1/limit-changes
LC: GET /api/v1/lc-records
PO: GET /api/v1/purchase-orders
TT: GET /api/v1/tt-remittances
Rust: POST /api/v1/calc/lc-fee, lc-limit-timeline, lc-maturity-alert

## 파일 구조

frontend/src/
├── pages/BankingPage.tsx (PlaceholderPage 교체)
├── components/banking/
│   ├── LCLimitSummaryCards.tsx (총한도/개설잔액/가용/사용률)
│   ├── BankLimitTable.tsx (은행별 테이블)
│   ├── LimitTimelineView.tsx (복원 타임라인 + AreaChart)
│   ├── LCMaturityTable.tsx (만기 + D-Day)
│   ├── LCFeeDetail.tsx (수수료 펼침)
│   ├── LimitChangeTable.tsx (변경 이력)
│   ├── LimitChangeForm.tsx (변경 등록)
│   ├── LCDemandForecast.tsx (수요 예측 메인)
│   ├── LCDemandByPOTable.tsx (PO별 미개설)
│   └── LCDemandMonthlyTable.tsx (3개월 예측)
├── hooks/
│   ├── useBanking.ts (한도 + 만기 + 수수료)
│   └── useLCDemand.ts (신규! PO/TT/LC 조합 → 수요 계산)
└── types/banking.ts

## types/banking.ts

LimitChange: limit_change_id, bank_id, bank_name?, change_date, previous_limit, new_limit, reason?

LCLimitTimeline (Rust): bank_summaries({bank_name, limit, used, available, usage_rate}[]), timeline_events({date, bank_name, amount, description}[]), monthly_projection({month, projected_available}[])

LCMaturityAlert (Rust): alerts({lc_id, lc_number, po_number?, bank_name, amount_usd, maturity_date, days_remaining, status}[])

LCFeeCalc (Rust): opening_fee, acceptance_fee, total_fee, fee_note

LCDemandByPO: po_id, po_number?, manufacturer_name?, po_total_usd, tt_paid_usd, lc_opened_usd, lc_needed_usd, contract_date?, lc_due_date?(contract_date+30일), urgency("immediate"|"soon"|"normal")

LCDemandMonthly: month, lc_demand_usd, limit_recovery_usd, projected_available_usd, shortage_usd, status("sufficient"|"caution"|"shortage")

## hooks/useLCDemand.ts 로직

useLCDemand(companyId):
1. PO 목록 조회 (contracted/shipping)
2. TT 전체 조회 → PO별 completed 합산
3. LC 전체 조회 → PO별 opened/docs_received 합산
4. PO별: lc_needed = po_total - tt_paid - lc_opened
5. lc_due_date = contract_date + 30일
6. urgency: 지남="immediate", 30일이내="soon", 이후="normal"
7. Rust lc-limit-timeline → 월별 가용한도
8. 월별: 해당 월 lc_due_date인 PO의 lc_needed 합산 = 수요
9. 과부족 = projected_available - lc_demand

## Recharts 사용 (탭 1 AreaChart)

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
ResponsiveContainer width="100%" height={300}
X축: 월, Y축: USD, Area: 가용한도 변화
Tooltip: formatUSD

## DECISIONS.md 추가
- D-062: LC 한도 수요 예측 기능
  이유: Alex 요청. 모든 해외 PO는 T/T 5~10% + 잔액 LC 구조.
  LC 개설 시점: PO 계약 후 30일 내. 알림: 3개월 전부터 매월.
  구현: 프론트에서 Go API 조합 (D-061 패턴). Phase 확장 시 Rust로 이동.

## PROGRESS.md 업데이트
- Step 28A 완료 기록

## 완료 기준
1. npm run build 성공
2. 로컬 테스트:
   - /banking -> 4개 탭
   - 한도 현황: 요약카드+은행테이블+사용률bar+타임라인+AreaChart
   - 만기 알림: D-Day Badge+수수료 펼침
   - 한도 변경: 등록만
   - LC 수요 예측: PO별 미개설+3개월 예측+과부족 색상+대응방안
   - Rust 미실행 시 503 처리
   - 법인 변경 -> 재조회
3. harness/CHECKLIST_TEMPLATE.md 양식으로 보고
4. 전체 파일 코드 보여주기
