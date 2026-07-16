#!/usr/bin/env bash
#
# build.sh — package SlideGrabber into a Chrome Web Store-ready zip under dist/.
#
# Only runtime files are included. Everything else in the repo (demo/,
# store-assets/, docs, dev/build files) is intentionally left out of the
# package. manifest.json is placed at the archive root, as the store requires.
#
# Usage: ./build.sh
# No dependencies beyond a POSIX shell, `zip`, and `jq`.

set -euo pipefail

cd "$(dirname "$0")"

# The exact set of files that ship inside the extension. Add new runtime
# files here when the extension grows (see CLAUDE.md).
RUNTIME_FILES=(
  manifest.json
  background.js
  sidepanel.html
  sidepanel.css
  sidepanel.js
  icon-16.png
  icon-32.png
  icon-48.png
  icon-128.png
)

command -v zip >/dev/null 2>&1 || { echo "error: 'zip' is required" >&2; exit 1; }
command -v jq  >/dev/null 2>&1 || { echo "error: 'jq' is required"  >&2; exit 1; }

VERSION="$(jq -r '.version' manifest.json)"
[ -n "$VERSION" ] && [ "$VERSION" != "null" ] || { echo "error: no version in manifest.json" >&2; exit 1; }

OUT="dist/slidegrabber-${VERSION}.zip"

# Fail loudly if a declared runtime file is missing.
missing=0
for f in "${RUNTIME_FILES[@]}"; do
  [ -f "$f" ] || { echo "error: missing runtime file: $f" >&2; missing=1; }
done
[ "$missing" -eq 0 ] || exit 1

mkdir -p dist
rm -f "$OUT"

# -X drops extra file attributes for a reproducible archive; files land at root.
zip -q -X "$OUT" "${RUNTIME_FILES[@]}"

echo "Built $OUT ($(du -h "$OUT" | cut -f1)), version $VERSION"
echo "Packaged files:"
printf '  %s\n' "${RUNTIME_FILES[@]}"
