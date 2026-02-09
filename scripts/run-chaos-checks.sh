#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="${ART_DIR:-$ROOT_DIR/artifacts/latest}"
mkdir -p "$ART_DIR"

MODE="${ASSURANCE_MODE:-pragmatic}" # pragmatic|real
RISK_TIER="${RISK_TIER:-${ASSURANCE_RISK_TIER:-${1:-high}}}"
MODULE_TYPE="${MODULE_TYPE:-${2:-api}}" # api|frontend|worker|shared-lib
CHAOS_EXPERIMENT="${CHAOS_EXPERIMENT:-$ROOT_DIR/templates/chaos/chaos-experiment-template.yaml}"

log() { echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }
has_cmd() { command -v "$1" >/dev/null 2>&1; }

required=false
if [[ "$RISK_TIER" == "high" || "$RISK_TIER" == "critical" ]]; then
  required=true
fi

case "$MODULE_TYPE" in
  api) required_scenarios_csv="network_latency,dependency_timeout,queue_backlog" ;;
  frontend) required_scenarios_csv="network_latency,dependency_timeout" ;;
  worker) required_scenarios_csv="process_kill,queue_backlog,resource_stress" ;;
  shared-lib) required_scenarios_csv="dependency_timeout,resource_stress" ;;
  *) required_scenarios_csv="network_latency,dependency_timeout" ;;
esac

executed_csv=""
skipped_csv=""
failed_csv=""
reasons_csv=""

append_csv() {
  local var_name="$1" value="$2"
  local current="${!var_name:-}"
  if [[ -z "$current" ]]; then
    printf -v "$var_name" '%s' "$value"
  else
    printf -v "$var_name" '%s,%s' "$current" "$value"
  fi
}

if has_cmd chaos; then
  if [[ "$MODE" == "real" ]]; then
    if chaos run "$CHAOS_EXPERIMENT" >"$ART_DIR/chaos-chaos_toolkit.log" 2>&1; then
      append_csv executed_csv "chaos_toolkit"
    else
      append_csv failed_csv "chaos_toolkit"
      append_csv reasons_csv "chaos toolkit execution failed"
    fi
  else
    echo "pragmatic mode simulated chaos toolkit" >"$ART_DIR/chaos-chaos_toolkit.log"
    append_csv skipped_csv "chaos_toolkit"
    append_csv reasons_csv "pragmatic mode: chaos toolkit run simulated"
  fi
else
  echo "chaos toolkit not installed" >"$ART_DIR/chaos-chaos_toolkit.log"
  append_csv skipped_csv "chaos_toolkit"
  append_csv reasons_csv "chaos toolkit not installed"
fi

for tool in toxiproxy-cli pumba stress-ng; do
  if has_cmd "$tool"; then
    echo "$tool detected; manual safe runbook execution required" >"$ART_DIR/chaos-${tool}.log"
    append_csv skipped_csv "$tool"
    append_csv reasons_csv "$tool present but not auto-executed in safe mode"
  else
    echo "$tool not installed" >"$ART_DIR/chaos-${tool}.log"
    append_csv skipped_csv "$tool"
    append_csv reasons_csv "$tool not installed"
  fi
done

chaos_status="pass"
if [[ -n "$failed_csv" ]]; then
  chaos_status="fail"
elif $required && [[ -z "$executed_csv" ]]; then
  chaos_status="skipped"
fi

echo "$chaos_status" >"$ART_DIR/chaos_resilience.status"

export ART_DIR MODE RISK_TIER MODULE_TYPE REQUIRED_BOOL="$required" REQUIRED_SCENARIOS_CSV="$required_scenarios_csv" EXECUTED_CSV="$executed_csv" SKIPPED_CSV="$skipped_csv" FAILED_CSV="$failed_csv" REASONS_CSV="$reasons_csv" CHAOS_STATUS="$chaos_status"
python3 - <<'PY'
import json
import os
from datetime import datetime, timezone
from pathlib import Path

def to_list(csv_val: str):
    if not csv_val:
        return []
    return [x.strip() for x in csv_val.split(",") if x.strip()]

art = Path(os.environ["ART_DIR"])
out = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "mode": os.environ["MODE"],
    "risk_tier": os.environ["RISK_TIER"],
    "module_type": os.environ["MODULE_TYPE"],
    "required": os.environ.get("REQUIRED_BOOL", "false") == "true",
    "required_scenarios": to_list(os.environ.get("REQUIRED_SCENARIOS_CSV", "")),
    "executed_scenarios": to_list(os.environ.get("EXECUTED_CSV", "")),
    "skipped_scenarios": to_list(os.environ.get("SKIPPED_CSV", "")),
    "failed_scenarios": to_list(os.environ.get("FAILED_CSV", "")),
    "reasons": to_list(os.environ.get("REASONS_CSV", "")),
    "status": os.environ["CHAOS_STATUS"],
    "logs": {
        "chaos_toolkit": "artifacts/latest/chaos-chaos_toolkit.log",
        "toxiproxy": "artifacts/latest/chaos-toxiproxy-cli.log",
        "pumba": "artifacts/latest/chaos-pumba.log",
        "stress_ng": "artifacts/latest/chaos-stress-ng.log"
    }
}
(art / "chaos-results.json").write_text(json.dumps(out, indent=2))
PY

log "Chaos checks complete: status=$chaos_status (required=$required, module_type=$MODULE_TYPE)"
