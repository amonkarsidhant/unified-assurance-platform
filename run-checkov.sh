#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts/latest"
mkdir -p "$ART_DIR"

STATUS_FILE="$ART_DIR/iac_policy.status"
LOG_FILE="$ART_DIR/iac_policy.log"
REPORT_FILE="$ART_DIR/checkov.json"
MODE="${ASSURANCE_MODE:-pragmatic}"
IAC_DIR="${CHECKOV_DIR:-$ROOT_DIR/examples/iac/sample-terraform}"

log(){ echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }
skip(){ log "SKIPPED: $1" | tee "$LOG_FILE"; echo "skipped" > "$STATUS_FILE"; exit 0; }
pass(){ log "PASS: checkov" | tee -a "$LOG_FILE"; echo "pass" > "$STATUS_FILE"; }
fail(){ log "FAIL: checkov" | tee -a "$LOG_FILE"; echo "fail" > "$STATUS_FILE"; exit 1; }

if ! command -v checkov >/dev/null 2>&1; then
  skip "checkov not installed (mode=$MODE)"
fi
if [ ! -d "$IAC_DIR" ]; then
  skip "IaC directory missing: $IAC_DIR"
fi

log "Running checkov IaC policy check" > "$LOG_FILE"
if checkov -d "$IAC_DIR" -o json > "$REPORT_FILE" 2>> "$LOG_FILE"; then
  pass
else
  cat "$REPORT_FILE" >> "$LOG_FILE" 2>/dev/null || true
  fail
fi
