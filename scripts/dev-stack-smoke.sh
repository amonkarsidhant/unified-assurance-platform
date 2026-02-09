#!/usr/bin/env bash
set -euo pipefail

RETRIES=${RETRIES:-15}
SLEEP_SECONDS=${SLEEP_SECONDS:-2}

check() {
  local name="$1"
  local url="$2"
  local attempt=1

  until curl -fsS "$url" >/dev/null; do
    if (( attempt >= RETRIES )); then
      echo "❌ $name unreachable after $RETRIES attempts: $url"
      return 1
    fi
    echo "⏳ $name not ready yet (attempt $attempt/$RETRIES): $url"
    sleep "$SLEEP_SECONDS"
    attempt=$((attempt + 1))
  done

  echo "✅ $name reachable: $url"
}

check "Grafana" "http://localhost:3000/api/health"
check "Prometheus" "http://localhost:9090/-/ready"
check "Loki" "http://localhost:3100/ready"
check "Tempo" "http://localhost:3200/ready"
check "OTel Collector" "http://localhost:13133/"

echo "All local observability smoke checks passed."
