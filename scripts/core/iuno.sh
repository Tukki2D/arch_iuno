#!/bin/bash
# iuno.sh — iuno router
# Lives at: ~/iuno/scripts/core/iuno.sh
#
# Usage:
#   iuno --backup  -appname    Back up one app
#   iuno --backup  -all        Back up all managed apps
#   iuno --restore -appname    Restore one app
#   iuno --restore -all        Restore all managed apps
#   iuno --detect              List managed apps and backup status
#   iuno --help                Show this help
#
# Short flags:
#   iuno -b -appname
#   iuno -r -appname

IUNO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS="$IUNO_ROOT/scripts/core"
source "$SCRIPTS/common.sh"

# ── Helpers ───────────────────────────────────────────────────────────────────

# Returns list of managed app names (dirs under apps/ with an info.sh)
list_apps() {
    for app_dir in "$IUNO_ROOT/apps"/*/; do
        local app
        app="$(basename "$app_dir")"
        [[ "$app" == _* ]] && continue
        [[ -f "$app_dir/info.sh" ]] && echo "$app"
    done
}

# ── --help ────────────────────────────────────────────────────────────────────

cmd_help() {
    printf "\n"
    printf "  iuno — personal setup and config management\n"
    printf "\n"
    printf "  Commands:\n"
    printf "    -b, --backup  -appname    Back up one app\n"
    printf "    -b, --backup  -all        Back up all managed apps\n"
    printf "    -r, --restore -appname    Restore one app\n"
    printf "    -r, --restore -all        Restore all managed apps\n"
    printf "    -d, --detect              Show managed apps and backup status\n"
    printf "    -c, --clean		  Clean the system\n"
    printf "    -h, --help                Show this help\n"
    printf "\n"
    printf "  Managed apps:\n"
    for app in $(list_apps); do
        printf "    %s\n" "$app"
    done
    printf "\n"
    printf "  Examples:\n"
    printf "    iuno -b -niri\n"
    printf "    iuno -b -all\n"
    printf "    iuno -r -kitty\n"
    printf "    iuno -r -all\n"
    printf "\n"
}

# ── --detect ──────────────────────────────────────────────────────────────────

cmd_detect() {
    printf "\n"
    printf "  %-14s  %-14s  %s\n" "APP" "BACKUP" "INSTALLED"
    printf "  %-14s  %-14s  %s\n" "---" "------" "---------"
    for app in $(list_apps); do
        local app_dir="$IUNO_ROOT/apps/$app"
        local backup_status installed_status

        # Check if dotfiles directory has content
        if [[ -d "$app_dir/dotfiles" ]] && [[ -n "$(ls -A "$app_dir/dotfiles" 2>/dev/null)" ]]; then
            backup_status="✓ backed up"
        else
            backup_status="✗ not backed up"
        fi

        # Source info.sh to get package name
        local PACKAGE=""
        source "$app_dir/info.sh" 2>/dev/null
        if [[ -n "$PACKAGE" ]] && pacman -Q "$PACKAGE" &>/dev/null; then
            installed_status="✓ installed"
        else
            installed_status="— unknown"
        fi

        printf "  %-14s  %-14s  %s\n" "$app" "$backup_status" "$installed_status"
    done
    printf "\n"
}

# ── --backup ──────────────────────────────────────────────────────────────────

cmd_backup() {
    local target="${1#-}"

    if [[ -z "$target" ]]; then
        err "No app specified. Use: iuno --backup -appname or -all"
        exit 1
    fi

    if [[ "$target" == "all" ]]; then
        for app in $(list_apps); do
            bash "$SCRIPTS/backup.sh" "$app"
        done
    else
        bash "$SCRIPTS/backup.sh" "$target"
    fi
}

# ── --restore ─────────────────────────────────────────────────────────────────

cmd_restore() {
    local target="${1#-}"

    if [[ -z "$target" ]]; then
        err "No app specified. Use: iuno --restore -appname or -all"
        exit 1
    fi

    if [[ "$target" == "all" ]]; then
        for app in $(list_apps); do
            bash "$SCRIPTS/restore.sh" "$app"
        done
    else
        bash "$SCRIPTS/restore.sh" "$target"
    fi
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

case "${1:-}" in
    --backup|-b)    cmd_backup  "${2:-}" ;;
    --restore|-r)   cmd_restore "${2:-}" ;;
    --detect|-d)    cmd_detect ;;
    --clean|-c)     bash "$SCRIPTS/clean.sh" "${@:2}" ;;
    --help|-h|"")   cmd_help ;;
    *)              err "Unknown command: $1" ; cmd_help ; exit 1 ;;
esac
