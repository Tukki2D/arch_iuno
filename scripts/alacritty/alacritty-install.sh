#!/bin/bash
# alacritty-install.sh — fresh alacritty install
# Lives at: ~/iuno/scripts/alacritty/alacritty-install.sh
#
# Usage:
#   bash ~/iuno/scripts/alacritty/alacritty-install.sh
#   install.sh -alacritty

SCRIPTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IUNO="$HOME/iuno"
ALACRITTY_REPO="$IUNO/alacritty"
ALACRITTY_LIVE="$HOME/.config/alacritty"

source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/install.sh"

# ── Main ──────────────────────────────────────────────────────────────────────

printf "\n"
log "Starting alacritty install..."
printf "\n"

# Verify AUR helper is available before any installs
bash "$SCRIPTS_DIR/check-aur.sh" || exit 1

# 1. Install alacritty package
if is_installed "alacritty"; then
    ok "alacritty already installed."
else
    log "Installing alacritty..."
    install_package "alacritty" || exit 1
fi

# 2. Install wl-clipboard — required for clipboard integration on Wayland
if is_installed "wl-clipboard"; then
    ok "wl-clipboard already installed."
else
    log "Installing wl-clipboard..."
    install_package "wl-clipboard" || exit 1
fi

# 3. Deploy config from iuno repo
printf "\n"
log "Deploying alacritty config from iuno repo..."

mkdir -p "$ALACRITTY_LIVE"

if [[ -f "$ALACRITTY_REPO/alacritty.toml" ]]; then
    cp "$ALACRITTY_REPO/alacritty.toml" "$ALACRITTY_LIVE/alacritty.toml"
    ok "Deployed: alacritty.toml"
else
    warn "alacritty.toml not found in iuno repo — skipping."
fi

# 4. Show what is installed and what tools are available
printf "\n"
log "Installed apps and available tools:"
bash "$SCRIPTS_DIR/iuno.sh" --detect

# 5. Next steps
printf "\n"
printf "  ── Next steps ───────────────────────────────────────────────────────\n"
printf "\n"
printf "  1. Verify clipboard works\n"
printf "     echo test | wl-copy && wl-paste\n"
printf "\n"
printf "  2. Reload alacritty config\n"
printf "     Ctrl+Shift+R inside alacritty\n"
printf "\n"
printf "  ─────────────────────────────────────────────────────────────────────\n"
printf "\n"
ok "alacritty install complete."
printf "\n"
