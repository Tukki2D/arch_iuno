#!/bin/bash
# dev/backup.sh — generic backup script
# Usage: backup.sh <appname>

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

log "Backing up $NAME..."

for path in "${CONFIG_PATHS[@]}"; do
    expanded="${path/\$HOME/$HOME}"
    name="$(basename "$expanded")"

    if [[ ! -e "$expanded" ]]; then
        warn "Not found: $expanded"
        continue
    fi

    DOTFILES="$APP_DIR/dotfiles"
    DOTFILES_BAK="$APP_DIR/dotfiles.bak"

    [[ -d "$DOTFILES_BAK" ]] && rm -rf "$DOTFILES_BAK"
    [[ -d "$DOTFILES" ]]     && mv "$DOTFILES" "$DOTFILES_BAK"

    cp -r "$expanded/." "$DOTFILES"
    log_action "backup" "$NAME" "$expanded"
    ok "Backed up: $expanded"
done

ok "$NAME backup done."
