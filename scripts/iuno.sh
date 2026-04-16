#!/bin/bash
# iuno.sh — top-level router for iuno config management
# Lives at: ~/iuno/scripts/iuno.sh
#
# Usage:
#   iuno --install [-flag]
#   iuno --backup  [-app]
#   iuno --restore [-app]
#   iuno --clean
#   iuno --detect
#   iuno --help

IUNO="$HOME/iuno"
SCRIPTS="$IUNO/scripts"
source "$SCRIPTS/common.sh"

# ── Helpers ───────────────────────────────────────────────────────────────────

die() {
    err "$*"
    exit 1
}

# ── --detect ──────────────────────────────────────────────────────────────────

cmd_detect() {
    printf "\n"
    printf "  Installed apps with dotfile support:\n\n"

    local fmt="  %-12s  %-12s  %s\n"

    for app in "${APP_NAMES[@]}"; do
        local pkg_status="not installed"
        local tool="—"

        if packages_installed "$app"; then
            pkg_status="installed"
        fi

        case "$app" in
            niri) tool="niri-tool --help" ;;
        esac

        if packages_installed "$app"; then
            printf "  ✓  %-12s  %-14s  %s\n" "$app" "$pkg_status" "$tool"
        else
            printf "  ✗  %-12s  %-14s  %s\n" "$app" "$pkg_status" "$tool"
        fi
    done

    printf "\n"
    printf "  Run: iuno --help for full usage.\n"
    printf "\n"
}

# ── --help ────────────────────────────────────────────────────────────────────

cmd_help() {
    printf "\n"
    printf "  iuno — config management tool\n"
    printf "\n"
    printf "  Commands:\n"
    printf "    --install  [-flag]   Install packages\n"
    printf "    --backup   [-app]    Back up configs to ~/iuno/\n"
    printf "    --restore  [-app]    Restore configs from ~/iuno/ to ~/.config/\n"
    printf "    --clean              Clean pacman and paru caches\n"
    printf "    --detect             Show installed apps and available tools\n"
    printf "    --help               Show this help\n"
    printf "\n"
    printf "  App tools:\n"
    printf "    niri-tool            Niri config update pipeline\n"
    printf "                         run: niri-tool --help\n"
    printf "\n"
    printf "  Examples:\n"
    printf "    iuno --backup -niri\n"
    printf "    iuno --restore -niri -fish\n"
    printf "    iuno --install -niri\n"
    printf "    iuno --install -core -browsers\n"
    printf "\n"
    printf "  Docs: https://github.com/Tukki2D/arch_iuno\n"
    printf "\n"
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

case "${1:-}" in
    --install)  bash "$SCRIPTS/install.sh"     "${@:2}" ;;
    --backup)   bash "$SCRIPTS/sync.sh"        "${@:2}" ;;
    --restore)  bash "$SCRIPTS/restore.sh"     "${@:2}" ;;
    --clean)    bash "$SCRIPTS/clean_cache.sh" "${@:2}" ;;
    --detect)   cmd_detect ;;
    --help)     cmd_help ;;
    *)
        cmd_help
        exit 0
        ;;
esac
