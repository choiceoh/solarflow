package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestAuthMiddleware_AmaranthRPAToken — 아마란스 업로드 RPA 전용 토큰은 해당 경로에서만 operator로 통과
func TestAuthMiddleware_AmaranthRPAToken(t *testing.T) {
	t.Setenv("SOLARFLOW_AMARANTH_RPA_TOKEN", "secret-rpa-token")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/export/amaranth/jobs/job-id/claim", nil)
	req.Header.Set("X-SolarFlow-RPA-Token", "secret-rpa-token")
	rec := httptest.NewRecorder()

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := GetUserID(r.Context()); got != "amaranth-rpa" {
			t.Fatalf("기대 user_id=amaranth-rpa, 실제=%s", got)
		}
		if got := GetUserRole(r.Context()); got != "operator" {
			t.Fatalf("기대 role=operator, 실제=%s", got)
		}
		w.WriteHeader(http.StatusNoContent)
	})

	AuthMiddleware(nil)(next).ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("기대 상태코드 204, 실제=%d body=%s", rec.Code, rec.Body.String())
	}
}

// TestAuthMiddleware_AmaranthRPATokenWrongPath — 전용 토큰은 다른 API 경로를 통과하지 못함
func TestAuthMiddleware_AmaranthRPATokenWrongPath(t *testing.T) {
	t.Setenv("SOLARFLOW_AMARANTH_RPA_TOKEN", "secret-rpa-token")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
	req.Header.Set("X-SolarFlow-RPA-Token", "secret-rpa-token")
	rec := httptest.NewRecorder()

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatalf("다른 API 경로는 RPA 토큰으로 통과하면 안 됩니다")
	})

	AuthMiddleware(nil)(next).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("기대 상태코드 401, 실제=%d", rec.Code)
	}
}

// TestAuthMiddleware_AmaranthRPATokenMismatch — 토큰 값이 다르면 아마란스 경로에서도 통과하지 못함
func TestAuthMiddleware_AmaranthRPATokenMismatch(t *testing.T) {
	t.Setenv("SOLARFLOW_AMARANTH_RPA_TOKEN", "secret-rpa-token")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/export/amaranth/jobs/job-id/claim", nil)
	req.Header.Set("X-SolarFlow-RPA-Token", "wrong-token")
	rec := httptest.NewRecorder()

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatalf("잘못된 RPA 토큰은 통과하면 안 됩니다")
	})

	AuthMiddleware(nil)(next).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("기대 상태코드 401, 실제=%d", rec.Code)
	}
}
