# 작업: Step 29C — 아마란스10 내보내기 (입고 34컬럼 + 출고 35컬럼)
harness/RULES.md를 반드시 따를 것. harness/CHECKLIST_TEMPLATE.md 양식으로 보고할 것.
감리 즉시 승인. 지적 0건. excelize 설치 완료.

## Go API 2개

### GET /api/v1/export/amaranth/inbound
쿼리: company_id, from(YYYY-MM-DD), to(YYYY-MM-DD)
DB: bl_shipments + bl_line_items JOIN products, warehouses, partners (기간 필터, status=completed/erp_done)
excelize로 .xlsx 생성. 행1: 한글헤더, 행2: ERP코드, 행3~: 데이터.
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=amaranth_inbound_YYYYMMDD.xlsx

입고 34컬럼 매핑:
A 거래구분 PO_FG 문자1 필수: import->"3", domestic/domestic_foreign/group->"0"
B 입고일자 RCV_DT 날짜8 필수: actual_arrival 또는 eta (YYYYMMDD 하이픈 제거)
C 거래처코드 TR_CD 문자10 필수: manufacturer의 erp_code (partners 테이블)
D 환종 EXCH_CD 문자4 필수: currency (USD 또는 KRW)
E 환율 EXCH_RT 숫자17,6 필수: exchange_rate (KRW이면 1)
F 과세구분 VAT_FG 문자1 필수: import->"1"(수입영세), domestic계열->"0"(매입과세)
G 단가구분 UMVAT_FG 문자1 필수: "0" 고정
H 창고코드 WH_CD 문자4 필수: warehouse_code
I 담당자코드 PLN_CD 문자10: 빈값
J 비고(건) REMARK_DC 문자60: bl_number + memo
K 품번 ITEM_CD 문자30 필수: product_code
L 입고수량 PO_QT 숫자17,6 필수: quantity
M 재고단위수량 RCV_QT 숫자17,6 필수: quantity (L과 동일)
N 단가유형 UM_FG 문자10: 빈값
O 부가세미포함단가 RCV_UM 숫자17,6: unit_price_krw (import: cif_wp_krw*spec_wp, domestic: unit_price_krw_wp*spec_wp)
P 부가세포함단가 VAT_UM 숫자17,6: O열 * 1.1 (import면 O열 그대로-영세)
Q 공급가 RCVG_AM 숫자17,4: quantity * O열
R 부가세 RCVV_AM 숫자17,4: import면 0, domestic면 Q열*0.1
S 합계액 RCVH_AM 숫자17,4: Q+R
T 외화단가 EXCH_UM 숫자17,6: unit_price_usd_wp * spec_wp (USD/EA)
U 외화금액 EXCH_AM 숫자17,4: invoice_amount_usd
V 장소코드 LC_CD 문자4 필수: location_code (warehouses 테이블)
W LOT번호 LOT_NB 문자50: 빈값
X 관리구분 MGMT_CD 문자10: 빈값 (D-067)
Y 프로젝트코드 PJT_CD 문자10: 빈값
Z 비고(내역) REMARKD_DC 문자60: bl_line memo
AA 발주번호 PO_NB 문자12: po_number (있으면)
AB 발주순번 PO_SQ 문자5: 라인아이템 순번
AC 수입선적번호 IBL_NB 문자20: bl_number
AD 수입선적순번 IBL_SQ 문자5: 라인아이템 순번
AE~AH 입고의뢰/검사: 빈값 4개

### GET /api/v1/export/amaranth/outbound
쿼리: company_id, from, to
DB: outbounds + sales JOIN products, warehouses, partners (기간 필터, status=active)

출고 35컬럼 매핑:
A 거래구분 SO_FG 문자1 필수: "0" 고정
B 출고일자 ISU_DT 날짜8 필수: outbound_date (YYYYMMDD)
C 고객코드 TR_CD 문자10 필수: customer의 erp_code (partners)
D 환종 EXCH_CD 문자4 필수: "KRW" 고정
E 환율 EXCH_RT 숫자17,6 필수: 1 고정
F 과세구분 VAT_FG 문자1 필수: "0" 고정
G 단가구분 UMVAT_FG 문자1 필수: "0" 고정
H 창고코드 WH_CD 문자4 필수: warehouse_code
I 담당자코드 PLN_CD 문자10: 빈값
J 비고(건) REMARK_DC 문자60: site_name + memo
K 품번 ITEM_CD 문자30 필수: product_code
L 출고수량 SO_QT 숫자17,6 필수: quantity
M 재고단위수량 ISU_QT 숫자17,6 필수: quantity
N 단가유형 UM_FG 문자10: 빈값
O 부가세미포함단가 ISU_UM 숫자17,6: unit_price_ea (sales, 없으면 빈값)
P 부가세포함단가 VAT_UM 숫자17,6: O열*1.1 (sales 없으면 빈값)
Q 공급가 ISUG_AM 숫자17,4: supply_amount (sales)
R 부가세 ISUV_AM 숫자17,4: vat_amount (sales)
S 합계액 ISUH_AM 숫자17,4: total_amount (sales)
T 장소코드 LC_CD 문자4 필수: location_code
U 관리구분 MGMT_CD 문자10: 빈값 (D-067)
V 프로젝트코드 PJT_CD 문자10: 빈값
W 비고(내역) REMARK_DC_D 문자60: outbound memo
X 납품처코드 SHIP_CD 문자5: 빈값
Y 지역 AREA_CD 문자10: 빈값
Z 외화단가 EXCH_UM 숫자17,6: 0
AA 외화금액 EXCH_AM 숫자17,4: 0
AB~AI: 빈값 8개

## 라우터 (main.go)

r.Route("/api/v1/export/amaranth", func(r chi.Router) {
    r.Use(AuthMiddleware)
    r.Get("/inbound", exportHandler.AmaranthInbound)
    r.Get("/outbound", exportHandler.AmaranthOutbound)
})

## Go 파일

backend/internal/handler/export.go (신규): ExportHandler + 2개 메서드
각 메서드: DB 조회 -> 컬럼 매핑 -> excelize.NewFile() -> 헤더+데이터 -> w.Write(f)

## 프론트

### ExcelToolbar.tsx 수정
type="inbound": [아마란스 입고] 버튼 추가
type="outbound": [아마란스 출고] 버튼 추가
type="sale": [아마란스 매출] 비활성 + 툴팁 "실물 양식 확인 후 구현"

### AmaranthExportDialog.tsx (신규 또는 기존 수정)
기간 선택: from(기본 이번달 1일), to(기본 오늘)
[내보내기] -> fetch(GET /api/v1/export/amaranth/{type}?...) -> blob -> saveAs

## Go 테스트

backend/internal/handler/export_test.go:
- TestExport_AmaranthInbound_Success: .xlsx 반환, Content-Type 확인
- TestExport_AmaranthInbound_Empty: 데이터 없을 때 헤더만 .xlsx
- TestExport_AmaranthInbound_DateFilter: from/to 필터
- TestExport_AmaranthOutbound_Success: 35컬럼
- TestExport_AmaranthOutbound_WithSale: 매출 연결 시 단가/금액
- TestExport_AmaranthOutbound_NoSale: 매출 미연결 시 빈값

## DECISIONS.md 추가
- D-066: 아마란스 매출마감 Step 32로. 실물 양식 미확보.
- D-067: 아마란스 관리구분(MGMT_CD) 빈값. 코드 체계 미확인.

## PROGRESS.md 업데이트
- Step 29C 완료, 다음: Step 30

## 완료 기준
1. Go: go build + go vet + go test 성공
2. npm run build 성공
3. 린터: bash scripts/lint_rules.sh 0건
4. harness/CHECKLIST_TEMPLATE.md 양식으로 보고
