package model

// AmaranthUploadJob — 아마란스 웹 엑셀 업로드 RPA 작업
// 비유: "업로드 접수증" — 어떤 엑셀 파일을 아마란스에 올릴 차례인지 추적
type AmaranthUploadJob struct {
	JobID          string  `json:"job_id"`
	JobType        string  `json:"job_type"`
	Status         string  `json:"status"`
	CompanyID      *string `json:"company_id"`
	DateFrom       *string `json:"date_from"`
	DateTo         *string `json:"date_to"`
	FileName       string  `json:"file_name"`
	StoredName     string  `json:"stored_name,omitempty"`
	StoredPath     string  `json:"stored_path,omitempty"`
	ContentType    string  `json:"content_type"`
	SizeBytes      int64   `json:"size_bytes"`
	FileSHA256     string  `json:"file_sha256"`
	RowCount       int     `json:"row_count"`
	CreatedBy      *string `json:"created_by"`
	CreatedByEmail *string `json:"created_by_email"`
	Attempts       int     `json:"attempts"`
	UploadMessage  *string `json:"upload_message"`
	LastError      *string `json:"last_error"`
	RPAStartedAt   *string `json:"rpa_started_at"`
	UploadedAt     *string `json:"uploaded_at"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

// CreateAmaranthUploadJobRequest — amaranth_upload_jobs INSERT payload
type CreateAmaranthUploadJobRequest struct {
	JobID          string  `json:"job_id"`
	JobType        string  `json:"job_type"`
	Status         string  `json:"status"`
	CompanyID      *string `json:"company_id,omitempty"`
	DateFrom       *string `json:"date_from,omitempty"`
	DateTo         *string `json:"date_to,omitempty"`
	FileName       string  `json:"file_name"`
	StoredName     string  `json:"stored_name"`
	StoredPath     string  `json:"stored_path"`
	ContentType    string  `json:"content_type"`
	SizeBytes      int64   `json:"size_bytes"`
	FileSHA256     string  `json:"file_sha256"`
	RowCount       int     `json:"row_count"`
	CreatedBy      *string `json:"created_by,omitempty"`
	CreatedByEmail *string `json:"created_by_email,omitempty"`
}

// UpdateAmaranthUploadJobStatusRequest — RPA 처리 상태 수정 요청
type UpdateAmaranthUploadJobStatusRequest struct {
	Status        string  `json:"status"`
	UploadMessage *string `json:"upload_message,omitempty"`
	LastError     *string `json:"last_error,omitempty"`
}

// Validate — 상태 수정 요청 검증
func (req *UpdateAmaranthUploadJobStatusRequest) Validate() string {
	if req.Status == "" {
		return "status는 필수 항목입니다"
	}
	if !validAmaranthUploadJobStatuses[req.Status] {
		return "status는 pending/running/uploaded/failed/manual_required/cancelled 중 하나여야 합니다"
	}
	return ""
}

var validAmaranthUploadJobStatuses = map[string]bool{
	"pending":         true,
	"running":         true,
	"uploaded":        true,
	"failed":          true,
	"manual_required": true,
	"cancelled":       true,
}

// AmaranthUploadJobCreateResponse — 업로드 작업 생성 응답
type AmaranthUploadJobCreateResponse struct {
	Job       AmaranthUploadJob `json:"job"`
	Duplicate bool              `json:"duplicate"`
}

// AmaranthUploadJobClaimResponse — RPA 워커가 작업을 선점한 결과
type AmaranthUploadJobClaimResponse struct {
	Job AmaranthUploadJob `json:"job"`
}
