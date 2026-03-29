package engine

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestCalcLandedCost_Success — mock 서버로 Landed Cost 응답 파싱 확인
func TestCalcLandedCost_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := LandedCostCalcResponse{
			Items: []LandedCostCalcItem{
				{
					CostID:            "test-cost-uuid",
					DeclarationID:     "test-decl-uuid",
					DeclarationNumber: "12345-25-1234567",
					ProductCode:       "M-JK0635-01",
					AllocatedExpenses: map[string]float64{
						"dock_charge": 365000,
						"transport":   1465000,
					},
					TotalExpenseKRW: 1830000,
					LandedTotalKRW:  795432000,
					LandedWpKRW:     132.13,
				},
			},
			Saved:        false,
			CalculatedAt: "2026-03-29T12:00:00Z",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Fatalf("응답 인코딩 실패: %v", err)
		}
	}))
	defer server.Close()

	client := NewEngineClient(server.URL)
	compID := "test-company-uuid"
	result, err := client.CalcLandedCost(nil, &compID, nil, false)
	if err != nil {
		t.Fatalf("CalcLandedCost 실패: %v", err)
	}

	if len(result.Items) != 1 {
		t.Fatalf("Items 개수 예상: 1, 실제: %d", len(result.Items))
	}
	if result.Items[0].AllocatedExpenses["dock_charge"] != 365000 {
		t.Fatalf("dock_charge 예상: 365000, 실제: %f", result.Items[0].AllocatedExpenses["dock_charge"])
	}
	if result.Saved {
		t.Fatal("saved 예상: false")
	}
}

// TestCalcLandedCost_AllocatedExpensesMap — map[string]float64 파싱 확인
func TestCalcLandedCost_AllocatedExpensesMap(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// 동적 맵 테스트 — 다양한 expense_type
		w.Write([]byte(`{
			"items": [{
				"cost_id": "uuid1",
				"declaration_id": "uuid2",
				"declaration_number": "12345",
				"product_id": "uuid3",
				"product_code": "M-01",
				"product_name": "Test",
				"manufacturer_name": "Test Mfg",
				"quantity": 100,
				"capacity_kw": 63.5,
				"exchange_rate": 1468.3,
				"allocated_expenses": {
					"dock_charge": 100000,
					"shuttle": 50000,
					"lc_fee": 200000,
					"custom_new_type": 75000
				},
				"total_expense_krw": 425000,
				"landed_total_krw": 500000,
				"landed_wp_krw": 132.0
			}],
			"saved": false,
			"calculated_at": "2026-03-29T12:00:00Z"
		}`))
	}))
	defer server.Close()

	client := NewEngineClient(server.URL)
	compID := "test-company-uuid"
	result, err := client.CalcLandedCost(nil, &compID, nil, false)
	if err != nil {
		t.Fatalf("CalcLandedCost 실패: %v", err)
	}

	expenses := result.Items[0].AllocatedExpenses
	if len(expenses) != 4 {
		t.Fatalf("allocated_expenses 개수 예상: 4, 실제: %d", len(expenses))
	}
	if expenses["custom_new_type"] != 75000 {
		t.Fatalf("custom_new_type 예상: 75000, 실제: %f", expenses["custom_new_type"])
	}
}

// TestCompareExchangeRates_Success — mock 서버로 환율 비교 응답 파싱 확인
func TestCompareExchangeRates_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := ExchangeCompareCalcResponse{
			Items: []ExchangeCompareCalcItem{
				{
					DeclarationNumber: "12345-25-1234567",
					DeclarationDate:   "2026-01-30",
					ProductName:       "JKM635N",
					ContractRate:      1468.30,
					CifWpAtContract:   131.50,
					CifWpAtLatest:     135.08,
					RateImpactKRW:     3.58,
				},
			},
			LatestRate:       1508.00,
			LatestRateSource: "가장 최근 면장 환율",
			CalculatedAt:     "2026-03-29T12:00:00Z",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Fatalf("응답 인코딩 실패: %v", err)
		}
	}))
	defer server.Close()

	client := NewEngineClient(server.URL)
	result, err := client.CompareExchangeRates("test-company-uuid", nil, nil)
	if err != nil {
		t.Fatalf("CompareExchangeRates 실패: %v", err)
	}

	if result.LatestRate != 1508.00 {
		t.Fatalf("LatestRate 예상: 1508.00, 실제: %f", result.LatestRate)
	}
	if len(result.Items) != 1 {
		t.Fatalf("Items 개수 예상: 1, 실제: %d", len(result.Items))
	}
}
