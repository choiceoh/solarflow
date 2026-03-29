package engine

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestCalcLcFees_Success — mock 서버로 LC 수수료 응답 파싱 확인
func TestCalcLcFees_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := LcFeeCalcResponse{
			Items:   []LcFeeCalcItem{{LCID: "uuid1", BankName: "산업은행", AmountUSD: 629400.89, TotalFeeKRW: 4249191}},
			Summary: LcFeeCalcSummary{TotalFeeKRW: 4249191},
			FeeNote: "요율 기반", CalculatedAt: "2026-03-29T12:00:00Z",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Fatalf("인코딩 실패: %v", err)
		}
	}))
	defer server.Close()

	client := NewEngineClient(server.URL)
	compID := "test-company"
	result, err := client.CalcLcFees(nil, &compID, nil)
	if err != nil {
		t.Fatalf("CalcLcFees 실패: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("Items 예상: 1, 실제: %d", len(result.Items))
	}
	if result.Summary.TotalFeeKRW != 4249191 {
		t.Fatalf("TotalFeeKRW 예상: 4249191, 실제: %f", result.Summary.TotalFeeKRW)
	}
}

// TestGetLcLimitTimeline_Success — mock 서버로 한도 타임라인 응답 확인
func TestGetLcLimitTimeline_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := LcLimitTimelineCalcResponse{
			Banks:        []BankTimelineCalc{{BankID: "uuid1", BankName: "하나은행", LCLimitUSD: 10000000, CurrentAvailableUSD: 360343.69, UsageRate: 96.4}},
			CalculatedAt: "2026-03-29T12:00:00Z",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Fatalf("인코딩 실패: %v", err)
		}
	}))
	defer server.Close()

	client := NewEngineClient(server.URL)
	result, err := client.GetLcLimitTimeline(nil, 6)
	if err != nil {
		t.Fatalf("GetLcLimitTimeline 실패: %v", err)
	}
	if len(result.Banks) != 1 {
		t.Fatalf("Banks 예상: 1, 실제: %d", len(result.Banks))
	}
	if result.Banks[0].UsageRate != 96.4 {
		t.Fatalf("UsageRate 예상: 96.4, 실제: %f", result.Banks[0].UsageRate)
	}
}

// TestGetLcMaturityAlerts_Success — mock 서버로 만기 알림 응답 확인
func TestGetLcMaturityAlerts_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := LcMaturityAlertCalcResponse{
			Alerts: []MaturityAlertCalc{
				{LCID: "uuid1", BankName: "산업은행", AmountUSD: 629400.89, DaysRemaining: 3, Severity: "critical"},
				{LCID: "uuid2", BankName: "하나은행", AmountUSD: 1200000, DaysRemaining: 5, Severity: "warning"},
			},
			Count: 2, CalculatedAt: "2026-03-29T12:00:00Z",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Fatalf("인코딩 실패: %v", err)
		}
	}))
	defer server.Close()

	client := NewEngineClient(server.URL)
	result, err := client.GetLcMaturityAlerts(nil, 7)
	if err != nil {
		t.Fatalf("GetLcMaturityAlerts 실패: %v", err)
	}
	if result.Count != 2 {
		t.Fatalf("Count 예상: 2, 실제: %d", result.Count)
	}
	if result.Alerts[0].Severity != "critical" {
		t.Fatalf("Severity 예상: critical, 실제: %s", result.Alerts[0].Severity)
	}
}
