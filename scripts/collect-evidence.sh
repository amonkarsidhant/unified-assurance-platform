#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +'%Y%m%d-%H%M%S')"
SRC_ART="$ROOT_DIR/artifacts/latest"
DEST="$ROOT_DIR/evidence/$STAMP"

mkdir -p "$DEST"

if [ -d "$SRC_ART" ]; then
  cp -R "$SRC_ART" "$DEST/artifacts"
fi

mkdir -p "$DEST/policies" "$DEST/catalog" "$DEST/reporting"
cp "$ROOT_DIR"/policies/*.yaml "$DEST/policies/"
cp "$ROOT_DIR"/catalog/*.yaml "$DEST/catalog/"
[ -f "$ROOT_DIR/artifacts/latest/release-report.md" ] && cp "$ROOT_DIR/artifacts/latest/release-report.md" "$DEST/reporting/" || true

cat > "$DEST/metadata.txt" <<META
collected_at=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
repo=unified-assurance-platform
git_commit=$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "uncommitted")
META

echo "Evidence collected in: $DEST"
