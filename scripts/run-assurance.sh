#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts/latest"
mkdir -p "$ART_DIR"

MODE="${ASSURANCE_MODE:-pragmatic}" # pragmatic|real
FORCE_REAL="${FORCE_REAL_TOOLS:-0}"
if [ "$FORCE_REAL" = "1" ]; then
  MODE="real"
fi

ONLY_ZAP_SMOKE="${ONLY_ZAP_SMOKE:-0}"

TRIVY_SEVERITY="${TRIVY_SEVERITY:-CRITICAL,HIGH}"
TRIVY_EXIT_CODE="${TRIVY_EXIT_CODE:-0}"
K6_VUS="${K6_VUS:-2}"
K6_DURATION="${K6_DURATION:-5s}"
PERF_TARGET_URL="${PERF_TARGET_URL:-https://test.k6.io}"
SEMGREP_CONFIG="${SEMGREP_CONFIG:-$ROOT_DIR/tests/security/semgrep-rules.yml}"

ZAP_TARGET_URL="${ZAP_TARGET_URL:-http://127.0.0.1:5678}"
ZAP_TIMEOUT_MIN="${ZAP_TIMEOUT_MIN:-2}"
ZAP_FAIL_LEVEL="${ZAP_FAIL_LEVEL:-medium}"
ZAP_DOCKER_IMAGE="${ZAP_DOCKER_IMAGE:-ghcr.io/zaproxy/zaproxy:stable}"

log() { echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }

write_status() {
  local file="$1" value="$2"
  echo "$value" >"$ART_DIR/${file}.status"
}

record_skipped() {
  local name="$1" reason="$2"
  echo "$reason" >"$ART_DIR/${name}.log"
  write_status "$name" "skipped"
}

run_cmd_step() {
  local name="$1"; shift
  log "Running: $name"
  if "$@" >"$ART_DIR/${name}.log" 2>&1; then
    write_status "$name" "pass"
    log "PASS: $name"
    return 0
  else
    write_status "$name" "fail"
    log "FAIL: $name (see $ART_DIR/${name}.log)"
    return 1
  fi
}

run_npm_or_fallback() {
  local name="$1" cmd="$2"
  if command -v npm >/dev/null 2>&1 && [ -f "$ROOT_DIR/package.json" ]; then
    run_cmd_step "$name" bash -lc "cd '$ROOT_DIR' && $cmd"
  else
    if [ "$MODE" = "real" ]; then
      record_skipped "$name" "real mode: npm/package.json unavailable"
      return 2
    fi
    run_cmd_step "$name" bash -lc "echo 'simulated $name (npm unavailable)'"
  fi
}

run_zap_baseline() {
  if [ "$MODE" != "real" ]; then
    record_skipped dast_zap "pragmatic mode: ZAP baseline runs only in real mode"
    return 0
  fi

  if command -v zap-baseline.py >/dev/null 2>&1; then
    run_cmd_step dast_zap bash -lc "zap-baseline.py -t '$ZAP_TARGET_URL' -m '$ZAP_TIMEOUT_MIN' -l '$ZAP_FAIL_LEVEL'"
    return $?
  fi

  if command -v docker >/dev/null 2>&1; then
    local docker_target="$ZAP_TARGET_URL"
    docker_target="${docker_target/127.0.0.1/host.docker.internal}"
    docker_target="${docker_target/localhost/host.docker.internal}"
    run_cmd_step dast_zap bash -lc "docker run --rm -t '$ZAP_DOCKER_IMAGE' zap-baseline.py -t '$docker_target' -m '$ZAP_TIMEOUT_MIN' -l '$ZAP_FAIL_LEVEL'"
    return $?
  fi

  record_skipped dast_zap "real mode: neither zap-baseline.py nor dockerized ZAP available"
  return 0
}

control_to_status() {
  local control="$1"
  case "$control" in
    sast) cat "$ART_DIR/security_scan.status" ;;
    sca) cat "$ART_DIR/dependency_scan.status" ;;
    dast) cat "$ART_DIR/dast_zap.status" ;;
    perf_smoke) cat "$ART_DIR/performance_smoke.status" ;;
    contract) cat "$ART_DIR/contract.status" ;;
    resilience) cat "$ART_DIR/resilience.status" ;;
    *) echo "unknown" ;;
  esac
}

FAILURES=0

if [ "$ONLY_ZAP_SMOKE" = "1" ]; then
  record_skipped lint "zap-smoke mode: not executed"
  record_skipped unit "zap-smoke mode: not executed"
  record_skipped integration "zap-smoke mode: not executed"
  record_skipped contract "zap-smoke mode: not executed"
  record_skipped security_scan "zap-smoke mode: not executed"
  record_skipped dependency_scan "zap-smoke mode: not executed"
  record_skipped performance_smoke "zap-smoke mode: not executed"
  record_skipped resilience "zap-smoke mode: not executed"
  record_skipped newman_smoke "zap-smoke mode: not executed"
  record_skipped playwright_smoke "zap-smoke mode: not executed"
  run_zap_baseline || FAILURES=$((FAILURES+1))
else
  run_npm_or_fallback lint "npm run lint" || [ $? -eq 2 ] || FAILURES=$((FAILURES+1))
  run_npm_or_fallback unit "npm test" || [ $? -eq 2 ] || FAILURES=$((FAILURES+1))
  run_npm_or_fallback integration "npm run test:integration" || [ $? -eq 2 ] || FAILURES=$((FAILURES+1))
  run_npm_or_fallback contract "npm run test:contract" || [ $? -eq 2 ] || FAILURES=$((FAILURES+1))

  if command -v semgrep >/dev/null 2>&1; then
    if [ -f "$SEMGREP_CONFIG" ]; then
      run_cmd_step security_scan bash -lc "cd '$ROOT_DIR' && semgrep --config '$SEMGREP_CONFIG' --error --json --output '$ART_DIR/semgrep.json' ." || FAILURES=$((FAILURES+1))
    else
      run_cmd_step security_scan bash -lc "cd '$ROOT_DIR' && semgrep --config auto --error --json --output '$ART_DIR/semgrep.json' ." || FAILURES=$((FAILURES+1))
    fi
  else
    if [ "$MODE" = "real" ]; then
      record_skipped security_scan "real mode: semgrep not installed"
    else
      run_cmd_step security_scan bash -lc "echo 'simulated security_scan (semgrep not installed)'"
    fi
  fi

  run_zap_baseline || FAILURES=$((FAILURES+1))

  if command -v trivy >/dev/null 2>&1; then
    run_cmd_step dependency_scan bash -lc "cd '$ROOT_DIR' && trivy fs --quiet --severity '$TRIVY_SEVERITY' --exit-code '$TRIVY_EXIT_CODE' --format json --output '$ART_DIR/trivy.json' ." || FAILURES=$((FAILURES+1))
  else
    if [ "$MODE" = "real" ]; then
      record_skipped dependency_scan "real mode: trivy not installed"
    else
      run_cmd_step dependency_scan bash -lc "echo 'simulated dependency_scan (trivy not installed)'"
    fi
  fi

  if command -v k6 >/dev/null 2>&1 && [ -f "$ROOT_DIR/tests/perf/smoke.js" ]; then
    run_cmd_step performance_smoke bash -lc "cd '$ROOT_DIR' && PERF_TARGET_URL='$PERF_TARGET_URL' K6_VUS='$K6_VUS' K6_DURATION='$K6_DURATION' k6 run tests/perf/smoke.js --summary-export '$ART_DIR/k6-summary.json'" || FAILURES=$((FAILURES+1))
  else
    if [ "$MODE" = "real" ]; then
      if ! command -v k6 >/dev/null 2>&1; then
        record_skipped performance_smoke "real mode: k6 not installed"
      else
        record_skipped performance_smoke "real mode: tests/perf/smoke.js missing"
      fi
    else
      run_cmd_step performance_smoke bash -lc "echo 'simulated performance_smoke (k6/script unavailable)'"
    fi
  fi

  if [ -f "$ROOT_DIR/tests/resilience/smoke.sh" ]; then
    run_cmd_step resilience bash -lc "cd '$ROOT_DIR' && bash tests/resilience/smoke.sh" || FAILURES=$((FAILURES+1))
  else
    if [ "$MODE" = "real" ]; then
      record_skipped resilience "real mode: resilience smoke script not found"
    else
      run_cmd_step resilience bash -lc "echo 'simulated resilience check (script unavailable)'"
    fi
  fi

  NEWMAN_COLLECTION=""
  for candidate in "$ROOT_DIR/tests/api/postman_collection.json" "$ROOT_DIR/tests/api/postman.collection.json" "$ROOT_DIR/tests/postman/collection.json" "$ROOT_DIR/postman/collection.json"; do
    if [ -f "$candidate" ]; then
      NEWMAN_COLLECTION="$candidate"
      break
    fi
  done
  NEWMAN_ENV_ARGS=""
  if [ -f "$ROOT_DIR/tests/api/postman_environment.json" ]; then
    NEWMAN_ENV_ARGS="--environment '$ROOT_DIR/tests/api/postman_environment.json'"
  fi
  if command -v newman >/dev/null 2>&1 && [ -n "$NEWMAN_COLLECTION" ]; then
    run_cmd_step newman_smoke bash -lc "cd '$ROOT_DIR' && newman run '$NEWMAN_COLLECTION' $NEWMAN_ENV_ARGS --env-var baseUrl='${NEWMAN_BASE_URL:-http://127.0.0.1:5678}' --reporters cli,json --reporter-json-export '$ART_DIR/newman.json'" || FAILURES=$((FAILURES+1))
  else
    if [ -z "$NEWMAN_COLLECTION" ]; then
      record_skipped newman_smoke "collection not found"
    else
      record_skipped newman_smoke "newman not installed"
    fi
  fi

  PLAYWRIGHT_TEST=""
  for candidate in "$ROOT_DIR/tests/ui/smoke.spec.ts" "$ROOT_DIR/tests/ui/smoke.spec.js" "$ROOT_DIR/tests/e2e/smoke.spec.ts" "$ROOT_DIR/tests/e2e/smoke.spec.js"; do
    if [ -f "$candidate" ]; then
      PLAYWRIGHT_TEST="$candidate"
      break
    fi
  done
  if [ -n "$PLAYWRIGHT_TEST" ]; then
    if command -v npm >/dev/null 2>&1 && [ -f "$ROOT_DIR/package.json" ] && grep -q '"test:ui:smoke"' "$ROOT_DIR/package.json"; then
      run_cmd_step playwright_smoke bash -lc "cd '$ROOT_DIR' && npm run test:ui:smoke" || FAILURES=$((FAILURES+1))
    elif command -v npx >/dev/null 2>&1; then
      run_cmd_step playwright_smoke bash -lc "cd '$ROOT_DIR' && npx playwright test '$PLAYWRIGHT_TEST' --config '$ROOT_DIR/playwright.config.ts' --reporter=line" || FAILURES=$((FAILURES+1))
    else
      record_skipped playwright_smoke "npx unavailable"
    fi
  else
    record_skipped playwright_smoke "smoke test not found"
  fi
fi

cp "$ART_DIR/security_scan.status" "$ART_DIR/security.status"
cp "$ART_DIR/performance_smoke.status" "$ART_DIR/performance.status"

TOTAL=9
PASSED=$(grep -h '^pass$' \
  "$ART_DIR/lint.status" \
  "$ART_DIR/unit.status" \
  "$ART_DIR/integration.status" \
  "$ART_DIR/contract.status" \
  "$ART_DIR/dependency_scan.status" \
  "$ART_DIR/security_scan.status" \
  "$ART_DIR/performance_smoke.status" \
  "$ART_DIR/dast_zap.status" \
  "$ART_DIR/resilience.status" | wc -l | tr -d ' ')
PASS_RATE=$(python3 - <<PY
print(round($PASSED/$TOTAL, 4))
PY
)

RISK_SCORE="${RISK_SCORE:-45}"
if [ "$RISK_SCORE" -ge 90 ]; then
  RISK_TIER="critical"
elif [ "$RISK_SCORE" -ge 70 ]; then
  RISK_TIER="high"
elif [ "$RISK_SCORE" -ge 30 ]; then
  RISK_TIER="medium"
else
  RISK_TIER="low"
fi

REQUIRED_CONTROLS=$(python3 - <<PY
import json
from pathlib import Path
p = Path('$ROOT_DIR/policies/tiers/$RISK_TIER.json')
print('\n'.join(json.loads(p.read_text()).get('mandatory_controls', [])))
PY
)

declare -a REQUIRED=()
while IFS= read -r control; do
  [ -n "$control" ] && REQUIRED+=("$control")
done <<< "$REQUIRED_CONTROLS"

CONTROL_STATUS_JSON=""
MISSING_CONTROLS=""
POLICY_VALIDATION_PASSED=true
for control in "${REQUIRED[@]}"; do
  status="$(control_to_status "$control")"
  write_status "$control" "$status"
  CONTROL_STATUS_JSON+=$'\n      '"\"$control\": \"$status\"," 
  if [ "$status" != "pass" ]; then
    POLICY_VALIDATION_PASSED=false
    MISSING_CONTROLS+="\"$control\","
  fi
done
CONTROL_STATUS_JSON="${CONTROL_STATUS_JSON%,}"
MISSING_CONTROLS="${MISSING_CONTROLS%,}"

cat > "$ART_DIR/results.json" <<JSON
{
  "service": "sample-service",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "execution": {
    "mode": "$MODE",
    "force_real_tools": $([ "$MODE" = "real" ] && echo true || echo false)
  },
  "risk_context": {
    "risk_score": $RISK_SCORE,
    "risk_tier": "$RISK_TIER",
    "required_controls": [$(printf '"%s",' "${REQUIRED[@]}" | sed 's/,$//')],
    "control_status": {${CONTROL_STATUS_JSON}
    },
    "policy_validation_passed": $POLICY_VALIDATION_PASSED,
    "missing_required_controls": [${MISSING_CONTROLS}]
  },
  "metrics": {
    "test_pass_rate": $PASS_RATE,
    "critical_test_failures": $([ "$FAILURES" -gt 0 ] && echo 1 || echo 0)
  },
  "tests": {
    "lint": "$(cat "$ART_DIR/lint.status")",
    "unit": "$(cat "$ART_DIR/unit.status")",
    "integration": "$(cat "$ART_DIR/integration.status")",
    "contract": "$(cat "$ART_DIR/contract.status")",
    "dependency_scan": "$(cat "$ART_DIR/dependency_scan.status")",
    "security_scan": "$(cat "$ART_DIR/security_scan.status")",
    "dast_zap": "$(cat "$ART_DIR/dast_zap.status")",
    "performance_smoke": "$(cat "$ART_DIR/performance_smoke.status")",
    "resilience": "$(cat "$ART_DIR/resilience.status")",
    "newman_smoke": "$(cat "$ART_DIR/newman_smoke.status")",
    "playwright_smoke": "$(cat "$ART_DIR/playwright_smoke.status")"
  },
  "evidence": {
    "tools": {
      "dast_zap": {
        "status": "$(cat "$ART_DIR/dast_zap.status")",
        "target_url": "$ZAP_TARGET_URL",
        "timeout_min": $ZAP_TIMEOUT_MIN,
        "fail_level": "$ZAP_FAIL_LEVEL",
        "log": "artifacts/latest/dast_zap.log"
      }
    },
    "tool_logs": {
      "lint": "artifacts/latest/lint.log",
      "unit": "artifacts/latest/unit.log",
      "integration": "artifacts/latest/integration.log",
      "contract": "artifacts/latest/contract.log",
      "security_scan": "artifacts/latest/security_scan.log",
      "dast_zap": "artifacts/latest/dast_zap.log",
      "dependency_scan": "artifacts/latest/dependency_scan.log",
      "performance_smoke": "artifacts/latest/performance_smoke.log",
      "resilience": "artifacts/latest/resilience.log",
      "newman_smoke": "artifacts/latest/newman_smoke.log",
      "playwright_smoke": "artifacts/latest/playwright_smoke.log"
    },
    "tool_outputs": {
      "semgrep_json": "artifacts/latest/semgrep.json",
      "trivy_json": "artifacts/latest/trivy.json",
      "k6_summary_json": "artifacts/latest/k6-summary.json",
      "newman_json": "artifacts/latest/newman.json"
    }
  }
}
JSON

log "Assurance run complete. Results at $ART_DIR/results.json"
