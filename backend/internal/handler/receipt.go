package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	supa "github.com/supabase-community/supabase-go"

	"solarflow-backend/internal/model"
	"solarflow-backend/internal/response"
)

// ReceiptHandler — 수금(receipts) 관련 API를 처리하는 핸들러
// 비유: "수금 전표함" — 고객 입금 내역을 관리
type ReceiptHandler struct {
	DB *supa.Client
}

// NewReceiptHandler — ReceiptHandler 생성자
func NewReceiptHandler(db *supa.Client) *ReceiptHandler {
	return &ReceiptHandler{DB: db}
}

// List — GET /api/v1/receipts — 수금 목록 조회
// 비유: 수금 전표함에서 전체 입금 내역을 꺼내 보여주는 것
func (h *ReceiptHandler) List(w http.ResponseWriter, r *http.Request) {
	query := h.DB.From("receipts").
		Select("*", "exact", false)

	// 비유: ?customer_id=xxx — 특정 고객의 수금만 필터
	if custID := r.URL.Query().Get("customer_id"); custID != "" {
		query = query.Eq("customer_id", custID)
	}

	data, _, err := query.Execute()
	if err != nil {
		log.Printf("[수금 목록 조회 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "수금 목록 조회에 실패했습니다")
		return
	}

	var receipts []model.Receipt
	if err := json.Unmarshal(data, &receipts); err != nil {
		log.Printf("[수금 목록 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, receipts)
}

// GetByID — GET /api/v1/receipts/{id} — 수금 상세 조회
// 비유: 특정 수금 전표를 꺼내 자세히 보는 것
func (h *ReceiptHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	data, _, err := h.DB.From("receipts").
		Select("*", "exact", false).
		Eq("receipt_id", id).
		Execute()
	if err != nil {
		log.Printf("[수금 상세 조회 실패] id=%s, err=%v", id, err)
		response.RespondError(w, http.StatusInternalServerError, "수금 조회에 실패했습니다")
		return
	}

	var receipts []model.Receipt
	if err := json.Unmarshal(data, &receipts); err != nil {
		log.Printf("[수금 상세 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(receipts) == 0 {
		response.RespondError(w, http.StatusNotFound, "수금을 찾을 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, receipts[0])
}

// Create — POST /api/v1/receipts — 수금 등록
// 비유: 새 수금 전표를 작성하여 전표함에 보관하는 것
func (h *ReceiptHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateReceiptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[수금 등록 요청 파싱 실패] %v", err)
		response.RespondError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	if msg := req.Validate(); msg != "" {
		response.RespondError(w, http.StatusBadRequest, msg)
		return
	}

	data, _, err := h.DB.From("receipts").
		Insert(req, false, "", "", "").
		Execute()
	if err != nil {
		log.Printf("[수금 등록 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "수금 등록에 실패했습니다")
		return
	}

	var created []model.Receipt
	if err := json.Unmarshal(data, &created); err != nil {
		log.Printf("[수금 등록 결과 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(created) == 0 {
		response.RespondError(w, http.StatusInternalServerError, "수금 등록 결과를 확인할 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusCreated, created[0])
}

// Update — PUT /api/v1/receipts/{id} — 수금 수정
// 비유: 기존 수금 전표의 내용을 수정하는 것
func (h *ReceiptHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req model.UpdateReceiptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[수금 수정 요청 파싱 실패] %v", err)
		response.RespondError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	if msg := req.Validate(); msg != "" {
		response.RespondError(w, http.StatusBadRequest, msg)
		return
	}

	data, _, err := h.DB.From("receipts").
		Update(req, "", "").
		Eq("receipt_id", id).
		Execute()
	if err != nil {
		log.Printf("[수금 수정 실패] id=%s, err=%v", id, err)
		response.RespondError(w, http.StatusInternalServerError, "수금 수정에 실패했습니다")
		return
	}

	var updated []model.Receipt
	if err := json.Unmarshal(data, &updated); err != nil {
		log.Printf("[수금 수정 결과 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(updated) == 0 {
		response.RespondError(w, http.StatusNotFound, "수정할 수금을 찾을 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, updated[0])
}

// Delete — DELETE /api/v1/receipts/{id} — 수금 삭제
// 비유: 수금 전표를 파기하는 것 — 연결된 매칭(receipt_matches)을 먼저 정리
func (h *ReceiptHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// 매칭 먼저 삭제 (FK 제약)
	_, _, _ = h.DB.From("receipt_matches").
		Delete("", "").
		Eq("receipt_id", id).
		Execute()

	_, _, err := h.DB.From("receipts").
		Delete("", "").
		Eq("receipt_id", id).
		Execute()
	if err != nil {
		log.Printf("[수금 삭제 실패] id=%s, err=%v", id, err)
		response.RespondError(w, http.StatusInternalServerError, "수금 삭제에 실패했습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, struct {
		Status string `json:"status"`
	}{Status: "deleted"})
}
