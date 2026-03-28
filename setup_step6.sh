#!/bin/bash
# ============================================================
# SolarFlow 3.0 — Step 6: 입고(B/L) API 핸들러
# 터미널 1에서 실행: bash setup_step6.sh
# ============================================================

set -e

BACKEND_DIR=~/solarflow-3/backend
cd "$BACKEND_DIR"

echo "🔧 Step 6 시작: 입고(B/L) API 핸들러 추가"
echo "================================================"

# ── 1. handler/bl.go — B/L CRUD ──
echo "📄 bl.go 생성..."
cat > internal/handler/bl.go << 'GOEOF'
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
GOEOF

# ── 2. handler/bl_line.go — B/L 라인아이템 CRUD ──
echo "📄 bl_line.go 생성..."
cat > internal/handler/bl_line.go << 'GOEOF'
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
GOEOF

# ── 3. router.go에 B/L 라우트 추가 ──
echo "📄 router.go에 B/L 라우트 추가..."

# router.go 끝부분(}) 앞에 B/L 라우트 삽입
# 기존 tts 라우트 뒤에 추가
sed -i '' '/r.Route("\/tts"/,/})/!b;/})/{a\
\
\t\t// ── Phase 2: 입고(B\/L) ──\
\
\t\tblH := handler.NewBLHandler(db)\
\t\tblLineH := handler.NewBLLineHandler(db)\
\t\tr.Route("\/bls", func(r chi.Router) {\
\t\t\tr.Get("\/", blH.List)                     \/\/ ?company_id=\&manufacturer_id=\&status=\&inbound_type=\
\t\t\tr.Post("\/", blH.Create)\
\t\t\tr.Get("\/{id}", blH.GetByID)              \/\/ 라인아이템 포함\
\t\t\tr.Put("\/{id}", blH.Update)\
\
\t\t\t\/\/ B\/L 하위: 라인아이템\
\t\t\tr.Route("\/{blId}\/lines", func(r chi.Router) {\
\t\t\t\tr.Get("\/", blLineH.ListByBL)\
\t\t\t\tr.Post("\/", blLineH.Create)\
\t\t\t\tr.Put("\/{id}", blLineH.Update)\
\t\t\t\tr.Delete("\/{id}", blLineH.Delete)\
\t\t\t})\
\t\t})
}' internal/router/router.go

# sed가 실패하면 직접 router.go 재생성
if ! go build -o /dev/null . 2>/dev/null; then
    echo "  sed 실패, router.go 전체 재생성..."
    cat > internal/router/router.go << 'GOEOF'
package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"solarflow-backend/internal/handler"
	"solarflow-backend/internal/middleware"

	supa "github.com/supabase-community/supabase-go"
)

func New(db *supa.Client) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.CORS)
	r.Get("/health", handler.HealthCheck)

	r.Route("/api/v1", func(r chi.Router) {

		// ── Phase 1: 마스터 관리 ──

		companyH := handler.NewCompanyHandler(db)
		r.Route("/companies", func(r chi.Router) {
			r.Get("/", companyH.List)
			r.Post("/", companyH.Create)
			r.Get("/{id}", companyH.GetByID)
			r.Put("/{id}", companyH.Update)
			r.Patch("/{id}/status", companyH.ToggleStatus)
		})

		mfgH := handler.NewManufacturerHandler(db)
		r.Route("/manufacturers", func(r chi.Router) {
			r.Get("/", mfgH.List)
			r.Post("/", mfgH.Create)
			r.Get("/{id}", mfgH.GetByID)
			r.Put("/{id}", mfgH.Update)
		})

		productH := handler.NewProductHandler(db)
		r.Route("/products", func(r chi.Router) {
			r.Get("/", productH.List)
			r.Post("/", productH.Create)
			r.Get("/{id}", productH.GetByID)
			r.Put("/{id}", productH.Update)
		})

		partnerH := handler.NewPartnerHandler(db)
		r.Route("/partners", func(r chi.Router) {
			r.Get("/", partnerH.List)
			r.Post("/", partnerH.Create)
			r.Get("/{id}", partnerH.GetByID)
			r.Put("/{id}", partnerH.Update)
		})

		warehouseH := handler.NewWarehouseHandler(db)
		r.Route("/warehouses", func(r chi.Router) {
			r.Get("/", warehouseH.List)
			r.Post("/", warehouseH.Create)
			r.Get("/{id}", warehouseH.GetByID)
			r.Put("/{id}", warehouseH.Update)
		})

		bankH := handler.NewBankHandler(db)
		r.Route("/banks", func(r chi.Router) {
			r.Get("/", bankH.List)
			r.Post("/", bankH.Create)
			r.Get("/{id}", bankH.GetByID)
			r.Put("/{id}", bankH.Update)
		})

		// ── Phase 2: 발주/결제 ──

		poH := handler.NewPOHandler(db)
		poLineH := handler.NewPOLineHandler(db)
		r.Route("/pos", func(r chi.Router) {
			r.Get("/", poH.List)
			r.Post("/", poH.Create)
			r.Get("/{id}", poH.GetByID)
			r.Put("/{id}", poH.Update)

			r.Route("/{poId}/lines", func(r chi.Router) {
				r.Get("/", poLineH.ListByPO)
				r.Post("/", poLineH.Create)
				r.Put("/{id}", poLineH.Update)
				r.Delete("/{id}", poLineH.Delete)
			})
		})

		lcH := handler.NewLCHandler(db)
		r.Route("/lcs", func(r chi.Router) {
			r.Get("/", lcH.List)
			r.Post("/", lcH.Create)
			r.Get("/{id}", lcH.GetByID)
			r.Put("/{id}", lcH.Update)
		})

		ttH := handler.NewTTHandler(db)
		r.Route("/tts", func(r chi.Router) {
			r.Get("/", ttH.List)
			r.Post("/", ttH.Create)
			r.Put("/{id}", ttH.Update)
		})

		// ── Phase 2: 입고(B/L) ──

		blH := handler.NewBLHandler(db)
		blLineH := handler.NewBLLineHandler(db)
		r.Route("/bls", func(r chi.Router) {
			r.Get("/", blH.List)
			r.Post("/", blH.Create)
			r.Get("/{id}", blH.GetByID)
			r.Put("/{id}", blH.Update)

			r.Route("/{blId}/lines", func(r chi.Router) {
				r.Get("/", blLineH.ListByBL)
				r.Post("/", blLineH.Create)
				r.Put("/{id}", blLineH.Update)
				r.Delete("/{id}", blLineH.Delete)
			})
		})
	})

	return r
}
GOEOF
fi

# ── 4. 빌드 테스트 ──
echo ""
echo "🔨 빌드 테스트..."
if go build -o /dev/null .; then
    echo ""
    echo "================================================"
    echo "✅ Step 6 완료! 빌드 성공!"
    echo "================================================"
    echo ""
    echo "다음 명령어를 순서대로 실행하세요:"
    echo '  git add -A'
    echo '  git commit -m "feat: Step 6 — 입고(B/L) API (선적, 라인아이템)"'
    echo '  git push origin main'
    echo '  fly deploy'
else
    echo ""
    echo "❌ 빌드 실패 — 에러 메시지를 Claude에게 보내주세요"
fi
