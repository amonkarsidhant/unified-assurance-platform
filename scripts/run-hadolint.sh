#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts/latest"
mkdir -p "$ART_DIR"

STATUS_FILE="$ART_DIR/dockerfile_policy.status"
LOG_FILE="$ART_DIR/dockerfile_policy.log"
REPORT_FILE="$ART_DIR/hadolint.json"
MODE="${ASSURANCE_MODE:-pragmatic}"
DOCKERFILE_PATH="${HADOLINT_FILE:-$ROOT_DIR/examples/docker/Dockerfile.sample}"

log(){ echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }
skip(){ log "SKIPPED: $1" | tee "$LOG_FILE"; echo "skipped" > "$STATUS_FILE"; exit 0; }
pass(){ log "PASS: hadolint" | tee -a "$LOG_FILE"; echo "pass" > "$STATUS_FILE"; }
fail(){ log "FAIL: hadolint" | tee -a "$LOG_FILE"; echo "fail" > "$STATUS_FILE"; exit 1; }

if ! command -v hadolint >/dev/null 2>&1; then
  skip "hadolint not installed (mode=$MODE)"
fi
if [ ! -f "$DOCKERFILE_PATH" ]; then
  skip "Dockerfile asset missing: $DOCKERFILE_PATH"
fi

log "Running hadolint Dockerfile policy check" > "$LOG_FILE"
if hadolint -f json "$DOCKERFILE_PATH" > "$REPORT_FILE" 2>> "$LOG_FILE"; then
  pass
else
  cat "$REPORT_FILE" >> "$LOG_FILE" 2>/dev/null || true
  fail
fi
