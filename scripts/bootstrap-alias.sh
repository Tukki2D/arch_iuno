#!/bin/bash
# bootstrap-alias.sh — set up iuno and app tool aliases for your shell
# Lives at: ~/iuno/scripts/bootstrap-alias.sh
#
# Usage:
#   bash ~/iuno/scripts/bootstrap-alias.sh
#
# Detects your active shell (fish, bash, zsh) and adds aliases for:
#   iuno       → bash ~/iuno/scripts/iuno.sh
#   niri-tool  → bash ~/iuno/scripts/niri/niri-tool.sh
#
# Safe to run multiple times — will not add duplicate aliases.
# Add new tools to the TOOLS array below as they are built.

# ── Tool registry ─────────────────────────────────────────────────────────────
# App tools only — iuno itself is handled separately below.
# Format: "alias-name|script-path"
# Paths use $HOME so no username is hardcoded in written config files.
# Add entries here as new app tools are built.

TOOLS=(
    "niri-tool|\$HOME/iuno/scripts/niri/niri-tool.sh"
)

# ── Helpers ───────────────────────────────────────────────────────────────────

log()  { echo "[bootstrap] $*"; }
ok()   { echo "[bootstrap] ✓  $*"; }
warn() { echo "[bootstrap] ⚠  $*"; }
err()  { echo "[bootstrap] ✗  $*"; }

die() {
    err "$*"
    exit 1
}

# ── Shell detection ───────────────────────────────────────────────────────────

detect_shell() {
    local shell_name
    shell_name=$(basename "$SHELL")

    case "$shell_name" in
        fish) echo "fish" ;;
        zsh)  echo "zsh" ;;
        bash) echo "bash" ;;
        *)
            if command -v fish &>/dev/null && ps -p $PPID -o comm= 2>/dev/null | grep -q fish; then
                echo "fish"
            else
                echo "bash"
            fi
            ;;
    esac
}

# ── Fish ──────────────────────────────────────────────────────────────────────
# Fish uses per-function files in ~/.config/fish/functions/
# Each tool gets its own function file.

install_fish() {
    local functions_dir="$HOME/.config/fish/functions"
    local config="$HOME/.config/fish/config.fish"
    mkdir -p "$functions_dir"

    # iuno goes in config.fish as an alias — written with $HOME literal
    if grep -q "alias iuno" "$config" 2>/dev/null; then
        ok "iuno alias already present in $config"
    else
        printf "\n# iuno — config management tool\nalias iuno \"bash \$HOME/iuno/scripts/iuno.sh\"\n" >> "$config"
        ok "Added iuno alias to $config"
    fi

    # App tools get their own function files
    for entry in "${TOOLS[@]}"; do
        local name="${entry%%|*}"
        local script="${entry##*|}"
        local function_file="$functions_dir/$name.fish"

        if [[ -f "$function_file" ]]; then
            ok "$name function already present: $function_file"
            continue
        fi

        cat > "$function_file" << EOF
# $name — added by bootstrap-alias.sh
function $name
    bash $script \$argv
end
EOF
        ok "Added $name function: $function_file"
    done

    log "Reload fish or open a new terminal to use the tools."
}

# ── Bash ──────────────────────────────────────────────────────────────────────

install_bash() {
    local config="$HOME/.bashrc"
    local iuno_line='alias iuno="bash $HOME/iuno/scripts/iuno.sh"'

    # iuno alias
    if grep -q "alias iuno" "$config" 2>/dev/null; then
        ok "iuno alias already present in $config"
    else
        printf "\n# iuno — config management tool\n%s\n" "$iuno_line" >> "$config"
        ok "Added iuno alias to $config"
    fi

    # App tools
    for entry in "${TOOLS[@]}"; do
        local name="${entry%%|*}"
        local script="${entry##*|}"
        local alias_line="alias $name=\"bash $script\""

        if grep -q "alias $name" "$config" 2>/dev/null; then
            ok "$name alias already present in $config"
            continue
        fi

        printf "\n# %s — added by bootstrap-alias.sh\n%s\n" "$name" "$alias_line" >> "$config"
        ok "Added $name alias to $config"
    done

    log "Run: source ~/.bashrc  or open a new terminal to use the tools."
}

# ── Zsh ───────────────────────────────────────────────────────────────────────

install_zsh() {
    local config="$HOME/.zshrc"
    local iuno_line='alias iuno="bash $HOME/iuno/scripts/iuno.sh"'

    # iuno alias
    if grep -q "alias iuno" "$config" 2>/dev/null; then
        ok "iuno alias already present in $config"
    else
        printf "\n# iuno — config management tool\n%s\n" "$iuno_line" >> "$config"
        ok "Added iuno alias to $config"
    fi

    # App tools
    for entry in "${TOOLS[@]}"; do
        local name="${entry%%|*}"
        local script="${entry##*|}"
        local alias_line="alias $name=\"bash $script\""

        if grep -q "alias $name" "$config" 2>/dev/null; then
            ok "$name alias already present in $config"
            continue
        fi

        printf "\n# %s — added by bootstrap-alias.sh\n%s\n" "$name" "$alias_line" >> "$config"
        ok "Added $name alias to $config"
    done

    log "Open a new terminal to use the tools. (source ~/.zshrc may not apply in the current session)"
}

# ── Main ──────────────────────────────────────────────────────────────────────

printf "\n"
log "Detecting shell..."

SHELL_TYPE=$(detect_shell)
log "Detected: $SHELL_TYPE"
printf "\n"

case "$SHELL_TYPE" in
    fish) install_fish ;;
    zsh)  install_zsh ;;
    bash) install_bash ;;
    *)    die "Unrecognised shell: $SHELL_TYPE. Add aliases manually — see ~/iuno/README.md" ;;
esac

printf "\n"
log "Tools registered:"
for entry in "${TOOLS[@]}"; do
    local_name="${entry%%|*}"
    local_script="${entry##*|}"
    # Expand $HOME for the existence check only
    local_script_expanded="${local_script/\$HOME/$HOME}"
    if [[ -f "$local_script_expanded" ]]; then
        ok "  $local_name → $local_script"
    else
        warn "  $local_name → $local_script (script not found)"
    fi
done
printf "\n"
