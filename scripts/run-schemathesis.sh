#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts/latest"
mkdir -p "$ART_DIR"

STATUS_FILE="$ART_DIR/api_fuzz_contract.status"
LOG_FILE="$ART_DIR/api_fuzz_contract.log"
MODE="${ASSURANCE_MODE:-pragmatic}"
OPENAPI_FILE="${SCHEMATHESIS_OPENAPI_FILE:-$ROOT_DIR/examples/openapi/sample-openapi.yaml}"
SCHEMATHESIS_DRY_RUN="${SCHEMATHESIS_DRY_RUN:-1}"
SCHEMATHESIS_BASE_URL="${SCHEMATHESIS_BASE_URL:-}"

log(){ echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }
skip(){ log "SKIPPED: $1" | tee "$LOG_FILE"; echo "skipped" > "$STATUS_FILE"; exit 0; }
pass(){ log "PASS: schemathesis" | tee -a "$LOG_FILE"; echo "pass" > "$STATUS_FILE"; }
fail(){ log "FAIL: schemathesis" | tee -a "$LOG_FILE"; echo "fail" > "$STATUS_FILE"; exit 1; }

if ! command -v schemathesis >/dev/null 2>&1; then
  skip "schemathesis not installed (mode=$MODE)"
fi
if [ ! -f "$OPENAPI_FILE" ]; then
  skip "OpenAPI asset missing: $OPENAPI_FILE"
fi

log "Running schemathesis contract fuzz check" > "$LOG_FILE"
if [ "$SCHEMATHESIS_DRY_RUN" = "1" ]; then
  if schemathesis run "$OPENAPI_FILE" --dry-run >> "$LOG_FILE" 2>&1; then
    pass
  else
    fail
  fi
else
  if [ -z "$SCHEMATHESIS_BASE_URL" ]; then
    skip "SCHEMATHESIS_BASE_URL not set (required when SCHEMATHESIS_DRY_RUN=0)"
  fi
  if schemathesis run "$OPENAPI_FILE" --url "$SCHEMATHESIS_BASE_URL" >> "$LOG_FILE" 2>&1; then
    pass
  else
    fail
  fi
fi
