package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"solarflow-backend/internal/middleware"
	"solarflow-backend/internal/response"
)

// Completion — POST /api/v1/assistant/completion
// 폼 텍스트 필드의 인라인 자동완성 전용 (Cursor 스타일 ghost text 백엔드).
// 도구·세션 영구 저장 없음. 단순 vLLM Qwen 호출 + 스트리밍 plain text 응답.
//
// 응답 형식: Content-Type: text/plain; chunked. useChat 의 streamProtocol: 'text' 와 호환.
// 실패 시 짧은 에러 본문 + 5xx.
type completionRequest struct {
	FieldKey     string                 `json:"fieldKey"`
	FieldLabel   string                 `json:"fieldLabel,omitempty"`
	CurrentValue string                 `json:"currentValue,omitempty"`
	Context      map[string]interface{} `json:"context,omitempty"` // 같은 폼의 다른 필드 현재값
	MaxLength    int                    `json:"maxLength,omitempty"`
	FormID       string                 `json:"formId,omitempty"`
}

const completionMaxTokens = 160 // 짧은 ghost text 가정 — 1~2 문장

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

	system := buildCompletionSystemPrompt(r.Context(), req)
	userPrompt := buildCompletionUserPrompt(req)

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
	log.Printf("[completion] enter user=%s form=%s field=%s ctxKeys=%d valLen=%d",
		middleware.GetUserID(r.Context()), req.FormID, req.FieldKey, len(req.Context), len(req.CurrentValue))

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
		{Role: "user", Content: userPrompt},
	}
	_, err := h.streamOpenAI(r.Context(), baseURL, apiKey, model, msgs, nil, completionMaxTokens, cb)
	elapsed := time.Since(startedAt)
	// 시스템 프롬프트는 streamOpenAI 가 받지 않으므로 user 앞에 별도 주입 필요 — workaround.
	// (streamOpenAI 시그니처상 system 인자가 없음 — chat path 와 다름.)
	// → 위 buildCompletionUserPrompt 에 system + user 를 합쳐 한 메시지로 넣는다.
	_ = system
	if err != nil {
		log.Printf("[completion] FAIL field=%s elapsed=%s err=%v", req.FieldKey, elapsed, err)
		if !headerWritten {
			response.RespondError(w, http.StatusBadGateway, err.Error())
			return
		}
		// 헤더 송출 후 → 그냥 스트림 종료
		return
	}
	log.Printf("[completion] ok field=%s elapsed=%s", req.FieldKey, elapsed)
}

// buildCompletionSystemPrompt — 사용자 역할/도메인 + 자동완성 규칙.
// (현재 streamOpenAI 가 system 메시지를 받는 별도 경로가 없어 buildCompletionUserPrompt 에서 합쳐 넣음.)
func buildCompletionSystemPrompt(ctx context.Context, req completionRequest) string {
	role := middleware.GetUserRole(ctx)
	scope := middleware.GetTenantScope(ctx)
	maxLen := req.MaxLength
	if maxLen <= 0 {
		maxLen = 200
	}
	var b strings.Builder
	b.WriteString("당신은 SolarFlow ERP 폼 자동완성 도우미입니다.\n")
	fmt.Fprintf(&b, "[규칙]\n")
	b.WriteString("1. 한국어로 짧고 정확하게.\n")
	fmt.Fprintf(&b, "2. 사용자가 입력 중인 텍스트의 *이어쓰기* 만 출력. 인사말·설명·따옴표 금지.\n")
	fmt.Fprintf(&b, "3. 최대 %d자 이내, 1~2 문장.\n", maxLen)
	b.WriteString("4. 같은 폼의 다른 필드 컨텍스트와 정합. 추측한 사실(이름·금액·일자) 금지.\n")
	b.WriteString("5. 사용자가 시작한 어조(격식체/평어)를 따른다.\n")
	fmt.Fprintf(&b, "6. 역할=%s, 테넌트=%s. 권한 외 정보 추측 금지.\n", role, scope)
	return b.String()
}

func buildCompletionUserPrompt(req completionRequest) string {
	var b strings.Builder
	b.WriteString(buildCompletionSystemPrompt(context.Background(), req)) // system 합치기 — 위 주석 참고
	b.WriteString("\n\n[폼 정보]\n")
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
		sortStrings(keys)
		for _, k := range keys {
			vBytes, _ := json.Marshal(req.Context[k])
			fmt.Fprintf(&b, "- %s: %s\n", k, truncate(string(vBytes), 120))
		}
	}
	b.WriteString("\n[현재 입력]\n")
	if strings.TrimSpace(req.CurrentValue) == "" {
		b.WriteString("(빈 칸)\n")
		b.WriteString("\n위 컨텍스트로 적합한 값을 처음부터 작성하세요.")
	} else {
		fmt.Fprintf(&b, "%s\n", req.CurrentValue)
		b.WriteString("\n위 텍스트의 *이어쓰기* 만 출력하세요. 첫 글자가 공백이면 공백 포함, 아니면 바로 이어붙임.")
	}
	return b.String()
}

// sortStrings — 외부 라이브러리 없이 단순 정렬 (안정 정렬 불필요).
func sortStrings(xs []string) {
	for i := 1; i < len(xs); i++ {
		for j := i; j > 0 && xs[j-1] > xs[j]; j-- {
			xs[j-1], xs[j] = xs[j], xs[j-1]
		}
	}
}

