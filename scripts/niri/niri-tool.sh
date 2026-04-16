#!/bin/bash
# niri-tool.sh — niri configuration update tool
# Lives at: ~/.dotfiles/scripts/update/niri-tool.sh
#
# Commands:
#   --backup    Back up all live config files to .bak (safe to fidget with live)
#   --build     Scaffold staging environment, copy live files in, user works in staging
#   --diff      Show differences between staging and live files (optional)
#   --validate  Check staging integrity, back up live, promote staging to live
#   --rollback  Restore all live files from .bak (all or nothing)
#   --push      Save to dotfiles repo and push to GitHub
#   --help      Show usage

STAGING="/tmp/dotniri"
LIVE="$HOME/.config/niri"
DOTFILES_NIRI="$HOME/.dotfiles/niri/.config/niri"
UPSTREAM_URL="https://raw.githubusercontent.com/niri-wm/niri/main/resources/default-config.kdl"

# ── Managed files ─────────────────────────────────────────────────────────────
# Blocks that are cut from config.kdl and owned by their own file.
# Add entries here as you migrate more sections.
# Format: "filename.kdl|block name"
MANAGED=(
    "layout.kdl|layout"
    "input.kdl|input"
)

# Static includes — always active, never conflict with upstream defaults.
STATIC_INCLUDES=(
    "custom.kdl"
)

# All files that are part of the live config and staging mirror.
# These are the files that get backed up, promoted, and rolled back.
ALL_FILES=(
    "config.kdl"
    "custom.kdl"
    "outputs.kdl"
    "layout.kdl"
    "input.kdl"
)

# ── Helpers ───────────────────────────────────────────────────────────────────

log()  { echo "[niri-tool] $*"; }
ok()   { echo "[niri-tool] ✓  $*"; }
warn() { echo "[niri-tool] ⚠  $*"; }
err()  { echo "[niri-tool] ✗  $*"; }

die() {
    err "$*"
    exit 1
}

ask() {
    printf "\n  %s [y/N] " "$1"
    read -r _answer
    [[ "$_answer" =~ ^[Yy]$ ]]
}

# is_blank <file>
# True if file does not exist or contains only whitespace and comments.
is_blank() {
    local file="$1"
    [[ ! -f "$file" ]] && return 0
    ! grep -qvE '^\s*(//.*)?$' "$file"
}

# has_block <file> <block_name>
# True if file contains an uncommented top-level block of that name.
has_block() {
    grep -qE "^\s*$2\s*\{" "$1"
}

# include_is_commented <file> <name>
# True if include "name" exists but is commented out.
include_is_commented() {
    grep -qE "^\s*//\s*include\s+\"$2\"" "$1"
}

# uncomment_include <file> <name>
uncomment_include() {
    sed -i "s|^\(\s*\)//\s*\(include\s*\"$2\"\)|\1\2|" "$1"
}

# ── Include block ─────────────────────────────────────────────────────────────
# Appended to the bottom of config.kdl in staging after download.

append_include_block() {
    local config="$1"
    {
        printf "\n"
        printf "// ── Personal Configuration ──────────────────────────────────────────────\n"
        printf "// Managed by niri-tool. See ~/.dotfiles/scripts/update/niri-tool.sh\n"
        printf "\n"
        printf "// Always safe — does not conflict with upstream defaults:\n"
        for f in "${STATIC_INCLUDES[@]}"; do
            printf "include \"%s\"\n" "$f"
        done
        printf "\n"
        printf "// System-specific — verify connector names with: niri msg outputs\n"
        printf "// Then uncomment:\n"
        printf "// include \"outputs.kdl\"\n"
        printf "\n"
        for entry in "${MANAGED[@]}"; do
            local fname="${entry%%|*}"
            local block="${entry##*|}"
            printf "// Remove %s{} from config.kdl above, then uncomment:\n" "$block"
            printf "// include \"%s\"\n" "$fname"
        done
    } >> "$config"
}

# ── Blank templates ───────────────────────────────────────────────────────────
# Written to staging only if the live file does not exist.

write_template() {
    local fname="$1"
    local dest="$STAGING/$fname"
    case "$fname" in
        layout.kdl)
            cat > "$dest" << 'EOF'
// layout.kdl — window layout configuration
// Included from config.kdl via: include "layout.kdl"
//
// This file owns the full layout{} block.
// config.kdl must not contain a layout{} block.
//
// On niri updates: check changelog for new layout options.
// Reference: https://niri-wm.github.io/niri/Configuration:-Layout
EOF
            ;;
        input.kdl)
            cat > "$dest" << 'EOF'
// input.kdl — input device configuration
// Included from config.kdl via: include "input.kdl"
//
// This file owns the full input{} block.
// config.kdl must not contain an input{} block.
//
// On niri updates: check changelog for new input options.
// Reference: https://niri-wm.github.io/niri/Configuration:-Input
EOF
            ;;
        outputs.kdl)
            cat > "$dest" << 'EOF'
// outputs.kdl — monitor output configuration
// Included from config.kdl via: include "outputs.kdl"
//
// This file owns all output{} blocks.
// config.kdl must not contain any output{} blocks.
//
// IMPORTANT: connector names are system-specific.
// Run: niri msg outputs
// to find the correct names for your hardware.
EOF
            ;;
        custom.kdl)
            cat > "$dest" << 'EOF'
// custom.kdl — personal niri configuration
// Included from config.kdl via: include "custom.kdl"
//
// Contains: binds, window-rules, spawn, prefer-no-csd, screenshot-path.
// This file layers on top of config.kdl defaults.
EOF
            ;;
    esac
}

# ── --backup ──────────────────────────────────────────────────────────────────

cmd_backup() {
    log "Backing up live config files..."

    local backed_up=0
    local not_found=0

    for fname in "${ALL_FILES[@]}"; do
        local live_file="$LIVE/$fname"
        if [[ -f "$live_file" ]]; then
            cp "$live_file" "$live_file.bak"
            ok "Backed up: $fname → $fname.bak"
            backed_up=1
        else
            warn "$fname not found in live config — skipped."
            not_found=1
        fi
    done

    printf "\n"
    if [[ $backed_up -eq 1 ]]; then
        ok "Backup complete. Use niri-tool --rollback to restore."
    fi
    if [[ $not_found -eq 1 ]]; then
        warn "Some files were not found and could not be backed up."
    fi
    printf "\n"
}

# ── --build ───────────────────────────────────────────────────────────────────

cmd_build() {
    log "Building staging environment..."

    # Warn if staging already exists
    if [[ -d "$STAGING" ]]; then
        warn "Staging directory already exists at $STAGING"
        ask "Overwrite it?" || die "Aborted. Existing staging preserved."
    fi

    # Create staging dir
    mkdir -p "$STAGING"

    # Download upstream default into staging
    log "Downloading upstream niri default..."
    if ! curl -sS --fail "$UPSTREAM_URL" -o "$STAGING/config.kdl"; then
        die "Download failed. Check your internet connection. Live config untouched."
    fi
    ok "Downloaded upstream default → staging/config.kdl"

    # Append include block to staging config.kdl
    append_include_block "$STAGING/config.kdl"
    ok "Include block appended."

    # For each file in ALL_FILES (except config.kdl which was just downloaded):
    # Copy from live if it exists, otherwise write a blank template.
    for fname in "${ALL_FILES[@]}"; do
        [[ "$fname" == "config.kdl" ]] && continue
        local live_file="$LIVE/$fname"
        if [[ -f "$live_file" ]]; then
            cp "$live_file" "$STAGING/$fname"
            ok "Copied from live: $fname"
        else
            write_template "$fname"
            ok "No live $fname found — blank template created."
        fi
    done

    printf "\n"
    ok "Staging ready at $STAGING"
    printf "\n"
    printf "  Work in: %s\n" "$STAGING"
    printf "\n"
    printf "  Next steps:\n"
    printf "  1. Move layout{} from staging/config.kdl → staging/layout.kdl\n"
    printf "  2. Move input{} from staging/config.kdl  → staging/input.kdl\n"
    printf "  3. Make any other changes you want across staging files\n"
    printf "  4. Optional: niri-tool --diff to review your changes\n"
    printf "  5. Run: niri-tool --validate when ready\n"
    printf "\n"
}

# ── --diff ────────────────────────────────────────────────────────────────────

cmd_diff() {
    [[ -d "$STAGING" ]] || die "No staging directory found. Run niri-tool --build first."

    local report="$STAGING/niri-changes.md"
    local date
    date=$(date '+%Y-%m-%d %H:%M')

    {
        printf "# Niri Diff Report — %s\n\n" "$date"
        printf "Differences between staging and live files.\n"
        printf "Lines starting with < are in staging only.\n"
        printf "Lines starting with > are in live only.\n\n"
        printf "This report lives in staging only — not promoted to live.\n\n"
        printf "---\n\n"

        for fname in "${ALL_FILES[@]}"; do
            local staging_file="$STAGING/$fname"
            local live_file="$LIVE/$fname"

            printf "## %s\n\n" "$fname"
            printf '```\n'

            if [[ ! -f "$staging_file" ]]; then
                printf "(%s not found in staging)\n" "$fname"
            elif [[ ! -f "$live_file" ]]; then
                printf "(%s not found in live — new file)\n" "$fname"
            else
                diff --ignore-blank-lines \
                     --ignore-matching-lines="^[[:space:]]*//" \
                     "$staging_file" "$live_file" || true
            fi

            printf '```\n\n'
        done

    } > "$report"

    ok "Diff report written to: $report"
    printf "\n"
    cat "$report"
}

# ── --validate ────────────────────────────────────────────────────────────────

cmd_validate() {
    [[ -d "$STAGING" ]] || die "No staging directory found. Run niri-tool --build first."

    log "Checking staging files..."
    local abort=0

    # Check managed staging files are not blank
    for entry in "${MANAGED[@]}"; do
        local fname="${entry%%|*}"
        if is_blank "$STAGING/$fname"; then
            err "$fname is empty. Fill it before validating."
            abort=1
        fi
    done

    [[ $abort -eq 1 ]] && die "Fill the empty files above then run niri-tool --validate again."

    # Check that managed blocks have been removed from staging config.kdl
    for entry in "${MANAGED[@]}"; do
        local fname="${entry%%|*}"
        local block="${entry##*|}"
        if has_block "$STAGING/config.kdl" "$block"; then
            err "$block{} still exists in staging/config.kdl."
            err "Move it to staging/$fname then remove it from staging/config.kdl."
            abort=1
        fi
    done

    [[ $abort -eq 1 ]] && die "Remove the blocks listed above from staging/config.kdl first."

    # Check if managed includes are still commented — offer to uncomment
    for entry in "${MANAGED[@]}"; do
        local fname="${entry%%|*}"
        if include_is_commented "$STAGING/config.kdl" "$fname"; then
            warn "$fname has content but its include is still commented out."
            if ask "Uncomment include for $fname?"; then
                uncomment_include "$STAGING/config.kdl" "$fname"
                ok "Uncommented: include \"$fname\""
            else
                warn "Left commented. $fname will not be active after promotion."
            fi
        fi
    done

    printf "\n"
    log "Staging checks passed."
    printf "\n"
    printf "  If you promote now, niri will live-reload immediately.\n"
    printf "  If something breaks: niri-tool --rollback restores everything.\n"
    printf "\n"

    ask "Promote staging to live?" || {
        log "Aborted. Staging preserved at $STAGING"
        exit 0
    }

    # Back up ALL live files before touching anything
    log "Backing up live files..."
    local backup_failed=0

    for fname in "${ALL_FILES[@]}"; do
        local live_file="$LIVE/$fname"
        if [[ -f "$live_file" ]]; then
            if ! cp "$live_file" "$live_file.bak"; then
                err "Failed to back up: $fname"
                backup_failed=1
            else
                ok "Backed up: $fname → $fname.bak"
            fi
        fi
    done

    if [[ $backup_failed -eq 1 ]]; then
        die "Backup failed. Live config untouched. Check permissions and try again."
    fi

    # Promote ALL staging files to live — all or nothing
    log "Promoting staging to live..."
    local promote_failed=0
    local promote_errors=()

    for fname in "${ALL_FILES[@]}"; do
        local staging_file="$STAGING/$fname"
        if [[ -f "$staging_file" ]]; then
            if ! cp "$staging_file" "$LIVE/$fname"; then
                promote_errors+=("$fname")
                promote_failed=1
            else
                ok "Promoted: $fname"
            fi
        fi
    done

    if [[ $promote_failed -eq 1 ]]; then
        err "Promotion failed for: ${promote_errors[*]}"
        err "Attempting automatic rollback of all files..."

        local rollback_failed=0
        for fname in "${ALL_FILES[@]}"; do
            if [[ -f "$LIVE/$fname.bak" ]]; then
                if ! cp "$LIVE/$fname.bak" "$LIVE/$fname"; then
                    err "Rollback failed for: $fname"
                    rollback_failed=1
                else
                    ok "Rolled back: $fname"
                fi
            fi
        done

        if [[ $rollback_failed -eq 1 ]]; then
            err "Automatic rollback incomplete. Check $LIVE manually."
            err "Your .bak files are still at $LIVE/*.bak"
        else
            warn "Automatic rollback complete. Live config restored."
        fi

        die "Promotion failed. See above."
    fi

    printf "\n"
    ok "Live config updated. Niri is reloading."
    printf "\n"
    warn "If something looks wrong: niri-tool --rollback"
    printf "\n"
    log "When satisfied: niri-tool --push"
    printf "\n"
}

# ── --rollback ────────────────────────────────────────────────────────────────

cmd_rollback() {
    log "Checking .bak files before rollback..."

    # Check ALL .bak files exist before touching anything
    local missing=()
    for fname in "${ALL_FILES[@]}"; do
        if [[ ! -f "$LIVE/$fname.bak" ]]; then
            missing+=("$fname.bak")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        err "The following .bak files are missing:"
        for f in "${missing[@]}"; do
            err "  $LIVE/$f"
        done
        die "Rollback aborted. All .bak files must exist. Live config unchanged."
    fi

    # All .bak files confirmed — restore all
    log "Restoring all files from .bak..."
    for fname in "${ALL_FILES[@]}"; do
        if ! cp "$LIVE/$fname.bak" "$LIVE/$fname"; then
            err "Failed to restore: $fname"
            die "Rollback failed mid-way. Check $LIVE manually. Your .bak files are intact."
        fi
        ok "Restored: $fname"
    done

    printf "\n"
    ok "Rollback complete. Niri is reloading."
    printf "\n"
    log "Staging at $STAGING is still intact if you want to continue working."
    printf "\n"
}

# ── --push ────────────────────────────────────────────────────────────────────

cmd_push() {
    printf "\n"
    warn "You are about to save your niri config to dotfiles and push to GitHub."
    warn "Only proceed if your config is well tested and working correctly."
    printf "\n"

    ask "Are you sure the config is functional and ready to commit?" || {
        log "Aborted. Nothing saved."
        exit 0
    }

    if ask "Save to dotfiles repo? (dotback -niri)"; then
        bash "$HOME/.dotfiles/scripts/sync.sh" -niri
    fi

    if ask "Push to GitHub?"; then
        cd "$HOME/.dotfiles" || die "Could not cd to dotfiles directory."
        git add .
        git commit -m "niri: update config" || warn "Nothing new to commit."
        if ! git push; then
            err "Git push failed. Dotfiles are saved locally."
            err "Run manually: cd ~/.dotfiles && git push"
            exit 1
        fi
        ok "Pushed to GitHub."
    fi

    printf "\n"
    ok "Done."
    printf "\n"
}

# ── --help ────────────────────────────────────────────────────────────────────

cmd_help() {
    printf "\n"
    printf "  niri-tool — niri configuration update tool\n"
    printf "\n"
    printf "  Commands:\n"
    printf "    --backup      Back up all live config files to .bak\n"
    printf "    --build       Scaffold staging, copy live files in\n"
    printf "    --diff        Show differences between staging and live (optional)\n"
    printf "    --validate    Check staging, promote to live, niri reloads\n"
    printf "    --rollback    Restore all live files from .bak (all or nothing)\n"
    printf "    --push        Save to dotfiles repo and push to GitHub\n"
    printf "    --help        Show this help\n"
    printf "\n"
    printf "  Typical update flow:\n"
    printf "    1. niri-tool --build\n"
    printf "    2. Edit files in %s\n" "$STAGING"
    printf "    3. niri-tool --diff        (optional)\n"
    printf "    4. niri-tool --validate\n"
    printf "    5. niri-tool --rollback    (if something breaks)\n"
    printf "    6. niri-tool --push\n"
    printf "\n"
    printf "  To safely fidget with live config:\n"
    printf "    1. niri-tool --backup\n"
    printf "    2. Edit files in %s directly\n" "$LIVE"
    printf "    3. niri-tool --rollback    (to restore if needed)\n"
    printf "\n"
    printf "  Staging:   %s\n" "$STAGING"
    printf "  Live:      %s\n" "$LIVE"
    printf "  Dotfiles:  %s\n" "$DOTFILES_NIRI"
    printf "\n"
    printf "  Managed files (own blocks cut from config.kdl):\n"
    for entry in "${MANAGED[@]}"; do
        printf "    %-14s  owns: %s{}\n" "${entry%%|*}" "${entry##*|}"
    done
    printf "\n"
    printf "  .bak files live in %s\n" "$LIVE"
    printf "  They are overwritten on the next --backup or --validate run.\n"
    printf "\n"
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

case "${1:-}" in
    --backup)   cmd_backup ;;
    --build)    cmd_build ;;
    --diff)     cmd_diff ;;
    --validate) cmd_validate ;;
    --rollback) cmd_rollback ;;
    --push)     cmd_push ;;
    --help)     cmd_help ;;
    *)          cmd_help ;;
esac
