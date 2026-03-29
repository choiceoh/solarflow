package model

import "unicode/utf8"

// ImportDeclaration — 수입신고(면장) 정보를 담는 구조체
// 비유: "수입신고 면장" — 세관에 제출하는 수입 신고서
type ImportDeclaration struct {
	DeclarationID     string  `json:"declaration_id"`
	DeclarationNumber string  `json:"declaration_number"`
	BLID              string  `json:"bl_id"`
	CompanyID         string  `json:"company_id"`
	DeclarationDate   string  `json:"declaration_date"`
	ArrivalDate       *string `json:"arrival_date"`
	ReleaseDate       *string `json:"release_date"`
	HSCode            *string `json:"hs_code"`
	CustomsOffice     *string `json:"customs_office"`
	Port              *string `json:"port"`
	Memo              *string `json:"memo"`
}

// CreateDeclarationRequest — 면장 등록 시 클라이언트가 보내는 데이터
// 비유: "수입신고서 등록 신청서" — 면장번호, B/L, 법인, 신고일을 필수 기재
type CreateDeclarationRequest struct {
	DeclarationNumber string  `json:"declaration_number"`
	BLID              string  `json:"bl_id"`
	CompanyID         string  `json:"company_id"`
	DeclarationDate   string  `json:"declaration_date"`
	ArrivalDate       *string `json:"arrival_date"`
	ReleaseDate       *string `json:"release_date"`
	HSCode            *string `json:"hs_code"`
	CustomsOffice     *string `json:"customs_office"`
	Port              *string `json:"port"`
	Memo              *string `json:"memo"`
}

// Validate — 면장 등록 요청의 입력값을 검증
// 비유: 접수 창구에서 면장 신청서 필수 항목 확인
func (req *CreateDeclarationRequest) Validate() string {
	if req.DeclarationNumber == "" {
		return "declaration_number는 필수 항목입니다"
	}
	if utf8.RuneCountInString(req.DeclarationNumber) > 30 {
		return "declaration_number는 30자를 초과할 수 없습니다"
	}
	if req.BLID == "" {
		return "bl_id는 필수 항목입니다"
	}
	if req.CompanyID == "" {
		return "company_id는 필수 항목입니다"
	}
	if req.DeclarationDate == "" {
		return "declaration_date는 필수 항목입니다"
	}
	return ""
}

// UpdateDeclarationRequest — 면장 수정 시 클라이언트가 보내는 데이터
// 비유: "수입신고서 변경 신청서" — 바꾸고 싶은 항목만 적어서 제출
type UpdateDeclarationRequest struct {
	DeclarationNumber *string `json:"declaration_number,omitempty"`
	BLID              *string `json:"bl_id,omitempty"`
	CompanyID         *string `json:"company_id,omitempty"`
	DeclarationDate   *string `json:"declaration_date,omitempty"`
	ArrivalDate       *string `json:"arrival_date,omitempty"`
	ReleaseDate       *string `json:"release_date,omitempty"`
	HSCode            *string `json:"hs_code,omitempty"`
	CustomsOffice     *string `json:"customs_office,omitempty"`
	Port              *string `json:"port,omitempty"`
	Memo              *string `json:"memo,omitempty"`
}

// Validate — 면장 수정 요청의 입력값을 검증
func (req *UpdateDeclarationRequest) Validate() string {
	if req.DeclarationNumber != nil {
		if *req.DeclarationNumber == "" {
			return "declaration_number는 빈 값으로 변경할 수 없습니다"
		}
		if utf8.RuneCountInString(*req.DeclarationNumber) > 30 {
			return "declaration_number는 30자를 초과할 수 없습니다"
		}
	}
	if req.BLID != nil && *req.BLID == "" {
		return "bl_id는 빈 값으로 변경할 수 없습니다"
	}
	if req.CompanyID != nil && *req.CompanyID == "" {
		return "company_id는 빈 값으로 변경할 수 없습니다"
	}
	if req.DeclarationDate != nil && *req.DeclarationDate == "" {
		return "declaration_date는 빈 값으로 변경할 수 없습니다"
	}
	return ""
}
