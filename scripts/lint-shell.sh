#!/usr/bin/env bash
set -euo pipefail

# Intentionally scoped to actively maintained shell entrypoints to avoid legacy churn.
FILES=(
  apps/control-plane/up.sh
  scripts/tooling-check.sh
  scripts/run-assurance.sh
  scripts/run-chaos-checks.sh
  scripts/run-resilience-intelligence.sh
  scripts/run-schemathesis.sh
  scripts/run-gitleaks.sh
  scripts/run-hadolint.sh
  scripts/run-checkov.sh
  scripts/lint-shell.sh
)

shellcheck -x "${FILES[@]}"
