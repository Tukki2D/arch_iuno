#!/bin/bash
# install.sh — fresh install package bootstrapper
# Lives at: ~/.dotfiles/scripts/install.sh
#
# Usage:
#   install.sh -all
#   install.sh -core -browsers
#   install.sh -niri -noctalia
#   install.sh              (interactive mode)
#
# On a fresh install:
#   git clone git@github.com:Tukki2D/arch_dotfiles.git ~/.dotfiles
#   bash ~/.dotfiles/scripts/install.sh

DOTFILES="$HOME/.dotfiles"
SCRIPTS_DIR="$(dirname "$0")"
source "$SCRIPTS_DIR/common.sh"

# ── Bootstrap ─────────────────────────────────────────────────────────────────

# ensure_pacman_dep <package>
# Installs a package via pacman if not present.
# Used only for bootstrapping before paru is available.
ensure_pacman_dep() {
    local pkg="$1"
    if ! pacman -Q "$pkg" &>/dev/null; then
        log "Installing bootstrap dependency: $pkg"
        sudo pacman -S --needed --noconfirm "$pkg" || {
            err "Failed to install $pkg via pacman. Cannot continue."
            exit 1
        }
    else
        ok "Bootstrap dep present: $pkg"
    fi
}

# bootstrap_paru
# Checks for paru. If missing, offers to install it.
bootstrap_paru() {
    if command -v paru &>/dev/null; then
        ok "paru is installed."
        return 0
    fi

    warn "paru is not installed."
    printf "\n  Install paru from the AUR? [y/N] "
    read -r answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        err "paru is required. Exiting."
        exit 1
    fi

    log "Bootstrapping paru..."

    # Ensure git and base-devel are present before attempting AUR build
    ensure_pacman_dep git
    ensure_pacman_dep base-devel

    local build_dir
    build_dir=$(mktemp -d)
    git clone https://aur.archlinux.org/paru.git "$build_dir/paru" || {
        err "Failed to clone paru from AUR."
        exit 1
    }

    cd "$build_dir/paru" || exit 1
    makepkg -si --noconfirm || {
        err "Failed to build paru."
        exit 1
    }

    cd "$HOME" || exit 1
    rm -rf "$build_dir"

    if command -v paru &>/dev/null; then
        ok "paru installed successfully."
    else
        err "paru install failed. Exiting."
        exit 1
    fi
}

# ── Package groups ────────────────────────────────────────────────────────────

install_core() {
    log "Installing core packages..."
    local pkgs=(
        git
        neovim
        kitty
        alacritty
        fish
        starship
        fastfetch
        btop
        wl-clipboard
        ripgrep
        tree
        wget
        rsync
    )
    for pkg in "${pkgs[@]}"; do
        is_installed "$pkg" && ok "Already installed: $pkg" && continue
        install_package "$pkg"
    done
    ok "Core done."
}

install_browsers() {
    log "Installing browsers and communication..."
    local pkgs=(
        brave-bin
        waterfox-bin
        librewolf-bin
        firefox
        telegram-desktop
        discord
    )
    for pkg in "${pkgs[@]}"; do
        is_installed "$pkg" && ok "Already installed: $pkg" && continue
        install_package "$pkg"
    done
    ok "Browsers done."
}

install_media() {
    log "Installing media and gaming..."
    local pkgs=(
        steam
        vlc
        vlc-plugins-all
        heroic-games-launcher-bin
        bottles
        pavucontrol
    )
    for pkg in "${pkgs[@]}"; do
        is_installed "$pkg" && ok "Already installed: $pkg" && continue
        install_package "$pkg"
    done
    ok "Media done."
}

install_creative() {
    log "Installing creative tools..."
    local pkgs=(
        krita
        krita-plugin-gmic
        libreoffice-fresh
    )
    for pkg in "${pkgs[@]}"; do
        is_installed "$pkg" && ok "Already installed: $pkg" && continue
        install_package "$pkg"
    done
    ok "Creative done."
}

install_hardware() {
    log "Installing hardware tools..."
    local pkgs=(
        ckb-next-git
        openrgb
    )
    for pkg in "${pkgs[@]}"; do
        is_installed "$pkg" && ok "Already installed: $pkg" && continue
        install_package "$pkg"
    done
    ok "Hardware done."
}

install_ai() {
    log "Installing AI tools..."
    local pkgs=(
        ollama-rocm
    )
    for pkg in "${pkgs[@]}"; do
        is_installed "$pkg" && ok "Already installed: $pkg" && continue
        install_package "$pkg"
    done
    ok "AI done."
}

install_niri() {
    log "Installing Niri DE packages..."
    local pkgs=(
        niri
        dunst
        swayidle
        swaylock
        swaybg
        xwayland-satellite
        xdg-desktop-portal-gnome
	wlsunset
    )
    for pkg in "${pkgs[@]}"; do
        is_installed "$pkg" && ok "Already installed: $pkg" && continue
        install_package "$pkg"
    done
    ok "Niri done."

    # Wacom setup is part of any Wayland DE install
    setup_wacom
}

setup_wacom() {
    log "Setting up Wacom Cintiq Pro 24..."

    # Install libwacom — provides device profiles for the kernel driver
    if ! is_installed "libwacom"; then
        install_package "libwacom"
    else
        ok "Already installed: libwacom"
    fi

    # Write udev rule — grants hidraw access to the tablet
    # Required because product IDs 037c/037f/0380/0381/0331 are missing
    # from OTD's bundled rules as of version 0.6.6.2
    local udev_rule="/etc/udev/rules.d/99-wacom-cintiq-pro24.rules"
    if [[ -f "$udev_rule" ]]; then
        ok "Udev rule already exists: $udev_rule"
    else
        log "Writing udev rule: $udev_rule"
        sudo tee "$udev_rule" > /dev/null << 'UDEV'
# Wacom Cintiq Pro 24 - missing from OTD 0.6.6.2 rules
KERNEL=="hidraw*", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="037c", TAG+="uaccess", TAG+="udev-acl"
SUBSYSTEM=="usb", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="037c", TAG+="uaccess", TAG+="udev-acl"
KERNEL=="hidraw*", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="037f", TAG+="uaccess", TAG+="udev-acl"
SUBSYSTEM=="usb", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="037f", TAG+="uaccess", TAG+="udev-acl"
KERNEL=="hidraw*", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="0380", TAG+="uaccess", TAG+="udev-acl"
SUBSYSTEM=="usb", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="0380", TAG+="uaccess", TAG+="udev-acl"
KERNEL=="hidraw*", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="0381", TAG+="uaccess", TAG+="udev-acl"
SUBSYSTEM=="usb", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="0381", TAG+="uaccess", TAG+="udev-acl"
KERNEL=="hidraw*", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="0331", TAG+="uaccess", TAG+="udev-acl"
SUBSYSTEM=="usb", ATTRS{idVendor}=="056a", ATTRS{idProduct}=="0331", TAG+="uaccess", TAG+="udev-acl"
UDEV
        ok "Udev rule written."
    fi

    # Write modules-load.d entry — loads wacom kernel module on boot
    local modules_conf="/etc/modules-load.d/wacom.conf"
    if [[ -f "$modules_conf" ]]; then
        ok "Module config already exists: $modules_conf"
    else
        log "Writing module config: $modules_conf"
        echo "wacom" | sudo tee "$modules_conf" > /dev/null
        ok "Module config written."
    fi

    # Reload udev rules — applies immediately without reboot
    log "Reloading udev rules..."
    sudo udevadm control --reload-rules
    sudo udevadm trigger --action=add --attr-match=idVendor=056a
    ok "Udev rules reloaded."

    # Load wacom module for current session
    if ! lsmod | grep -q "^wacom"; then
        log "Loading wacom kernel module..."
        sudo modprobe wacom && ok "Wacom module loaded." || warn "Failed to load wacom module — reboot may be required."
    else
        ok "Wacom module already loaded."
    fi

    ok "Wacom setup done."
}

install_noctalia() {
    log "Installing Noctalia shell..."

    # noctalia-qs provides the qs binary — required first
    if ! is_installed "noctalia-qs"; then
        log "Installing noctalia-qs (Quickshell dependency)..."
        install_package "noctalia-qs" || {
            err "noctalia-qs failed. Cannot install noctalia-shell without it."
            return 1
        }
    else
        ok "Already installed: noctalia-qs"
    fi

    if ! is_installed "noctalia-shell"; then
        install_package "noctalia-shell"
    else
        ok "Already installed: noctalia-shell"
    fi

    ok "Noctalia done."
}

install_caelestia() {
    log "Installing Caelestia shell..."
    local pkgs=(
        caelestia-shell
        caelestia-cli
    )
    for pkg in "${pkgs[@]}"; do
        is_installed "$pkg" && ok "Already installed: $pkg" && continue
        install_package "$pkg"
    done
    ok "Caelestia done."
}

install_repos() {
    log "Installing GitHub repos..."

    # Momoisay
    if command -v momoisay &>/dev/null; then
        ok "momoisay already installed."
    else
        log "Installing momoisay..."

        ensure_pacman_dep git

        local build_dir
        build_dir=$(mktemp -d)

        git clone https://github.com/Mon4sm/Momoisay.git "$build_dir/Momoisay" || {
            err "Failed to clone Momoisay."
            return 1
        }

        sudo cp "$build_dir/Momoisay/bin/linux/momoisay" /usr/local/bin/ || {
            err "Failed to copy momoisay binary."
            return 1
        }

        sudo chmod +x /usr/local/bin/momoisay
        rm -rf "$build_dir"
        ok "momoisay installed."
    fi

    ok "Repos done."
}

# ── DE and shell selection ────────────────────────────────────────────────────

select_de() {
    printf "\n  Which desktop environment are you installing for?\n"
    printf "    1) Niri\n"
    printf "    2) None (core packages only)\n"
    printf "\n  Choice: "
    read -r de_choice

    case "$de_choice" in
        1) install_niri ;;
        2) log "Skipping DE packages." ;;
        *) warn "Invalid choice. Skipping DE packages." ;;
    esac
}

select_shell() {
    printf "\n  Which shell would you like to install?\n"
    printf "    1) Noctalia\n"
    printf "    2) Caelestia\n"
    printf "    3) Both\n"
    printf "    4) None\n"
    printf "\n  Choice: "
    read -r shell_choice

    case "$shell_choice" in
        1) install_noctalia ;;
        2) install_caelestia ;;
        3) install_noctalia && install_caelestia ;;
        4) log "Skipping shell packages." ;;
        *) warn "Invalid choice. Skipping shell packages." ;;
    esac
}

# ── Restore prompt ────────────────────────────────────────────────────────────

prompt_restore() {
    printf "\n"
    printf "  Packages installed.\n"
    printf "  Deploy configs from dotfiles repo? [y/N] "
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        if [[ -f "$SCRIPTS_DIR/restore.sh" ]]; then
            log "Running restore..."
            bash "$SCRIPTS_DIR/restore.sh" -all
        else
            warn "restore.sh not found at $SCRIPTS_DIR/restore.sh"
            warn "Clone the dotfiles repo first:"
            warn "  git clone git@github.com:Tukki2D/arch_dotfiles.git ~/.dotfiles"
        fi
    else
        log "Skipping config restore."
        log "Run 'restore -all' manually when ready."
    fi
}

# ── Usage ─────────────────────────────────────────────────────────────────────

usage() {
    printf "\n"
    printf "  Usage: install.sh [-all] [-flag] [-list]\n"
    printf "\n"
    printf "  Package flags:\n"
    printf "    -all          Install everything (prompts for DE and shell)\n"
    printf "    -core         Core CLI tools\n"
    printf "    -browsers     Browsers and communication\n"
    printf "    -media        Media and gaming\n"
    printf "    -creative     Krita, LibreOffice\n"
    printf "    -hardware     CKB-Next, OpenRGB\n"
    printf "    -ai           Ollama\n"
    printf "    -repos        GitHub repos (Momoisay)\n"
    printf "\n"
    printf "  DE flags:\n"
    printf "    -niri         Niri compositor packages + Wacom setup\n"
    printf "\n"
    printf "  Hardware flags:\n"
    printf "    -wacom        Wacom Cintiq Pro 24 udev rules + kernel module\n"
    printf "\n"
    printf "  Shell flags:\n"
    printf "    -noctalia     Noctalia shell (includes noctalia-qs check)\n"
    printf "    -caelestia    Caelestia shell\n"
    printf "\n"
    printf "  Other:\n"
    printf "    -list         Show backup and package status\n"
    printf "\n"
    printf "  No flags → interactive mode\n"
    printf "\n"
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

# Always bootstrap paru first
bootstrap_paru

# Interactive mode if no flags given
if [[ $# -eq 0 ]]; then
    printf "\n"
    printf "  No flags provided — entering interactive mode.\n"
    install_core
    select_de
    select_shell

    printf "\n  Install browsers and communication? [y/N] "
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] && install_browsers

    printf "\n  Install media and gaming? [y/N] "
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] && install_media

    printf "\n  Install creative tools (Krita, LibreOffice)? [y/N] "
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] && install_creative

    printf "\n  Install hardware tools (CKB-Next, OpenRGB)? [y/N] "
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] && install_hardware

    printf "\n  Install AI tools (Ollama)? [y/N] "
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] && install_ai

    printf "\n  Install GitHub repos (Momoisay)? [y/N] "
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] && install_repos

    printf "\n  Set up Wacom Cintiq Pro 24? [y/N] "
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] && setup_wacom

    prompt_restore
    exit 0
fi

# Flag mode
for arg in "$@"; do
    case "$arg" in
        -all)
            install_core
            install_browsers
            install_media
            install_creative
            install_hardware
            install_ai
            install_repos
            select_de
            select_shell
            ;;
        -core)       install_core ;;
        -browsers)   install_browsers ;;
        -media)      install_media ;;
        -creative)   install_creative ;;
        -hardware)   install_hardware ;;
        -ai)         install_ai ;;
        -repos)      install_repos ;;
        -niri)       install_niri ;;
        -wacom)      setup_wacom ;;
        -noctalia)   install_noctalia ;;
        -caelestia)  install_caelestia ;;
        -list)       show_list ;;
        *)
            err "Unknown flag: $arg"
            usage
            exit 1
            ;;
    esac
done

prompt_restore

log "Done."
