package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

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
	if orderID := r.URL.Query().Get("order_id"); orderID != "" {
		query = query.Eq("order_id", orderID)
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

	items := h.enrichSales(sales)
	companyID := r.URL.Query().Get("company_id")
	month := r.URL.Query().Get("month")
	invoiceStatus := r.URL.Query().Get("invoice_status")
	filtered := make([]model.SaleListItem, 0, len(items))
	for _, item := range items {
		if companyID != "" && companyID != "all" && (item.CompanyID == nil || *item.CompanyID != companyID) {
			continue
		}
		if month != "" && (item.Sale.TaxInvoiceDate == nil || !strings.HasPrefix(*item.Sale.TaxInvoiceDate, month)) {
			continue
		}
		if invoiceStatus == "issued" && item.Sale.TaxInvoiceDate == nil {
			continue
		}
		if invoiceStatus == "pending" && item.Sale.TaxInvoiceDate != nil {
			continue
		}
		filtered = append(filtered, item)
	}

	response.RespondJSON(w, http.StatusOK, filtered)
}

type saleOrderRow struct {
	OrderID     string   `json:"order_id"`
	OrderNumber *string  `json:"order_number"`
	OrderDate   string   `json:"order_date"`
	CompanyID   string   `json:"company_id"`
	CustomerID  string   `json:"customer_id"`
	ProductID   string   `json:"product_id"`
	Quantity    int      `json:"quantity"`
	CapacityKw  *float64 `json:"capacity_kw"`
	SiteName    *string  `json:"site_name"`
}

type saleOutboundRow struct {
	OutboundID   string   `json:"outbound_id"`
	OutboundDate string   `json:"outbound_date"`
	CompanyID    string   `json:"company_id"`
	ProductID    string   `json:"product_id"`
	Quantity     int      `json:"quantity"`
	CapacityKw   *float64 `json:"capacity_kw"`
	SiteName     *string  `json:"site_name"`
	OrderID      *string  `json:"order_id"`
}

type saleProductRow struct {
	ProductID   string   `json:"product_id"`
	ProductName string   `json:"product_name"`
	ProductCode string   `json:"product_code"`
	SpecWp      *float64 `json:"spec_wp"`
}

type salePartnerRow struct {
	PartnerID   string `json:"partner_id"`
	PartnerName string `json:"partner_name"`
}

func ptrString(v string) *string { return &v }

func (h *SaleHandler) enrichSales(sales []model.Sale) []model.SaleListItem {
	var orders []saleOrderRow
	var outbounds []saleOutboundRow
	var products []saleProductRow
	var partners []salePartnerRow

	if data, _, err := h.DB.From("orders").Select("order_id, order_number, order_date, company_id, customer_id, product_id, quantity, capacity_kw, site_name", "exact", false).Execute(); err == nil {
		_ = json.Unmarshal(data, &orders)
	}
	if data, _, err := h.DB.From("outbounds").Select("outbound_id, outbound_date, company_id, product_id, quantity, capacity_kw, site_name, order_id", "exact", false).Execute(); err == nil {
		_ = json.Unmarshal(data, &outbounds)
	}
	if data, _, err := h.DB.From("products").Select("product_id, product_name, product_code, spec_wp", "exact", false).Execute(); err == nil {
		_ = json.Unmarshal(data, &products)
	}
	if data, _, err := h.DB.From("partners").Select("partner_id, partner_name", "exact", false).Execute(); err == nil {
		_ = json.Unmarshal(data, &partners)
	}

	orderMap := make(map[string]saleOrderRow, len(orders))
	for _, o := range orders {
		orderMap[o.OrderID] = o
	}
	outboundMap := make(map[string]saleOutboundRow, len(outbounds))
	for _, ob := range outbounds {
		outboundMap[ob.OutboundID] = ob
	}
	productMap := make(map[string]saleProductRow, len(products))
	for _, p := range products {
		productMap[p.ProductID] = p
	}
	partnerMap := make(map[string]salePartnerRow, len(partners))
	for _, p := range partners {
		partnerMap[p.PartnerID] = p
	}

	items := make([]model.SaleListItem, 0, len(sales))
	for _, sale := range sales {
		item := model.SaleListItem{
			SaleID:         sale.SaleID,
			OutboundID:     sale.OutboundID,
			OrderID:        sale.OrderID,
			CustomerID:     sale.CustomerID,
			Quantity:       0,
			CapacityKw:     sale.CapacityKw,
			UnitPriceWp:    sale.UnitPriceWp,
			UnitPriceEa:    sale.UnitPriceEa,
			SupplyAmount:   sale.SupplyAmount,
			VatAmount:      sale.VatAmount,
			TotalAmount:    sale.TotalAmount,
			TaxInvoiceDate: sale.TaxInvoiceDate,
			Sale:           sale,
		}
		if sale.Quantity != nil {
			item.Quantity = *sale.Quantity
		}
		if p, ok := partnerMap[sale.CustomerID]; ok {
			item.CustomerName = &p.PartnerName
			item.Sale.CustomerName = &p.PartnerName
		}

		var productID *string
		if sale.OutboundID != nil {
			if ob, ok := outboundMap[*sale.OutboundID]; ok {
				item.OutboundDate = &ob.OutboundDate
				item.CompanyID = &ob.CompanyID
				item.SiteName = ob.SiteName
				productID = &ob.ProductID
				if item.Quantity == 0 {
					item.Quantity = ob.Quantity
				}
				if item.CapacityKw == nil {
					item.CapacityKw = ob.CapacityKw
				}
				if item.OrderID == nil && ob.OrderID != nil {
					item.OrderID = ob.OrderID
				}
			}
		}
		if item.OrderID != nil {
			if ord, ok := orderMap[*item.OrderID]; ok {
				item.OrderDate = &ord.OrderDate
				item.OrderNumber = ord.OrderNumber
				if item.CompanyID == nil {
					item.CompanyID = &ord.CompanyID
				}
				if item.SiteName == nil {
					item.SiteName = ord.SiteName
				}
				if productID == nil {
					productID = &ord.ProductID
				}
				if item.Quantity == 0 {
					item.Quantity = ord.Quantity
				}
				if item.CapacityKw == nil {
					item.CapacityKw = ord.CapacityKw
				}
			}
		}
		if productID != nil {
			item.ProductID = productID
			if p, ok := productMap[*productID]; ok {
				item.ProductName = ptrString(p.ProductName)
				item.ProductCode = ptrString(p.ProductCode)
				item.SpecWp = p.SpecWp
			}
		}
		items = append(items, item)
	}
	return items
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
	h.fillSaleDefaults(&req)

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

func (h *SaleHandler) fillSaleDefaults(req *model.CreateSaleRequest) {
	if req.Quantity != nil && req.CapacityKw != nil {
		return
	}
	if req.OutboundID != nil && *req.OutboundID != "" {
		data, _, err := h.DB.From("outbounds").
			Select("quantity, capacity_kw", "exact", false).
			Eq("outbound_id", *req.OutboundID).
			Execute()
		if err == nil {
			var rows []struct {
				Quantity   int      `json:"quantity"`
				CapacityKw *float64 `json:"capacity_kw"`
			}
			if json.Unmarshal(data, &rows) == nil && len(rows) > 0 {
				if req.Quantity == nil {
					req.Quantity = &rows[0].Quantity
				}
				if req.CapacityKw == nil {
					req.CapacityKw = rows[0].CapacityKw
				}
			}
		}
	}
	if req.OrderID != nil && *req.OrderID != "" {
		data, _, err := h.DB.From("orders").
			Select("quantity, capacity_kw", "exact", false).
			Eq("order_id", *req.OrderID).
			Execute()
		if err == nil {
			var rows []struct {
				Quantity   int      `json:"quantity"`
				CapacityKw *float64 `json:"capacity_kw"`
			}
			if json.Unmarshal(data, &rows) == nil && len(rows) > 0 {
				if req.Quantity == nil {
					req.Quantity = &rows[0].Quantity
				}
				if req.CapacityKw == nil {
					req.CapacityKw = rows[0].CapacityKw
				}
			}
		}
	}
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
