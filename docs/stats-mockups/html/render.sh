#!/usr/bin/env bash
# Usage: ./render.sh page.html [mobileH] [desktopH]
# Renders out/<name>-mobile.png (390 x mobileH, default 1400) and
# out/<name>-desktop.png (1280 x desktopH, default 1000) with headless Chromium.
# Simplest robust approach: no height measuring; pages are designed to fit the
# tall fixed viewports (chrome screenshots exactly the window size). Override
# heights via args 2/3 if a page is longer.
set -euo pipefail
CHROME=/home/rense/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome
[ $# -ge 1 ] || { echo "usage: $0 page.html [mobileH] [desktopH]"; exit 1; }
DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
NAME="$(basename "$1" .html)"
MH="${2:-1400}"; DH="${3:-1000}"
mkdir -p "$DIR/out"
shot() { # w h out
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --window-size="$1,$2" --virtual-time-budget=3000 \
    --screenshot="$3" "file://$SRC" >/dev/null 2>&1 || true
  [ -s "$3" ] && echo "$3" || { echo "FAILED: $3" >&2; return 1; }
}
shot 390 "$MH" "$DIR/out/$NAME-mobile.png"
shot 1280 "$DH" "$DIR/out/$NAME-desktop.png"
