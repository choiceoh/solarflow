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

// SaleHandler — 판매(sales) 관련 API를 처리하는 핸들러
// 비유: "판매 전표함" — 출고에 연결된 판매 금액, 세금계산서 정보를 관리
// TODO: Rust 계산엔진 연동 — 마진/이익률 분석 (원가 vs 판매가)
// TODO: Go 자동 계산 — unit_price_ea = unit_price_wp x spec_wp, supply = ea x qty, vat = supply x 0.1, total = supply + vat
// (product 테이블에서 spec_wp 조회 필요, Phase 4 프론트엔드 연동 시 구현)
type SaleHandler struct {
	DB *supa.Client
}

// NewSaleHandler — SaleHandler 생성자
func NewSaleHandler(db *supa.Client) *SaleHandler {
	return &SaleHandler{DB: db}
}

// List — GET /api/v1/sales — 판매 목록 조회
// 비유: 판매 전표함에서 전체 판매 내역을 꺼내 보여주는 것
// TODO: 세금계산서 미발행 목록 필터 (tax_invoice_date IS NULL + outbound completed)
func (h *SaleHandler) List(w http.ResponseWriter, r *http.Request) {
	query := h.DB.From("sales").
		Select("*", "exact", false)

	// 비유: ?outbound_id=xxx — 특정 출고의 판매만 필터
	if outID := r.URL.Query().Get("outbound_id"); outID != "" {
		query = query.Eq("outbound_id", outID)
	}

	// 비유: ?customer_id=xxx — 특정 고객의 판매만 필터
	if custID := r.URL.Query().Get("customer_id"); custID != "" {
		query = query.Eq("customer_id", custID)
	}

	// 비유: ?erp_closed=true — ERP 마감 여부 필터
	if erpClosed := r.URL.Query().Get("erp_closed"); erpClosed != "" {
		query = query.Eq("erp_closed", erpClosed)
	}

	data, _, err := query.Execute()
	if err != nil {
		log.Printf("[판매 목록 조회 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "판매 목록 조회에 실패했습니다")
		return
	}

	var sales []model.Sale
	if err := json.Unmarshal(data, &sales); err != nil {
		log.Printf("[판매 목록 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, sales)
}

// GetByID — GET /api/v1/sales/{id} — 판매 상세 조회
// 비유: 특정 판매 전표를 꺼내 자세히 보는 것
func (h *SaleHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	data, _, err := h.DB.From("sales").
		Select("*", "exact", false).
		Eq("sale_id", id).
		Execute()
	if err != nil {
		log.Printf("[판매 상세 조회 실패] id=%s, err=%v", id, err)
		response.RespondError(w, http.StatusInternalServerError, "판매 조회에 실패했습니다")
		return
	}

	var sales []model.Sale
	if err := json.Unmarshal(data, &sales); err != nil {
		log.Printf("[판매 상세 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(sales) == 0 {
		response.RespondError(w, http.StatusNotFound, "판매를 찾을 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, sales[0])
}

// Create — POST /api/v1/sales — 판매 등록
// 비유: 새 판매 전표를 작성하여 전표함에 보관하는 것
func (h *SaleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateSaleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[판매 등록 요청 파싱 실패] %v", err)
		response.RespondError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	if msg := req.Validate(); msg != "" {
		response.RespondError(w, http.StatusBadRequest, msg)
		return
	}

	data, _, err := h.DB.From("sales").
		Insert(req, false, "", "", "").
		Execute()
	if err != nil {
		log.Printf("[판매 등록 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "판매 등록에 실패했습니다")
		return
	}

	var created []model.Sale
	if err := json.Unmarshal(data, &created); err != nil {
		log.Printf("[판매 등록 결과 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(created) == 0 {
		response.RespondError(w, http.StatusInternalServerError, "판매 등록 결과를 확인할 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusCreated, created[0])
}

// Update — PUT /api/v1/sales/{id} — 판매 수정
// 비유: 기존 판매 전표의 내용을 수정하는 것
func (h *SaleHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req model.UpdateSaleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[판매 수정 요청 파싱 실패] %v", err)
		response.RespondError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	if msg := req.Validate(); msg != "" {
		response.RespondError(w, http.StatusBadRequest, msg)
		return
	}

	data, _, err := h.DB.From("sales").
		Update(req, "", "").
		Eq("sale_id", id).
		Execute()
	if err != nil {
		log.Printf("[판매 수정 실패] id=%s, err=%v", id, err)
		response.RespondError(w, http.StatusInternalServerError, "판매 수정에 실패했습니다")
		return
	}

	var updated []model.Sale
	if err := json.Unmarshal(data, &updated); err != nil {
		log.Printf("[판매 수정 결과 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(updated) == 0 {
		response.RespondError(w, http.StatusNotFound, "수정할 판매를 찾을 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, updated[0])
}
