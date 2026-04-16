#!/bin/bash
# nvim-install.sh — fresh neovim install
# Lives at: ~/iuno/scripts/nvim/nvim-install.sh
#
# Usage:
#   bash ~/iuno/scripts/nvim/nvim-install.sh
#   install.sh -nvim

SCRIPTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IUNO="$HOME/iuno"
NVIM_REPO="$IUNO/nvim/.config/nvim"
NVIM_LIVE="$HOME/.config/nvim"

source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/install.sh"

# ── Main ──────────────────────────────────────────────────────────────────────

printf "\n"
log "Starting neovim install..."
printf "\n"

# Verify AUR helper is available before any installs
bash "$SCRIPTS_DIR/check-aur.sh" || exit 1

# 1. Install neovim package
if is_installed "neovim"; then
    ok "neovim already installed."
else
    log "Installing neovim..."
    install_package "neovim" || exit 1
fi

# 2. Install wl-clipboard — required for system clipboard integration
if is_installed "wl-clipboard"; then
    ok "wl-clipboard already installed."
else
    log "Installing wl-clipboard..."
    install_package "wl-clipboard" || exit 1
fi

# 3. Deploy config from iuno repo
printf "\n"
log "Deploying neovim config from iuno repo..."

mkdir -p "$NVIM_LIVE"

if [[ -f "$NVIM_REPO/init.vim" ]]; then
    cp "$NVIM_REPO/init.vim" "$NVIM_LIVE/init.vim"
    ok "Deployed: init.vim"
else
    warn "init.vim not found in iuno repo — skipping."
fi

# 4. Show what is installed and what tools are available
printf "\n"
log "Installed apps and available tools:"
bash "$SCRIPTS_DIR/iuno.sh" --detect

# 5. Next steps
printf "\n"
printf "  ── Next steps ───────────────────────────────────────────────────────\n"
printf "\n"
printf "  1. Verify clipboard works in nvim\n"
printf "     :echo has('clipboard')\n"
printf "     Should return 1\n"
printf "\n"
printf "  ─────────────────────────────────────────────────────────────────────\n"
printf "\n"
ok "neovim install complete."
printf "\n"
