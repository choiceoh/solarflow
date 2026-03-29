package engine

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetOutstandingList_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := OutstandingListCalcResponse{
			CustomerName: "바로(주)", TotalOutstanding: 64562400, OutstandingCount: 3,
			CalculatedAt: "2026-03-29T12:00:00Z",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil { t.Fatalf("인코딩 실패: %v", err) }
	}))
	defer server.Close()

	client := NewEngineClient(server.URL)
	result, err := client.GetOutstandingList("company-uuid", "customer-uuid")
	if err != nil { t.Fatalf("GetOutstandingList 실패: %v", err) }
	if result.OutstandingCount != 3 { t.Fatalf("OutstandingCount 예상: 3, 실제: %d", result.OutstandingCount) }
	if result.TotalOutstanding != 64562400 { t.Fatalf("TotalOutstanding 예상: 64562400, 실제: %f", result.TotalOutstanding) }
}

func TestSuggestReceiptMatch_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := ReceiptMatchSuggestCalcResponse{
			ReceiptAmount: 38976300,
			Suggestions: []SuggestionCalcItem{
				{MatchType: "exact", TotalMatched: 38976300, Remainder: 0, MatchRate: 100.0},
			},
			UnmatchedAmount: 0, CalculatedAt: "2026-03-29T12:00:00Z",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil { t.Fatalf("인코딩 실패: %v", err) }
	}))
	defer server.Close()

	client := NewEngineClient(server.URL)
	result, err := client.SuggestReceiptMatch("company-uuid", "customer-uuid", 38976300)
	if err != nil { t.Fatalf("SuggestReceiptMatch 실패: %v", err) }
	if len(result.Suggestions) != 1 { t.Fatalf("Suggestions 예상: 1, 실제: %d", len(result.Suggestions)) }
	if result.Suggestions[0].MatchRate != 100.0 { t.Fatalf("MatchRate 예상: 100.0, 실제: %f", result.Suggestions[0].MatchRate) }
}
