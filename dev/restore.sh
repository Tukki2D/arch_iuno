#!/bin/bash
# dev/restore.sh — generic restore script
# Usage: restore.sh <appname>
IUNO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$IUNO_ROOT/scripts/core/common.sh"

APP="$1"

if [[ -z "$APP" ]]; then
    err "No app name provided."
    exit 1
fi

APP_DIR="$IUNO_ROOT/apps/$APP"

if [[ ! -f "$APP_DIR/info.sh" ]]; then
    err "No info.sh found for: $APP"
    exit 1
fi

source "$APP_DIR/info.sh"

DOTFILES="$APP_DIR/dotfiles"

if [[ ! -d "$DOTFILES" ]]; then
    err "No dotfiles backup found for: $APP"
    exit 1
fi

log "Restoring $NAME..."

for path in "${CONFIG_PATHS[@]}"; do
    expanded="${path/\$HOME/$HOME}"
    mkdir -p "$(dirname "$expanded")"
    rm -rf "$expanded"
    cp -r "$DOTFILES/." "$expanded"
    log_action "restore" "$NAME" "$expanded"
    ok "Restored: $expanded"
done

ok "$NAME restore done."
