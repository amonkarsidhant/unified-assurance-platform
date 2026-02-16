#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_PORT="${CONTROL_PLANE_PORT:-4172}"
UI_PORT="${CONTROL_PLANE_UI_PORT:-4173}"

# cleanup terminates the background control-plane API process if it is running; errors during termination are ignored.
cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "${API_PID}" 2>/dev/null; then
    kill "${API_PID}" || true
  fi
}
trap cleanup EXIT INT TERM

cd "${ROOT_DIR}"

node apps/control-plane/api/server.mjs &
API_PID=$!

sleep 1
if ! kill -0 "${API_PID}" 2>/dev/null; then
  echo "Failed to start control-plane API"
  exit 1
fi

echo "Control Plane API: http://localhost:${API_PORT}"
echo "Control Plane UI:  http://localhost:${UI_PORT}"
echo "Press Ctrl+C to stop both"

python3 -m http.server "${UI_PORT}" --directory apps/control-plane/ui