#!/bin/bash
# apps/niri/backup.sh — backup live niri configs into iuno

source "$(dirname "$0")/../../scripts/core/common.sh"
source "$(dirname "$0")/info.sh"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUPS_DIR="$SCRIPT_DIR/backups"
mkdir -p "$BACKUPS_DIR"

log "Backing up $NAME..."

for path in "${CONFIG_PATHS[@]}"; do
    expanded="${path/\$HOME/$HOME}"
    if [[ -f "$expanded" ]]; then
        filename="$(basename "$expanded")"
        [[ -f "$BACKUPS_DIR/$filename.2" ]] && mv "$BACKUPS_DIR/$filename.2" "$BACKUPS_DIR/$filename.3"
        [[ -f "$BACKUPS_DIR/$filename.1" ]] && mv "$BACKUPS_DIR/$filename.1" "$BACKUPS_DIR/$filename.2"
        [[ -f "$SCRIPT_DIR/$filename" ]]    && cp "$SCRIPT_DIR/$filename"    "$BACKUPS_DIR/$filename.1"
        cp "$expanded" "$SCRIPT_DIR/"
        log_action "backup" "$NAME" "$filename"
        ok "Backed up: $filename"
    else
        warn "Not found: $expanded"
    fi
done

ok "$NAME backup done."
