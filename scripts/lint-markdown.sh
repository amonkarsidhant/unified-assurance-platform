#!/usr/bin/env bash
set -euo pipefail

# Scoped markdown lint baseline for DX entrypoints + templates.
TARGETS=(
  README.md
  CONTRIBUTING.md
  SECURITY.md
  docs/README.md
  .github/*.md
  .github/ISSUE_TEMPLATE/*.md
)

npx --yes markdownlint-cli "${TARGETS[@]}"
