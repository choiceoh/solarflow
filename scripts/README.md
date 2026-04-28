# SolarFlow 개발 스크립트

반복 검증과 로컬 서비스 반영 시간을 줄이기 위한 루트 스크립트입니다.

## 전체 검증

```bash
./scripts/verify_all.sh
```

실행 항목:
- Go: build, vet, test
- Go 규칙: `backend/scripts/lint_rules.sh` advisory 실행
- Go Request 구조체와 DB 컬럼 동기화: `backend/scripts/check_schema.sh`
- Rust: cargo test
- Frontend: npm run build

선택 옵션:

```bash
SKIP_SCHEMA=1 ./scripts/verify_all.sh
SKIP_GO_TEST=1 SKIP_RUST_TEST=1 ./scripts/verify_all.sh
STRICT_RULES=1 ./scripts/verify_all.sh
RUN_GRAPHIFY=1 ./scripts/verify_all.sh
```

현재 코드베이스에는 기존 RULES lint 부채가 남아 있어 기본 실행에서는 advisory로 표시합니다.
신규 작업에서 규칙 위반을 차단해야 할 때는 `STRICT_RULES=1`을 사용합니다.

## 서비스 반영

```bash
./scripts/apply_go.sh
./scripts/apply_rust.sh
./scripts/apply_frontend.sh
```

Go/Rust 스크립트는 macOS의 `codesign`과 `launchctl`이 있으면 자동으로 코드서명과 서비스 재반영까지 수행합니다.
