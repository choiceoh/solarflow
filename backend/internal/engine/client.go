package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// HealthResponse — Rust 엔진 /health/ready 응답 구조체
// 비유: "설비 점검 결과서" — DB 연결 상태를 확인한 결과
type HealthResponse struct {
	Status string `json:"status"`
	DB     string `json:"db"`
}

// EngineClient — Rust 계산엔진 HTTP 클라이언트
// 비유: "계산실 연락 담당" — Go에서 Rust 계산엔진에 요청을 보내는 전담 직원
type EngineClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewEngineClient — EngineClient 생성자
// 비유: 계산실 연락 담당 직원을 배치하고 전화번호(BaseURL)를 등록하는 것
func NewEngineClient(baseURL string) *EngineClient {
	// 비유: 전화번호 끝에 / 있으면 제거 — 중복 방지
	baseURL = strings.TrimRight(baseURL, "/")

	return &EngineClient{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// CheckHealth — Rust 엔진 상태 확인 (/health/ready 호출)
// 비유: "계산실 전화해서 설비 정상인지 확인하는 것"
func (c *EngineClient) CheckHealth() (HealthResponse, error) {
	url := c.BaseURL + "/health/ready"
	var result HealthResponse

	resp, err := c.HTTPClient.Get(url)
	if err != nil {
		log.Printf("[Rust 엔진 헬스체크 실패] url=%s, err=%v", url, err)
		return result, fmt.Errorf("Rust 엔진 연결 실패: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Rust 엔진 헬스체크 응답 읽기 실패] %v", err)
		return result, fmt.Errorf("Rust 엔진 응답 읽기 실패: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Rust 엔진 헬스체크 비정상] status=%d, body=%s", resp.StatusCode, string(body))
		return result, fmt.Errorf("Rust 엔진 비정상 상태: %d", resp.StatusCode)
	}

	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("[Rust 엔진 헬스체크 파싱 실패] %v", err)
		return result, fmt.Errorf("Rust 엔진 응답 파싱 실패: %w", err)
	}

	return result, nil
}

// CallCalc — Rust 계산엔진에 계산 요청을 보냄
// 비유: "계산실에 계산 요청서를 보내고 결과를 받아오는 것"
//
// 참고: Rust 엔진은 fly.io auto_stop으로 꺼져 있을 수 있음.
// 첫 요청 시 콜드 스타트 1~3초 지연 가능. 타임아웃 10초로 충분.
// 재시도 로직은 필요 시 추가 (현재 불필요).
func (c *EngineClient) CallCalc(path string, reqBody interface{}) ([]byte, error) {
	url := c.BaseURL + "/api/calc/" + path

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		log.Printf("[Rust 엔진 요청 직렬화 실패] path=%s, err=%v", path, err)
		return nil, fmt.Errorf("요청 데이터 직렬화 실패: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(jsonData))
	if err != nil {
		log.Printf("[Rust 엔진 요청 생성 실패] path=%s, err=%v", path, err)
		return nil, fmt.Errorf("요청 생성 실패: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		log.Printf("[Rust 엔진 호출 실패] path=%s, err=%v", path, err)
		return nil, fmt.Errorf("Rust 엔진 호출 실패: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Rust 엔진 응답 읽기 실패] path=%s, err=%v", path, err)
		return nil, fmt.Errorf("Rust 엔진 응답 읽기 실패: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Rust 엔진 계산 실패] path=%s, status=%d, body=%s", path, resp.StatusCode, string(body))
		return nil, fmt.Errorf("Rust 엔진 계산 실패: status=%d, body=%s", resp.StatusCode, string(body))
	}

	return body, nil
}

// inventoryRequest — Rust 재고 집계 요청 구조체
// 비유: "재고 조회 신청서" — Go에서 Rust로 보내는 요청
type inventoryRequest struct {
	CompanyID      string  `json:"company_id"`
	ProductID      *string `json:"product_id,omitempty"`
	ManufacturerID *string `json:"manufacturer_id,omitempty"`
}

// GetInventory — Rust 재고 집계 API 호출
// 비유: "계산실에 재고 현황판 요청서를 보내고 결과를 받아오는 것"
func (c *EngineClient) GetInventory(companyID string, productID, manufacturerID *string) (InventoryResponse, error) {
	req := inventoryRequest{
		CompanyID:      companyID,
		ProductID:      productID,
		ManufacturerID: manufacturerID,
	}

	data, err := c.CallCalc("inventory", req)
	if err != nil {
		return InventoryResponse{}, err
	}

	var result InventoryResponse
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("[재고 집계 응답 파싱 실패] %v", err)
		return InventoryResponse{}, fmt.Errorf("재고 집계 응답 파싱 실패: %w", err)
	}

	return result, nil
}

// InventoryResponse — Rust 재고 집계 응답 (engine 패키지 내부 사용)
type InventoryResponse struct {
	Items        []InventoryItem  `json:"items"`
	Summary      InventorySummary `json:"summary"`
	CalculatedAt string           `json:"calculated_at"`
}

// InventoryItem — 품번별 재고 상세
type InventoryItem struct {
	ProductID          string  `json:"product_id"`
	ProductCode        string  `json:"product_code"`
	ProductName        string  `json:"product_name"`
	ManufacturerName   string  `json:"manufacturer_name"`
	SpecWP             int     `json:"spec_wp"`
	ModuleWidthMM      int     `json:"module_width_mm"`
	ModuleHeightMM     int     `json:"module_height_mm"`
	PhysicalKW         float64 `json:"physical_kw"`
	ReservedKW         float64 `json:"reserved_kw"`
	AllocatedKW        float64 `json:"allocated_kw"`
	AvailableKW        float64 `json:"available_kw"`
	IncomingKW         float64 `json:"incoming_kw"`
	IncomingReservedKW float64 `json:"incoming_reserved_kw"`
	AvailableIncomingKW float64 `json:"available_incoming_kw"`
	TotalSecuredKW     float64 `json:"total_secured_kw"`
	LongTermStatus     string  `json:"long_term_status"`
}

// InventorySummary — 전체 합계
type InventorySummary struct {
	TotalPhysicalKW  float64 `json:"total_physical_kw"`
	TotalAvailableKW float64 `json:"total_available_kw"`
	TotalIncomingKW  float64 `json:"total_incoming_kw"`
	TotalSecuredKW   float64 `json:"total_secured_kw"`
}

// === Landed Cost ===

// landedCostCalcRequest — Rust Landed Cost 요청 구조체
type landedCostCalcRequest struct {
	DeclarationID *string `json:"declaration_id,omitempty"`
	CompanyID     *string `json:"company_id,omitempty"`
	BLID          *string `json:"bl_id,omitempty"`
	Save          bool    `json:"save"`
}

// LandedCostCalcResponse — Rust Landed Cost 응답 (engine 패키지)
type LandedCostCalcResponse struct {
	Items        []LandedCostCalcItem `json:"items"`
	Saved        bool                 `json:"saved"`
	CalculatedAt string               `json:"calculated_at"`
}

// LandedCostCalcItem — Landed Cost 라인아이템
type LandedCostCalcItem struct {
	CostID            string             `json:"cost_id"`
	DeclarationID     string             `json:"declaration_id"`
	DeclarationNumber string             `json:"declaration_number"`
	ProductID         string             `json:"product_id"`
	ProductCode       string             `json:"product_code"`
	ProductName       string             `json:"product_name"`
	ManufacturerName  string             `json:"manufacturer_name"`
	Quantity          int                `json:"quantity"`
	CapacityKW        float64            `json:"capacity_kw"`
	ExchangeRate      float64            `json:"exchange_rate"`
	AllocatedExpenses map[string]float64 `json:"allocated_expenses"`
	TotalExpenseKRW   float64            `json:"total_expense_krw"`
	LandedTotalKRW    float64            `json:"landed_total_krw"`
	LandedWpKRW       float64            `json:"landed_wp_krw"`
}

// CalcLandedCost — Rust Landed Cost 계산 API 호출
// 비유: "계산실에 원가 계산 요청서를 보내고 결과를 받아오는 것"
func (c *EngineClient) CalcLandedCost(declarationID, companyID, blID *string, save bool) (LandedCostCalcResponse, error) {
	req := landedCostCalcRequest{
		DeclarationID: declarationID,
		CompanyID:     companyID,
		BLID:          blID,
		Save:          save,
	}

	data, err := c.CallCalc("landed-cost", req)
	if err != nil {
		return LandedCostCalcResponse{}, err
	}

	var result LandedCostCalcResponse
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("[Landed Cost 응답 파싱 실패] %v", err)
		return LandedCostCalcResponse{}, fmt.Errorf("Landed Cost 응답 파싱 실패: %w", err)
	}

	return result, nil
}

// === 환율 비교 ===

// exchangeCompareCalcRequest — Rust 환율 비교 요청 구조체
type exchangeCompareCalcRequest struct {
	CompanyID      string  `json:"company_id"`
	ProductID      *string `json:"product_id,omitempty"`
	ManufacturerID *string `json:"manufacturer_id,omitempty"`
}

// ExchangeCompareCalcResponse — Rust 환율 비교 응답 (engine 패키지)
type ExchangeCompareCalcResponse struct {
	Items            []ExchangeCompareCalcItem `json:"items"`
	LatestRate       float64                   `json:"latest_rate"`
	LatestRateSource string                    `json:"latest_rate_source"`
	CalculatedAt     string                    `json:"calculated_at"`
}

// ExchangeCompareCalcItem — 환율 비교 라인아이템
type ExchangeCompareCalcItem struct {
	DeclarationNumber string  `json:"declaration_number"`
	DeclarationDate   string  `json:"declaration_date"`
	ProductName       string  `json:"product_name"`
	ContractRate      float64 `json:"contract_rate"`
	CifWpAtContract   float64 `json:"cif_wp_at_contract"`
	CifWpAtLatest     float64 `json:"cif_wp_at_latest"`
	RateImpactKRW     float64 `json:"rate_impact_krw"`
}

// CompareExchangeRates — Rust 환율 비교 API 호출
// 비유: "계산실에 환율 비교 요청서를 보내고 결과를 받아오는 것"
func (c *EngineClient) CompareExchangeRates(companyID string, productID, manufacturerID *string) (ExchangeCompareCalcResponse, error) {
	req := exchangeCompareCalcRequest{
		CompanyID:      companyID,
		ProductID:      productID,
		ManufacturerID: manufacturerID,
	}

	data, err := c.CallCalc("exchange-compare", req)
	if err != nil {
		return ExchangeCompareCalcResponse{}, err
	}

	var result ExchangeCompareCalcResponse
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("[환율 비교 응답 파싱 실패] %v", err)
		return ExchangeCompareCalcResponse{}, fmt.Errorf("환율 비교 응답 파싱 실패: %w", err)
	}

	return result, nil
}

// === LC 수수료/한도/만기 ===

// lcFeeCalcRequest — Rust LC 수수료 요청
type lcFeeCalcRequest struct {
	LCID         *string  `json:"lc_id,omitempty"`
	CompanyID    *string  `json:"company_id,omitempty"`
	StatusFilter []string `json:"status_filter,omitempty"`
}

// LcFeeCalcResponse — Rust LC 수수료 응답 (engine 패키지)
type LcFeeCalcResponse struct {
	Items        []LcFeeCalcItem  `json:"items"`
	Summary      LcFeeCalcSummary `json:"summary"`
	FeeNote      string           `json:"fee_note"`
	CalculatedAt string           `json:"calculated_at"`
}

// LcFeeCalcItem — LC 수수료 라인아이템 (간략)
type LcFeeCalcItem struct {
	LCID        string  `json:"lc_id"`
	LCNumber    *string `json:"lc_number"`
	BankName    string  `json:"bank_name"`
	AmountUSD   float64 `json:"amount_usd"`
	TotalFeeKRW float64 `json:"total_fee_krw"`
}

// LcFeeCalcSummary — 수수료 합계
type LcFeeCalcSummary struct {
	TotalFeeKRW float64 `json:"total_fee_krw"`
}

// CalcLcFees — Rust LC 수수료 API 호출
func (c *EngineClient) CalcLcFees(lcID, companyID *string, statusFilter []string) (LcFeeCalcResponse, error) {
	req := lcFeeCalcRequest{LCID: lcID, CompanyID: companyID, StatusFilter: statusFilter}
	data, err := c.CallCalc("lc-fee", req)
	if err != nil {
		return LcFeeCalcResponse{}, err
	}
	var result LcFeeCalcResponse
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("[LC 수수료 응답 파싱 실패] %v", err)
		return LcFeeCalcResponse{}, fmt.Errorf("LC 수수료 응답 파싱 실패: %w", err)
	}
	return result, nil
}

// lcLimitTimelineCalcRequest — Rust 한도 복원 타임라인 요청
type lcLimitTimelineCalcRequest struct {
	CompanyID   *string `json:"company_id,omitempty"`
	MonthsAhead int     `json:"months_ahead"`
}

// LcLimitTimelineCalcResponse — 한도 타임라인 응답 (간략)
type LcLimitTimelineCalcResponse struct {
	Banks        []BankTimelineCalc `json:"banks"`
	CalculatedAt string             `json:"calculated_at"`
}

// BankTimelineCalc — 은행 타임라인 (간략)
type BankTimelineCalc struct {
	BankID              string  `json:"bank_id"`
	BankName            string  `json:"bank_name"`
	LCLimitUSD          float64 `json:"lc_limit_usd"`
	CurrentAvailableUSD float64 `json:"current_available_usd"`
	UsageRate           float64 `json:"usage_rate"`
}

// GetLcLimitTimeline — Rust 한도 복원 타임라인 API 호출
func (c *EngineClient) GetLcLimitTimeline(companyID *string, monthsAhead int) (LcLimitTimelineCalcResponse, error) {
	req := lcLimitTimelineCalcRequest{CompanyID: companyID, MonthsAhead: monthsAhead}
	data, err := c.CallCalc("lc-limit-timeline", req)
	if err != nil {
		return LcLimitTimelineCalcResponse{}, err
	}
	var result LcLimitTimelineCalcResponse
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("[한도 타임라인 응답 파싱 실패] %v", err)
		return LcLimitTimelineCalcResponse{}, fmt.Errorf("한도 타임라인 응답 파싱 실패: %w", err)
	}
	return result, nil
}

// lcMaturityAlertCalcRequest — Rust 만기 알림 요청
type lcMaturityAlertCalcRequest struct {
	CompanyID *string `json:"company_id,omitempty"`
	DaysAhead int     `json:"days_ahead"`
}

// LcMaturityAlertCalcResponse — 만기 알림 응답 (간략)
type LcMaturityAlertCalcResponse struct {
	Alerts       []MaturityAlertCalc `json:"alerts"`
	Count        int                 `json:"count"`
	CalculatedAt string              `json:"calculated_at"`
}

// MaturityAlertCalc — 만기 알림 항목 (간략)
type MaturityAlertCalc struct {
	LCID          string  `json:"lc_id"`
	LCNumber      *string `json:"lc_number"`
	BankName      string  `json:"bank_name"`
	AmountUSD     float64 `json:"amount_usd"`
	DaysRemaining int64   `json:"days_remaining"`
	Severity      string  `json:"severity"`
}

// GetLcMaturityAlerts — Rust 만기 알림 API 호출
func (c *EngineClient) GetLcMaturityAlerts(companyID *string, daysAhead int) (LcMaturityAlertCalcResponse, error) {
	req := lcMaturityAlertCalcRequest{CompanyID: companyID, DaysAhead: daysAhead}
	data, err := c.CallCalc("lc-maturity-alert", req)
	if err != nil {
		return LcMaturityAlertCalcResponse{}, err
	}
	var result LcMaturityAlertCalcResponse
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("[만기 알림 응답 파싱 실패] %v", err)
		return LcMaturityAlertCalcResponse{}, fmt.Errorf("만기 알림 응답 파싱 실패: %w", err)
	}
	return result, nil
}
