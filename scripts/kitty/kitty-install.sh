#!/bin/bash
# kitty-install.sh — fresh kitty install
# Lives at: ~/iuno/scripts/kitty/kitty-install.sh
#
# Usage:
#   bash ~/iuno/scripts/kitty/kitty-install.sh
#   install.sh -kitty
#
# Never touches ~/.config/ before package is installed.
# Deploys config from iuno repo after install.

SCRIPTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IUNO="$HOME/iuno"
KITTY_REPO="$IUNO/kitty"
KITTY_LIVE="$HOME/.config/kitty"

source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/install.sh"

# ── Main ──────────────────────────────────────────────────────────────────────

printf "\n"
log "Starting kitty install..."
printf "\n"

# Verify AUR helper is available before any installs
bash "$SCRIPTS_DIR/check-aur.sh" || exit 1

# 1. Install kitty package
if is_installed "kitty"; then
    ok "kitty already installed."
else
    log "Installing kitty..."
    install_package "kitty" || exit 1
fi

# 2. Deploy config from iuno repo
printf "\n"
log "Deploying kitty config from iuno repo..."

mkdir -p "$KITTY_LIVE/themes"

# Deploy default_kitty.conf as kitty.conf
# default_kitty.conf is the upstream default + include block (font/theme commented out)
if [[ -f "$KITTY_REPO/default_kitty.conf" ]]; then
    cp "$KITTY_REPO/default_kitty.conf" "$KITTY_LIVE/kitty.conf"
    ok "Deployed: kitty.conf (from default_kitty.conf)"
else
    warn "default_kitty.conf not found in iuno repo — skipping kitty.conf deploy."
fi

# Deploy personal files
for f in custom.conf window.conf font.conf current-theme.conf; do
    if [[ -f "$KITTY_REPO/$f" ]]; then
        cp "$KITTY_REPO/$f" "$KITTY_LIVE/$f"
        ok "Deployed: $f"
    else
        warn "$f not found in iuno repo — skipping."
    fi
done

# Deploy themes directory
if [[ -d "$KITTY_REPO/themes" ]]; then
    cp -r "$KITTY_REPO/themes/." "$KITTY_LIVE/themes/"
    ok "Deployed: themes/"
else
    warn "themes/ not found in iuno repo — skipping."
fi

# 3. Show what is installed and what tools are available
printf "\n"
log "Installed apps and available tools:"
bash "$SCRIPTS_DIR/iuno.sh" --detect

# 4. Next steps
printf "\n"
printf "  ── Next steps ───────────────────────────────────────────────────────\n"
printf "\n"
printf "  1. Verify font is installed\n"
printf "     fc-list | grep JetBrainsMono\n"
printf "     If installed: uncomment include font.conf in kitty.conf\n"
printf "\n"
printf "  2. Verify theme is applied\n"
printf "     kitten theme\n"
printf "     If needed: uncomment include current-theme.conf in kitty.conf\n"
printf "\n"
printf "  3. Reload kitty config\n"
printf "     kill -SIGUSR1 \$(pgrep kitty)\n"
printf "\n"
printf "  ─────────────────────────────────────────────────────────────────────\n"
printf "\n"
ok "kitty install complete."
printf "\n"
