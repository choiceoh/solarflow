#!/usr/bin/env bash
# Go 백엔드 빌드 + 코드서명 + launchd 재반영
# 사용법: ./scripts/apply_go.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
BINARY_PATH="${BACKEND_DIR}/solarflow-go"
PLIST_PATH="${SOLARFLOW_GO_PLIST:-${HOME}/Library/LaunchAgents/com.solarflow.go.plist}"
GUI_UID="${SOLARFLOW_GUI_UID:-$(id -u)}"

echo "SolarFlow Go apply"
echo "backend: ${BACKEND_DIR}"

cd "${BACKEND_DIR}"
go build -o "${BINARY_PATH}" .

if command -v codesign >/dev/null 2>&1; then
  codesign -f -s - "${BINARY_PATH}"
else
  echo "skip codesign: codesign command not found"
fi

if command -v launchctl >/dev/null 2>&1 && [[ -f "${PLIST_PATH}" ]]; then
  launchctl bootout "gui/${GUI_UID}" "${PLIST_PATH}" 2>/dev/null || true
  launchctl bootstrap "gui/${GUI_UID}" "${PLIST_PATH}"
else
  echo "skip launchd: launchctl or plist not available (${PLIST_PATH})"
fi

echo "Go backend apply completed."
