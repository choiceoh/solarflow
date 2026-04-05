# SolarFlow 진행 상황

## 현재 상태 요약 (최종 업데이트: 2026-04-05)

| 항목 | 상태 |
|------|------|
| 현재 Phase | **Phase 4 완료 + Mac mini 로컬 완전 이전 완료** |
| 다음 작업 | 실데이터 이관 + 기능 검증 |
| 인프라 | Mac mini (Go+Rust+PostgREST+Caddy+PostgreSQL) + Supabase Auth(인증만) + Tailscale(외부접속) |
| 프론트엔드 | Caddy 정적 서빙 (dist/) — localhost:5173, Tailscale 100.123.70.19:5173 |
| DB | 로컬 PostgreSQL + PostgREST (D-075, D-076) |
| DB 테이블 | 22개 생성 완료 (user_profiles, notes 포함) |
| Go 테스트 | 116개 PASS |
| Rust 테스트 | 75개 PASS |
| 총 테스트 | 191개 PASS |
| Rust API | 15개 엔드포인트 |
| Go CalcProxy | 15개 엔드포인트 (프론트→Go→Rust) |
| 인증 | ES256 JWKS + HMAC 폴백 (D-069) + auto-provision (D-077) |
| RLS | 전체 비활성화 (D-070) |
| 대시보드 로딩 | 6초 → 2초 (companies 중복제거 + API 병렬화) |
| 감리 점수 | Phase 2: 9-10/10, Phase 3: 전부 10/10 |
| DECISIONS | D-001~D-079 (79개) |
| launchd | 5개 서비스 자동 시작 — 재부팅 테스트 성공 |

### Phase 확장 미해결 사항
1. 수금매칭 outbound 기준 → 현재 정상 동작 (D-042)
2. LC 수수료 수동 보정 기능 (D-030)
3. 제조사/거래처 별칭 DB 테이블 이동 (D-043)
4. FIFO 원가 매칭 (D-022, D-031)
5. 실시간 환율 API (D-024)
6. PDF 자동 데이터 입력 (D-064)
7. 아마란스 매출마감 내보내기 (D-067)
8. 아마란스 관리구분 매핑 (D-068)

### Rust API 엔드포인트 (15개)
- /health, /health/ready
- /api/calc/inventory (재고 집계)
- /api/calc/landed-cost (Landed Cost)
- /api/calc/exchange-compare (환율 비교)
- /api/calc/lc-fee (LC 수수료)
- /api/calc/lc-limit-timeline (한도 복원)
- /api/calc/lc-maturity-alert (만기 알림)
- /api/calc/margin-analysis (마진 분석)
- /api/calc/customer-analysis (거래처 분석)
- /api/calc/price-trend (단가 추이)
- /api/calc/supply-forecast (수급 전망)
- /api/calc/outstanding-list (미수금 목록)
- /api/calc/receipt-match-suggest (수금 매칭 추천)
- /api/calc/search (자연어 검색)

## Phase 완료 이력

### Phase 1: Go 기초 보강 완료
| 작업 | 감리 점수 |
|------|----------|
| DB 14개 테이블 | 합격 |
| 마스터 6개 핸들러 | 8-9/10 |
| 인증 미들웨어 | 9/10 |
| PO/LC/TT/BL 핸들러 | 9/10 |

### Phase 2: 핵심 거래 모듈 완료
| 작업 | 감리 점수 |
|------|----------|
| Step 7: 면장/원가 | 9/10 |
| Step 8: 수주/수금 | 9/10 |
| Step 9: 출고/판매 | 9/10 |
| Step 10: 한도변경 + omitempty | 10/10 |
| Step 11A: 스키마 변경 | 10/10 |

### Phase 3: Rust 계산엔진 완료
| 작업 | 감리 점수 | 테스트 |
|------|----------|--------|
| Step 11B: Rust 초기화 + fly.io | 10/10 | - |
| Step 12: Go-Rust 통신 | 10/10 | 63개 |
| Step 13: 재고 집계 | 10/10 | 69개 |
| Step 14: Landed Cost + 환율 | 10/10 | 74개 |
| Step 15: LC 만기/수수료/한도 | 10/10 | 88개 |
| Step 16: 마진/이익률 + 단가 | 10/10 | 100개 |
| Step 17: 월별 수급 전망 | 10/10 | 110개 |
| Step 18: 수금 매칭 추천 | 10/10 | 127개 |
| Step 19: 자연어 검색 | 10/10 | 153개 |

### Phase 4: 프론트엔드 + 연동 + 배포 (완료)
| 작업 | 감리 점수 | 비고 |
|------|----------|------|
| Step 20: 인증 + CORS + CalcProxy | 감리 대기 | CORS, 프록시 15개, users/me, 로그인 UI |
| Step 21: 레이아웃 + 마스터 CRUD 6개 | 감리 대기 | AppLayout, Sidebar(역할별), DataTable, 6개 마스터 페이지+폼 |
| Step 22: 재고 화면 + 수급 전망 | 감리 대기 | 3탭(재고/미착품/수급전망), 요약카드, 장기재고Badge, insufficient경고 |
| Step 23: 입고 관리 (B/L+라인) | 감리 대기 | 목록/상세/생성/수정, 상태6단계, 입고유형4종, 라인아이템CRUD |
| Step 24: 발주/결제 (PO+LC+TT+단가) | 감리 대기 | 4탭, PO 5서브탭, 입고진행률바, LC만기임박, 단가인상/인하표시 |
| Step 25: 출고/판매 | 감리 대기 | 2탭(출고관리/매출현황), 취소3단계, Wp단가자동계산, 그룹거래Switch, 세금계산서Badge |
| Step 26: 수주/수금+매칭 | 감리 대기 | 3탭(수주/수금/매칭), 충당소스Badge, 매칭3단계(선택→체크→확정), 자동추천, 차액표시 |
| Step 27: 면장/원가 | 감리 대기 | 3탭(수입면장/부대비용/환율비교), 원가3단계(FOB→CIF→Landed), Badge, LandedCost 미리보기/저장, 부대비용11유형, price-histories Go라우트추가 |
| Step 28A: 은행/LC+수요예측 | 감리 대기 | 4탭(한도현황/만기알림/한도변경/LC수요예측), 요약카드4+3개, 사용률bar, Recharts AreaChart, D-Day Badge, 수수료펼침, PO별미개설, 3개월예측+대응방안(D-062) |
| Step 28B: 대시보드 | 감리 대기 | 역할별분기(admin=Manager/executive=Executive), 카드6개, BarChart+LineChart, 알림9가지, 미착품/수주잔량/미수금프리뷰, Promise.allSettled 섹션별 독립로딩, 장기재고경고 |
| Step 29A: 엑셀 양식 다운로드+업로드 미리보기 | 감리 대기 | 양식7종(입고/출고/매출/면장/부대비용/수주/수금), ExcelJS dynamic import(별도chunk 930KB), 드롭다운+코드표, 업로드파싱→검증→미리보기, 면장2시트탭, 에러행다운로드, 확정등록비활성(29B), D-063/D-064 |
| Step 29B: 엑셀 확정 등록 + Import API 7개 | 감리 대기 | 29A즉시수정(통화하드코딩), 지적1(매출outbound_id), 지적2(면장+원가한번에전송), 지적3(B/L기본정보불일치경고), Go Import핸들러7개(inbound/outbound/sales/declarations/expenses/orders/receipts), FK해소+자동계산, ImportResultDialog, ConfirmDialog, 테스트13개PASS |
| Step 29C: 아마란스10 내보내기 | 감리 대기 | 입고34컬럼+출고35컬럼 excelize, GET /export/amaranth/inbound·outbound, 거래구분/과세구분 매핑, 외화단가/원화단가 자동계산, 기간선택 AmaranthExportDialog, D-067/D-068 |
| Step 30: 결재안 자동 생성 6유형 | 감리 대기 | 6유형카드선택, LC/BL/PO/거래처 기반 데이터조회, 수입통관부가세(CIF×0.1), approvalTemplates 텍스트생성, 미리보기Textarea수정, 클립보드복사, 수동입력(노란배경), Go변경없음 |
| Step 31: 메모+검색+알림 | 감리 대기 | Go Note CRUD(소유권검사), 포스트잇 MemoPage+LinkedMemoWidget, Ctrl+K GlobalSearchBar(500ms디바운스), Rust search API연동, SearchPage(이력+예시), useAlerts 분리(useDashboard에서 추출), AlertBell+AlertDropdown, 5분자동갱신, 테스트8개 |
| Step 32: 배포+검증 | ✅ 완료 | ES256 JWKS인증(D-069), RLS비활성화(D-070), 전체법인합산(D-071), user_profiles 컬럼명 정렬, 구형파일삭제, 프론트Cloudflare+Go/Rust fly.io 3레이어 배포완료 |
| Step 33: Lightsail 서울 이전 | ✅ 완료 | Fly.io 도쿄→AWS Lightsail 서울(D-072), solarflow3.com 도메인(D-073), Caddy 리버스프록시+자동SSL(D-074), 직접바이너리+systemd, Docker미사용, 대시보드6초→2초 |
| Step 34: Mac mini 로컬 이전 | ✅ 완료 | PostgREST 로컬(D-075), Caddy 경로변환(D-076), auto-provision(D-077), Tailscale 외부접속(D-078), 프론트 정적서빙(D-079), launchd 5개 서비스, 재부팅테스트 성공 |
