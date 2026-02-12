#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="${ART_DIR:-$ROOT_DIR/artifacts/latest}"
mkdir -p "$ART_DIR"

STATUS_FILE="$ART_DIR/resilience_intelligence.status"
LOG_FILE="$ART_DIR/resilience_intelligence.log"
SUMMARY_FILE="$ART_DIR/resilience-intelligence.json"
CONFIG_FILE="${RESILIENCE_INTELLIGENCE_CONFIG:-$ROOT_DIR/config/resilience-intelligence.json}"
ADAPTERS_DIR="$ROOT_DIR/scripts/adapters/resilience"
ADAPTER_VALIDATOR="$ROOT_DIR/scripts/validate-resilience-adapter.py"

: >"$LOG_FILE"

log() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*" | tee -a "$LOG_FILE"
}

if ! command -v jq >/dev/null 2>&1; then
  log "jq not installed; resilience intelligence requires jq for config/summary parsing"
  echo "skipped" >"$STATUS_FILE"
  cat >"$SUMMARY_FILE" <<'JSON'
{"status":"skipped","reason":"jq not installed","correlation":{"status":"unknown","score":0,"explanation":"jq unavailable"}}
JSON
  exit 0
fi

cfg_get() {
  local key="$1" fallback="$2"
  if [[ -f "$CONFIG_FILE" ]]; then
    jq -r "$key // \"$fallback\"" "$CONFIG_FILE" 2>/dev/null || echo "$fallback"
  else
    echo "$fallback"
  fi
}

mode_from_env="${RESILIENCE_INTELLIGENCE_MODE:-}"
if [[ -n "$mode_from_env" ]]; then
  MODE="${mode_from_env^^}"
else
  MODE="$(tr '[:lower:]' '[:upper:]' <<< "$(cfg_get '.mode' 'ROBUSTNESS')")"
fi

if [[ "$MODE" != "ROBUSTNESS" && "$MODE" != "CHAOS" ]]; then
  log "Invalid mode '$MODE'. Allowed: ROBUSTNESS, CHAOS"
  echo "fail" >"$STATUS_FILE"
  jq -n --arg ts "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" --arg mode "$MODE" '{timestamp:$ts,mode:$mode,status:"fail",score:0.0,reason:"invalid mode",correlation:{status:"unknown",score:0,explanation:"invalid mode"}}' >"$SUMMARY_FILE"
  exit 1
fi

cfg_seed="$(cfg_get '.seed' '1337')"
cfg_attempts="$(cfg_get '.retries' '1')"
cfg_perf_target="$(cfg_get '.targets.perf_target_url' 'https://test.k6.io')"
cfg_module_type="$(cfg_get '.targets.module_type' 'api')"
cfg_k6_timeout="$(cfg_get '.timeouts.k6_seconds' '45')"
cfg_chaos_timeout="$(cfg_get '.timeouts.chaos_seconds' '60')"
cfg_max_error_rate="$(cfg_get '.thresholds.max_error_rate' '0.05')"
cfg_min_pass_rate="$(cfg_get '.thresholds.min_pass_rate' '0.90')"
cfg_scenario="$(cfg_get '.scenario_template' 'robustness-fixed')"

SEED_RAW="${RESILIENCE_INTELLIGENCE_SEED:-$cfg_seed}"
MAX_ATTEMPTS="${RESILIENCE_INTELLIGENCE_MAX_ATTEMPTS:-$cfg_attempts}"
PERF_TARGET_URL="${PERF_TARGET_URL:-$cfg_perf_target}"
MODULE_TYPE="${MODULE_TYPE:-$cfg_module_type}"
RISK_TIER="${RISK_TIER:-high}"
K6_TIMEOUT_SECONDS="${RESILIENCE_INTELLIGENCE_K6_TIMEOUT_SECONDS:-$cfg_k6_timeout}"
CHAOS_TIMEOUT_SECONDS="${RESILIENCE_INTELLIGENCE_CHAOS_TIMEOUT_SECONDS:-$cfg_chaos_timeout}"
MAX_ERROR_RATE="${RESILIENCE_INTELLIGENCE_MAX_ERROR_RATE:-$cfg_max_error_rate}"
MIN_PASS_RATE="${RESILIENCE_INTELLIGENCE_MIN_PASS_RATE:-$cfg_min_pass_rate}"
SELECTED_SCENARIO="${RESILIENCE_INTELLIGENCE_SCENARIO:-$cfg_scenario}"

SEED="$SEED_RAW"
if ! [[ "$SEED" =~ ^[0-9]+$ ]]; then
  fallback_seed="$cfg_seed"
  if ! [[ "$fallback_seed" =~ ^[0-9]+$ ]]; then
    fallback_seed=0
  fi
  log "Invalid seed '$SEED_RAW'; defaulting to $fallback_seed"
  SEED="$fallback_seed"
fi

if ! [[ "$MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || [[ "$MAX_ATTEMPTS" -lt 1 ]]; then
  MAX_ATTEMPTS=1
fi

k6_status="skipped"
k6_reason="k6 not installed"
chaos_status="skipped"
chaos_reason="chaos script not found"
selected_vus=2
selected_duration="5s"
selected_fault_profile="latency-low"
k6_error_rate=""
k6_pass_rate=""

if [[ "$MODE" == "CHAOS" ]]; then
  RANDOM="$SEED"
  selected_vus=$((1 + RANDOM % 6))
  selected_duration="$((5 + RANDOM % 21))s"
  fault_profiles=("latency-medium" "dependency-timeout" "packet-loss")
  selected_fault_profile="${fault_profiles[$((RANDOM % ${#fault_profiles[@]}))]}"
fi

log "Resilience Intelligence start mode=$MODE seed=$SEED attempts=$MAX_ATTEMPTS scenario=$SELECTED_SCENARIO"
log "Selected profile: vus=$selected_vus duration=$selected_duration fault=$selected_fault_profile"

run_with_timeout() {
  local seconds="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "${seconds}s" "$@"
  else
    "$@"
  fi
}

evaluate_k6_thresholds() {
  local summary_path="$1"
  if [[ ! -f "$summary_path" ]]; then
    return 0
  fi

  local observed_error observed_pass
  observed_error="$(jq -r '.metrics.http_req_failed.values.rate // 0' "$summary_path" 2>/dev/null || echo 0)"
  observed_pass="$(jq -r '.metrics.checks.values.rate // 1' "$summary_path" 2>/dev/null || echo 1)"

  k6_error_rate="$observed_error"
  k6_pass_rate="$observed_pass"

  if ! awk -v e="$observed_error" -v max="$MAX_ERROR_RATE" 'BEGIN{exit !(e <= max)}'; then
    k6_status="fail"
    k6_reason="k6 threshold failed: error_rate=${observed_error} > max_error_rate=${MAX_ERROR_RATE}"
    return 1
  fi

  if ! awk -v p="$observed_pass" -v min="$MIN_PASS_RATE" 'BEGIN{exit !(p >= min)}'; then
    k6_status="fail"
    k6_reason="k6 threshold failed: pass_rate=${observed_pass} < min_pass_rate=${MIN_PASS_RATE}"
    return 1
  fi

  return 0
}

if command -v k6 >/dev/null 2>&1 && [[ -f "$ROOT_DIR/tests/perf/smoke.js" ]]; then
  attempt=1
  while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
    log "Load path attempt $attempt/$MAX_ATTEMPTS"
    if run_with_timeout "$K6_TIMEOUT_SECONDS" env PERF_TARGET_URL="$PERF_TARGET_URL" K6_VUS="$selected_vus" K6_DURATION="$selected_duration" k6 run "$ROOT_DIR/tests/perf/smoke.js" --summary-export "$ART_DIR/k6-summary.json" >>"$LOG_FILE" 2>&1; then
      k6_status="pass"
      k6_reason="executed"
      if ! evaluate_k6_thresholds "$ART_DIR/k6-summary.json"; then
        break
      fi
      break
    fi

    k6_status="fail"
    k6_reason="k6 execution failed on attempt $attempt/$MAX_ATTEMPTS"
    attempt=$((attempt+1))
  done
else
  if [[ ! -f "$ROOT_DIR/tests/perf/smoke.js" ]]; then
    k6_reason="k6 script missing"
  fi
  log "Load path skipped: $k6_reason"
fi

if [[ -x "$ROOT_DIR/scripts/run-chaos-checks.sh" ]]; then
  log "Chaos path via scripts/run-chaos-checks.sh"
  if run_with_timeout "$CHAOS_TIMEOUT_SECONDS" env ASSURANCE_MODE=real RISK_TIER="$RISK_TIER" MODULE_TYPE="$MODULE_TYPE" CHAOS_FAULT_PROFILE="$selected_fault_profile" "$ROOT_DIR/scripts/run-chaos-checks.sh" >>"$LOG_FILE" 2>&1; then
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

# Adapter framework (Phase 2)
adapter_inputs=()
if [[ -d "$ADAPTERS_DIR" && -r "$ADAPTERS_DIR" ]]; then
  while IFS= read -r adapter_path; do
    adapter_name="$(basename "$adapter_path")"
    adapter_out="$ART_DIR/resilience-adapter-${adapter_name%.*}.json"
    if run_with_timeout 20 env ART_DIR="$ART_DIR" "$adapter_path" >"$adapter_out" 2>>"$LOG_FILE"; then
      if env ART_DIR="$ART_DIR" python3 "$ADAPTER_VALIDATOR" --input "$adapter_out" >>"$LOG_FILE" 2>&1; then
        adapter_inputs+=("$adapter_out")
        log "Adapter OK: $adapter_name"
      else
        log "Adapter validation failed: $adapter_name"
        rm -f "$adapter_out"
      fi
    else
      log "Adapter execution failed: $adapter_name"
      rm -f "$adapter_out"
    fi
  done < <(find "$ADAPTERS_DIR" -maxdepth 1 -type f \( -name "*.sh" -o -name "*.py" \) | sort)
else
  log "Adapter directory unavailable: $ADAPTERS_DIR (skipping adapters)"
fi

if [[ ${#adapter_inputs[@]} -gt 0 ]]; then
  jq -s '.' "${adapter_inputs[@]}" >"$ART_DIR/resilience-adapters.json"
else
  echo '[]' >"$ART_DIR/resilience-adapters.json"
fi

load_degradation=""
if [[ -n "$k6_error_rate" ]]; then
  load_degradation="$k6_error_rate"
fi

adapter_degradation="$(jq -r '[.[] | .metrics.degradation? | select(.!=null)] | if length>0 then (add/length) else empty end' "$ART_DIR/resilience-adapters.json" 2>/dev/null || true)"
if [[ -z "$load_degradation" && -n "$adapter_degradation" ]]; then
  load_degradation="$adapter_degradation"
fi
if [[ -z "$load_degradation" ]]; then
  load_degradation="0"
fi

chaos_impact=0
[[ "$chaos_status" == "fail" ]] && chaos_impact=1

resilience_recovered=1
[[ "$k6_status" == "fail" || "$chaos_status" == "fail" ]] && resilience_recovered=0

correlation_score="$(python3 - <<PY
ld=float("$load_degradation")
ci=float("$chaos_impact")
rr=float("$resilience_recovered")
score=max(0.0,min(1.0, (0.55*(1-ld)) + (0.25*(1-ci)) + (0.20*rr)))
print(f"{score:.3f}")
PY
)"

correlation_status="strong"
correlation_explanation="load degradation and chaos outcomes align with resilience status"
if [[ "$chaos_status" == "skipped" || "$k6_status" == "skipped" ]]; then
  correlation_status="partial"
  correlation_explanation="optional signals missing; computed from available inputs"
fi
if [[ "$resilience_recovered" -eq 0 ]]; then
  correlation_status="degraded"
  correlation_explanation="load and/or chaos failure indicates resilience degradation"
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

jq -n \
  --arg ts "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --arg mode "$MODE" \
  --arg scenario "$SELECTED_SCENARIO" \
  --arg status "$status" \
  --argjson score "$score" \
  --argjson seed "$SEED" \
  --argjson max_attempts "$MAX_ATTEMPTS" \
  --argjson vus "$selected_vus" \
  --arg duration "$selected_duration" \
  --arg fault "$selected_fault_profile" \
  --arg k6_status "$k6_status" \
  --arg k6_reason "$k6_reason" \
  --arg k6_error_rate "$k6_error_rate" \
  --arg k6_pass_rate "$k6_pass_rate" \
  --arg chaos_status "$chaos_status" \
  --arg chaos_reason "$chaos_reason" \
  --arg max_error_rate "$MAX_ERROR_RATE" \
  --arg min_pass_rate "$MIN_PASS_RATE" \
  --arg load_degradation "$load_degradation" \
  --arg correlation_status "$correlation_status" \
  --arg correlation_explanation "$correlation_explanation" \
  --argjson correlation_score "$correlation_score" \
  --arg log_path "${ART_DIR}/resilience_intelligence.log" \
  --slurpfile adapters "$ART_DIR/resilience-adapters.json" \
  '(
    {
      timestamp:$ts,
      mode:$mode,
      scenario:$scenario,
      status:$status,
      score:$score,
      seed:$seed,
      max_attempts:$max_attempts,
      selected:{vus:$vus,duration:$duration,fault_profile:$fault},
      thresholds:{max_error_rate:($max_error_rate|tonumber),min_pass_rate:($min_pass_rate|tonumber)},
      load:{status:$k6_status,reason:$k6_reason,summary_file:($log_path|gsub("resilience_intelligence.log";"k6-summary.json"))},
      chaos:{status:$chaos_status,reason:$chaos_reason,artifact:($log_path|gsub("resilience_intelligence.log";"chaos-results.json"))},
      adapters:{count:($adapters[0]|length),items:$adapters[0]},
      correlation:{
        status:$correlation_status,
        score:$correlation_score,
        load_degradation:($load_degradation|tonumber),
        chaos_status:$chaos_status,
        resilience_status:$status,
        explanation:$correlation_explanation
      },
      log:$log_path
    }
    | if ($k6_error_rate|length)>0 then .load.error_rate=($k6_error_rate|tonumber) else . end
    | if ($k6_pass_rate|length)>0 then .load.pass_rate=($k6_pass_rate|tonumber) else . end
  )' >"$SUMMARY_FILE"

log "Resilience Intelligence complete status=$status score=$score correlation=$correlation_score"
if [[ "$status" == "fail" ]]; then
  exit 1
fi
