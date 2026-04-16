#!/bin/bash
# check-aur.sh — verify an AUR helper is available, install paru if not
# Lives at: ~/iuno/scripts/check-aur.sh
#
# Usage:
#   bash ~/iuno/scripts/check-aur.sh
#   Called by install.sh and niri-install.sh before any package installs.
#
# Returns 0 if paru or yay is available after this script runs.
# Returns 1 if no AUR helper is available and the user declined to install paru.
#
# Never run as root. Requires sudo access.

BUILD_DIR="/tmp/paru-build"

# ── Helpers ───────────────────────────────────────────────────────────────────

log()  { echo "[check-aur] $*"; }
ok()   { echo "[check-aur] ✓  $*"; }
warn() { echo "[check-aur] ⚠  $*"; }
err()  { echo "[check-aur] ✗  $*"; }

die() {
    err "$*"
    exit 1
}

cleanup() {
    if [[ -d "$BUILD_DIR" ]]; then
        rm -rf "$BUILD_DIR"
        log "Cleaned up build directory."
    fi
}

# ── Safety checks ─────────────────────────────────────────────────────────────

# Abort if running as root — makepkg refuses to run as root
if [[ "$EUID" -eq 0 ]]; then
    die "Do not run as root. Run as a normal user with sudo access."
fi

# Verify sudo access before attempting anything
if ! sudo -v &>/dev/null; then
    die "sudo access required. Make sure your user has sudo privileges."
fi

# ── AUR helper check ──────────────────────────────────────────────────────────

if command -v paru &>/dev/null; then
    ok "paru is available."
    exit 0
fi

if command -v yay &>/dev/null; then
    ok "yay is available."
    exit 0
fi

# ── No AUR helper found ───────────────────────────────────────────────────────

warn "No AUR helper found (checked: paru, yay)."
printf "\n"
printf "  An AUR helper is required to install AUR packages.\n"
printf "  Without one, AUR packages will not be installable.\n"
printf "\n"
printf "  Install paru now? [y/N] "
read -r answer

if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    warn "Skipping paru install. AUR packages will not be installable."
    exit 1
fi

# ── Install paru ──────────────────────────────────────────────────────────────

log "Installing paru..."

# Ensure git is available — required for cloning
if ! command -v git &>/dev/null; then
    log "git not found — installing via pacman..."
    if ! sudo pacman -S --needed --noconfirm git; then
        die "Failed to install git. Cannot proceed."
    fi
    ok "git installed."
fi

# Ensure base-devel is available — required for makepkg
log "Ensuring base-devel is installed..."
if ! sudo pacman -S --needed --noconfirm base-devel; then
    die "Failed to install base-devel. Cannot proceed."
fi
ok "base-devel ready."

# Clean up any previous failed build
cleanup

# Clone paru from AUR
log "Cloning paru from AUR..."
if ! git clone https://aur.archlinux.org/paru.git "$BUILD_DIR"; then
    cleanup
    die "Failed to clone paru. Check your internet connection and try again."
fi

# Build and install
log "Building and installing paru..."
cd "$BUILD_DIR" || die "Failed to enter build directory."

if ! makepkg -si --noconfirm; then
    cd "$HOME" || true
    cleanup
    die "paru build failed. Check the errors above and try again."
fi

cd "$HOME" || true

# Clean up build directory
cleanup

# Verify paru is now available
if command -v paru &>/dev/null; then
    ok "paru installed successfully."
    exit 0
else
    warn "paru was installed but is not found in PATH."
    warn "Try opening a new terminal, then re-run this script."
    exit 1
fi
