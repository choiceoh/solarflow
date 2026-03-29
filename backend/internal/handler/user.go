package handler

import (
	"encoding/json"
	"log"
	"net/http"

	supa "github.com/supabase-community/supabase-go"

	"solarflow-backend/internal/middleware"
	"solarflow-backend/internal/response"
)

// UserProfileResponse — /api/v1/users/me 응답 구조체
// 비유: "내 인사카드" — 로그인한 사용자의 프로필 정보
// 컬럼명은 실제 DB 기준 (D-055 참조)
type UserProfileResponse struct {
	ID         string  `json:"id"`
	Email      string  `json:"email"`
	FullName   string  `json:"full_name"`
	Role       string  `json:"role"`
	Department *string `json:"department"`
	Phone      *string `json:"phone"`
	AvatarURL  *string `json:"avatar_url"`
	IsActive   bool    `json:"is_active"`
}

// UserHandler — 사용자 관련 핸들러
type UserHandler struct {
	DB *supa.Client
}

// NewUserHandler — UserHandler 생성자
func NewUserHandler(db *supa.Client) *UserHandler {
	return &UserHandler{DB: db}
}

// GetMe — 현재 로그인한 사용자의 프로필 조회
// 비유: "사원증 스캔 후 내 인사카드 보기"
func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	// 비유: AuthMiddleware가 context에 넣어둔 사번(user_id)을 꺼냄
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.RespondError(w, http.StatusUnauthorized, "인증이 필요합니다")
		return
	}

	data, _, err := h.DB.From("user_profiles").
		Select("id, email, full_name, role, department, phone, avatar_url, is_active", "exact", false).
		Eq("id", userID).
		Execute()
	if err != nil {
		log.Printf("[users/me] user_profiles 조회 실패: id=%s, err=%v", userID, err)
		response.RespondError(w, http.StatusInternalServerError, "사용자 정보 조회에 실패했습니다")
		return
	}

	var profiles []UserProfileResponse
	if err := json.Unmarshal(data, &profiles); err != nil {
		log.Printf("[users/me] user_profiles 디코딩 실패: %v", err)
		response.RespondError(w, http.StatusInternalServerError, "사용자 정보 처리에 실패했습니다")
		return
	}

	if len(profiles) == 0 {
		response.RespondError(w, http.StatusNotFound, "사용자 프로필을 찾을 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, profiles[0])
}
