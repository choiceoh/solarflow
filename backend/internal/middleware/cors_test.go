package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

// dummyHandler — 테스트용 더미 핸들러 (200 OK 반환)
func dummyHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
}

// TestCORS_AllowedOrigin — 허용된 Origin이면 CORS 헤더가 포함되는지 확인
func TestCORS_AllowedOrigin(t *testing.T) {
	os.Setenv("CORS_ORIGINS", "http://localhost:5173,https://solarflow.pages.dev")
	defer os.Unsetenv("CORS_ORIGINS")

	handler := CORSMiddleware(dummyHandler())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/companies", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("기대: 200, 실제: %d", rec.Code)
	}

	origin := rec.Header().Get("Access-Control-Allow-Origin")
	if origin != "http://localhost:5173" {
		t.Errorf("Access-Control-Allow-Origin 기대: http://localhost:5173, 실제: %s", origin)
	}

	creds := rec.Header().Get("Access-Control-Allow-Credentials")
	if creds != "true" {
		t.Errorf("Access-Control-Allow-Credentials 기대: true, 실제: %s", creds)
	}
}

// TestCORS_DisallowedOrigin — 허용되지 않은 Origin이면 CORS 헤더가 없는지 확인
func TestCORS_DisallowedOrigin(t *testing.T) {
	os.Setenv("CORS_ORIGINS", "http://localhost:5173")
	defer os.Unsetenv("CORS_ORIGINS")

	handler := CORSMiddleware(dummyHandler())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/companies", nil)
	req.Header.Set("Origin", "https://evil.com")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("기대: 200, 실제: %d", rec.Code)
	}

	origin := rec.Header().Get("Access-Control-Allow-Origin")
	if origin != "" {
		t.Errorf("미허용 Origin인데 Access-Control-Allow-Origin이 설정됨: %s", origin)
	}
}

// TestCORS_Preflight — OPTIONS 프리플라이트 요청에 200 + CORS 헤더 반환
func TestCORS_Preflight(t *testing.T) {
	os.Setenv("CORS_ORIGINS", "http://localhost:5173")
	defer os.Unsetenv("CORS_ORIGINS")

	handler := CORSMiddleware(dummyHandler())
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/companies", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("기대: 200, 실제: %d", rec.Code)
	}

	methods := rec.Header().Get("Access-Control-Allow-Methods")
	if methods == "" {
		t.Error("Access-Control-Allow-Methods 헤더가 비어있음")
	}

	maxAge := rec.Header().Get("Access-Control-Max-Age")
	if maxAge != "3600" {
		t.Errorf("Access-Control-Max-Age 기대: 3600, 실제: %s", maxAge)
	}
}
