package model

// Sale — 판매(세금계산서) 정보를 담는 구조체
// 비유: "판매 전표" — 출고에 연결된 판매 금액, 세금계산서 정보
type Sale struct {
	SaleID          string   `json:"sale_id"`
	OutboundID      string   `json:"outbound_id"`
	CustomerID      string   `json:"customer_id"`
	UnitPriceWp     float64  `json:"unit_price_wp"`
	UnitPriceEa     *float64 `json:"unit_price_ea"`
	SupplyAmount    *float64 `json:"supply_amount"`
	VatAmount       *float64 `json:"vat_amount"`
	TotalAmount     *float64 `json:"total_amount"`
	TaxInvoiceDate  *string  `json:"tax_invoice_date"`
	TaxInvoiceEmail *string  `json:"tax_invoice_email"`
	ErpClosed       *bool    `json:"erp_closed"`
	ErpClosedDate   *string  `json:"erp_closed_date"`
	Memo            *string  `json:"memo"`
}

// CreateSaleRequest — 판매 등록 시 클라이언트가 보내는 데이터
// 비유: "판매 등록 신청서" — 출고, 고객, Wp 단가를 필수 기재
type CreateSaleRequest struct {
	OutboundID      string   `json:"outbound_id"`
	CustomerID      string   `json:"customer_id"`
	UnitPriceWp     float64  `json:"unit_price_wp"`
	UnitPriceEa     *float64 `json:"unit_price_ea"`
	SupplyAmount    *float64 `json:"supply_amount"`
	VatAmount       *float64 `json:"vat_amount"`
	TotalAmount     *float64 `json:"total_amount"`
	TaxInvoiceDate  *string  `json:"tax_invoice_date"`
	TaxInvoiceEmail *string  `json:"tax_invoice_email"`
	ErpClosed       *bool    `json:"erp_closed"`
	ErpClosedDate   *string  `json:"erp_closed_date"`
	Memo            *string  `json:"memo"`
}

// Validate — 판매 등록 요청의 입력값을 검증
// 비유: 접수 창구에서 판매 신청서 필수 항목 확인
func (req *CreateSaleRequest) Validate() string {
	if req.OutboundID == "" {
		return "outbound_id는 필수 항목입니다"
	}
	if req.CustomerID == "" {
		return "customer_id는 필수 항목입니다"
	}
	if req.UnitPriceWp <= 0 {
		return "unit_price_wp는 양수여야 합니다"
	}
	return ""
}

// UpdateSaleRequest — 판매 수정 시 클라이언트가 보내는 데이터
// 비유: "판매 전표 변경 신청서" — 바꾸고 싶은 항목만 적어서 제출
type UpdateSaleRequest struct {
	OutboundID      *string  `json:"outbound_id,omitempty"`
	CustomerID      *string  `json:"customer_id,omitempty"`
	UnitPriceWp     *float64 `json:"unit_price_wp,omitempty"`
	UnitPriceEa     *float64 `json:"unit_price_ea,omitempty"`
	SupplyAmount    *float64 `json:"supply_amount,omitempty"`
	VatAmount       *float64 `json:"vat_amount,omitempty"`
	TotalAmount     *float64 `json:"total_amount,omitempty"`
	TaxInvoiceDate  *string  `json:"tax_invoice_date,omitempty"`
	TaxInvoiceEmail *string  `json:"tax_invoice_email,omitempty"`
	ErpClosed       *bool    `json:"erp_closed,omitempty"`
	ErpClosedDate   *string  `json:"erp_closed_date,omitempty"`
	Memo            *string  `json:"memo,omitempty"`
}

// Validate — 판매 수정 요청의 입력값을 검증
func (req *UpdateSaleRequest) Validate() string {
	if req.OutboundID != nil && *req.OutboundID == "" {
		return "outbound_id는 빈 값으로 변경할 수 없습니다"
	}
	if req.CustomerID != nil && *req.CustomerID == "" {
		return "customer_id는 빈 값으로 변경할 수 없습니다"
	}
	if req.UnitPriceWp != nil && *req.UnitPriceWp <= 0 {
		return "unit_price_wp는 양수여야 합니다"
	}
	return ""
}
