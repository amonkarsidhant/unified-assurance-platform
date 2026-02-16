#!/usr/bin/env bash
set -euo pipefail

TARGETS=(
  .github/workflows
  policies
  config
  catalog
  templates
)

EXISTING_TARGETS=()
for dir in "${TARGETS[@]}"; do
  if [ -d "$dir" ]; then
    EXISTING_TARGETS+=("$dir")
  fi
done

if [ "${#EXISTING_TARGETS[@]}" -eq 0 ]; then
  echo "No YAML directories found. Skipping."
  exit 0
fi

yamllint "${EXISTING_TARGETS[@]}"
