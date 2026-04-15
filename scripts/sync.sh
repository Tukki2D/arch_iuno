#!/bin/bash
# sync.sh — back up configs from ~/.config into ~/.dotfiles
# Lives at: ~/.dotfiles/scripts/sync.sh
#
# Usage:
#   sync.sh -all
#   sync.sh -niri
#   sync.sh -niri -fish
#   sync.sh -list
#
# Run deliberately when your config is in a known-good state.
# Copies — does not symlink. Your live configs are never moved or touched.

DOTFILES="$HOME/.dotfiles"
SCRIPTS_DIR="$(dirname "$0")"
source "$SCRIPTS_DIR/common.sh"

# ── Copy helpers ──────────────────────────────────────────────────────────────

# copy_dir <source> <dest>
# Copies a directory into the dotfiles repo.
# Creates destination parent dirs as needed.
copy_dir() {
    local src="$1"
    local dest="$2"

    if [[ ! -d "$src" ]]; then
        warn "Source directory not found, skipping: $src"
        return 1
    fi

    mkdir -p "$(dirname "$dest")"
    cp -r "$src" "$(dirname "$dest")/"
    ok "Backed up: $src"
}

# copy_file <source> <dest>
# Copies a single file into the dotfiles repo.
# Creates destination parent dirs as needed.
copy_file() {
    local src="$1"
    local dest="$2"

    if [[ ! -f "$src" ]]; then
        warn "Source file not found, skipping: $src"
        return 1
    fi

    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    ok "Backed up: $src"
}

# ── App backup functions ──────────────────────────────────────────────────────

backup_niri() {
    log "Backing up niri..."
    copy_dir "$HOME/.config/niri" "$DOTFILES/niri/.config/niri"
}

backup_hypr() {
    log "Backing up hypr..."
    copy_dir "$HOME/.config/hypr" "$DOTFILES/hypr/.config/hypr"
}

backup_kitty() {
    log "Backing up kitty..."
    copy_dir "$HOME/.config/kitty" "$DOTFILES/kitty/.config/kitty"
}

backup_alacritty() {
    log "Backing up alacritty..."
    copy_dir "$HOME/.config/alacritty" "$DOTFILES/alacritty/.config/alacritty"
}

backup_fastfetch() {
    log "Backing up fastfetch..."
    copy_dir "$HOME/.config/fastfetch" "$DOTFILES/fastfetch/.config/fastfetch"
}

backup_noctalia() {
    log "Backing up noctalia..."
    copy_dir "$HOME/.config/noctalia" "$DOTFILES/noctalia/.config/noctalia"
}

backup_fish() {
    log "Backing up fish..."
    # Copy the full fish config dir excluding fish_variables
    # fish_variables is runtime generated and changes constantly
    mkdir -p "$DOTFILES/fish/.config/fish"
    cp -r "$HOME/.config/fish/completions" "$DOTFILES/fish/.config/fish/" 2>/dev/null
    cp -r "$HOME/.config/fish/conf.d"      "$DOTFILES/fish/.config/fish/" 2>/dev/null
    cp -r "$HOME/.config/fish/functions"   "$DOTFILES/fish/.config/fish/" 2>/dev/null
    copy_file "$HOME/.config/fish/config.fish" "$DOTFILES/fish/.config/fish/config.fish"
    ok "Backed up: ~/.config/fish (fish_variables excluded)"
}

backup_starship() {
    log "Backing up starship..."
    # ~/.config/starship.toml is currently a symlink to mybash.
    # We copy the real file content, not the symlink itself.
    copy_file "$(realpath "$HOME/.config/starship.toml")" \
              "$DOTFILES/starship/.config/starship.toml"
}

backup_nvim() {
    log "Backing up nvim..."
    copy_dir "$HOME/.config/nvim" "$DOTFILES/nvim/.config/nvim"
}

backup_krita() {
    log "Backing up krita..."

    # rc files
    copy_file "$HOME/.config/kritarc"          "$DOTFILES/krita/.config/kritarc"
    copy_file "$HOME/.config/kritadisplayrc"   "$DOTFILES/krita/.config/kritadisplayrc"
    copy_file "$HOME/.config/kritashortcutsrc" "$DOTFILES/krita/.config/kritashortcutsrc"

    # User data dirs — skip default bundles, cache, and logs
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

    mkdir -p "$DOTFILES/krita/.local/share/krita"

    for dir in "${krita_dirs[@]}"; do
        local src="$HOME/.local/share/krita/$dir"
        if [[ -d "$src" ]]; then
            cp -r "$src" "$DOTFILES/krita/.local/share/krita/"
        fi
    done

    # Custom brush bundle only — skip Krita default bundles and sqlite cache
    local bundle="Dojen Krita Brushes .bundle"
    if [[ -f "$HOME/.local/share/krita/$bundle" ]]; then
        copy_file "$HOME/.local/share/krita/$bundle" \
                  "$DOTFILES/krita/.local/share/krita/$bundle"
    fi

    ok "krita done."
}

backup_ckbnext() {
    log "Backing up ckb-next..."
    copy_dir "$HOME/.config/ckb-next" "$DOTFILES/ckb-next/.config/ckb-next"
}

# ── Usage ─────────────────────────────────────────────────────────────────────

usage() {
    printf "\n"
    printf "  Usage: dotback [-all] [-app] [-list]\n"
    printf "\n"
    printf "  Flags:\n"
    printf "    -all          Back up all configs\n"
    printf "    -niri         Niri compositor\n"
    printf "    -hypr         Hyprland compositor\n"
    printf "    -kitty        Kitty terminal\n"
    printf "    -alacritty    Alacritty terminal\n"
    printf "    -fastfetch    Fastfetch\n"
    printf "    -noctalia     Noctalia shell theme\n"
    printf "    -fish         Fish shell (excludes fish_variables)\n"
    printf "    -starship     Starship prompt\n"
    printf "    -nvim         Neovim\n"
    printf "    -krita        Krita configs and user data\n"
    printf "    -ckb-next     CKB-Next keyboard profiles\n"
    printf "    -list         Show backup and package status\n"
    printf "\n"
    printf "  Dotfiles: %s\n" "$DOTFILES"
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
            backup_niri
            backup_hypr
            backup_kitty
            backup_alacritty
            backup_fastfetch
            backup_noctalia
            backup_fish
            backup_starship
            backup_nvim
            backup_krita
            backup_ckbnext
            ;;
        -niri)      backup_niri ;;
        -hypr)      backup_hypr ;;
        -kitty)     backup_kitty ;;
        -alacritty) backup_alacritty ;;
        -fastfetch) backup_fastfetch ;;
        -noctalia)  backup_noctalia ;;
        -fish)      backup_fish ;;
        -starship)  backup_starship ;;
        -nvim)      backup_nvim ;;
        -krita)     backup_krita ;;
        -ckb-next)  backup_ckbnext ;;
        -list)      show_list ;;
        *)
            err "Unknown flag: $arg"
            usage
            exit 1
            ;;
    esac
done

log "Done."
