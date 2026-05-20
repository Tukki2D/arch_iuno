#!/bin/bash
# common.sh — shared toolset for iuno scripts
# Lives at: ~/iuno/scripts/core/common.sh
#
# Never run directly. Sourced by other scripts:
#   source "$(dirname "$0")/../../scripts/core/common.sh"
#
# Provides:
#   IUNO_ROOT            Absolute path to the iuno repo
#   load_machine()       Sources machine files
#   detect_distro()      Returns arch | deb | unknown
#   install_package()    Distro-aware package installer
#   log_action()         Appends to iuno.log
#   file_hash()          sha256 fingerprint of a file
#   configs_match()      Returns 0 if two files are identical
#   log/ok/warn/err      Output helpers

# ── IUNO_ROOT ─────────────────────────────────────────────────────────────────
# Resolved from common.sh's own location — works wherever iuno lives.
IUNO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ── Machine files ─────────────────────────────────────────────────────────────
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
# Appends a timestamped entry to iuno.log.
# Usage: log_action "backup" "niri" "detail"
log_action() {
    local action="$1"
    local app="$2"
    local detail="$3"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M')
    echo "[$timestamp] $action  $app  $detail" >> "$IUNO_ROOT/iuno.log"
}

# ── Distro detection ──────────────────────────────────────────────────────────
# Checks which package manager is available.
# Returns: arch | deb | unknown
detect_distro() {
    if command -v pacman &>/dev/null; then echo "arch"
    elif command -v apt &>/dev/null;  then echo "deb"
    else echo "unknown"
    fi
}

# ── Package install ───────────────────────────────────────────────────────────
# Low-level installer. Never prompts.
# Usage: install_package "packagename"
install_package() {
    local name="$1"
    case "$(detect_distro)" in
        arch)
            if command -v paru &>/dev/null; then
                paru -S --noconfirm "$name"
            elif command -v yay &>/dev/null; then
                yay -S --noconfirm "$name"
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

# ── File hash ─────────────────────────────────────────────────────────────────
# Returns sha256 fingerprint of a file.
# Usage: hash=$(file_hash "/path/to/file")
file_hash() {
    local file="$1"
    [[ ! -f "$file" ]] && err "file_hash: not found: $file" && return 1
    sha256sum "$file" | cut -d' ' -f1
}

# ── Config comparison ─────────────────────────────────────────────────────────
# Returns 0 if two files are identical, 1 if different.
# Usage: configs_match "$repo_file" "$live_file"
configs_match() {
    diff -q "$1" "$2" &>/dev/null
}
