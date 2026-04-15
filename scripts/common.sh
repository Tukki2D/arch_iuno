#!/bin/bash
# common.sh — shared functions for sync.sh and restore.sh
# Sourced by both scripts. Do not call directly.
#
# Provides:
#   - Logging helpers
#   - Package detection and installation
#   - App registry (names, config paths, packages)
#   - show_list() — status table for -list flag
#
# Package notes:
#   starship — in extra/ repo as 'starship'. Current system has a manual
#              install at /usr/local/bin/starship. On next fresh install
#              use: paru -S starship

DOTFILES="$HOME/.dotfiles"

# ── Logging ───────────────────────────────────────────────────────────────────

log()  { echo "[dotfiles] $*"; }
ok()   { echo "[dotfiles] ✓  $*"; }
warn() { echo "[dotfiles] ⚠  $*"; }
err()  { echo "[dotfiles] ✗  $*"; }

# ── Package management ────────────────────────────────────────────────────────

# is_installed <package>
# Returns 0 if installed, 1 if not.
# Uses pacman -Q which covers packages from any source (pacman, AUR).
is_installed() {
    pacman -Q "$1" &>/dev/null
}

# install_package <package>
# Tries paru → yay → pacman in order.
# Warns and returns 1 if all fail.
install_package() {
    local pkg="$1"

    if command -v paru &>/dev/null; then
        log "Installing $pkg with paru..."
        paru -S --noconfirm "$pkg" && return 0
        warn "paru failed for $pkg"
    fi

    if command -v yay &>/dev/null; then
        log "Installing $pkg with yay..."
        yay -S --noconfirm "$pkg" && return 0
        warn "yay failed for $pkg"
    fi

    log "Installing $pkg with pacman..."
    if sudo pacman -S --noconfirm "$pkg"; then
        return 0
    fi

    err "All package managers failed for: $pkg"
    return 1
}

# ── App registry ──────────────────────────────────────────────────────────────
#
# APP_NAMES         — ordered list of all app keys
# APP_CONFIG_CHECK  — path inside $DOTFILES to check for backed-up config
# APP_PACKAGES      — space-separated packages required (all must be present)

APP_NAMES=(
    niri
    kitty
    alacritty
    fastfetch
    noctalia
    fish
    starship
    nvim
    krita
)

declare -A APP_CONFIG_CHECK
APP_CONFIG_CHECK[niri]="niri/.config/niri"
APP_CONFIG_CHECK[kitty]="kitty/.config/kitty"
APP_CONFIG_CHECK[alacritty]="alacritty/.config/alacritty"
APP_CONFIG_CHECK[fastfetch]="fastfetch/.config/fastfetch"
APP_CONFIG_CHECK[noctalia]="noctalia/.config/noctalia"
APP_CONFIG_CHECK[fish]="fish/.config/fish"
APP_CONFIG_CHECK[starship]="starship/.config/starship.toml"
APP_CONFIG_CHECK[nvim]="nvim/.config/nvim"
APP_CONFIG_CHECK[krita]="krita/.config/kritarc"

declare -A APP_PACKAGES
APP_PACKAGES[niri]="niri"
APP_PACKAGES[kitty]="kitty"
APP_PACKAGES[alacritty]="alacritty"
APP_PACKAGES[fastfetch]="fastfetch"
APP_PACKAGES[noctalia]="noctalia-qs noctalia-shell"
APP_PACKAGES[fish]="fish"
APP_PACKAGES[starship]="starship"
APP_PACKAGES[nvim]="neovim"
APP_PACKAGES[krita]="krita"

# ── Status helpers ────────────────────────────────────────────────────────────

# config_in_repo <app>
# Returns 0 if the app config exists in the dotfiles repo.
config_in_repo() {
    local app="$1"
    [[ -e "$DOTFILES/${APP_CONFIG_CHECK[$app]}" ]]
}

# packages_installed <app>
# Returns 0 only if ALL required packages for the app are installed.
packages_installed() {
    local app="$1"
    for pkg in ${APP_PACKAGES[$app]}; do
        is_installed "$pkg" || return 1
    done
    return 0
}

# ── List ──────────────────────────────────────────────────────────────────────

# show_list
# Prints a status table showing config backup status and package install status.
show_list() {
    local fmt="  %-12s  %-16s  %s\n"

    printf "\n"
    printf "$fmt" "APP" "CONFIG IN REPO" "PACKAGES"
    printf "$fmt" "-----------" "---------------" "-----------------------------"

    for app in "${APP_NAMES[@]}"; do

        # Config status
        if config_in_repo "$app"; then
            local cfg="✓ backed up"
        else
            local cfg="✗ not backed up"
        fi

        # Package status — each package checked individually
        local pkg_line=""
        for pkg in ${APP_PACKAGES[$app]}; do
            if is_installed "$pkg"; then
                pkg_line+="✓ $pkg  "
            else
                pkg_line+="✗ $pkg  "
            fi
        done

        printf "$fmt" "$app" "$cfg" "$pkg_line"
    done

    printf "\n"
    printf "  Dotfiles: %s\n" "$DOTFILES"
    printf "\n"
}
