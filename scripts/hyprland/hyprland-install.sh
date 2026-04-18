#!/bin/bash
# hyprland-install.sh — fresh Hyprland install
# Lives at: ~/iuno/scripts/hyprland/hyprland-install.sh
#
# Usage:
#   bash ~/iuno/scripts/hyprland/hyprland-install.sh
#   install.sh -hyprland
#
# Never touches ~/.config/ before packages are installed.
# Config restore is prompted and requires confirmation if not on Hyprland.

SCRIPTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/install.sh"

# ── DE Detection ──────────────────────────────────────────────────────────────

is_on_hyprland() {
    [[ -n "$HYPRLAND_INSTANCE_SIGNATURE" ]] || [[ "$XDG_CURRENT_DESKTOP" == "Hyprland" ]]
}

# ── Main ──────────────────────────────────────────────────────────────────────

printf "\n"
log "Starting Hyprland install..."
printf "\n"

# Verify AUR helper is available before any installs
bash "$SCRIPTS_DIR/check-aur.sh" || exit 1

# 1. Install Hyprland packages
install_hyprland

# 2. Install shell
select_shell

# 3. Wacom setup — prompted, not automatic
printf "\n"
printf "  Set up Wacom Cintiq Pro 24? [y/N] "
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
    setup_wacom
else
    log "Skipping Wacom setup. Run: iuno --install -wacom when ready."
fi

# 4. Offer config restore
printf "\n"
if is_on_hyprland; then
    printf "  Restore Hyprland config from iuno repo? [y/N] "
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        bash "$SCRIPTS_DIR/iuno.sh" --restore -hypr
    else
        log "Skipping restore. Run: iuno --restore -hypr when ready."
    fi
else
    warn "You are not currently running Hyprland."
    warn "Restoring configs now will deploy to ~/.config/hypr/ without being able to test them."
    printf "\n"
    printf "  Restore Hyprland config anyway? [y/N] "
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        bash "$SCRIPTS_DIR/iuno.sh" --restore -hypr
    else
        log "Skipping restore. Run: iuno --restore -hypr after logging into Hyprland."
    fi
fi

# 5. Show what is installed and what tools are available
printf "\n"
log "Installed apps and available tools:"
bash "$SCRIPTS_DIR/iuno.sh" --detect

# 6. Next steps
printf "\n"
printf "  ── Next steps ───────────────────────────────────────────────────────\n"
printf "\n"
printf "  1. Log into Hyprland\n"
printf "     Hyprland\n"
printf "\n"
printf "  2. Restore your backed-up configs (if you skipped it above)\n"
printf "     iuno --restore -hypr\n"
printf "\n"
printf "  3. Verify your monitor outputs\n"
printf "     hyprctl monitors\n"
printf "\n"
printf "  4. Update monitors.conf with your connector names\n"
printf "     then uncomment: source = ~/.config/hypr/monitors.conf in hyprland.conf\n"
printf "\n"
printf "  ─────────────────────────────────────────────────────────────────────\n"
printf "\n"
ok "Hyprland install complete."
printf "\n"
