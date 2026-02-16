#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE=".markdown-link-check.json"

npx --yes markdown-link-check --config "$CONFIG_FILE" README.md docs/README.md
