package model

// LandedCostResponse — Rust Landed Cost 계산 응답 (Go 측)
type LandedCostResponse struct {
	Items        []LandedCostItem `json:"items"`
	Saved        bool             `json:"saved"`
	CalculatedAt string           `json:"calculated_at"`
}

// LandedCostItem — Landed Cost 라인아이템
type LandedCostItem struct {
	CostID             string             `json:"cost_id"`
	DeclarationID      string             `json:"declaration_id"`
	DeclarationNumber  string             `json:"declaration_number"`
	ProductID          string             `json:"product_id"`
	ProductCode        string             `json:"product_code"`
	ProductName        string             `json:"product_name"`
	ManufacturerName   string             `json:"manufacturer_name"`
	Quantity           int                `json:"quantity"`
	CapacityKW         float64            `json:"capacity_kw"`
	ExchangeRate       float64            `json:"exchange_rate"`
	FobUnitUSD         *float64           `json:"fob_unit_usd"`
	FobWpKRW           *float64           `json:"fob_wp_krw"`
	CifWpKRW           float64            `json:"cif_wp_krw"`
	TariffRate         *float64           `json:"tariff_rate"`
	TariffAmount       float64            `json:"tariff_amount"`
	VatAmount          float64            `json:"vat_amount"`
	AllocatedExpenses  map[string]float64 `json:"allocated_expenses"`
	TotalExpenseKRW    float64            `json:"total_expense_krw"`
	ExpensePerWpKRW    float64            `json:"expense_per_wp_krw"`
	LandedTotalKRW     float64            `json:"landed_total_krw"`
	LandedWpKRW        float64            `json:"landed_wp_krw"`
	MarginVsCifKRW     float64            `json:"margin_vs_cif_krw"`
}

// ExchangeCompareResponse — 환율 환산 비교 응답
type ExchangeCompareResponse struct {
	Items            []ExchangeCompareItem `json:"items"`
	LatestRate       float64               `json:"latest_rate"`
	LatestRateSource string                `json:"latest_rate_source"`
	CalculatedAt     string                `json:"calculated_at"`
}

// ExchangeCompareItem — 환율 비교 라인아이템
type ExchangeCompareItem struct {
	DeclarationNumber string   `json:"declaration_number"`
	DeclarationDate   string   `json:"declaration_date"`
	ProductName       string   `json:"product_name"`
	ManufacturerName  string   `json:"manufacturer_name"`
	ContractRate      float64  `json:"contract_rate"`
	FobUnitUSD        *float64 `json:"fob_unit_usd"`
	CifUnitUSD        *float64 `json:"cif_unit_usd"`
	CifWpAtContract   float64  `json:"cif_wp_at_contract"`
	CifWpAtLatest     float64  `json:"cif_wp_at_latest"`
	RateImpactKRW     float64  `json:"rate_impact_krw"`
}
