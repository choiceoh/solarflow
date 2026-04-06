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

// OrderHandler — 수주(orders) 관련 API를 처리하는 핸들러
// 비유: "수주 관리실" — 고객별 판매 주문서를 관리
type OrderHandler struct {
	DB *supa.Client
}

// NewOrderHandler — OrderHandler 생성자
func NewOrderHandler(db *supa.Client) *OrderHandler {
	return &OrderHandler{DB: db}
}

// List — GET /api/v1/orders — 수주 목록 조회
// 비유: 수주 관리실에서 전체 주문서를 꺼내 보여주는 것
// TODO: delivery_due 범위 필터 추가 (대시보드 출고 예정 알림용)
func (h *OrderHandler) List(w http.ResponseWriter, r *http.Request) {
	query := h.DB.From("orders").
		Select("*", "exact", false)

	// 비유: ?company_id=xxx — 특정 법인의 수주만 필터
	if compID := r.URL.Query().Get("company_id"); compID != "" && compID != "all" {
		query = query.Eq("company_id", compID)
	}

	// 비유: ?customer_id=xxx — 특정 고객의 수주만 필터
	if custID := r.URL.Query().Get("customer_id"); custID != "" {
		query = query.Eq("customer_id", custID)
	}

	// 비유: ?status=received — 특정 상태의 수주만 필터
	if status := r.URL.Query().Get("status"); status != "" {
		query = query.Eq("status", status)
	}

	// 비유: ?product_id=xxx — 특정 품번의 수주만 필터
	if prodID := r.URL.Query().Get("product_id"); prodID != "" {
		query = query.Eq("product_id", prodID)
	}

	// 비유: ?management_category=sale — 관리구분 필터
	if mgmtCat := r.URL.Query().Get("management_category"); mgmtCat != "" {
		query = query.Eq("management_category", mgmtCat)
	}

	// 비유: ?fulfillment_source=stock — 충당 소스 필터
	if source := r.URL.Query().Get("fulfillment_source"); source != "" {
		query = query.Eq("fulfillment_source", source)
	}

	data, _, err := query.Execute()
	if err != nil {
		log.Printf("[수주 목록 조회 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "수주 목록 조회에 실패했습니다")
		return
	}

	var orders []model.Order
	if err := json.Unmarshal(data, &orders); err != nil {
		log.Printf("[수주 목록 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, orders)
}

// GetByID — GET /api/v1/orders/{id} — 수주 상세 조회
// 비유: 특정 주문서를 꺼내 자세히 보는 것
func (h *OrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	data, _, err := h.DB.From("orders").
		Select("*", "exact", false).
		Eq("order_id", id).
		Execute()
	if err != nil {
		log.Printf("[수주 상세 조회 실패] id=%s, err=%v", id, err)
		response.RespondError(w, http.StatusInternalServerError, "수주 조회에 실패했습니다")
		return
	}

	var orders []model.Order
	if err := json.Unmarshal(data, &orders); err != nil {
		log.Printf("[수주 상세 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(orders) == 0 {
		response.RespondError(w, http.StatusNotFound, "수주를 찾을 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, orders[0])
}

// Create — POST /api/v1/orders — 수주 등록
// 비유: 새 주문서를 작성하여 관리실에 보관하는 것
func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[수주 등록 요청 파싱 실패] %v", err)
		response.RespondError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	// 비유: management_category 미입력이면 기본값 "sale" 설정
	if req.ManagementCategory == "" {
		req.ManagementCategory = "sale"
	}
	// 비유: fulfillment_source 미입력이면 기본값 "stock" 설정
	if req.FulfillmentSource == "" {
		req.FulfillmentSource = "stock"
	}

	if msg := req.Validate(); msg != "" {
		response.RespondError(w, http.StatusBadRequest, msg)
		return
	}

	data, _, err := h.DB.From("orders").
		Insert(req, false, "", "", "").
		Execute()
	if err != nil {
		log.Printf("[수주 등록 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "수주 등록에 실패했습니다")
		return
	}

	var created []model.Order
	if err := json.Unmarshal(data, &created); err != nil {
		log.Printf("[수주 등록 결과 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(created) == 0 {
		response.RespondError(w, http.StatusInternalServerError, "수주 등록 결과를 확인할 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusCreated, created[0])
}

// Update — PUT /api/v1/orders/{id} — 수주 수정
// 비유: 기존 주문서의 내용을 수정하는 것
func (h *OrderHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req model.UpdateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[수주 수정 요청 파싱 실패] %v", err)
		response.RespondError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	if msg := req.Validate(); msg != "" {
		response.RespondError(w, http.StatusBadRequest, msg)
		return
	}

	data, _, err := h.DB.From("orders").
		Update(req, "", "").
		Eq("order_id", id).
		Execute()
	if err != nil {
		log.Printf("[수주 수정 실패] id=%s, err=%v", id, err)
		response.RespondError(w, http.StatusInternalServerError, "수주 수정에 실패했습니다")
		return
	}

	var updated []model.Order
	if err := json.Unmarshal(data, &updated); err != nil {
		log.Printf("[수주 수정 결과 디코딩 실패] %v", err)
		response.RespondError(w, http.StatusInternalServerError, "응답 데이터 처리에 실패했습니다")
		return
	}

	if len(updated) == 0 {
		response.RespondError(w, http.StatusNotFound, "수정할 수주를 찾을 수 없습니다")
		return
	}

	response.RespondJSON(w, http.StatusOK, updated[0])
}

// Delete — DELETE /api/v1/orders/{id} — 수주 삭제
// 비유: 수주 주문서를 파기하는 것 — 연결된 출고가 있으면 DB FK 제약으로 막힘
func (h *OrderHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	_, _, err := h.DB.From("orders").
		Delete("", "").
		Eq("order_id", id).
		Execute()
	if err != nil {
		log.Printf("[수주 삭제 실패] id=%s, err=%v", id, err)
		response.RespondError(w, http.StatusInternalServerError, "수주 삭제에 실패했습니다 (연결된 출고가 있으면 먼저 삭제해야 합니다)")
		return
	}

	response.RespondJSON(w, http.StatusOK, struct {
		Status string `json:"status"`
	}{Status: "deleted"})
}
