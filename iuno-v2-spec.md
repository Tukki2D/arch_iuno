# Iuno — Architecture Spec v2
# Personal install and staging tool for Arch/CachyOS.
# Built to learn. Not for sale.
# Last updated: May 2026

---

## What Iuno Is

A personal Linux setup tool. Installs packages, backs up configs, restores them,
and stages live changes safely. Every feature is written by hand and understood
completely. When it breaks the author knows why.

Not a product. Not enterprise. A learning project that solves real problems.

---

## Design Principles

- Generic core scripts do all the work. App directories hold data only.
- Every app gets a directory. Same layout every time. No exceptions.
- info.sh is the data. arch.sh is the install declaration. Core scripts do the work.
- iuno.sh routes only. Never contains logic.
- IUNO_ROOT is never hardcoded — resolved at runtime.
- An app gets a directory only if it has config files worth managing.
- Arch/CachyOS is the current focus. Deb is future work.

---

## Directory Structure

```
~/iuno/
├── Brain.md                         ← source of truth, session record
├── README.md                        ← honest entry point
├── iuno.log                         ← append-only action log
├── iuno-v2-spec.md                  ← this file
├── .gitignore
├── apps/
│   ├── _distro/
│   │   └── arch/
│   │       └── install.sh           ← one-shot Arch essentials (future)
│   ├── _de/
│   │   ├── niri/
│   │   │   └── install.sh           ← one-shot Niri essentials (future)
│   │   └── hyprland/
│   │       └── install.sh           ← one-shot Hyprland essentials (future)
│   └── [appname]/
│       ├── info.sh                  ← NAME, DESCRIPTION, CONFIG_PATHS
│       ├── arch.sh                  ← PACKAGE, METHOD (future)
│       ├── stage.sh                 ← staging pipeline (optional)
│       ├── dotfiles/                ← current backup
│       └── dotfiles.bak/           ← previous backup (auto-rotated)
├── machines/
│   ├── defaults.sh                  ← IUNO_ROOT, EDITOR, TERMINAL
│   └── Arona.sh                     ← machine-specific overrides
├── scripts/
│   ├── core/
│   │   ├── iuno.sh                  ← router only
│   │   ├── common.sh                ← shared toolset
│   │   ├── backup.sh                ← generic backup
│   │   ├── restore.sh               ← generic restore
│   │   ├── clean.sh                 ← staging and cache cleanup
│   │   ├── bootstrap-alias.sh       ← shell alias installer
│   │   └── check-aur.sh             ← AUR helper verification
│   ├── user/                        ← personal scripts, not iuno core
│   │   ├── launcher-toggle.sh
│   │   └── combined_audio.sh
│   └── niri/
│       └── niri-tool.sh             ← v1 staging reference, not deleted yet
└── dev/                             ← sandbox for new scripts before promoting
```

---

## The App Directory

Every app that has config files gets a directory. Same structure every time.

### info.sh — the manifest

Single source of truth. Sourced by backup, restore, detect. Never contains logic.

```bash
#!/bin/bash
# apps/niri/info.sh
NAME="niri"
DESCRIPTION="Scrollable tiling Wayland compositor."
CONFIG_PATHS=(
    "$HOME/.config/niri"
)
```

CONFIG_PATHS entries can be directories or individual files.
For apps with configs in multiple locations (krita), list them all.

### arch.sh — install declaration (not yet built)

Declares the package name and install method. Optional before/after hooks.

```bash
#!/bin/bash
# apps/niri/arch.sh
PACKAGE="niri"
METHOD="pacman"    # pacman | aur | flatpak

before_install() { :; }   # optional
after_install()  { :; }   # optional
```

### dotfiles/ and dotfiles.bak/

dotfiles/ — current backup, populated by backup.sh
dotfiles.bak/ — previous backup, created automatically by rotation on each backup run

---

## Core Scripts

### scripts/core/backup.sh

Generic. Takes an app name. Sources info.sh. Rotates dotfiles. Copies live configs.

Flow:
1. Source apps/appname/info.sh
2. Rotate: rm dotfiles.bak → mv dotfiles → dotfiles.bak → mkdir dotfiles
3. For each path in CONFIG_PATHS:
   - Directory: cp -r live/. → dotfiles/dirname/
   - File: cp live → dotfiles/
4. log_action()

Rotation happens ONCE before the loop — safe for multi-path apps like krita.

### scripts/core/restore.sh

Generic. Takes an app name. Sources info.sh. Copies repo files to live locations.

Flow:
1. Source apps/appname/info.sh
2. For each path in CONFIG_PATHS:
   - Directory: rm -rf live && cp -r dotfiles/dirname → live
   - File: cp dotfiles/filename → live
3. log_action()

### scripts/core/iuno.sh

Router only. No logic.

```
iuno -b -appname     → backup.sh appname
iuno -b -all         → backup.sh for each app with info.sh
iuno -r -appname     → restore.sh appname
iuno -r -all         → restore.sh for each app with info.sh
iuno --detect        → walk apps/, report backup status and install status
iuno -c [flags]      → clean.sh
iuno --help          → show commands and auto-discovered app list
```

App list in help and detect is auto-discovered by walking apps/ — no hardcoded list.

### scripts/core/common.sh

Shared toolset. Sourced by all scripts. Never run directly.

Functions:
- IUNO_ROOT — resolved from BASH_SOURCE[0]
- load_machine() — sources machines/defaults.sh then machines/$(hostname).sh
- detect_distro() — returns arch | deb | unknown
- install_package(name) — paru → yay → pacman → apt
- log_action(action, app, detail) — appends to iuno.log
- file_hash(file) — sha256sum fingerprint
- configs_match(a, b) — diff -q, returns 0 if identical
- log / ok / warn / err — output helpers

---

## Essentials Lists (future — not built yet)

Simple packages with no config to manage. Installed once on a fresh system.
No app directories for these. No prompts. Arrays in distro/DE install scripts.

```bash
# apps/_distro/arch/install.sh
ESSENTIALS=(
    git ripgrep fd fzf zoxide btop
    fastfetch wl-clipboard tree wget rsync
)
for pkg in "${ESSENTIALS[@]}"; do
    install_package "$pkg"
done
```

---

## Staging (future — niri-tool.sh is the reference)

For apps where a bad config means losing your session.
Safe edit in /tmp → diff vs live → finalize or rollback.

Currently only niri uses this pattern via niri-tool.sh.
The plan is to migrate niri-tool.sh logic into apps/niri/stage.sh
and wire iuno --stage -niri into the router.

---

## Next Session Plan (start here)

### Step 1 — Fix script headers (2 minutes)
backup.sh and restore.sh still say `# dev/` in their comment headers.

```bash
sed -i 's|# dev/backup.sh|# scripts/core/backup.sh|' ~/iuno/scripts/core/backup.sh
sed -i 's|# dev/restore.sh|# scripts/core/restore.sh|' ~/iuno/scripts/core/restore.sh
```

### Step 2 — Audit dotfiles nesting (check all apps)
The niri dotfiles.bak has a nested structure from before the backup script was fixed.
Check every app for unexpected nesting before fixing anything:

```bash
for app in ~/iuno/apps/*/; do
    echo "=== $(basename $app) ==="
    ls "$app/dotfiles/" 2>/dev/null
    echo ""
done
```

Expected: each app's dotfiles/ should contain either named subdirectories or
flat files matching the basenames in CONFIG_PATHS. No extra nesting.
Fix any that are wrong by manually moving contents up a level.

### Step 3 — Add PACKAGE to all info.sh files
Without PACKAGE, iuno --detect shows "— unknown" for 11 of 12 apps.
Each info.sh needs one line added:

| App | PACKAGE |
|-----|---------|
| alacritty | alacritty |
| ckb-next | ckb-next-git |
| fastfetch | fastfetch |
| fish | fish |
| hypr | hyprland |
| kitty | kitty |
| krita | krita |
| mango | mango (verify package name) |
| niri | niri |
| nvim | neovim |
| pipewire | pipewire |
| starship | starship |

After adding, verify with: `iuno --detect`

### Step 4 — Fix .gitignore
fish_variables is machine-specific and was accidentally committed.

```bash
echo "apps/fish/dotfiles/fish/fish_variables" >> ~/iuno/.gitignore
git rm --cached apps/fish/dotfiles/fish/fish_variables
```

### Step 5 — Clean dev/ directory
dev/ still has old versions of iuno.sh, backup.sh, restore.sh from before promotion.
Review and remove stale files, keep dev/ as a clean sandbox.

### Step 6 — Commit all cleanup
```bash
cd ~/iuno
git add .
git commit -m "cleanup: fix headers, gitignore fish_variables, clean dev/, add PACKAGE to info.sh"
git push
```

---

## Roadmap

### Phase 1 — Foundation ✓
- [x] Directory structure created
- [x] common.sh installed to scripts/core/
- [x] machines/defaults.sh and Arona.sh written
- [x] v1 scripts cleaned up — sync.sh, restore.sh, install.sh, per-app installs removed
- [x] helium browser data removed from repo and git history (git filter-repo)

### Phase 2 — Core Generic Scripts ✓
- [x] backup.sh — generic, tested on all apps including krita
- [x] restore.sh — generic, tested on all apps including krita
- [x] iuno.sh v2 router — backup, restore, detect, clean all working
- [x] bootstrap-alias.sh updated to scripts/core/iuno.sh
- [x] Fish alias working: iuno -b -all, iuno -r -appname, iuno --detect

### Phase 3 — App Migration ✓
- [x] All 12 apps have info.sh and dotfiles/
- [x] iuno -b -all and iuno -r -all working
- [x] Krita multi-location backup and restore tested and working

### Phase 4 — Cleanup (next session — see Next Session Plan above)
- [ ] Fix script headers (dev/ → scripts/core/)
- [ ] Audit and fix dotfiles nesting across all apps
- [ ] Add PACKAGE variable to all info.sh files
- [ ] Add fish_variables to .gitignore and untrack it
- [ ] Clean dev/ directory of promoted files

### Phase 5 — Stage Pipeline
- [ ] Write apps/niri/stage.sh (migrate from scripts/niri/niri-tool.sh)
- [ ] Wire iuno --stage -appname into iuno.sh router
- [ ] Test end to end — stage, diff, finalize, rollback
- [ ] niri-tool.sh is the reference — do not delete until stage.sh is proven

### Phase 6 — Install System (low priority)
- [ ] Write apps/_distro/arch/install.sh — Arch essentials array
- [ ] Write apps/_de/niri/install.sh — Niri essentials array
- [ ] Write per-app arch.sh files with PACKAGE and METHOD
- [ ] Wire iuno --install into router

### Phase 7 — Detect Improvements
- [ ] PACKAGE in info.sh enables real install status in --detect
- [ ] Hash comparison for drift detection (file_hash already in common.sh)

---

## What Is Not In Iuno

- Secrets — private setup on encrypted USB, never in this repo
- Network config — fstab, samba, UFW are private
- SSH keys — never in any repo
- Noctalia/Caelestia — install only, no config management
- Helium browser — install only, browser data never tracked

---

## Future Considerations

- Rollback command — iuno --rollback -appname restores from dotfiles.bak
- Hash-based skip in backup — skip if file unchanged (file_hash already in common.sh)
- Drift detection — alert when live differs from repo
- Auto-update — fetch upstream config, diff, let user merge
- Flatpak install method — add to install_package() when needed
- Deb support — deb.sh per app, detect_distro() already handles apt
- Encryption — gpg for in-repo secrets when needed
- Multi-machine — machines/ directory already supports this, just add a new hostname file
