# SolarFlow 3.0 STATUS (2026-04-05)

## 역할 체계

- **Alex**: 프로젝트 리더. 기획조정실 3팀. 비개발자. 무역/수입 전문가. 비유 기반 설명 선호.
- **재이(설계시공자)**: Claude. TASK 작성 + 방향 설정 + 시공자 지시. Alex는 "재이"로 호출.
- **감리자**: 별도 Claude 대화창. 코드 검토/승인/지적/점수 판정. TASK를 직접 작성하지 않음.
- **시공자(Claude Code)**: 터미널에서 코드 작성/빌드/테스트 실행.

## 작업 흐름

재이가 TASK 작성 → 감리자 검토/승인 → Alex가 TASK 파일을 `cat >` 로 생성 → Claude Code 실행 → 감리자 평가 → 다음 Step.

터미널 구성: 터미널 1=Claude Code, 터미널 2=서버 SSH(`ubuntu@54.180.140.18`), 터미널 3=Mac 로컬 작업.

## 현재 Phase/Step

Phase 4 완료 + Mac mini 로컬 완전 이전 완료. 재부팅 테스트 성공. 실데이터 이관 + 기능 검증 남음.

## 인프라

- **서버**: Mac mini 로컬 (이전: AWS Lightsail 서울)
- **Go 백엔드**: localhost:8080
- **Rust 엔진**: localhost:8081
- **PostgREST**: localhost:3000 (로컬 PostgreSQL 앞단, D-075)
- **Caddy**: localhost:3001 (PostgREST 경로변환, /rest/v1/* strip, D-076) + localhost:5173 (프론트 정적서빙 + /api/* Go 프록시, D-079)
- **DB**: 로컬 PostgreSQL, RLS 비활성화
- **인증**: Supabase Auth (인증만) + ES256 JWKS + HMAC 폴백 + auto-provision (D-077)
- **외부접속**: Tailscale VPN — 100.123.70.19:5173 (D-078)
- **CORS**: Caddy 프록시로 우회, 별도 설정 불필요
- **자동시작**: launchd 5개 서비스 (Go, Rust, PostgREST, Caddy, PostgreSQL)

## 배포 방법 (코드 변경 시 — Mac mini 로컬)

**Go 변경:**
```bash
cd ~/solarflow-3/backend && go build -o solarflow-go . && launchctl kickstart -k gui/$(id -u)/com.solarflow.go
```

**Rust 변경:**
```bash
cd ~/solarflow-3/engine && cargo build --release && launchctl kickstart -k gui/$(id -u)/com.solarflow.engine
```

**프론트 변경:**
```bash
cd ~/solarflow-3/frontend && npm run build
# Caddy가 dist/ 직접 서빙하므로 빌드만 하면 반영됨
```

## 테스트 현황

Go: 116 PASS, Rust: 75 PASS, 총: 191 PASS. 프론트 빌드 0에러. 린터 0건.

## DECISIONS 요약 (D-001~D-079)

주요: D-001 Go+Rust 분리, D-051 프론트→Go→Rust, D-054 CalcProxy, D-055 user_profiles(user_id,name), D-060 즉시수정, D-065 Import map허용, D-072 Lightsail서울, D-073 solarflow3.com, D-074 Caddy SSL, D-075 PostgREST로컬, D-076 Caddy경로변환, D-077 auto-provision, D-078 Tailscale, D-079 프론트정적서빙.

## 남은 작업

1. 실데이터 이관: 마스터(법인3, 제조사15, 품번20, 거래처10, 창고6, 은행5) + 거래데이터(입고3+출고3+매출2+수주2+PO1)
2. 기능 검증 체크리스트 (인증/마스터/재고/입고/발주/출고/수주/면장/은행/대시보드/엑셀/결재안/메모검색알림)
3. PROGRESS.md 최종 마무리

## Phase 4 완료 이력

Step 20~31 전부 감리 합격. Step 32 배포 완료. Step 33 Lightsail 이전 완료. Step 34 Mac mini 로컬 이전 완료.
