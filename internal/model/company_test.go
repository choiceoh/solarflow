package model

import (
	"strings"
	"testing"
)

// TestValidate_EmptyName — 법인명이 빈 값일 때 에러 반환 확인
func TestValidate_EmptyName(t *testing.T) {
	req := CreateCompanyRequest{
		CompanyName: "",
		CompanyCode: "TSE",
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("빈 CompanyName에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "company_name") {
		t.Fatalf("에러 메시지에 'company_name'이 포함되어야 합니다, got: %s", msg)
	}
}

// TestValidate_NameTooLong — 법인명이 100자를 초과할 때 에러 반환 확인
func TestValidate_NameTooLong(t *testing.T) {
	longName := strings.Repeat("가", 101)
	req := CreateCompanyRequest{
		CompanyName: longName,
		CompanyCode: "TSE",
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("101자 CompanyName에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "100") {
		t.Fatalf("에러 메시지에 '100'이 포함되어야 합니다, got: %s", msg)
	}
}

// TestValidate_EmptyCode — 법인코드가 빈 값일 때 에러 반환 확인
func TestValidate_EmptyCode(t *testing.T) {
	req := CreateCompanyRequest{
		CompanyName: "탑솔라에너지",
		CompanyCode: "",
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("빈 CompanyCode에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "company_code") {
		t.Fatalf("에러 메시지에 'company_code'가 포함되어야 합니다, got: %s", msg)
	}
}

// TestValidate_CodeTooLong — 법인코드가 10자를 초과할 때 에러 반환 확인
func TestValidate_CodeTooLong(t *testing.T) {
	req := CreateCompanyRequest{
		CompanyName: "탑솔라에너지",
		CompanyCode: "12345678901",
	}
	msg := req.Validate()
	if msg == "" {
		t.Fatal("11자 CompanyCode에 대해 에러가 반환되어야 합니다")
	}
	if !strings.Contains(msg, "10") {
		t.Fatalf("에러 메시지에 '10'이 포함되어야 합니다, got: %s", msg)
	}
}

// TestValidate_Success — 정상 데이터일 때 빈 문자열 반환 확인
func TestValidate_Success(t *testing.T) {
	req := CreateCompanyRequest{
		CompanyName: "탑솔라에너지",
		CompanyCode: "TSE",
	}
	msg := req.Validate()
	if msg != "" {
		t.Fatalf("정상 데이터에서 에러가 반환되면 안 됩니다, got: %s", msg)
	}
}
