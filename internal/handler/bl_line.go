package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	supa "github.com/supabase-community/supabase-go"
)

type BLLineHandler struct {
	DB *supa.Client
}

func NewBLLineHandler(db *supa.Client) *BLLineHandler {
	return &BLLineHandler{DB: db}
}

// ListByBL — GET /api/v1/bls/{blId}/lines
func (h *BLLineHandler) ListByBL(w http.ResponseWriter, r *http.Request) {
	blID := chi.URLParam(r, "blId")

	var result []map[string]interface{}
	data, _, err := h.DB.From("bl_line_items").
		Select("*, products(product_name, spec_wp, module_width_mm, module_height_mm)", "exact", false).
		Eq("bl_id", blID).
		Execute()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	json.Unmarshal(data, &result)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Create — POST /api/v1/bls/{blId}/lines
func (h *BLLineHandler) Create(w http.ResponseWriter, r *http.Request) {
	blID := chi.URLParam(r, "blId")

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"잘못된 요청입니다"}`, http.StatusBadRequest)
		return
	}
	body["bl_id"] = blID

	data, _, err := h.DB.From("bl_line_items").
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

// Update — PUT /api/v1/bls/{blId}/lines/{id}
func (h *BLLineHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"잘못된 요청입니다"}`, http.StatusBadRequest)
		return
	}

	data, _, err := h.DB.From("bl_line_items").
		Update(body, "", "").
		Eq("bl_line_id", id).
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

// Delete — DELETE /api/v1/bls/{blId}/lines/{id}
func (h *BLLineHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	_, _, err := h.DB.From("bl_line_items").
		Delete("", "").
		Eq("bl_line_id", id).
		Execute()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}
