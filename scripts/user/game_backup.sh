#!/bin/bash

# --- 1. Define Directory Variables ---
LIVE_DIRECTORY="$HOME/Projects/GuildedGame/"
BACKUP_DIRECTORY="/mnt/TylerFS/GuildGame/"
BAK_DIRECTORY="${BACKUP_DIRECTORY%/}.bak" # Dynamically creates /mnt/TylerFS/GuildGame.bak

echo "========================================="
echo " Starting Backup Rotation & Sync"
echo "========================================="

# --- 2. Clean Up Old .bak Safely ---
# This fixes the "cannot delete non-empty directory" error by making 
# sure the old backup generation is wiped out before the sync begins.
if [ -d "$BAK_DIRECTORY" ]; then
    echo "1. Purging old .bak directory..."
    rm -rf "$BAK_DIRECTORY"
fi

# --- 3. Run Sync & Generate New .bak ---
echo "2. Syncing live files & rotating changes..."
echo "-----------------------------------------"

# -a: archive mode (preserves attributes, copies recursively)
# -b: backup files that are changed/deleted
# --delete: remove dead files from main backup
# --info=progress2: the global progress bar
rsync -ab --delete --info=progress2 --backup-dir="$BAK_DIRECTORY" "$LIVE_DIRECTORY" "$BACKUP_DIRECTORY"

echo "-----------------------------------------"
echo "========================================="
echo " Backup Process Complete!"
echo "========================================="
