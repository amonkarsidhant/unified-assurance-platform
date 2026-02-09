#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check_tool() {
  local name="$1"
  local version_cmd="$2"
  if command -v "$name" >/dev/null 2>&1; then
    local version
    version=$(bash -lc "$version_cmd" 2>/dev/null | head -n1)
    echo "✅ $name: ${version:-installed}"
  else
    echo "⚠️  $name: not installed"
  fi
}

echo "Tooling check for $ROOT_DIR"
check_tool bash "bash --version"
check_tool python3 "python3 --version"
check_tool make "make --version"
check_tool npm "npm --version"
check_tool npx "npx --version"
check_tool k6 "k6 version"
check_tool semgrep "semgrep --version"
check_tool trivy "trivy --version"
check_tool newman "newman --version"

[ -f "$ROOT_DIR/tests/perf/smoke.js" ] && echo "✅ tests/perf/smoke.js present" || echo "⚠️  tests/perf/smoke.js missing"
[ -f "$ROOT_DIR/tests/security/semgrep-rules.yml" ] && echo "✅ tests/security/semgrep-rules.yml present" || echo "⚠️  tests/security/semgrep-rules.yml missing"

echo "Done."
