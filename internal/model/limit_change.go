package model

// LimitChange — 은행 LC 한도 변경이력 구조체
// 비유: "한도 변경 대장" — 은행별 LC 한도가 언제, 얼마에서 얼마로 바뀌었는지 기록
// 이력은 수정/삭제하지 않음 — 잘못 입력 시 새 이력으로 정정
type LimitChange struct {
	LimitChangeID string  `json:"limit_change_id"`
	BankID        string  `json:"bank_id"`
	ChangeDate    string  `json:"change_date"`
	PreviousLimit float64 `json:"previous_limit"`
	NewLimit      float64 `json:"new_limit"`
	Reason        *string `json:"reason"`
}

// CreateLimitChangeRequest — 한도 변경이력 등록 시 클라이언트가 보내는 데이터
// 비유: "한도 변경 기록 신청서" — 은행, 변경일, 이전/변경 한도를 필수 기재
type CreateLimitChangeRequest struct {
	BankID        string  `json:"bank_id"`
	ChangeDate    string  `json:"change_date"`
	PreviousLimit float64 `json:"previous_limit"`
	NewLimit      float64 `json:"new_limit"`
	Reason        *string `json:"reason"`
}

// Validate — 한도 변경이력 등록 요청의 입력값을 검증
// 비유: 접수 창구에서 한도 변경 기록 필수 항목 확인
func (req *CreateLimitChangeRequest) Validate() string {
	if req.BankID == "" {
		return "bank_id는 필수 항목입니다"
	}
	if req.ChangeDate == "" {
		return "change_date는 필수 항목입니다"
	}
	if req.PreviousLimit < 0 {
		return "previous_limit은 0 이상이어야 합니다"
	}
	if req.NewLimit < 0 {
		return "new_limit은 0 이상이어야 합니다"
	}
	if req.PreviousLimit == req.NewLimit {
		return "이전 한도와 변경 한도가 같습니다"
	}
	return ""
}
