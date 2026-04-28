#!/usr/bin/env bash
# Rust 계산엔진 빌드 + 코드서명 + launchd 재시작
# 사용법: ./scripts/apply_rust.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE_DIR="${ROOT_DIR}/engine"
BINARY_PATH="${ENGINE_DIR}/target/release/solarflow-engine"
SERVICE_LABEL="${SOLARFLOW_ENGINE_LABEL:-com.solarflow.engine}"

echo "SolarFlow Rust apply"
echo "engine: ${ENGINE_DIR}"

cd "${ENGINE_DIR}"
cargo build --release

if command -v codesign >/dev/null 2>&1; then
  codesign -f -s - "${BINARY_PATH}"
else
  echo "skip codesign: codesign command not found"
fi

if command -v launchctl >/dev/null 2>&1; then
  launchctl stop "${SERVICE_LABEL}" || true
  launchctl start "${SERVICE_LABEL}"
else
  echo "skip launchd: launchctl command not found"
fi

echo "Rust engine apply completed."
