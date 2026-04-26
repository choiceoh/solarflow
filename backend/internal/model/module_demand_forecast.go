package model

// ModuleDemandForecast — 운영 forecast용 모듈 수요 계획
// 비유: 아직 수주/출고 전표가 되기 전, 현장에서 "이 달쯤 이 규격이 필요하다"고 붙여둔 메모판
type ModuleDemandForecast struct {
	ForecastID     string   `json:"forecast_id"`
	CompanyID      string   `json:"company_id"`
	SiteID         *string  `json:"site_id"`
	SiteName       string   `json:"site_name"`
	DemandMonth    string   `json:"demand_month"`
	DemandType     string   `json:"demand_type"`
	ManufacturerID *string  `json:"manufacturer_id"`
	SpecWp         int      `json:"spec_wp"`
	ModuleWidthMM  int      `json:"module_width_mm"`
	ModuleHeightMM int      `json:"module_height_mm"`
	RequiredKw     float64  `json:"required_kw"`
	Status         string   `json:"status"`
	Notes          *string  `json:"notes"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
}

var validDemandTypes = map[string]bool{
	"construction":            true,
	"distribution_adjustment": true,
	"other":                   true,
}

var validDemandStatuses = map[string]bool{
	"planned":   true,
	"confirmed": true,
	"done":      true,
	"cancelled": true,
}

// CreateModuleDemandForecastRequest — 모듈 수요 계획 등록 요청
type CreateModuleDemandForecastRequest struct {
	CompanyID      string   `json:"company_id"`
	SiteID         *string  `json:"site_id,omitempty"`
	SiteName       string   `json:"site_name"`
	DemandMonth    string   `json:"demand_month"`
	DemandType     string   `json:"demand_type"`
	ManufacturerID *string  `json:"manufacturer_id,omitempty"`
	SpecWp         int      `json:"spec_wp"`
	ModuleWidthMM  int      `json:"module_width_mm"`
	ModuleHeightMM int      `json:"module_height_mm"`
	RequiredKw     float64  `json:"required_kw"`
	Status         string   `json:"status"`
	Notes          *string  `json:"notes,omitempty"`
}

func (req *CreateModuleDemandForecastRequest) Validate() string {
	if req.CompanyID == "" {
		return "company_id는 필수입니다"
	}
	if req.SiteName == "" {
		return "site_name은 필수입니다"
	}
	if len(req.DemandMonth) != 7 {
		return "demand_month는 YYYY-MM 형식이어야 합니다"
	}
	if req.DemandType == "" {
		req.DemandType = "construction"
	}
	if !validDemandTypes[req.DemandType] {
		return "demand_type 값이 올바르지 않습니다"
	}
	if req.SpecWp <= 0 {
		return "spec_wp는 양수여야 합니다"
	}
	if req.ModuleWidthMM <= 0 || req.ModuleHeightMM <= 0 {
		return "module_width_mm와 module_height_mm는 양수여야 합니다"
	}
	if req.RequiredKw <= 0 {
		return "required_kw는 양수여야 합니다"
	}
	if req.Status == "" {
		req.Status = "planned"
	}
	if !validDemandStatuses[req.Status] {
		return "status 값이 올바르지 않습니다"
	}
	return ""
}

// UpdateModuleDemandForecastRequest — 모듈 수요 계획 수정 요청
type UpdateModuleDemandForecastRequest struct {
	SiteID         *string  `json:"site_id,omitempty"`
	SiteName       *string  `json:"site_name,omitempty"`
	DemandMonth    *string  `json:"demand_month,omitempty"`
	DemandType     *string  `json:"demand_type,omitempty"`
	ManufacturerID *string  `json:"manufacturer_id,omitempty"`
	SpecWp         *int     `json:"spec_wp,omitempty"`
	ModuleWidthMM  *int     `json:"module_width_mm,omitempty"`
	ModuleHeightMM *int     `json:"module_height_mm,omitempty"`
	RequiredKw     *float64 `json:"required_kw,omitempty"`
	Status         *string  `json:"status,omitempty"`
	Notes          *string  `json:"notes,omitempty"`
}

func (req *UpdateModuleDemandForecastRequest) Validate() string {
	if req.SiteName != nil && *req.SiteName == "" {
		return "site_name은 빈 값일 수 없습니다"
	}
	if req.DemandMonth != nil && len(*req.DemandMonth) != 7 {
		return "demand_month는 YYYY-MM 형식이어야 합니다"
	}
	if req.DemandType != nil && !validDemandTypes[*req.DemandType] {
		return "demand_type 값이 올바르지 않습니다"
	}
	if req.SpecWp != nil && *req.SpecWp <= 0 {
		return "spec_wp는 양수여야 합니다"
	}
	if req.ModuleWidthMM != nil && *req.ModuleWidthMM <= 0 {
		return "module_width_mm는 양수여야 합니다"
	}
	if req.ModuleHeightMM != nil && *req.ModuleHeightMM <= 0 {
		return "module_height_mm는 양수여야 합니다"
	}
	if req.RequiredKw != nil && *req.RequiredKw <= 0 {
		return "required_kw는 양수여야 합니다"
	}
	if req.Status != nil && !validDemandStatuses[*req.Status] {
		return "status 값이 올바르지 않습니다"
	}
	return ""
}
