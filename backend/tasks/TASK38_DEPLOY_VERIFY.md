# 작업: Step 32 — 배포 완료 + 실데이터 검증
harness/RULES.md를 반드시 따를 것.
감리 지적 반영: "전체(all)" 법인 합산 수정 완료.

## 현재 배포 상태

| 레이어 | URL | 상태 |
|--------|-----|------|
| 프론트 | https://solarflow-3-frontend.pages.dev | ✅ 로그인 성공 |
| Go | https://solarflow-backend.fly.dev | ✅ health 200 |
| Rust | https://solarflow-engine.fly.dev | ✅ health 200 |
| DB | Supabase solarflow-2 | ✅ 연결됨 |
| 인증 | ES256 JWKS + HMAC 폴백 | ✅ 동작 |

## 감리 지적 반영 (D-060 완료)

"전체(all)" 법인 선택 시:
- Calc API hooks: 법인 목록 조회 → Promise.all 병렬 호출 → 합산
- CRUD hooks: company_id 파라미터 생략 → 전체 반환
- 적용: useDashboard, useAlerts, useInventory, useBanking, useForecast, useLCDemand, useSearch
- 신규: lib/companyUtils.ts (isAllCompanies, companyParams, fetchCalc)

## Stage 0: RLS 비활성화 (Alex가 Supabase SQL Editor에서 실행)

ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE banks DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE lc_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE tt_remittances DISABLE ROW LEVEL SECURITY;
ALTER TABLE bl_shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE bl_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE outbounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE declarations DISABLE ROW LEVEL SECURITY;
ALTER TABLE declaration_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_histories DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_limit_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;

## Stage 1: 마스터 데이터 이관 (Alex — 웹 화면 직접 등록)

순서 (FK 의존성 준수):
1. 법인 3개: 탑솔라(TS), 디원(DW), 화신이엔지(HS)
2. 제조사 15개: 진코, 트리나, 라이젠, LONGi, 에스디엔, AIKO, 한화, TCL, 한솔, 현대, 캐나디안, JA, 통웨이, KNK, 에스엔
3. 품번 20개: 주요 모듈 (M-JK0635, M-JK0640, M-TR0720 등)
4. 거래처 10개: 바로, 신명, 미래에스엠, 블루오션에어, 선진로지스틱스 등
5. 창고 6개: A200(블루오션), A400(선진), F100(광주공장) + location_code
6. 은행 5개: 하나($10M), 산업($10M), 신한($2.5M), 국민($4M), 광주($2.5M)

## Stage 2: 거래 데이터 최소 이관

마스터 등록 후:
- 입고 3건 (해외직수입1 + 국내구매1 + 그룹내1)
- 출고 3건 (판매1 + 공사1 + 스페어1)
- 매출 2건 (출고 후)
- 수주 2건
- PO 1건 + LC 1건 + TT 1건

## Stage 3: 기능 검증 체크리스트

### 인증
- [ ] 로그인 성공 ✅
- [ ] 로그아웃 → 로그인 이동
- [ ] 새로고침 세션 유지

### 마스터 CRUD 6개
- [ ] 법인 등록/수정/토글
- [ ] 제조사 등록
- [ ] 품번 등록 (제조사 연결, spec_wp, 크기mm)
- [ ] 거래처 등록 (partner_type, erp_code)
- [ ] 창고 등록 (warehouse_code, location_code)
- [ ] 은행 등록 (법인, LC한도, 수수료율)

### 재고
- [ ] 요약 카드 4개 (물리적/가용/미착품/총확보)
- [ ] 데이터 이관 후 수치 변동
- [ ] 법인 전환 + "전체" 합산 표시

### 입고
- [ ] B/L 등록 + 라인아이템
- [ ] 상태 변경 (순방향)

### 발주
- [ ] PO 등록 + 라인아이템
- [ ] 5서브탭 표시
- [ ] LC/TT 등록

### 출고/판매
- [ ] 출고 등록 → 재고 차감
- [ ] 매출 등록 (Wp단가 → 4개 자동계산)

### 수주/수금
- [ ] 수주 등록
- [ ] 수금 등록 + 매칭

### 면장/원가
- [ ] 면장 등록 (B/L 연결)
- [ ] 원가 등록

### 은행/LC
- [ ] 한도 현황 + 사용률
- [ ] LC 등록 후 변동

### 대시보드
- [ ] 요약 카드 6개 ✅
- [ ] "전체" 합산 표시
- [ ] 데이터 이관 후 수치 변동

### 엑셀
- [ ] 양식 다운로드 → 드롭다운
- [ ] 업로드 → 미리보기 → 확정
- [ ] 아마란스 입고(34컬럼)/출고(35컬럼) 내보내기

### 결재안
- [ ] 유형 선택 → 텍스트 생성
- [ ] 클립보드 복사

### 메모/검색/알림
- [ ] 메모 생성/수정/삭제
- [ ] Ctrl+K 검색 바
- [ ] 알림 Bell 드롭다운

### 성능
- [ ] 대시보드 3초 이내 ✅ (2초)
- [ ] 검색 2초 이내
- [ ] 재고 집계 2초 이내

## 시공자 작업 범위

### 버그 수정 (검증 중 발견 시)
- D-060 즉시 수정 → fly deploy + wrangler deploy

### RLS 정리 SQL
Alex가 Supabase에서 실행할 전체 테이블 DISABLE RLS SQL 제공 (위 Stage 0).

### 문서 최종 마무리
- PROGRESS.md: Phase 4 완료 기록
- DECISIONS.md: 배포 관련 결정 추가 (ES256/JWKS, RLS 비활성화, 전체법인합산)
- 최종 커밋

## PROGRESS.md 최종 업데이트

Phase 4 전체 완료:
Step 20~31 ✅ 개발 완료
Step 32 ✅ 배포 + 실데이터 검증
Go: 116+ 테스트 PASS
Rust: 75 테스트 PASS
프론트: 빌드 0에러, 190+ 파일
배포: 프론트(Cloudflare) + Go(fly.io) + Rust(fly.io)
인증: ES256 JWKS 지원

## 완료 기준
1. RLS 비활성화 완료
2. 마스터 6종 등록 완료
3. 거래 데이터 최소 3건씩
4. 검증 체크리스트 주요 항목 통과
5. "전체" 법인 합산 정상 동작
6. PROGRESS.md + DECISIONS.md 최종
7. 커밋 + push
