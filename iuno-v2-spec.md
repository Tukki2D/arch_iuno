# Iuno — Architecture Spec v2
# Personal reinstall and staging tool for Arch/CachyOS.
# Built to learn. Not for sale.

---

## What Iuno Is

A personal tool for reinstalling preferences and dotfiles on a fresh system.
Backs up config files, restores them, installs packages, stages live changes safely.

Not enterprise. Not a product. Personal.

---

## Design Principles

- Generic core scripts do all the work. App directories hold data only.
- Every app gets a directory. Same layout every time. No exceptions.
- info.sh is the config data. arch.sh is the install declaration. That's it.
- Core scripts are distro-agnostic. They read the app data and act on it.
- iuno.sh routes only. Never contains logic.
- IUNO_ROOT is never hardcoded.
- Arch is the current focus. Other distros add their own .sh files per app.

---

## Directory Structure

```
~/iuno/
├── Brain.md
├── README.md
├── iuno.log                             ← append-only action log
├── .gitignore
│
├── apps/
│   ├── _distro/
│   │   └── arch/
│   │       └── install.sh               ← one-shot Arch essentials
│   ├── _de/
│   │   ├── niri/
│   │   │   └── install.sh               ← one-shot Niri essentials
│   │   └── hyprland/
│   │       └── install.sh               ← one-shot Hyprland essentials
│   └── [appname]/                       ← every app, no exceptions
│       ├── info.sh                      ← name, description, config paths
│       ├── arch.sh                      ← package name + method for Arch
│       ├── deb.sh                       ← package name + method for Debian (future)
│       └── backups/                     ← rollback history, starts empty
│
├── machines/
│   ├── defaults.sh
│   └── Arona.sh
│
├── scripts/
│   ├── core/                            ← generic, work for any app
│   │   ├── iuno.sh                      ← router only
│   │   ├── common.sh                    ← shared toolset
│   │   ├── backup.sh                    ← reads info.sh, copies config files
│   │   ├── restore.sh                   ← reads info.sh, restores config files
│   │   ├── install.sh                   ← reads arch.sh, installs package
│   │   ├── clean.sh                     ← staging and cache cleanup
│   │   └── bootstrap-alias.sh           ← shell alias installer
│   └── user/                            ← personal scripts
│       ├── launcher-toggle.sh
│       └── combined_audio.sh
│
└── home/
    └── .zshrc
```

---

## The App Directory

Every app gets a directory. Same layout every time.
Trivial bytes. Keeps everything consistent and the core scripts agnostic.

### info.sh — app data

Name, description, and where the config files live on the system.
Sourced by backup.sh, restore.sh, detect, and anything else that needs app data.
Never contains logic.

```bash
#!/bin/bash
# apps/niri/info.sh

NAME="niri"
DESCRIPTION="Scrollable tiling Wayland compositor."
CONFIG_PATHS=(
    "$HOME/.config/niri/config.kdl"
    "$HOME/.config/niri/custom.kdl"
    "$HOME/.config/niri/outputs.kdl"
    "$HOME/.config/niri/input.kdl"
    "$HOME/.config/niri/layout.kdl"
    "$HOME/.config/niri/animations.kdl"
)
```

For apps with config files in multiple locations (e.g. krita):
```bash
CONFIG_PATHS=(
    "$HOME/.config/kritarc"
    "$HOME/.config/kritadisplayrc"
    "$HOME/.local/share/krita/brushes"
)
```

### arch.sh — Arch install declaration

Package name and install method. That's it.
Optional before_install() and after_install() for the rare cases that need them.

```bash
#!/bin/bash
# apps/niri/arch.sh

PACKAGE="niri"
METHOD="pacman"    # pacman | aur | flatpak
```

For packages that need the AUR variant:
```bash
# apps/ckb-next/arch.sh
PACKAGE="ckb-next-git"
METHOD="aur"
```

Optional hooks — defined only when needed, skipped silently if absent:
```bash
before_install() {
    # runs before install — check conflicts, warn user
    :
}

after_install() {
    # runs after install — enable services, print next steps
    :
}
```

### deb.sh — Debian install declaration (future)

Same structure as arch.sh. Added when Debian support is needed.
The core install script reads whichever distro file matches the current system.

### backups/

Exists from day one even if empty.
Populated by backup.sh with 3-deep rotation.

---

## Core Scripts

### scripts/core/backup.sh

Generic. Called with an app name. Sources info.sh. Copies config files.

```
backup.sh niri
    ↓
source apps/niri/info.sh
for each path in CONFIG_PATHS:
    rotate backups (3-deep)
    copy live file into apps/niri/
    log_action()
```

### scripts/core/restore.sh

Generic. Called with an app name. Sources info.sh. Restores config files.

```
restore.sh niri
    ↓
source apps/niri/info.sh
for each path in CONFIG_PATHS:
    back up existing live file to backups/filename.pre-restore
    copy apps/niri/filename to live location
    log_action()
```

### scripts/core/install.sh

Generic. Called with an app name. Sources arch.sh (or deb.sh). Installs package.

```
install.sh niri
    ↓
detect_distro()
source apps/niri/arch.sh   (or deb.sh)
run before_install() if defined
install_package PACKAGE METHOD
run after_install() if defined
log_action()
```

### scripts/core/iuno.sh

Router only.

```bash
case "$1" in
    --install)  bash "$IUNO_ROOT/scripts/core/install.sh" "$2" ;;
    --backup)   bash "$IUNO_ROOT/scripts/core/backup.sh"  "$2" ;;
    --restore)  bash "$IUNO_ROOT/scripts/core/restore.sh" "$2" ;;
    --stage)    handle_stage "$2" ;;
    --detect)   handle_detect ;;
    --clean)    bash "$IUNO_ROOT/scripts/core/clean.sh" "${@:2}" ;;
    --log)      handle_log "$2" ;;
    --help)     show_help ;;
esac
```

### scripts/core/common.sh

Shared toolset. Sourced by all scripts. Never run directly.

- detect_distro() — returns arch, deb, unknown
- install_package(package, method) — installs using the declared method
- log_action(action, app, detail) — appends to iuno.log
- file_hash(file) — sha256 fingerprint
- configs_match(a, b) — returns 0 if identical
- load_machine() — sources machine files on startup
- log / ok / warn / err — output helpers

---

## Essentials Lists

Simple packages with no config to manage.
Installed once on setup. No app directories. No prompts. Just install.

```bash
# apps/_distro/arch/install.sh
source "$IUNO_ROOT/scripts/core/common.sh"

ESSENTIALS=(
    git ripgrep fd fzf zoxide btop
    fastfetch wl-clipboard tree wget rsync
)

for pkg in "${ESSENTIALS[@]}"; do
    install_package "$pkg" "pacman"
done
```

---

## Staging

For apps where a bad config means losing your session.
Not every app needs this. Only high-risk ones.

Currently: niri.
Future: hyprland, pipewire.

```
iuno --stage -niri
    ↓
apps/niri/stage.sh
    ↓
copy live → /tmp/iuno/niri/
user edits in staging
diff staging vs live
finalize → copy to live + log
rollback → restore .bak + log
```

stage.sh lives in the app directory because it is app-specific.
backup.sh and restore.sh live in core because they are generic.

---

## Machine Files

**defaults.sh:**
```bash
IUNO_ROOT="$HOME/iuno"
EDITOR=nvim
TERMINAL=kitty
```

**Arona.sh:**
```bash
MONITOR_PRIMARY="DP-3"
MONITOR_SECONDARY="HDMI-A-1"
MONITOR_TABLET="DP-2"
```

---

## Roadmap

### Current State
- v1 scripts live in ~/iuno/scripts/ and are functional
- v2 directory structure created
- common.sh written and installed to scripts/core/
- machine files written
- apps/niri/info.sh written

### Phase 1 — Foundation ✓
- [x] Create directory structure
- [x] Install common.sh to scripts/core/
- [x] Write machines/defaults.sh and Arona.sh
- [x] Move core scripts to scripts/core/
- [x] Move personal scripts to scripts/user/

### Phase 2 — Core Generic Scripts
- [ ] Write scripts/core/backup.sh
- [ ] Write scripts/core/restore.sh
- [ ] Write scripts/core/install.sh
- [ ] Write scripts/core/iuno.sh (v2 router)
- [ ] Test: iuno --backup -niri
- [ ] Test: iuno --restore -niri
- [ ] Test: iuno --install -niri

### Phase 3 — First App Complete
- [ ] Write apps/niri/arch.sh
- [ ] Verify end to end

### Phase 4 — Essentials Lists
- [ ] Write apps/_distro/arch/install.sh
- [ ] Write apps/_de/niri/install.sh
- [ ] Wire into iuno --install interactive flow

### Phase 5 — Migrate Remaining Apps
- [ ] kitty, alacritty, nvim, zsh, hypr, yazi, pipewire, ckb-next
- [ ] Retire v1 scripts when all apps migrated

### Phase 6 — Stage Pipeline
- [ ] Write apps/niri/stage.sh
- [ ] Wire iuno --stage into router

### Phase 7 — Detect
- [ ] Walk apps/ directories
- [ ] Source info.sh for each
- [ ] Report installed / backed up / in sync

---

## Not In Iuno

- Secrets — private setup on encrypted USB
- Network config — fstab, samba, UFW
- SSH keys — never in any repo
- Noctalia/Caelestia — install only, no config management

---

## Future

- Rollback command — iuno --rollback -appname
- Hash-based skip in backup — skip if file unchanged
- Drift detection in detect
- Auto-update — fetch upstream config, diff, merge
- Flatpak install method
- Deb support — deb.sh per app when needed
