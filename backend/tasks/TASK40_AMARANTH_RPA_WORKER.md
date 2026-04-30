# TASK40 — 아마란스 웹 출고 업로드 RPA 워커

## 배경

아마란스 출고 업로드는 유료 API 대신 웹 화면 자동화로 처리한다. SolarFlow는 이미 실물 출고 엑셀 양식과 업로드 작업 대기열을 만든다. 이번 작업은 본격 배포 전 리허설 가능한 Playwright 워커를 추가해 실제 웹 업로드 흐름을 검증하는 것이다.

## 범위

### Go API

- `POST /api/v1/export/amaranth/jobs/{id}/claim`
  - `pending` 작업만 `running`으로 선점
  - `attempts` 증가
  - `rpa_started_at` 저장
  - 이미 선점/완료된 작업은 409
- `SOLARFLOW_AMARANTH_RPA_TOKEN`
  - `/api/v1/export/amaranth/*` 경로에서만 RPA 전용 operator 인증 허용
  - 다른 API 경로에는 적용하지 않음

### RPA 워커

- 위치: `rpa/amaranth-uploader`
- 실행:
  - `npm run login`
  - `npm run once`
  - `npm run watch`
- 자동화 순서:
  - 로그인 화면이면 `AMARANTH_AUTO_LOGIN=true`에서 회사코드/아이디/비밀번호 자동 입력
  - 아마란스 `출고등록엑셀업로드` 화면 진입
  - `기능모음`
  - `엑셀 업로드`
  - 파일 선택
  - `변환확인`
- 성공 확신이 없으면 `manual_required`
- 실패 시 스크린샷과 오류 코드를 남김
- 비밀번호는 자동화 전용 PC의 로컬 `.env`에만 저장하고 저장소에 포함하지 않음

## 비범위

- 2FA/보안모듈 우회
- Windows 시작프로그램 등록
- 매출마감 자동화
- 입고 자동화

## 완료 기준

- Go build/vet/test 통과
- RPA 워커 JS syntax check 통과
- `npm install --package-lock-only`로 의존성 잠금 생성
- 하네스 `PROGRESS.md`, `DECISIONS.md` 업데이트

## 리허설 기준

실제 운영 PC에서 아래 순서로 확인한다.

```bash
cd rpa/amaranth-uploader
npm install
npm run install:browsers
cp .env.example .env
npm run login
npm run once
```

리허설 성공 후에는 `npm run watch` 또는 Windows 시작프로그램 등록을 결정한다.
