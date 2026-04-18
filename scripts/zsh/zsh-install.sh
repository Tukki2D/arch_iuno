#!/bin/bash
# zsh-install.sh — fresh zsh install
# Lives at: ~/iuno/scripts/zsh/zsh-install.sh
#
# Usage:
#   bash ~/iuno/scripts/zsh/zsh-install.sh
#   install.sh -zsh
#
# Installs zsh, plugins, oh-my-zsh, fzf, and starship.
# Deploys .zshrc from ~/iuno/home/.zshrc.
# Sets zsh as the default shell.
#
# CachyOS note:
#   Plugins are at /usr/share/zsh/plugins/ — same path used in .zshrc.
#   oh-my-zsh is available as oh-my-zsh-git from the CachyOS repo.
#
# Base Arch note:
#   oh-my-zsh-git may not be available. If paru install fails, the script
#   offers manual install instructions via the official oh-my-zsh script.
#   Verify oh-my-zsh install path — may differ from /usr/share/oh-my-zsh.

SCRIPTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IUNO="$HOME/iuno"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/install.sh"

# ── Main ──────────────────────────────────────────────────────────────────────

printf "\n"
log "Starting zsh install..."
printf "\n"

# Verify AUR helper is available before any installs
bash "$SCRIPTS_DIR/check-aur.sh" || exit 1

# 1. Install zsh
log "Installing zsh..."
is_installed "zsh" && ok "Already installed: zsh" || install_package "zsh"

# 2. Install plugins
log "Installing zsh plugins..."
for pkg in zsh-syntax-highlighting zsh-autosuggestions zsh-history-substring-search; do
    is_installed "$pkg" && ok "Already installed: $pkg" || install_package "$pkg"
done

# 3. Install fzf
log "Installing fzf..."
is_installed "fzf" && ok "Already installed: fzf" || install_package "fzf"

# 4. Install oh-my-zsh
log "Installing oh-my-zsh..."
if [[ -f "/usr/share/oh-my-zsh/oh-my-zsh.sh" ]]; then
    ok "oh-my-zsh already installed at /usr/share/oh-my-zsh"
else
    if install_package "oh-my-zsh-git"; then
        ok "oh-my-zsh installed."
    else
        warn "oh-my-zsh-git install failed."
        warn "On base Arch, install manually:"
        warn "  sh -c \"\$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)\""
        warn "Then update ZSH= path in ~/.zshrc to match your install location."
    fi
fi

# 5. Install starship
log "Installing starship..."
if command -v starship &>/dev/null; then
    ok "Already installed: starship ($(starship --version | head -1))"
else
    install_package "starship" || {
        warn "starship not found in repos. Install manually:"
        warn "  curl -sS https://starship.rs/install.sh | sh"
    }
fi

# 6. Deploy .zshrc
printf "\n"
if [[ ! -f "$IUNO/home/.zshrc" ]]; then
    warn "No .zshrc found in iuno repo at $IUNO/home/.zshrc — skipping deploy."
else
    if [[ -f "$HOME/.zshrc" ]]; then
        printf "  ~/.zshrc already exists. Overwrite with iuno repo version? [y/N] "
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            cp "$HOME/.zshrc" "$HOME/.zshrc.bak"
            warn "Existing .zshrc backed up to ~/.zshrc.bak"
            cp "$IUNO/home/.zshrc" "$HOME/.zshrc"
            ok "Deployed: ~/.zshrc"
        else
            log "Skipping .zshrc deploy. Run: cp ~/iuno/home/.zshrc ~/.zshrc when ready."
        fi
    else
        cp "$IUNO/home/.zshrc" "$HOME/.zshrc"
        ok "Deployed: ~/.zshrc"
    fi
fi

# 7. Set zsh as default shell
printf "\n"
if [[ "$SHELL" == "$(which zsh)" ]]; then
    ok "zsh is already the default shell."
else
    printf "  Set zsh as your default shell? [y/N] "
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        chsh -s "$(which zsh)"
        ok "Default shell set to zsh. Log out and back in for it to take effect."
    else
        log "Skipping. Run: chsh -s \$(which zsh) when ready."
    fi
fi

# 8. Bootstrap iuno aliases for zsh
printf "\n"
printf "  Run bootstrap-alias.sh to set up iuno aliases for zsh? [y/N] "
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
    bash "$SCRIPTS_DIR/bootstrap-alias.sh"
else
    log "Skipping. Run: bash ~/iuno/scripts/bootstrap-alias.sh when ready."
fi

# 9. Next steps
printf "\n"
printf "  ── Next steps ───────────────────────────────────────────────────────\n"
printf "\n"
printf "  1. Open a new terminal — zsh will be active\n"
printf "\n"
printf "  2. Verify starship prompt is working\n"
printf "     starship --version\n"
printf "\n"
printf "  3. If oh-my-zsh path differs from /usr/share/oh-my-zsh,\n"
printf "     update ZSH= in ~/.zshrc to match your install location\n"
printf "\n"
printf "  ─────────────────────────────────────────────────────────────────────\n"
printf "\n"
ok "zsh install complete."
printf "\n"
