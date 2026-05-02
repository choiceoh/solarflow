package handler

import (
	"context"
	"strings"
	"testing"
	"time"
)

// system 프롬프트가 핵심 규칙 포함 + maxLength 반영 확인.
func TestBuildCompletionSystemPrompt(t *testing.T) {
	ctx := context.Background()
	req := completionRequest{MaxLength: 80}
	got := buildCompletionSystemPrompt(ctx, req)

	for _, must := range []string{
		"이어쓰기",  // 핵심 규칙
		"한국어",   // 응답 언어
		"80자",   // 명시 maxLength 반영
		"추측",    // 사실 fabrication 금지
	} {
		if !strings.Contains(got, must) {
			t.Errorf("system prompt 에 %q 누락:\n%s", must, got)
		}
	}
}

// MaxLength 미지정 시 기본값(200) 적용.
func TestBuildCompletionSystemPromptDefaultMaxLen(t *testing.T) {
	got := buildCompletionSystemPrompt(context.Background(), completionRequest{})
	if !strings.Contains(got, "200자") {
		t.Errorf("MaxLength 미지정 시 기본 200 자 명시 누락:\n%s", got)
	}
}

// user content — 폼 정보 + 다른 필드 + 현재 입력. system 규칙은 *없어야* (분리됨).
func TestBuildCompletionUserContent(t *testing.T) {
	req := completionRequest{
		FieldKey:     "remarks",
		FieldLabel:   "비고",
		CurrentValue: "오늘 ",
		Context: map[string]any{
			"partner_name": "한화",
			"amount":       1500000,
			"":             "skip-empty-key", // 빈 키는 무시되지 않음 (key 만 비교) — 단지 다른 케이스
			"empty_value":  "",                // 빈 값은 제외
		},
		FormID: "partner_form_v2",
	}
	got := buildCompletionUserContent(req)

	if strings.Contains(got, "이어쓰기") {
		t.Errorf("user content 에 system 규칙(\"이어쓰기\") 이 섞임 — system 분리 실패:\n%s", got)
	}
	for _, must := range []string{
		"partner_form_v2",
		"비고",
		"remarks",
		"한화",          // 다른 필드 값 포함
		"1500000",     // 숫자도 직렬화
		"오늘 ",         // 현재 입력 그대로
	} {
		if !strings.Contains(got, must) {
			t.Errorf("user content 에 %q 누락:\n%s", must, got)
		}
	}
	if strings.Contains(got, "empty_value") {
		t.Errorf("빈 값 필드는 컨텍스트에서 제외돼야 함:\n%s", got)
	}
}

// 빈 currentValue → "(빈 칸)" 으로 표시.
func TestBuildCompletionUserContentEmpty(t *testing.T) {
	got := buildCompletionUserContent(completionRequest{FieldKey: "memo"})
	if !strings.Contains(got, "(빈 칸)") {
		t.Errorf("빈 currentValue 시 (빈 칸) 표시 누락:\n%s", got)
	}
}

// completionLimiter — capacity 까지 통과, 초과 시 거부, window 후 회복.
func TestCompletionLimiter(t *testing.T) {
	lim := newCompletionLimiter(3, 100*time.Millisecond)
	user := "u-1"

	// 처음 3 회 통과
	for i := 0; i < 3; i++ {
		if !lim.allow(user) {
			t.Fatalf("호출 %d 통과해야 함", i+1)
		}
	}
	// 4 회째 거부
	if lim.allow(user) {
		t.Errorf("capacity 초과 시 거부해야 함")
	}
	// 다른 사용자는 별도 버킷 — 통과
	if !lim.allow("u-2") {
		t.Errorf("다른 사용자는 별도 버킷이어야 함")
	}

	// window 경과 후 회복
	time.Sleep(120 * time.Millisecond)
	if !lim.allow(user) {
		t.Errorf("window 경과 후 회복해야 함")
	}
}
