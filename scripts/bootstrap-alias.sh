#!/bin/bash
# bootstrap-alias.sh — add the iuno alias to your shell config
# Lives at: ~/iuno/scripts/bootstrap-alias.sh
#
# Usage:
#   bash ~/iuno/scripts/bootstrap-alias.sh
#
# Detects your active shell (fish, bash, zsh) and adds:
#   alias iuno="bash ~/iuno/scripts/iuno.sh"
# to the correct config file.
#
# Safe to run multiple times — will not add a duplicate alias.

IUNO_SCRIPT="$HOME/iuno/scripts/iuno.sh"
ALIAS_LINE="alias iuno=\"bash $IUNO_SCRIPT\""
FISH_LINE="alias iuno \"bash $IUNO_SCRIPT\""

log()  { echo "[iuno] $*"; }
ok()   { echo "[iuno] ✓  $*"; }
warn() { echo "[iuno] ⚠  $*"; }
err()  { echo "[iuno] ✗  $*"; }

die() {
    err "$*"
    exit 1
}

# ── Shell detection ───────────────────────────────────────────────────────────

detect_shell() {
    # Check SHELL env var first
    local shell_name
    shell_name=$(basename "$SHELL")

    case "$shell_name" in
        fish) echo "fish" ;;
        zsh)  echo "zsh" ;;
        bash) echo "bash" ;;
        *)
            # Fall back to checking running process
            if command -v fish &>/dev/null && ps -p $PPID -o comm= 2>/dev/null | grep -q fish; then
                echo "fish"
            else
                echo "bash"
            fi
            ;;
    esac
}

# ── Install alias ─────────────────────────────────────────────────────────────

install_fish() {
    local config="$HOME/.config/fish/config.fish"

    if grep -q "alias iuno" "$config" 2>/dev/null; then
        ok "iuno alias already present in $config"
        return 0
    fi

    mkdir -p "$(dirname "$config")"
    printf "\n# iuno — config management tool\n%s\n" "$FISH_LINE" >> "$config"
    ok "Added iuno alias to $config"
    log "Reload fish or open a new terminal to use: iuno --help"
}

install_bash() {
    local config="$HOME/.bashrc"

    if grep -q "alias iuno" "$config" 2>/dev/null; then
        ok "iuno alias already present in $config"
        return 0
    fi

    printf "\n# iuno — config management tool\n%s\n" "$ALIAS_LINE" >> "$config"
    ok "Added iuno alias to $config"
    log "Run: source ~/.bashrc  or open a new terminal to use: iuno --help"
}

install_zsh() {
    local config="$HOME/.zshrc"

    if grep -q "alias iuno" "$config" 2>/dev/null; then
        ok "iuno alias already present in $config"
        return 0
    fi

    printf "\n# iuno — config management tool\n%s\n" "$ALIAS_LINE" >> "$config"
    ok "Added iuno alias to $config"
    log "Run: source ~/.zshrc  or open a new terminal to use: iuno --help"
}

# ── Main ──────────────────────────────────────────────────────────────────────

printf "\n"
log "Detecting shell..."

SHELL_TYPE=$(detect_shell)
log "Detected: $SHELL_TYPE"

case "$SHELL_TYPE" in
    fish) install_fish ;;
    zsh)  install_zsh ;;
    bash) install_bash ;;
    *)    die "Unrecognised shell: $SHELL_TYPE. Add the alias manually:" ;;
esac

printf "\n"
log "iuno alias points to: $IUNO_SCRIPT"

if [[ ! -f "$IUNO_SCRIPT" ]]; then
    warn "iuno.sh does not exist yet at $IUNO_SCRIPT"
    warn "iuno.sh is planned — use fish functions directly until it is built."
    warn "See: ~/iuno/README.md"
fi

printf "\n"
