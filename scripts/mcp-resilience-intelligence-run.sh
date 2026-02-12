#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-${RESILIENCE_INTELLIGENCE_MODE:-ROBUSTNESS}}"
SCENARIO="${2:-${RESILIENCE_INTELLIGENCE_SCENARIO:-robustness-fixed}}"

RESILIENCE_INTELLIGENCE_MODE="$MODE" \
RESILIENCE_INTELLIGENCE_SCENARIO="$SCENARIO" \
./scripts/run-resilience-intelligence.sh

echo "artifacts/latest/resilience-intelligence.json"
