#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python3 - <<'PY'
import json
from pathlib import Path

root = Path('artifacts/latest')
out = {
    "resilience_intelligence": str(root / 'resilience-intelligence.json'),
    "resilience_report": str(root / 'resilience-intelligence-report.md'),
    "adapter_inputs": str(root / 'resilience-adapters.json'),
    "status_file": str(root / 'resilience_intelligence.status')
}
print(json.dumps(out, indent=2))
PY
