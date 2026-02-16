#!/usr/bin/env bash
set -euo pipefail

yamllint \
  .github/workflows \
  policies \
  config \
  catalog \
  templates
