package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"solarflow-backend/internal/middleware"
	"solarflow-backend/internal/response"
)

// Completion — POST /api/v1/assistant/completion
// 폼 텍스트 필드의 인라인 자동완성 전용 (Cursor 스타일 ghost text 백엔드).
// 도구·세션 영구 저장 없음. 단순 vLLM Qwen 호출 + 스트리밍 plain text 응답.
//
// 응답: Content-Type: text/plain; chunked. useCompletion('text' streamProtocol) 또는 raw fetch 와 호환.
// system 메시지는 별도 role=system 으로 분리해 모델이 규칙을 system layer 로 인식하게 함.
type completionRequest struct {
	FieldKey     string                 `json:"fieldKey"`
	FieldLabel   string                 `json:"fieldLabel,omitempty"`
	CurrentValue string                 `json:"currentValue,omitempty"`
	Context      map[string]interface{} `json:"context,omitempty"` // 같은 폼의 다른 필드 현재값
	MaxLength    int                    `json:"maxLength,omitempty"`
	FormID       string                 `json:"formId,omitempty"`
}

const (
	completionMaxTokens     = 160 // 짧은 ghost text 가정 — 1~2 문장
	completionDefaultMaxLen = 200 // MaxLength 미지정 시 기본 cap
)

// completionRateLimiter — 사용자별 분당 호출 제한. 토큰 버킷 단순 구현 (사용자 = JWT user_id).
// 운영 vLLM 부하 방지: 사용자가 ✨ 또는 인라인 자동완성을 분당 30회 초과 호출 못 함.
var completionRateLimiter = newCompletionLimiter(30, time.Minute)

func (h *AssistantHandler) Completion(w http.ResponseWriter, r *http.Request) {
	var req completionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.RespondError(w, http.StatusBadRequest, "요청 본문이 올바른 JSON이 아닙니다")
		return
	}
	if strings.TrimSpace(req.FieldKey) == "" {
		response.RespondError(w, http.StatusBadRequest, "fieldKey는 필수입니다")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.RespondError(w, http.StatusUnauthorized, "인증 정보가 없습니다")
		return
	}
	if !completionRateLimiter.allow(userID) {
		response.RespondError(w, http.StatusTooManyRequests, "잠시 후 다시 시도해 주세요")
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	baseURL := strings.TrimRight(os.Getenv("OPENAI_BASE_URL"), "/")
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	requireAuth := !isLocalBaseURL(baseURL)
	if requireAuth && apiKey == "" {
		response.RespondError(w, http.StatusInternalServerError, "OPENAI_API_KEY 미설정")
		return
	}

	model := strings.TrimSpace(os.Getenv("ASSISTANT_COMPLETION_MODEL"))
	if model == "" {
		model = strings.TrimSpace(os.Getenv("ASSISTANT_MODEL"))
	}
	if model == "" {
		model = defaultModelForProvider("openai")
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		response.RespondError(w, http.StatusInternalServerError, "ResponseWriter 에 http.Flusher 미지원")
		return
	}

	startedAt := time.Now()
	log.Printf("[completion] enter user=%s form=%s field=%s ctxKeys=%d valLen=%d maxLen=%d",
		userID, req.FormID, req.FieldKey, len(req.Context), len(req.CurrentValue), req.MaxLength)

	// system role 메시지로 분리 — buildCompletionSystemPrompt 가 만든 규칙은 system 가 받음.
	// user 메시지에는 폼 정보 + 현재 입력만.
	system := buildCompletionSystemPrompt(r.Context(), req)
	user := buildCompletionUserContent(req)

	headerWritten := false
	onText := func(t string) {
		if !headerWritten {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache, no-transform")
			w.Header().Set("X-Accel-Buffering", "no")
			w.WriteHeader(http.StatusOK)
			headerWritten = true
		}
		_, _ = w.Write([]byte(t))
		flusher.Flush()
	}

	cb := streamCallbacks{
		onTextDelta: onText,
		onToolCall:  func(string, string, json.RawMessage) {}, // 도구 비활성
	}

	msgs := []openaiMessage{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	}
	_, err := h.streamOpenAI(r.Context(), baseURL, apiKey, model, msgs, nil, completionMaxTokens, cb)
	elapsed := time.Since(startedAt)
	if err != nil {
		log.Printf("[completion] FAIL user=%s field=%s elapsed=%s err=%v", userID, req.FieldKey, elapsed, err)
		if !headerWritten {
			response.RespondError(w, http.StatusBadGateway, err.Error())
			return
		}
		// 헤더 송출 후 → 그냥 스트림 종료
		return
	}
	log.Printf("[completion] ok user=%s field=%s elapsed=%s", userID, req.FieldKey, elapsed)
}

// buildCompletionSystemPrompt — 자동완성 규칙. 이제 system role 메시지로 직접 사용.
func buildCompletionSystemPrompt(ctx context.Context, req completionRequest) string {
	role := middleware.GetUserRole(ctx)
	scope := middleware.GetTenantScope(ctx)
	maxLen := req.MaxLength
	if maxLen <= 0 {
		maxLen = completionDefaultMaxLen
	}
	var b strings.Builder
	b.WriteString("당신은 SolarFlow ERP 폼 자동완성 도우미입니다.\n")
	b.WriteString("[규칙]\n")
	b.WriteString("1. 한국어로 짧고 정확하게.\n")
	b.WriteString("2. 사용자가 입력 중인 텍스트의 *이어쓰기* 만 출력. 인사말·설명·따옴표·코드블록 금지.\n")
	fmt.Fprintf(&b, "3. 절대로 %d자(공백 포함) 를 넘기지 마세요. 1~2 문장.\n", maxLen)
	b.WriteString("4. 같은 폼의 다른 필드 컨텍스트와 정합. 추측한 사실(이름·금액·일자·번호) 금지.\n")
	b.WriteString("5. 사용자가 시작한 어조(격식체/평어)를 따른다.\n")
	fmt.Fprintf(&b, "6. 역할=%s, 테넌트=%s. 권한 외 정보 추측 금지.\n", role, scope)
	b.WriteString("7. 빈 칸이면 컨텍스트로 적합한 값을 처음부터 작성. 비어 있지 않으면 *그 텍스트의 이어쓰기*만 출력.\n")
	return b.String()
}

// buildCompletionUserContent — 폼 정보 + 현재 입력. system 규칙은 분리됨.
func buildCompletionUserContent(req completionRequest) string {
	var b strings.Builder
	b.WriteString("[폼 정보]\n")
	if req.FormID != "" {
		fmt.Fprintf(&b, "- form: %s\n", req.FormID)
	}
	if req.FieldLabel != "" {
		fmt.Fprintf(&b, "- 대상 필드: %s (%s)\n", req.FieldLabel, req.FieldKey)
	} else {
		fmt.Fprintf(&b, "- 대상 필드: %s\n", req.FieldKey)
	}
	if len(req.Context) > 0 {
		b.WriteString("\n[같은 폼의 다른 필드 값]\n")
		// 이름순 정렬 + 빈 값/대상 필드 제외
		keys := make([]string, 0, len(req.Context))
		for k := range req.Context {
			if k == req.FieldKey {
				continue
			}
			if v, ok := req.Context[k]; ok && v != nil && v != "" {
				keys = append(keys, k)
			}
		}
		sort.Strings(keys)
		for _, k := range keys {
			vBytes, _ := json.Marshal(req.Context[k])
			fmt.Fprintf(&b, "- %s: %s\n", k, truncate(string(vBytes), 120))
		}
	}
	b.WriteString("\n[현재 입력]\n")
	if strings.TrimSpace(req.CurrentValue) == "" {
		b.WriteString("(빈 칸)")
	} else {
		b.WriteString(req.CurrentValue)
	}
	return b.String()
}

// completionLimiter — 사용자별 토큰 버킷 (window 동안 capacity 호출 허용).
// 단순 구현: 사용자별 호출 시각 슬라이스. window 밖 시각은 청소.
type completionLimiter struct {
	mu       sync.Mutex
	capacity int
	window   time.Duration
	hits     map[string][]time.Time
}

func newCompletionLimiter(capacity int, window time.Duration) *completionLimiter {
	return &completionLimiter{
		capacity: capacity,
		window:   window,
		hits:     make(map[string][]time.Time),
	}
}

func (l *completionLimiter) allow(userID string) bool {
	now := time.Now()
	cutoff := now.Add(-l.window)
	l.mu.Lock()
	defer l.mu.Unlock()
	xs := l.hits[userID]
	// window 밖 청소
	keep := xs[:0]
	for _, t := range xs {
		if t.After(cutoff) {
			keep = append(keep, t)
		}
	}
	if len(keep) >= l.capacity {
		l.hits[userID] = keep
		return false
	}
	keep = append(keep, now)
	l.hits[userID] = keep
	return true
}
