#!/usr/bin/env bash
set -euo pipefail

ART_DIR="${ART_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../artifacts/latest" && pwd)}"
INPUT_FILE="${RESILIENCE_EXTERNAL_RESULTS_FILE:-$ART_DIR/external-resilience-results.json}"

if [[ ! -f "$INPUT_FILE" ]]; then
  jq -n --arg src "$INPUT_FILE" '{
    adapter:"external-results",
    signal:"external",
    status:"skipped",
    reason:"external results file not found",
    metrics:{},
    metadata:{source_file:$src}
  }'
  exit 0
fi

python3 - "$INPUT_FILE" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
data = json.loads(path.read_text())

status = str(data.get("status", "pass")).lower()
if status not in {"pass", "fail", "skipped"}:
    status = "skipped"

error_rate = data.get("error_rate")
pass_rate = data.get("pass_rate")

def to_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None

err = to_float(error_rate)
pas = to_float(pass_rate)
degradation = err if err is not None else (1.0 - pas if pas is not None else None)

print(json.dumps({
    "adapter": "external-results",
    "signal": "external",
    "status": status,
    "reason": str(data.get("reason", "external result parsed")),
    "metrics": {
        "error_rate": err,
        "pass_rate": pas,
        "degradation": degradation
    },
    "metadata": {
        "source_file": str(path),
        "provider": str(data.get("provider", "unknown"))
    }
}, indent=2))
PY
