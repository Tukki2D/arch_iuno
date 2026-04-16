#!/bin/bash
# clean.sh — clean iuno temporary and backup files
# Lives at: ~/iuno/scripts/clean.sh
#
# Usage:
#   iuno --clean
#   bash ~/iuno/scripts/clean.sh
#
# Cleans:
#   /tmp/iuno/          staging directories for all tools (always)
#   .bak files          created by tool safety nets (prompted)
#
# Add new .bak locations below as new tools are built.

# ── Bak file locations ────────────────────────────────────────────────────────
# Add entries here as new tools are built.
# Format: "description|directory|pattern"

BAK_LOCATIONS=(
    "niri-tool|$HOME/.config/niri|*.bak"
)

# ── Helpers ───────────────────────────────────────────────────────────────────

log()  { echo "[iuno clean] $*"; }
ok()   { echo "[iuno clean] ✓  $*"; }
warn() { echo "[iuno clean] ⚠  $*"; }

# ── Clean /tmp/iuno/ ──────────────────────────────────────────────────────────

printf "\n"
log "Cleaning staging directory..."

if [[ -d "/tmp/iuno" ]]; then
    rm -rf "/tmp/iuno"
    ok "Removed: /tmp/iuno/"
else
    log "Nothing to clean: /tmp/iuno/ does not exist."
fi

# ── Clean .bak files ──────────────────────────────────────────────────────────

printf "\n"
log "Scanning for .bak files..."

found_any=0
declare -a found_files=()

for entry in "${BAK_LOCATIONS[@]}"; do
    local_desc="${entry%%|*}"
    local_rest="${entry#*|}"
    local_dir="${local_rest%%|*}"
    local_pattern="${local_rest##*|}"

    while IFS= read -r -d '' f; do
        found_files+=("$f")
        found_any=1
    done < <(find "$local_dir" -maxdepth 1 -name "$local_pattern" -print0 2>/dev/null)
done

if [[ $found_any -eq 0 ]]; then
    log "No .bak files found."
    printf "\n"
    ok "Clean complete."
    printf "\n"
    exit 0
fi

printf "\n"
log "Found .bak files:"
for f in "${found_files[@]}"; do
    printf "    %s\n" "$f"
done

printf "\n"
printf "  Remove all .bak files listed above? [y/N] "
read -r answer

if [[ "$answer" =~ ^[Yy]$ ]]; then
    for f in "${found_files[@]}"; do
        rm -f "$f"
        ok "Removed: $f"
    done
else
    warn "Skipped. .bak files left in place."
fi

printf "\n"
ok "Clean complete."
printf "\n"
