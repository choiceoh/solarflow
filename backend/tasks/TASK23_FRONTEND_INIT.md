# 작업: Step 20 — 프론트엔드 초기화 + 인증 + Go 보강 (CORS + Rust 프록시)
harness/RULES.md를 반드시 따를 것. harness/CHECKLIST_TEMPLATE.md 양식으로 보고할 것.
감리 승인 완료. 1건 확인: 기존 타입 안전 메서드 삭제 금지.

## 작업 A: Go CORS 미들웨어

### backend/internal/middleware/cors.go (신규)

CORSMiddleware 함수:
- CORS_ORIGINS 환경변수에서 허용 도메인 읽기 (쉼표 구분)
- 없으면 기본값: http://localhost:5173
- 허용 Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- 허용 Headers: Authorization, Content-Type
- Allow Credentials: true
- Max Age: 3600
- OPTIONS 프리플라이트 요청에 200 반환
- 실제 요청에 CORS 헤더 추가

### backend/internal/middleware/cors_test.go (신규)
- TestCORS_AllowedOrigin: 허용 Origin -> CORS 헤더 포함
- TestCORS_DisallowedOrigin: 미허용 Origin -> CORS 헤더 없음
- TestCORS_Preflight: OPTIONS -> 200 + CORS 헤더

### backend/cmd/server/main.go 수정
- chi 미들웨어 체인에 CORSMiddleware 추가 (AuthMiddleware 앞에)

## 작업 B: Go Rust 프록시 핸들러 15개

### backend/internal/engine/client.go 수정

CallCalcRaw 메서드 추가 (기존 메서드 삭제 금지!):
- CallCalcRaw(path string, body []byte) ([]byte, int, error)
- path: Rust API 경로 (예: "inventory")
- body: 프론트 요청 본문 바이트 그대로
- 반환: Rust 응답 바이트, Rust 상태코드, 에러
- Rust 다운 시 에러 반환 (상태코드 0)

CallCalcRawGet(path string) ([]byte, int, error) 메서드 추가:
- GET 요청용 (health, ready)

기존 메서드 (GetInventory, CalcLandedCost 등)는 그대로 유지.
CallCalcRaw는 프록시 전용 추가 메서드.

### backend/internal/handler/calc_proxy.go (신규)

CalcProxyHandler 구조체:
- Engine *engine.EngineClient

15개 핸들러 (모두 동일 패턴):

POST 핸들러 패턴:
func (h *CalcProxyHandler) Inventory(w http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil { 400 에러 }
    defer r.Body.Close()
    
    result, statusCode, err := h.Engine.CallCalcRaw("inventory", body)
    if err != nil {
        // Rust 다운: 503 + 에러 메시지
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(503)
        w.Write([]byte(`{"error":"계산 엔진이 일시적으로 사용할 수 없습니다","engine_status":"unavailable"}`))
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    w.Write(result)
}

GET 핸들러 패턴 (EngineHealth, EngineReady):
동일하지만 CallCalcRawGet 사용, body 없음.

엔드포인트 매핑 15개:
POST /api/v1/calc/inventory -> CallCalcRaw("inventory", body)
POST /api/v1/calc/landed-cost -> CallCalcRaw("landed-cost", body)
POST /api/v1/calc/exchange-compare -> CallCalcRaw("exchange-compare", body)
POST /api/v1/calc/lc-fee -> CallCalcRaw("lc-fee", body)
POST /api/v1/calc/lc-limit-timeline -> CallCalcRaw("lc-limit-timeline", body)
POST /api/v1/calc/lc-maturity-alert -> CallCalcRaw("lc-maturity-alert", body)
POST /api/v1/calc/margin-analysis -> CallCalcRaw("margin-analysis", body)
POST /api/v1/calc/customer-analysis -> CallCalcRaw("customer-analysis", body)
POST /api/v1/calc/price-trend -> CallCalcRaw("price-trend", body)
POST /api/v1/calc/supply-forecast -> CallCalcRaw("supply-forecast", body)
POST /api/v1/calc/outstanding-list -> CallCalcRaw("outstanding-list", body)
POST /api/v1/calc/receipt-match-suggest -> CallCalcRaw("receipt-match-suggest", body)
POST /api/v1/calc/search -> CallCalcRaw("search", body)
GET /api/v1/engine/health -> CallCalcRawGet("/health")
GET /api/v1/engine/ready -> CallCalcRawGet("/health/ready")

### backend/cmd/server/main.go 수정 (라우터)

calcProxy := handler.NewCalcProxyHandler(engineClient)

r.Route("/api/v1/calc", func(r chi.Router) {
    r.Use(AuthMiddleware)
    r.Post("/inventory", calcProxy.Inventory)
    r.Post("/landed-cost", calcProxy.LandedCost)
    r.Post("/exchange-compare", calcProxy.ExchangeCompare)
    r.Post("/lc-fee", calcProxy.LcFee)
    r.Post("/lc-limit-timeline", calcProxy.LcLimitTimeline)
    r.Post("/lc-maturity-alert", calcProxy.LcMaturityAlert)
    r.Post("/margin-analysis", calcProxy.MarginAnalysis)
    r.Post("/customer-analysis", calcProxy.CustomerAnalysis)
    r.Post("/price-trend", calcProxy.PriceTrend)
    r.Post("/supply-forecast", calcProxy.SupplyForecast)
    r.Post("/outstanding-list", calcProxy.OutstandingList)
    r.Post("/receipt-match-suggest", calcProxy.ReceiptMatchSuggest)
    r.Post("/search", calcProxy.Search)
})
r.Route("/api/v1/engine", func(r chi.Router) {
    r.Use(AuthMiddleware)
    r.Get("/health", calcProxy.EngineHealth)
    r.Get("/ready", calcProxy.EngineReady)
})

### backend/internal/handler/calc_proxy_test.go (신규)
- TestCalcProxy_Inventory_Success: mock Rust 200 -> Go 200 + 동일 응답
- TestCalcProxy_Inventory_EngineDown: Rust 연결 불가 -> Go 503 + engine_status
- TestCalcProxy_Inventory_RustBadRequest: mock Rust 400 -> Go 400 + 동일 에러
- TestCalcProxy_EngineHealth: mock Rust 200 -> Go 200
- TestCalcProxy_EngineReady_DBDown: mock Rust 503 -> Go 503

## 작업 C: 프론트엔드 프로젝트 초기화

### Alex가 터미널에서 실행 (프로젝트 생성):

cd ~/solarflow-3
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D @tailwindcss/vite
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
npm install zustand react-router-dom
npx shadcn@latest init

### Claude Code가 작업할 파일:

### frontend/vite.config.ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

### frontend/src/index.css
@import "tailwindcss";

### frontend/src/lib/supabase.ts
- createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- 환경변수 없으면 에러 로그

### frontend/src/lib/api.ts
- API_BASE_URL: VITE_API_URL (기본 http://localhost:8080)
- fetchWithAuth(path, options):
  Supabase 세션에서 access_token 가져와 Authorization 헤더 추가
  Content-Type: application/json
  401 응답 시 로그아웃
  응답 JSON 파싱
  에러 시 throw

### frontend/src/lib/utils.ts
- cn() 함수 (shadcn/ui 표준)

### frontend/src/types/models.ts
- UserProfile 타입:
  userId, email, name, role, allowedModules, companyId, isActive

### frontend/src/stores/authStore.ts (Zustand)
- 상태: session, user(UserProfile), isLoading
- login(email, password):
  supabase.auth.signInWithPassword -> 세션 저장
  fetchWithAuth("/api/v1/users/me") -> UserProfile 저장
  (users/me 핸들러가 없으면 user_profiles에서 JWT uid로 조회하는 핸들러 추가 필요 -> 작업 D에 포함)
- logout(): supabase.auth.signOut -> 상태 초기화
- initialize(): supabase.auth.onAuthStateChange 구독 + UserProfile 조회

### frontend/src/hooks/useAuth.ts
- authStore 래퍼: isAuthenticated, user, role, login, logout, isLoading

### frontend/src/hooks/useApi.ts
- useApi() 훅: fetchWithAuth 래퍼
- get(path), post(path, body), put(path, body), del(path)
- 로딩/에러 상태 관리

### frontend/src/components/auth/LoginForm.tsx
- shadcn/ui Card + Input + Button
- 이메일 + 비밀번호 입력
- 로그인 버튼 -> authStore.login() 호출
- 에러 표시 (잘못된 이메일/비밀번호)
- 로딩 스피너

### frontend/src/components/auth/ProtectedRoute.tsx
- isAuthenticated false -> Navigate to /login
- isLoading -> 로딩 스피너

### frontend/src/components/auth/RoleGuard.tsx
- props: allowedRoles: string[]
- user.role이 allowedRoles에 없으면 "접근 권한이 없습니다" 표시

### frontend/src/pages/LoginPage.tsx
- 중앙 정렬 LoginForm
- "SolarFlow 3.0" 텍스트

### frontend/src/pages/HomePage.tsx (임시)
- "SolarFlow 3.0에 오신 것을 환영합니다"
- 사용자 이름 + 역할 표시
- 로그아웃 버튼
- "Step 21에서 대시보드로 교체 예정"

### frontend/src/App.tsx
- BrowserRouter + Routes:
  /login -> LoginPage
  / -> ProtectedRoute -> HomePage
  * -> 404 페이지 또는 / 리다이렉트

### frontend/src/main.tsx
- React.StrictMode + App 렌더

### frontend/.env.example
VITE_SUPABASE_URL=https://aalxpmfnsjzmhsfkuxnp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:8080

### frontend/.gitignore
node_modules
dist
.env
.env.local

## 작업 D: Go /api/v1/users/me 핸들러 추가

### backend/internal/handler/user.go (신규 또는 기존 수정)

GET /api/v1/users/me:
- AuthMiddleware에서 JWT uid를 context에 저장
- user_profiles에서 해당 uid 조회
- UserProfile JSON 반환
- 없으면 404

라우터에 등록:
r.Get("/api/v1/users/me", userHandler.GetMe)
(AuthMiddleware 적용)

## 환경변수 정리

### fly.io (Alex 수동 실행)
fly secrets set CORS_ORIGINS="https://solarflow-3-frontend.pages.dev,http://localhost:5173" -a solarflow-backend

### Supabase (Alex 수동)
테스트 사용자 생성:
1. Supabase 대시보드 -> Authentication -> Users -> Create User
   이메일: admin@solarflow.app, 비밀번호: 설정
2. user_profiles에 INSERT:
   INSERT INTO user_profiles (user_id, email, name, role, is_active)
   VALUES ('supabase_auth_uid', 'admin@solarflow.app', '관리자', 'admin', true);

## DECISIONS.md 추가
- D-051: 프론트->Go->Rust 호출 체인
  이유: 인증 우회 방지, CORS 1곳 관리, graceful degradation 유지.
- D-052: shadcn/ui 선택
  이유: 소스 복사 방식, 완전 커스텀, 2026년 React 표준.
- D-053: Zustand 상태 관리
  이유: 전역 상태가 인증+법인 선택 정도. Redux 과잉.
- D-054: CalcProxy 패턴 — 바이트 그대로 전달
  이유: Go가 Rust 요청 해석 불필요. Rust API 변경 시 Go 수정 불필요.
  기존 타입 안전 메서드는 Go 내부 호출용으로 유지.

## PROGRESS.md 업데이트
- Step 20 완료 기록
- Phase 4 순서: 20(인증) -> 21(레이아웃) -> 22(재고!) -> 23(입고) -> ...

## 완료 기준
1. Go: go build + go vet + go test 성공
   - CORS 테스트 + CalcProxy 테스트 통과
   - 기존 테스트 전부 PASS
2. Frontend: npm run build 성공 (에러 0)
3. 로컬 테스트:
   - Go 서버 시작 (8080)
   - Frontend 시작 (5173)
   - http://localhost:5173 -> 로그인 페이지
   - 로그인 -> HomePage 이동
   - 브라우저 Network 탭에서 CORS 에러 없음
4. harness/CHECKLIST_TEMPLATE.md 양식으로 보고
5. 전체 파일 코드(cat) 보여주기
