#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE=".markdown-link-check.json"
TARGETS=(README.md docs/README.md)

EXISTING_TARGETS=()
for path in "${TARGETS[@]}"; do
  if [ -f "$path" ]; then
    EXISTING_TARGETS+=("$path")
  fi
done

if [ "${#EXISTING_TARGETS[@]}" -eq 0 ]; then
  echo "No markdown files found for link lint. Skipping."
  exit 0
fi

npx --yes markdown-link-check --config "$CONFIG_FILE" "${EXISTING_TARGETS[@]}"
