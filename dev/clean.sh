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



# ── Help ──────────────────────────────────────────────────────────

show_help() {
    printf "\n"
    log "-h/--help  --- Display Help Menu"
    printf "\n"
    log "-f/--full  --- Clear .bak, /tmp/iuno, the package cache, and old temp files"
    printf "\n"
    log "-b/--bak   --- Clear .bak files from iuno directory"
    printf "\n"
    log "-t/--temp  --- Clear /tmp/iuno Directory"
    printf "\n"
    log "-c/--cache --- Clear the Package Cache and week old temp files"

}



## --DO A FULL CLEAN ##
clean_full() {
    printf "\n"
    log "Deep Clean..."
    clean_cache
    clean_temp
    clean_bak
}





## -- Clean Cache -- ##
clean_cache() {
    sudo -v

    printf "\n"
    log "Cleaning Package Cache"

    sudo rm -rf /var/cache/pacman/pkg/download-*
    sudo pacman -Scc


    printf "\n"
    log "Cleaning Old /tmp/ Files"
    sudo find /tmp -type f -atime +7 -delete 2>/dev/null

    paru -Scc

    printf "\n"
    log "Package Cache Cleaned"

}

# ── Clean /tmp/iuno/ ──────────────────────────────────────────────────────────

clean_temp() {
    printf "\n"
    log "Cleaning staging directory..."

    if [[ -d "/tmp/iuno" ]]; then
        rm -rf "/tmp/iuno"
        ok "Removed: /tmp/iuno/"
    else
        log "Nothing to clean: /tmp/iuno/ does not exist."
    fi
}

# ── Clean .bak files ──────────────────────────────────────────────────────────
clean_bak() {
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
}


## -- GET ARGUEMENTS -- ##
case "${1}" in
    --full|-f)   clean_full ;;
    --bak|-b)    clean_bak ;;
    --temp|-t)   clean_temp ;;
    --cache|-c)  clean_cache ;;
    --help|-h)   show_help ;;
    *)           show_help ;;
esac
