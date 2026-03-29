package middleware

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	supa "github.com/supabase-community/supabase-go"

	"solarflow-backend/internal/response"
)

// UserProfile — user_profiles 테이블에서 조회한 사용자 프로필
// 비유: 사원 인사카드 — 역할, 활성 여부가 적혀 있음
// 컬럼명은 실제 DB 기준 (D-055 참조)
type UserProfile struct {
	ID       string `json:"id"`
	Role     string `json:"role"`
	Email    string `json:"email"`
	IsActive bool   `json:"is_active"`
}

// AuthMiddleware — JWT 토큰을 검증하고 사용자 정보를 context에 저장하는 미들웨어
// 비유: 건물 출입 게이트 — 사원증(JWT)을 스캔하고, 인사카드를 확인한 뒤 통과시킴
func AuthMiddleware(db *supa.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 비유: 사원증(Authorization 헤더)을 꺼내 달라고 요청
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.RespondError(w, http.StatusUnauthorized, "인증이 필요합니다")
				return
			}

			// 비유: "Bearer {토큰}" 형식에서 토큰 부분만 분리
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				response.RespondError(w, http.StatusUnauthorized, "인증이 필요합니다")
				return
			}
			tokenString := parts[1]

			// 비유: JWT Secret으로 사원증 위조 여부 확인
			jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
			if jwtSecret == "" {
				log.Printf("[인증 미들웨어] SUPABASE_JWT_SECRET 환경변수가 설정되지 않았습니다")
				response.RespondError(w, http.StatusInternalServerError, "서버 인증 설정 오류입니다")
				return
			}

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				// 비유: 서명 알고리즘이 HMAC 계열인지 확인 — 위조 방지
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				response.RespondError(w, http.StatusUnauthorized, "유효하지 않은 토큰입니다")
				return
			}

			// 비유: 사원증에서 사번(sub 클레임)을 읽음
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				response.RespondError(w, http.StatusUnauthorized, "유효하지 않은 토큰입니다")
				return
			}

			userID, ok := claims["sub"].(string)
			if !ok || userID == "" {
				response.RespondError(w, http.StatusUnauthorized, "유효하지 않은 토큰입니다")
				return
			}

			// 비유: 이메일도 토큰에서 꺼냄 (Supabase JWT에 email 클레임 포함)
			email, _ := claims["email"].(string)

			// 비유: 인사카드(user_profiles)에서 해당 사번의 역할, 활성 여부 조회
			data, _, err := db.From("user_profiles").
				Select("id, role, email, is_active", "exact", false).
				Eq("id", userID).
				Execute()
			if err != nil {
				log.Printf("[인증 미들웨어] user_profiles 조회 실패: %v", err)
				response.RespondError(w, http.StatusInternalServerError, "사용자 정보 조회에 실패했습니다")
				return
			}

			var profiles []UserProfile
			if err := json.Unmarshal(data, &profiles); err != nil {
				log.Printf("[인증 미들웨어] user_profiles 디코딩 실패: %v", err)
				response.RespondError(w, http.StatusInternalServerError, "사용자 정보 처리에 실패했습니다")
				return
			}

			if len(profiles) == 0 {
				response.RespondError(w, http.StatusUnauthorized, "등록되지 않은 사용자입니다")
				return
			}

			profile := profiles[0]

			// 비유: 인사카드에 "퇴사" 도장이 찍혀 있으면 출입 거부
			if !profile.IsActive {
				response.RespondError(w, http.StatusForbidden, "비활성화된 계정입니다")
				return
			}

			// 비유: 프로필에 이메일이 있으면 프로필 것을 우선 사용
			if profile.Email != "" {
				email = profile.Email
			}

			// 비유: 사원증에 역할, 이메일, 허용 구역을 기록하고 통과시킴
			// allowed_modules는 Phase 확장 시 추가 (D-055)
			ctx := SetUserContext(r.Context(), userID, profile.Role, email, nil)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RoleMiddleware — 특정 역할만 접근을 허용하는 미들웨어
// 비유: 특정 층의 출입문 — "임원 전용", "관리자 전용" 같은 제한
func RoleMiddleware(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := GetUserRole(r.Context())

			for _, allowed := range allowedRoles {
				if role == allowed {
					next.ServeHTTP(w, r)
					return
				}
			}

			response.RespondError(w, http.StatusForbidden, "접근 권한이 없습니다")
		})
	}
}
