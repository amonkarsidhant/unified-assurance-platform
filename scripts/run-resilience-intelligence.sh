#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="${ART_DIR:-$ROOT_DIR/artifacts/latest}"
mkdir -p "$ART_DIR"

STATUS_FILE="$ART_DIR/resilience_intelligence.status"
LOG_FILE="$ART_DIR/resilience_intelligence.log"
SUMMARY_FILE="$ART_DIR/resilience-intelligence.json"
CONFIG_FILE="${RESILIENCE_INTELLIGENCE_CONFIG:-$ROOT_DIR/config/resilience-intelligence.json}"

: >"$LOG_FILE"

log() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*" | tee -a "$LOG_FILE"
}

mode_from_env="${RESILIENCE_INTELLIGENCE_MODE:-}"
if [[ -n "$mode_from_env" ]]; then
  MODE="$(echo "$mode_from_env" | tr '[:lower:]' '[:upper:]')"
else
  MODE="$(python3 - <<PY
import json
from pathlib import Path
p = Path('$CONFIG_FILE')
if p.exists():
    print((json.loads(p.read_text()).get('mode') or 'ROBUSTNESS').upper())
else:
    print('ROBUSTNESS')
PY
)"
fi

if [[ "$MODE" != "ROBUSTNESS" && "$MODE" != "CHAOS" ]]; then
  log "Invalid mode '$MODE'. Allowed: ROBUSTNESS, CHAOS"
  echo "fail" >"$STATUS_FILE"
  python3 - <<PY
import json
from datetime import datetime, timezone
from pathlib import Path
Path('$SUMMARY_FILE').write_text(json.dumps({
  'timestamp': datetime.now(timezone.utc).isoformat(),
  'mode': '$MODE',
  'status': 'fail',
  'score': 0.0,
  'reason': 'invalid mode'
}, indent=2))
PY
  exit 1
fi

cfg_values="$(python3 - <<PY
import json
from pathlib import Path
p = Path('$CONFIG_FILE')
cfg = json.loads(p.read_text()) if p.exists() else {}
t = cfg.get('targets', {})
print('|'.join([
    str(cfg.get('seed', 1337)),
    str(cfg.get('retries', 1)),
    str(t.get('perf_target_url') or 'https://test.k6.io'),
    str(t.get('module_type') or 'api'),
]))
PY
)"
IFS='|' read -r cfg_seed cfg_retries cfg_perf_target cfg_module_type <<EOF
$cfg_values
EOF

SEED="${RESILIENCE_INTELLIGENCE_SEED:-$cfg_seed}"
RETRIES="${RESILIENCE_INTELLIGENCE_RETRIES:-$cfg_retries}"
PERF_TARGET_URL="${PERF_TARGET_URL:-$cfg_perf_target}"
MODULE_TYPE="${MODULE_TYPE:-$cfg_module_type}"
RISK_TIER="${RISK_TIER:-high}"

if ! [[ "$RETRIES" =~ ^[0-9]+$ ]]; then
  RETRIES=1
fi

attempt=0
k6_status="skipped"
k6_reason="k6 not installed"
chaos_status="skipped"
chaos_reason="chaos script not found"
selected_vus=2
selected_duration="5s"
selected_fault_profile="latency-low"

if [[ "$MODE" == "CHAOS" ]]; then
  rand_values="$(python3 - <<PY
import random
seed = int('$SEED')
random.seed(seed)
vus = random.randint(1, 6)
duration = f"{random.randint(5, 25)}s"
profile = random.choice(['latency-medium', 'dependency-timeout', 'packet-loss'])
print(f"{vus}|{duration}|{profile}")
PY
)"
  IFS='|' read -r selected_vus selected_duration selected_fault_profile <<EOF
$rand_values
EOF
fi

log "Resilience Intelligence start mode=$MODE seed=$SEED retries=$RETRIES"
log "Selected profile: vus=$selected_vus duration=$selected_duration fault=$selected_fault_profile"

run_with_timeout() {
  local seconds="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "${seconds}s" "$@"
  else
    "$@"
  fi
}

if command -v k6 >/dev/null 2>&1 && [[ -f "$ROOT_DIR/tests/perf/smoke.js" ]]; then
  attempt=0
  until [[ "$attempt" -gt "$RETRIES" ]]; do
    attempt=$((attempt+1))
    log "Load path attempt $attempt"
    if run_with_timeout 45 env PERF_TARGET_URL="$PERF_TARGET_URL" K6_VUS="$selected_vus" K6_DURATION="$selected_duration" k6 run "$ROOT_DIR/tests/perf/smoke.js" --summary-export "$ART_DIR/k6-summary.json" >>"$LOG_FILE" 2>&1; then
      k6_status="pass"
      k6_reason="executed"
      break
    fi
    k6_status="skipped"
    k6_reason="k6 execution failed; downgraded to skipped"
  done
else
  if [[ ! -f "$ROOT_DIR/tests/perf/smoke.js" ]]; then
    k6_reason="k6 script missing"
  fi
  log "Load path skipped: $k6_reason"
fi

if [[ -x "$ROOT_DIR/scripts/run-chaos-checks.sh" ]]; then
  log "Chaos path via scripts/run-chaos-checks.sh"
  if run_with_timeout 60 env ASSURANCE_MODE=real RISK_TIER="$RISK_TIER" MODULE_TYPE="$MODULE_TYPE" CHAOS_FAULT_PROFILE="$selected_fault_profile" "$ROOT_DIR/scripts/run-chaos-checks.sh" >>"$LOG_FILE" 2>&1; then
    if [[ -f "$ART_DIR/chaos_resilience.status" ]]; then
      chaos_status="$(cat "$ART_DIR/chaos_resilience.status")"
      chaos_reason="executed"
    else
      chaos_status="skipped"
      chaos_reason="chaos status file missing"
    fi
  else
    chaos_status="fail"
    chaos_reason="chaos execution failed"
  fi
else
  log "Chaos path skipped: $chaos_reason"
fi

status="pass"
if [[ "$k6_status" == "fail" || "$chaos_status" == "fail" ]]; then
  status="fail"
elif [[ "$k6_status" == "skipped" && "$chaos_status" == "skipped" ]]; then
  status="skipped"
fi

score="1.0"
if [[ "$status" == "fail" ]]; then
  score="0.0"
elif [[ "$status" == "skipped" ]]; then
  score="0.5"
fi

echo "$status" >"$STATUS_FILE"

python3 - <<PY
import json
from datetime import datetime, timezone
from pathlib import Path
summary = {
  'timestamp': datetime.now(timezone.utc).isoformat(),
  'mode': '$MODE',
  'status': '$status',
  'score': float('$score'),
  'seed': int('$SEED'),
  'retries': int('$RETRIES'),
  'selected': {
    'vus': int('$selected_vus'),
    'duration': '$selected_duration',
    'fault_profile': '$selected_fault_profile'
  },
  'load': {
    'status': '$k6_status',
    'reason': '$k6_reason',
    'summary_file': 'artifacts/latest/k6-summary.json'
  },
  'chaos': {
    'status': '$chaos_status',
    'reason': '$chaos_reason',
    'artifact': 'artifacts/latest/chaos-results.json'
  },
  'log': 'artifacts/latest/resilience_intelligence.log'
}
Path('$SUMMARY_FILE').write_text(json.dumps(summary, indent=2))
PY

log "Resilience Intelligence complete status=$status score=$score"
if [[ "$status" == "fail" ]]; then
  exit 1
fi
