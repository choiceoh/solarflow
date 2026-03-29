package model

import (
	"strings"
	"testing"
)

// TestLimitChangeValidate_EmptyBankID — bank_id가 빈 값일 때 에러 반환 확인
func TestLimitChangeValidate_EmptyBankID(t *testing.T) {
	req := CreateLimitChangeRequest{
		BankID: "", ChangeDate: "2025-03-15",
		PreviousLimit: 1000000, NewLimit: 2000000,
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("빈 BankID에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "bank_id") {
		t.Fatalf("에러 메시지에 'bank_id'가 포함되어야 합니다, got: %s", msg)
	}
}

// TestLimitChangeValidate_EmptyDate — change_date가 빈 값일 때 에러 반환 확인
func TestLimitChangeValidate_EmptyDate(t *testing.T) {
	req := CreateLimitChangeRequest{
		BankID: "550e8400-e29b-41d4-a716-446655440000", ChangeDate: "",
		PreviousLimit: 1000000, NewLimit: 2000000,
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("빈 ChangeDate에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "change_date") {
		t.Fatalf("에러 메시지에 'change_date'가 포함되어야 합니다, got: %s", msg)
	}
}

// TestLimitChangeValidate_NegativePreviousLimit — previous_limit이 음수일 때 에러 반환 확인
func TestLimitChangeValidate_NegativePreviousLimit(t *testing.T) {
	req := CreateLimitChangeRequest{
		BankID: "550e8400-e29b-41d4-a716-446655440000", ChangeDate: "2025-03-15",
		PreviousLimit: -100, NewLimit: 2000000,
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("음수 PreviousLimit에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "previous_limit") {
		t.Fatalf("에러 메시지에 'previous_limit'이 포함되어야 합니다, got: %s", msg)
	}
}

// TestLimitChangeValidate_NegativeNewLimit — new_limit이 음수일 때 에러 반환 확인
func TestLimitChangeValidate_NegativeNewLimit(t *testing.T) {
	req := CreateLimitChangeRequest{
		BankID: "550e8400-e29b-41d4-a716-446655440000", ChangeDate: "2025-03-15",
		PreviousLimit: 1000000, NewLimit: -500,
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("음수 NewLimit에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "new_limit") {
		t.Fatalf("에러 메시지에 'new_limit'이 포함되어야 합니다, got: %s", msg)
	}
}

// TestLimitChangeValidate_SameLimit — 이전/변경 한도가 같을 때 에러 반환 확인
func TestLimitChangeValidate_SameLimit(t *testing.T) {
	req := CreateLimitChangeRequest{
		BankID: "550e8400-e29b-41d4-a716-446655440000", ChangeDate: "2025-03-15",
		PreviousLimit: 1000000, NewLimit: 1000000,
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("같은 한도에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "같습니다") {
		t.Fatalf("에러 메시지에 '같습니다'가 포함되어야 합니다, got: %s", msg)
	}
}

// TestLimitChangeValidate_ZeroPreviousLimit — previous_limit=0 (신규 한도 설정) 성공 확인
func TestLimitChangeValidate_ZeroPreviousLimit(t *testing.T) {
	req := CreateLimitChangeRequest{
		BankID: "550e8400-e29b-41d4-a716-446655440000", ChangeDate: "2025-03-15",
		PreviousLimit: 0, NewLimit: 2000000,
	}
	msg := req.Validate()
	if msg != "" {
		t.Fatalf("PreviousLimit=0(신규 한도) 정상 데이터에서 에러가 반환되면 안 됩니다, got: %s", msg)
	}
}

// TestLimitChangeValidate_ZeroNewLimit — new_limit=0 (한도 철회) 성공 확인
func TestLimitChangeValidate_ZeroNewLimit(t *testing.T) {
	req := CreateLimitChangeRequest{
		BankID: "550e8400-e29b-41d4-a716-446655440000", ChangeDate: "2025-03-15",
		PreviousLimit: 1000000, NewLimit: 0,
	}
	msg := req.Validate()
	if msg != "" {
		t.Fatalf("NewLimit=0(한도 철회) 정상 데이터에서 에러가 반환되면 안 됩니다, got: %s", msg)
	}
}

// TestLimitChangeValidate_Success — 정상 데이터일 때 빈 문자열 반환 확인
func TestLimitChangeValidate_Success(t *testing.T) {
	req := CreateLimitChangeRequest{
		BankID: "550e8400-e29b-41d4-a716-446655440000", ChangeDate: "2025-03-15",
		PreviousLimit: 1000000, NewLimit: 2000000,
	}
	msg := req.Validate()
	if msg != "" {
		t.Fatalf("정상 데이터에서 에러가 반환되면 안 됩니다, got: %s", msg)
	}
}
