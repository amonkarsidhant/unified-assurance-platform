#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts/latest"
mkdir -p "$ART_DIR"

STATUS_FILE="$ART_DIR/secret_scan.status"
LOG_FILE="$ART_DIR/secret_scan.log"
REPORT_FILE="$ART_DIR/gitleaks.json"
MODE="${ASSURANCE_MODE:-pragmatic}"

log(){ echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }
skip(){ log "SKIPPED: $1" | tee "$LOG_FILE"; echo "skipped" > "$STATUS_FILE"; exit 0; }
pass(){ log "PASS: gitleaks" | tee -a "$LOG_FILE"; echo "pass" > "$STATUS_FILE"; }
fail(){ log "FAIL: gitleaks" | tee -a "$LOG_FILE"; echo "fail" > "$STATUS_FILE"; exit 1; }

if ! command -v gitleaks >/dev/null 2>&1; then
  skip "gitleaks not installed (mode=$MODE)"
fi

log "Running gitleaks secret scan" > "$LOG_FILE"
if gitleaks detect --source "$ROOT_DIR" --no-git --redact --report-format json --report-path "$REPORT_FILE" >> "$LOG_FILE" 2>&1; then
  pass
else
  fail
fi
