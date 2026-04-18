#!/bin/bash
# niri-install.sh — fresh niri install
# Lives at: ~/iuno/scripts/niri/niri-install.sh
#
# Usage:
#   bash ~/iuno/scripts/niri/niri-install.sh
#   install.sh -niri
#
# Never touches ~/.config/. Config decisions are made by the user after install.

SCRIPTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/install.sh"

# ── Main ──────────────────────────────────────────────────────────────────────

printf "\n"
log "Starting niri install..."
printf "\n"

# Verify AUR helper is available before any installs
bash "$SCRIPTS_DIR/check-aur.sh" || exit 1

# 1. Install niri packages
install_niri

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

# 4. Show what is installed and what tools are available
printf "\n"
log "Installed apps and available tools:"
bash "$SCRIPTS_DIR/iuno.sh" --detect

# 5. Offer niri-tool --stage
printf "\n"
if [[ -z "$NIRI_SOCKET" ]]; then
    warn "You are not currently running Niri."
    warn "You can stage configs but won't be able to test them live."
    printf "\n"
fi
printf "  Run niri-tool --stage now to set up your config pipeline? [y/N] "
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
    bash "$SCRIPTS_DIR/niri/niri-tool.sh" --stage
else
    log "Skipping. Run: niri-tool --stage when ready."
fi

# 6. Next steps
printf "\n"
printf "  ── Next steps ───────────────────────────────────────────────────────\n"
printf "\n"
printf "  1. Log into niri\n"
printf "     niri-session\n"
printf "\n"
printf "  2. Set up your config pipeline (if you skipped it above)\n"
printf "     niri-tool --stage\n"
printf "\n"
printf "  3. Restore your backed-up configs (if migrating from another machine)\n"
printf "     iuno --restore -niri\n"
printf "\n"
printf "  4. Verify your monitor outputs\n"
printf "     niri msg outputs\n"
printf "\n"
printf "  5. Fill outputs.kdl with your connector names\n"
printf "     then uncomment: include \"outputs.kdl\" in config.kdl\n"
printf "\n"
printf "  ─────────────────────────────────────────────────────────────────────\n"
printf "\n"
ok "niri install complete."
printf "\n"
