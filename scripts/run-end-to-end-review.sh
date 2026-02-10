#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts/latest"
REVIEW_ENV="${ENV:-stage}"
mkdir -p "$ART_DIR"

log() { echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }

log "Starting end-to-end review"
cd "$ROOT_DIR"

log "1) Structure validation"
make validate

log "2) Tooling checks"
make tooling-check || true

log "3) Phase A security/policy checks"
PATH="$HOME/.local/bin:$PATH" make phase-a-checks || true

log "4) Assurance execution (prefer real mode, fallback pragmatic)"
REVIEW_PATH="$HOME/.local/bin:$PATH"
if ! PATH="$REVIEW_PATH" make run-assurance-real; then
  log "run-assurance-real failed, running pragmatic assurance for baseline artifacts"
  PATH="$REVIEW_PATH" make run-assurance
fi

log "5) Report + promotion decision"
make report
make promotion-check ENV="$REVIEW_ENV" || true

log "6) Governance checks (if stack is running)"
if curl -fsS "http://localhost:9090/-/healthy" >/dev/null 2>&1; then
  make assurance-dashboard-check || true
  make assurance-governance-check || true
else
  log "Skipping dashboard/governance checks (Prometheus not reachable)"
fi

log "7) High-risk command pattern scan"
python3 - <<'PY'
from pathlib import Path
import re
root = Path('.')
patterns = {
  'shell_eval': re.compile(r'\beval\b'),
  'dangerous_rm': re.compile(r'\brm\s+-rf\s+/'),
  'hardcoded_basic_auth': re.compile(r'curl[^\n]*\s-u\s+[^\s]'),
}
rows = []
allowed_extensions = {'.sh', '.py', '.yml', '.yaml', '.json', '.md'}
excluded_dirs = {'node_modules', 'artifacts', 'evidence', '.git'}
for p in root.rglob('*'):
    if not p.is_file() or any(part in excluded_dirs for part in p.parts):
        continue
    if p.name != 'Makefile' and (not p.suffix or p.suffix.lower() not in allowed_extensions):
        continue
    try:
        text = p.read_text(errors='ignore')
    except Exception:
        continue
    for name, pat in patterns.items():
        for i, line in enumerate(text.splitlines(), start=1):
            if pat.search(line):
                rows.append((str(p), i, name, line.strip()[:220]))
out = Path('artifacts/latest/security-pattern-review.md')
with out.open('w') as f:
    f.write('# Security Pattern Review\n\n')
    if not rows:
        f.write('No matching high-risk patterns found by baseline regex scan.\n')
    else:
        f.write('| file | line | pattern | snippet |\n|---|---:|---|---|\n')
        for r in rows:
            snippet = r[3].replace("|", "\\|").replace("`", "&#96;")
            f.write(f'| `{r[0]}` | {r[1]} | `{r[2]}` | `{snippet}` |\n')
print(f'Wrote {out}')
PY

log "8) Summarize review status"
REVIEW_ENV="$REVIEW_ENV" python3 - <<'PY'
import json
import os
from pathlib import Path
res_p = Path('artifacts/latest/results.json')
promo_p = Path('artifacts/latest/promotion-decision.json')
summary_p = Path('artifacts/latest/end-to-end-review-summary.md')
res = json.loads(res_p.read_text()) if res_p.exists() else {}
promo = json.loads(promo_p.read_text()) if promo_p.exists() else {}
default_checks = ['lint','unit','integration','contract','security_scan','dependency_scan','dast_zap','performance_smoke','chaos_resilience','secret_scan','api_fuzz_contract','dockerfile_policy','iac_policy','newman_smoke','playwright_smoke']
test_keys = list(res.get('tests', {}).keys())
checks = (default_checks + [k for k in test_keys if k not in default_checks]) if test_keys else default_checks
review_env = os.environ.get('REVIEW_ENV', 'stage')
with summary_p.open('w') as f:
    f.write('# End-to-End Review Summary\n\n')
    f.write(f"- pass_rate: `{res.get('metrics',{}).get('test_pass_rate','n/a')}`\n")
    f.write(f"- critical_test_failures: `{res.get('metrics',{}).get('critical_test_failures','n/a')}`\n")
    f.write(f"- promotion_passed({review_env}): `{promo.get('passed','n/a')}`\n\n")
    f.write('## Check statuses\n')
    tests = res.get('tests', {})
    for c in checks:
        f.write(f"- {c}: `{tests.get(c,'missing')}`\n")
    f.write('\n## Artifacts\n')
    for p in [
        'artifacts/latest/results.json',
        'artifacts/latest/results.v2.json',
        'artifacts/latest/release-report.md',
        'artifacts/latest/promotion-decision.json',
        'artifacts/latest/security-pattern-review.md'
    ]:
        f.write(f"- `{p}`\n")
print(f'Wrote {summary_p}')
PY

log "End-to-end review complete"
