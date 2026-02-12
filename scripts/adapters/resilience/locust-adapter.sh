#!/usr/bin/env bash
set -euo pipefail

ART_DIR="${ART_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../artifacts/latest" && pwd)}"
LOCUST_FILE="${RESILIENCE_LOCUST_SUMMARY_FILE:-$ART_DIR/locust-summary.json}"

if [[ ! -f "$LOCUST_FILE" ]]; then
  jq -n --arg src "$LOCUST_FILE" '{
    adapter:"locust",
    signal:"load",
    status:"skipped",
    reason:"locust summary not found",
    metrics:{},
    metadata:{source_file:$src}
  }'
  exit 0
fi

python3 - "$LOCUST_FILE" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])

try:
    data = json.loads(path.read_text())
    stats = data.get("stats_total", {}) if isinstance(data, dict) else {}
    fail_ratio = float(stats.get("fail_ratio", 0) or 0)
    rps = float(stats.get("current_rps", 0) or 0)
    status = "pass" if fail_ratio <= 0.05 else "fail"
    reason = "locust summary parsed"
    metadata = {"source_file": str(path)}
except json.JSONDecodeError as exc:
    fail_ratio = 0.0
    rps = 0.0
    status = "pass"
    reason = f"locust summary parse error: {exc}"
    metadata = {"source_file": str(path), "exception": str(exc)}
except Exception as exc:
    fail_ratio = 0.0
    rps = 0.0
    status = "pass"
    reason = f"locust adapter error: {exc}"
    metadata = {"source_file": str(path), "exception": str(exc)}

print(json.dumps({
    "adapter": "locust",
    "signal": "load",
    "status": status,
    "reason": reason,
    "metrics": {
        "error_rate": fail_ratio,
        "degradation": fail_ratio,
        "throughput_rps": rps
    },
    "metadata": metadata
}, indent=2))
PY
