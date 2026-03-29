package model

// 허용되는 expense_type 값
var validExpenseTypes = map[string]bool{
	"dock_charge":   true,
	"shuttle":       true,
	"customs_fee":   true,
	"transport":     true,
	"storage":       true,
	"handling":      true,
	"surcharge":     true,
	"lc_fee":        true,
	"lc_acceptance": true,
	"telegraph":     true,
	"other":         true,
}

// IncidentalExpense — 부대비용 정보를 담는 구조체
// 비유: "부대비용 전표" — 모듈 입고 과정에서 발생하는 각종 비용(접안료, 셔틀, 통관 등)
type IncidentalExpense struct {
	ExpenseID   string   `json:"expense_id"`
	BLID        *string  `json:"bl_id"`
	Month       *string  `json:"month"`
	CompanyID   string   `json:"company_id"`
	ExpenseType string   `json:"expense_type"`
	Amount      float64  `json:"amount"`
	Vat         *float64 `json:"vat"`
	Total       float64  `json:"total"`
	Vendor      *string  `json:"vendor"`
	Memo        *string  `json:"memo"`
}

// CreateExpenseRequest — 부대비용 등록 시 클라이언트가 보내는 데이터
// 비유: "부대비용 등록 신청서" — 법인, 비용 유형, 금액을 필수 기재
type CreateExpenseRequest struct {
	BLID        *string  `json:"bl_id"`
	Month       *string  `json:"month"`
	CompanyID   string   `json:"company_id"`
	ExpenseType string   `json:"expense_type"`
	Amount      float64  `json:"amount"`
	Vat         *float64 `json:"vat"`
	Total       float64  `json:"total"`
	Vendor      *string  `json:"vendor"`
	Memo        *string  `json:"memo"`
}

// Validate — 부대비용 등록 요청의 입력값을 검증
// 비유: 접수 창구에서 비용 전표 필수 항목 확인
func (req *CreateExpenseRequest) Validate() string {
	if req.CompanyID == "" {
		return "company_id는 필수 항목입니다"
	}
	if req.ExpenseType == "" {
		return "expense_type은 필수 항목입니다"
	}
	if !validExpenseTypes[req.ExpenseType] {
		return "expense_type은 허용된 값이 아닙니다 (dock_charge/shuttle/customs_fee/transport/storage/handling/surcharge/lc_fee/lc_acceptance/telegraph/other)"
	}
	if req.Amount <= 0 {
		return "amount는 양수여야 합니다"
	}
	if req.Total <= 0 {
		return "total은 양수여야 합니다"
	}
	// 비유: B/L 또는 월(month) 중 하나는 있어야 비용을 어디에 귀속시킬지 알 수 있음
	if req.BLID == nil && req.Month == nil {
		return "bl_id 또는 month 중 하나는 필수입니다"
	}
	return ""
}

// UpdateExpenseRequest — 부대비용 수정 시 클라이언트가 보내는 데이터
// 비유: "부대비용 변경 신청서" — 바꾸고 싶은 항목만 적어서 제출
type UpdateExpenseRequest struct {
	BLID        *string  `json:"bl_id,omitempty"`
	Month       *string  `json:"month,omitempty"`
	CompanyID   *string  `json:"company_id,omitempty"`
	ExpenseType *string  `json:"expense_type,omitempty"`
	Amount      *float64 `json:"amount,omitempty"`
	Vat         *float64 `json:"vat,omitempty"`
	Total       *float64 `json:"total,omitempty"`
	Vendor      *string  `json:"vendor,omitempty"`
	Memo        *string  `json:"memo,omitempty"`
}

// Validate — 부대비용 수정 요청의 입력값을 검증
func (req *UpdateExpenseRequest) Validate() string {
	if req.CompanyID != nil && *req.CompanyID == "" {
		return "company_id는 빈 값으로 변경할 수 없습니다"
	}
	if req.ExpenseType != nil && !validExpenseTypes[*req.ExpenseType] {
		return "expense_type은 허용된 값이 아닙니다"
	}
	if req.Amount != nil && *req.Amount <= 0 {
		return "amount는 양수여야 합니다"
	}
	if req.Total != nil && *req.Total <= 0 {
		return "total은 양수여야 합니다"
	}
	return ""
}
