#!/bin/bash
# RULES.md 위반 자동 검출 스크립트
# 검출 대상: internal/ 하위 .go 파일 (_test.go 제외)
# 위반 0건이면 exit 0, 있으면 exit 1

set -euo pipefail

VIOLATIONS=0

echo "=== RULES.md 위반 검출 시작 ==="
echo ""

# 검출 대상 파일 목록 (internal/ 하위 .go, _test.go 제외)
FILES=$(find internal/ -name '*.go' ! -name '*_test.go' -type f)

# 1. map[string]interface 사용 검출
echo "[검사 1] map[string]interface 사용 여부"
while IFS= read -r file; do
    while IFS=: read -r line_num content; do
        echo "  위반: ${file}:${line_num} — ${content}"
        VIOLATIONS=$((VIOLATIONS + 1))
    done < <(grep -n 'map\[string\]interface' "$file" 2>/dev/null || true)
done <<< "$FILES"

# 2. 문자열 붙이기 에러 응답 검출: {"error":" 패턴
echo "[검사 2] 문자열 붙이기 에러 응답 여부"
while IFS= read -r file; do
    while IFS=: read -r line_num content; do
        echo "  위반: ${file}:${line_num} — ${content}"
        VIOLATIONS=$((VIOLATIONS + 1))
    done < <(grep -n '{"error":"' "$file" 2>/dev/null || true)
done <<< "$FILES"

# 3. json.Unmarshal 호출 후 에러 미처리 검출
# 패턴: json.Unmarshal(... 로 시작하는 줄에서 에러를 변수에 할당하지 않는 경우
echo "[검사 3] json.Unmarshal 에러 미처리 여부"
while IFS= read -r file; do
    while IFS=: read -r line_num content; do
        # "if err :=" 또는 "err =" 패턴이 없는 json.Unmarshal 호출 검출
        if ! echo "$content" | grep -qE '(if err|err\s*[=:])'; then
            echo "  위반: ${file}:${line_num} — ${content}"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    done < <(grep -n 'json\.Unmarshal' "$file" 2>/dev/null || true)
done <<< "$FILES"

echo ""
echo "=== 검출 결과: 총 ${VIOLATIONS}건 위반 ==="

if [ "$VIOLATIONS" -gt 0 ]; then
    echo "❌ RULES.md 위반이 발견되었습니다. 수정 후 다시 실행하세요."
    exit 1
else
    echo "✅ RULES.md 위반 없음 — 모든 검사 통과"
    exit 0
fi
