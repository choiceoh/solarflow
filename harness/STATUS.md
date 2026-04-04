# SolarFlow 3.0 STATUS (2026-04-04)

## 역할 체계

- **Alex**: 프로젝트 리더. 기획조정실 3팀. 비개발자. 무역/수입 전문가. 비유 기반 설명 선호.
- **재이(설계시공자)**: Claude. TASK 작성 + 방향 설정 + 시공자 지시. Alex는 "재이"로 호출.
- **감리자**: 별도 Claude 대화창. 코드 검토/승인/지적/점수 판정. TASK를 직접 작성하지 않음.
- **시공자(Claude Code)**: 터미널에서 코드 작성/빌드/테스트 실행.

## 작업 흐름

재이가 TASK 작성 → 감리자 검토/승인 → Alex가 TASK 파일을 `cat >` 로 생성 → Claude Code 실행 → 감리자 평가 → 다음 Step.

터미널 구성: 터미널 1=Claude Code, 터미널 2=서버 SSH(`ubuntu@54.180.140.18`), 터미널 3=Mac 로컬 작업.

## 현재 Phase/Step

Phase 4 Step 32 진행 중. 배포 완료 + 서버 이전 완료. 실데이터 이관 + 기능 검증 남음.

## 인프라

- **Go+Rust**: AWS Lightsail 서울 `54.180.140.18` (2GB/2vCPU/60GB, $12/월)
- **배포 방식**: 직접 바이너리 + systemd + Caddy SSL (Docker 미사용)
- **바이너리 위치**: `/opt/solarflow/solarflow-go`, `/opt/solarflow/solarflow-engine`
- **환경변수**: `/opt/solarflow/.env`
- **도메인**: `api.solarflow3.com`(백엔드), `app.solarflow3.com`(프론트)
- **프론트**: Cloudflare Pages (`solarflow-3` 프로젝트), `wrangler pages deploy dist --project-name=solarflow-3`
- **DB**: Supabase `solarflow-2` (`aalxpmfnsjzmhsfkuxnp`), Session pooler, RLS 비활성화
- **Rust DB**: `SUPABASE_DB_URL` (Session pooler: `aws-1-ap-northeast-2.pooler.supabase.com:5432`)
- **인증**: ES256 JWKS + HMAC 폴백
- **SSH**: `ssh -i ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem ubuntu@54.180.140.18`

## 배포 방법 (코드 변경 시)

**Go 변경:**
```bash
cd ~/solarflow-3/backend && GOOS=linux GOARCH=amd64 go build -o solarflow-go-linux .
scp -i ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem solarflow-go-linux ubuntu@54.180.140.18:~/
# 서버에서:
sudo cp ~/solarflow-go-linux /opt/solarflow/solarflow-go && sudo systemctl restart solarflow-go
```

**Rust 변경:**
```bash
# 서버에서 직접 빌드:
cd ~/engine && cargo build --release
sudo cp target/release/solarflow-engine /opt/solarflow/ && sudo systemctl restart solarflow-engine
```

**프론트 변경:**
```bash
cd ~/solarflow-3/frontend && npm run build && npx wrangler pages deploy dist --project-name=solarflow-3 --commit-dirty=true
```

**Go+프론트 동시 변경:** 둘 다 배포 (항상!)

## 테스트 현황

Go: 116 PASS, Rust: 75 PASS, 총: 191 PASS. 프론트 빌드 0에러. 린터 0건.

## DECISIONS 요약 (D-001~D-074)

주요: D-001 Go+Rust 분리, D-051 프론트→Go→Rust, D-054 CalcProxy, D-055 user_profiles(user_id,name), D-060 즉시수정, D-065 Import map허용, D-072 Lightsail서울, D-073 solarflow3.com, D-074 Caddy SSL.

## 남은 작업

1. Fly.io 서비스 종료 (감리자 확인 후)
2. 실데이터 이관: 마스터(법인3, 제조사15, 품번20, 거래처10, 창고6, 은행5) + 거래데이터(입고3+출고3+매출2+수주2+PO1)
3. 기능 검증 체크리스트 (인증/마스터/재고/입고/발주/출고/수주/면장/은행/대시보드/엑셀/결재안/메모검색알림)
4. PROGRESS.md 최종 마무리

## Phase 4 완료 이력

Step 20~31 전부 감리 합격. Step 32 배포+이전 진행중.
