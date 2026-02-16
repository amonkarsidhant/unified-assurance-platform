#!/usr/bin/env bash
set -euo pipefail

echo "Formatting Markdown/YAML/JSON with Prettier (where available)..."
if command -v npx >/dev/null 2>&1; then
  find . -type f \( -name '*.md' -o -name '*.yml' -o -name '*.yaml' -o -name '*.json' \) \
    -not -path './node_modules/*' \
    -not -path './artifacts/*' \
    -not -path './.git/*' \
    -print0 | xargs -0 npx --yes prettier@3 --write
else
  echo "npx not found; skipping fmt"
fi
