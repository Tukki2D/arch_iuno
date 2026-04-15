#!/bin/bash
# restore.sh — check packages and restore configs from ~/.dotfiles to ~/.config
# Lives at: ~/.dotfiles/scripts/restore.sh
#
# Usage:
#   restore.sh -all
#   restore.sh -niri
#   restore.sh -niri -fish
#   restore.sh -list
#
# Behavior:
#   - Checks if required packages are installed, offers to install if not
#   - If a config already exists at the target, backs it up to ~/.dotfiles/backups/
#     before restoring. Only one backup is kept — it is overwritten each run.
#   - If no config exists at target, restores directly with no backup created.
#   - If no config exists in the dotfiles repo, warns and skips.

DOTFILES="$HOME/.dotfiles"
BACKUPS="$HOME/.dotfiles/backups"
SCRIPTS_DIR="$(dirname "$0")"
source "$SCRIPTS_DIR/common.sh"

# ── Restore helpers ───────────────────────────────────────────────────────────

# backup_existing <path>
# Moves an existing config to the backups folder if it exists.
# Does nothing if the path does not exist.
backup_existing() {
    local target="$1"
    local backup_dest="$BACKUPS/${target#$HOME/}"

    if [[ -e "$target" ]]; then
        mkdir -p "$(dirname "$backup_dest")"
        rm -rf "$backup_dest"
        mv "$target" "$backup_dest"
        warn "Existing config backed up: $target → $backup_dest"
    fi
}

# restore_dir <dotfiles_src> <target>
# Restores a directory from the dotfiles repo to the target path.
restore_dir() {
    local src="$1"
    local target="$2"

    if [[ ! -d "$src" ]]; then
        warn "No backup found in repo, skipping: $src"
        return 1
    fi

    backup_existing "$target"
    mkdir -p "$(dirname "$target")"
    cp -r "$src" "$(dirname "$target")/"
    ok "Restored: $target"
}

# restore_file <dotfiles_src> <target>
# Restores a single file from the dotfiles repo to the target path.
restore_file() {
    local src="$1"
    local target="$2"

    if [[ ! -f "$src" ]]; then
        warn "No backup found in repo, skipping: $src"
        return 1
    fi

    backup_existing "$target"
    mkdir -p "$(dirname "$target")"
    cp "$src" "$target"
    ok "Restored: $target"
}

# ── Package check ─────────────────────────────────────────────────────────────

# ensure_packages <app>
# Checks all required packages for an app.
# Offers to install any that are missing.
# Returns 1 if any package ends up missing after the install attempt.
ensure_packages() {
    local app="$1"
    local all_present=0

    for pkg in ${APP_PACKAGES[$app]}; do
        if is_installed "$pkg"; then
            ok "Package installed: $pkg"
        else
            warn "Package missing: $pkg"
            printf "  Install %s now? [y/N] " "$pkg"
            read -r answer
            if [[ "$answer" =~ ^[Yy]$ ]]; then
                install_package "$pkg" || all_present=1
            else
                warn "Skipping install of $pkg"
                all_present=1
            fi
        fi
    done

    return $all_present
}

# ── App restore functions ─────────────────────────────────────────────────────

restore_niri() {
    log "Restoring niri..."
    ensure_packages niri
    restore_dir "$DOTFILES/niri/.config/niri" "$HOME/.config/niri"
}

restore_kitty() {
    log "Restoring kitty..."
    ensure_packages kitty
    restore_dir "$DOTFILES/kitty/.config/kitty" "$HOME/.config/kitty"
}

restore_alacritty() {
    log "Restoring alacritty..."
    ensure_packages alacritty
    restore_dir "$DOTFILES/alacritty/.config/alacritty" "$HOME/.config/alacritty"
}

restore_fastfetch() {
    log "Restoring fastfetch..."
    ensure_packages fastfetch
    restore_dir "$DOTFILES/fastfetch/.config/fastfetch" "$HOME/.config/fastfetch"
}

restore_noctalia() {
    log "Restoring noctalia..."
    ensure_packages noctalia
    restore_dir "$DOTFILES/noctalia/.config/noctalia" "$HOME/.config/noctalia"
}

restore_fish() {
    log "Restoring fish..."
    ensure_packages fish

    # Restore fish config dirs individually — fish_variables is never restored
    # as it is runtime generated and machine specific
    local fish_dest="$HOME/.config/fish"
    local fish_src="$DOTFILES/fish/.config/fish"

    if [[ ! -d "$fish_src" ]]; then
        warn "No fish backup found in repo, skipping."
        return 1
    fi

    mkdir -p "$fish_dest"

    for item in completions conf.d functions config.fish; do
        local src="$fish_src/$item"
        local dest="$fish_dest/$item"
        if [[ -e "$src" ]]; then
            backup_existing "$dest"
            cp -r "$src" "$fish_dest/"
            ok "Restored: $dest"
        fi
    done
}

restore_starship() {
    log "Restoring starship..."
    ensure_packages starship
    # Restores to ~/.config/starship.toml directly.
    # Note: on a fresh CachyOS install mybash may have placed a symlink here.
    # backup_existing will move it aside before restoring the real file.
    restore_file "$DOTFILES/starship/.config/starship.toml" \
                 "$HOME/.config/starship.toml"
}

restore_nvim() {
    log "Restoring nvim..."
    ensure_packages nvim
    restore_dir "$DOTFILES/nvim/.config/nvim" "$HOME/.config/nvim"
}

restore_krita() {
    log "Restoring krita..."
    ensure_packages krita

    # rc files
    restore_file "$DOTFILES/krita/.config/kritarc"          "$HOME/.config/kritarc"
    restore_file "$DOTFILES/krita/.config/kritadisplayrc"   "$HOME/.config/kritadisplayrc"
    restore_file "$DOTFILES/krita/.config/kritashortcutsrc" "$HOME/.config/kritashortcutsrc"

    # User data dirs
    local krita_dirs=(
        brushes
        color-schemes
        input
        paintoppresets
        palettes
        patterns
        gradients
        workspaces
        windowlayouts
        tasksets
        sessions
        templates
        pykrita
        symbols
        asl
    )

    for dir in "${krita_dirs[@]}"; do
        local src="$DOTFILES/krita/.local/share/krita/$dir"
        if [[ -d "$src" ]]; then
            restore_dir "$src" "$HOME/.local/share/krita/$dir"
        fi
    done

    # Custom brush bundle
    local bundle="Dojen Krita Brushes .bundle"
    local bundle_src="$DOTFILES/krita/.local/share/krita/$bundle"
    if [[ -f "$bundle_src" ]]; then
        restore_file "$bundle_src" "$HOME/.local/share/krita/$bundle"
    fi

    ok "krita done."
}

# ── Usage ─────────────────────────────────────────────────────────────────────

usage() {
    printf "\n"
    printf "  Usage: restore [-all] [-app] [-list]\n"
    printf "\n"
    printf "  Flags:\n"
    printf "    -all          Restore all configs\n"
    printf "    -niri         Niri compositor\n"
    printf "    -kitty        Kitty terminal\n"
    printf "    -alacritty    Alacritty terminal\n"
    printf "    -fastfetch    Fastfetch\n"
    printf "    -noctalia     Noctalia shell theme\n"
    printf "    -fish         Fish shell\n"
    printf "    -starship     Starship prompt\n"
    printf "    -nvim         Neovim\n"
    printf "    -krita        Krita configs and user data\n"
    printf "    -list         Show backup and package status\n"
    printf "\n"
    printf "  Existing configs are backed up to: %s\n" "$BACKUPS"
    printf "  One backup is kept per app — previous backup is overwritten.\n"
    printf "\n"
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

if [[ $# -eq 0 ]]; then
    usage
    exit 0
fi

for arg in "$@"; do
    case "$arg" in
        -all)
            restore_niri
            restore_kitty
            restore_alacritty
            restore_fastfetch
            restore_noctalia
            restore_fish
            restore_starship
            restore_nvim
            restore_krita
            ;;
        -niri)       restore_niri ;;
        -kitty)      restore_kitty ;;
        -alacritty)  restore_alacritty ;;
        -fastfetch)  restore_fastfetch ;;
        -noctalia)   restore_noctalia ;;
        -fish)       restore_fish ;;
        -starship)   restore_starship ;;
        -nvim)       restore_nvim ;;
        -krita)      restore_krita ;;
        -list)       show_list ;;
        *)
            err "Unknown flag: $arg"
            usage
            exit 1
            ;;
    esac
done

log "Done."
