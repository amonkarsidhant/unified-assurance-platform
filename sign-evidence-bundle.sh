#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <bundle.tar.gz>"
  exit 1
fi

BUNDLE="$1"
if [ ! -f "$BUNDLE" ]; then
  echo "Bundle not found: $BUNDLE"
  exit 1
fi

SIG_PATH="${BUNDLE}.sig"
CERT_PATH="${BUNDLE}.cert"
SKIP_PATH="${BUNDLE}.sig.skip.txt"

if command -v cosign >/dev/null 2>&1; then
  echo "Signing bundle with cosign keyless flow..."
  if cosign sign-blob --yes --output-signature "$SIG_PATH" --output-certificate "$CERT_PATH" "$BUNDLE"; then
    echo "Cosign signature created: $SIG_PATH"
  else
    echo "cosign invocation failed" > "$SKIP_PATH"
    echo "Signature skipped; reason in $SKIP_PATH"
  fi
else
  echo "cosign not installed; signature step skipped" > "$SKIP_PATH"
  echo "Signature skipped; reason in $SKIP_PATH"
fi
