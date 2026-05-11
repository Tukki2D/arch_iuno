#!/bin/bash
# common.sh — shared toolset for iuno scripts
# Lives at: ~/iuno/scripts/core/common.sh
#
# Never run directly. Sourced by other scripts:
#   source "$(dirname "$0")/../core/common.sh"
#
# Provides:
#   Output helpers       log, ok, warn, err
#   Distro detection     detect_distro
#   Package install      install_package, install_with_prompt
#   Logging              log_action
#   File comparison      file_hash, configs_match
#   Machine loading      load_machine

# ── Resolve iuno root ─────────────────────────────────────────────────────────
# IUNO_ROOT is the absolute path to the iuno repo.
# Every script that sources common.sh can use $IUNO_ROOT safely.
IUNO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ── Load machine file ─────────────────────────────────────────────────────────
# Loads defaults first, then overrides for this machine.
# Machine files live in $IUNO_ROOT/machines/
load_machine() {
    local defaults="$IUNO_ROOT/machines/defaults.sh"
    local machine="$IUNO_ROOT/machines/$(hostname).sh"

    [[ -f "$defaults" ]] && source "$defaults"
    [[ -f "$machine" ]]  && source "$machine"
}

load_machine

# ── Output helpers ────────────────────────────────────────────────────────────
log()  { echo "[iuno] $*"; }
ok()   { echo "[iuno] ✓  $*"; }
warn() { echo "[iuno] ⚠  $*"; }
err()  { echo "[iuno] ✗  $*"; }

# ── Action log ────────────────────────────────────────────────────────────────
# Appends a timestamped record to iuno.log.
# Called by any script that does something real.
#
# Usage:
#   log_action "backup" "niri" "custom.kdl outputs.kdl"
log_action() {
    local action="$1"
    local app="$2"
    local detail="$3"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M')
    echo "[$timestamp] $action  $app  $detail" >> "$IUNO_ROOT/iuno.log"
}

# ── Distro detection ──────────────────────────────────────────────────────────
# Detects the base distro family by checking which package manager is available.
# Returns: arch, deb, or unknown
#
# Usage:
#   DISTRO=$(detect_distro)
detect_distro() {
    if command -v pacman &>/dev/null; then
        echo "arch"
    elif command -v apt &>/dev/null; then
        echo "deb"
    else
        echo "unknown"
    fi
}

# ── Package install ───────────────────────────────────────────────────────────
# Installs a single package using the correct method for this distro.
# Does not prompt — prompting is handled by install_with_prompt.
#
# Usage:
#   install_package "krita"
install_package() {
    local name="$1"
    local distro
    distro=$(detect_distro)

    case "$distro" in
        arch)
            if command -v paru &>/dev/null; then
                paru -S --noconfirm "$name"
            else
                sudo pacman -S --noconfirm "$name"
            fi
            ;;
        deb)
            sudo apt install -y "$name"
            ;;
        *)
            err "Unsupported distro. Cannot install: $name"
            return 1
            ;;
    esac

    log_action "install" "$name" "$(detect_distro)"
}

# ── Install with prompt ───────────────────────────────────────────────────────
# Reads the app's description file, shows it to the user, and prompts.
# Installs only if the user confirms.
#
# Usage:
#   install_with_prompt "$APP_DIR" "krita"
install_with_prompt() {
    local app_dir="$1"
    local pkg_name="$2"
    local desc=""

    [[ -f "$app_dir/description" ]] && desc=$(cat "$app_dir/description")

    printf "\n"
    printf "  %s\n" "$pkg_name"
    [[ -n "$desc" ]] && printf "  %s\n" "$desc"
    printf "\n  Install? [y/N] "
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] && install_package "$pkg_name"
}

# ── File hash ─────────────────────────────────────────────────────────────────
# Returns a sha256 hash of a file's content.
# Used to detect whether a file has changed since last backup.
#
# Usage:
#   hash=$(file_hash "$HOME/.config/niri/custom.kdl")
file_hash() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        err "file_hash: file not found: $file"
        return 1
    fi
    sha256sum "$file" | cut -d' ' -f1
}

# ── Config comparison ─────────────────────────────────────────────────────────
# Compares two files. Returns 0 if identical, 1 if different.
# Used by backup and restore to check if action is needed.
#
# Usage:
#   if configs_match "$repo_file" "$live_file"; then
#       log "Already up to date."
#   fi
configs_match() {
    local file_a="$1"
    local file_b="$2"
    diff -q "$file_a" "$file_b" &>/dev/null
}
