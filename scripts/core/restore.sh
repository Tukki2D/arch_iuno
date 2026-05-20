#!/bin/bash
# dev/restore.sh — generic restore script
# Usage: restore.sh <appname>
IUNO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
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
    name="$(basename "$expanded")"
    repo_file="$DOTFILES/$name"

    if [[ ! -e "$repo_file" ]]; then
        warn "Not found in backup: $name"
        continue
    fi

    mkdir -p "$(dirname "$expanded")"

    if [[ -d "$repo_file" ]]; then
        rm -rf "$expanded"
        cp -r "$repo_file" "$expanded"
    else
        cp "$repo_file" "$expanded"
    fi

    log_action "restore" "$NAME" "$expanded"
    ok "Restored: $expanded"
done

ok "$NAME restore done."
