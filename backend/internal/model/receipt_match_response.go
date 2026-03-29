package model

// OutstandingListResp — 미수금 목록 응답
type OutstandingListResp struct {
	CustomerID       string                `json:"customer_id"`
	CustomerName     string                `json:"customer_name"`
	OutstandingItems []OutstandingItemResp  `json:"outstanding_items"`
	TotalOutstanding float64               `json:"total_outstanding"`
	OutstandingCount int                   `json:"outstanding_count"`
	CalculatedAt     string                `json:"calculated_at"`
}

// OutstandingItemResp — 미수금 항목
type OutstandingItemResp struct {
	OutboundID       string   `json:"outbound_id"`
	OutboundDate     *string  `json:"outbound_date"`
	ProductName      string   `json:"product_name"`
	SpecWP           int      `json:"spec_wp"`
	Quantity         int      `json:"quantity"`
	SiteName         *string  `json:"site_name"`
	TotalAmount      float64  `json:"total_amount"`
	CollectedAmount  float64  `json:"collected_amount"`
	OutstandingAmount float64 `json:"outstanding_amount"`
	DaysElapsed      int64    `json:"days_elapsed"`
	TaxInvoiceDate   *string  `json:"tax_invoice_date"`
	Status           string   `json:"status"`
}

// ReceiptMatchSuggestResp — 매칭 추천 응답
type ReceiptMatchSuggestResp struct {
	ReceiptAmount   float64          `json:"receipt_amount"`
	Suggestions     []SuggestionResp `json:"suggestions"`
	UnmatchedAmount float64          `json:"unmatched_amount"`
	CalculatedAt    string           `json:"calculated_at"`
}

// SuggestionResp — 추천 조합
type SuggestionResp struct {
	MatchType    string               `json:"match_type"`
	Description  string               `json:"description"`
	Items        []SuggestionItemResp `json:"items"`
	TotalMatched float64              `json:"total_matched"`
	Remainder    float64              `json:"remainder"`
	MatchRate    float64              `json:"match_rate"`
}

// SuggestionItemResp — 추천 항목
type SuggestionItemResp struct {
	OutboundID       string  `json:"outbound_id"`
	OutboundDate     *string `json:"outbound_date"`
	SiteName         *string `json:"site_name"`
	ProductName      string  `json:"product_name"`
	OutstandingAmount float64 `json:"outstanding_amount"`
	MatchAmount      float64 `json:"match_amount"`
}
