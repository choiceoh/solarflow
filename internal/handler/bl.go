package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	supa "github.com/supabase-community/supabase-go"
)

type BLHandler struct {
	DB *supa.Client
}

func NewBLHandler(db *supa.Client) *BLHandler {
	return &BLHandler{DB: db}
}

// List — GET /api/v1/bls
func (h *BLHandler) List(w http.ResponseWriter, r *http.Request) {
	var result []map[string]interface{}

	query := h.DB.From("bl_shipments").
		Select("*, companies(company_name, company_code), manufacturers(name_kr), warehouses(warehouse_name, location_name)", "exact", false)

	if compID := r.URL.Query().Get("company_id"); compID != "" {
		query = query.Eq("company_id", compID)
	}
	if mfgID := r.URL.Query().Get("manufacturer_id"); mfgID != "" {
		query = query.Eq("manufacturer_id", mfgID)
	}
	if status := r.URL.Query().Get("status"); status != "" {
		query = query.Eq("status", status)
	}
	if inType := r.URL.Query().Get("inbound_type"); inType != "" {
		query = query.Eq("inbound_type", inType)
	}

	data, _, err := query.Execute()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	json.Unmarshal(data, &result)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetByID — GET /api/v1/bls/{id} — 라인아이템 포함
func (h *BLHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var bl []map[string]interface{}
	data, _, err := h.DB.From("bl_shipments").
		Select("*, companies(company_name, company_code), manufacturers(name_kr, name_en), warehouses(warehouse_name, location_name, warehouse_code, location_code)", "exact", false).
		Eq("bl_id", id).
		Execute()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	json.Unmarshal(data, &bl)
	if len(bl) == 0 {
		http.Error(w, `{"error":"B/L을 찾을 수 없습니다"}`, http.StatusNotFound)
		return
	}

	// 라인아이템
	var lines []map[string]interface{}
	lineData, _, _ := h.DB.From("bl_line_items").
		Select("*, products(product_name, spec_wp, module_width_mm, module_height_mm)", "exact", false).
		Eq("bl_id", id).
		Execute()
	json.Unmarshal(lineData, &lines)

	result := bl[0]
	result["line_items"] = lines

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Create — POST /api/v1/bls
func (h *BLHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"잘못된 요청입니다"}`, http.StatusBadRequest)
		return
	}

	data, _, err := h.DB.From("bl_shipments").
		Insert(body, false, "", "", "").
		Execute()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	var result []map[string]interface{}
	json.Unmarshal(data, &result)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if len(result) > 0 {
		json.NewEncoder(w).Encode(result[0])
	}
}

// Update — PUT /api/v1/bls/{id}
func (h *BLHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"잘못된 요청입니다"}`, http.StatusBadRequest)
		return
	}

	data, _, err := h.DB.From("bl_shipments").
		Update(body, "", "").
		Eq("bl_id", id).
		Execute()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	var result []map[string]interface{}
	json.Unmarshal(data, &result)

	w.Header().Set("Content-Type", "application/json")
	if len(result) > 0 {
		json.NewEncoder(w).Encode(result[0])
	}
}
