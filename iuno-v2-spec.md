# Iuno — Architecture Spec v2
# Personal install and staging tool for Arch/CachyOS.
# Built to learn. Not for sale.

---

## What Iuno Is

A personal Linux setup tool for Arch/CachyOS. Installs software, manages configs,
and stages changes safely. Every feature is written by hand and understood completely.

Not a dotfile manager. Not a product. A learning project that solves real problems.

---

## Design Principles

- Start with the simplest version that works. Make it smarter when you understand how.
- The structure supports growth without rewrites. Add inside existing files.
- If it exists in iuno, the author wrote it and knows what it does.
- Failure is logged. Logs are how you know what to fix.
- iuno.sh dispatches only. Logic lives in app directories and core scripts.
- An app gets a directory only if it has config files worth managing.
- IUNO_ROOT is never hardcoded — always resolved at runtime.
- Deb support is future work. Arch is the current focus.

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
│   └── [appname]/                       ← apps with config files to manage
│       ├── info.sh                      ← name, package, description, config paths
│       ├── arch.sh                      ← Arch install logic, sources info.sh
│       ├── backup.sh                    ← copy live configs into iuno
│       ├── restore.sh                   ← copy iuno configs to live
│       ├── stage.sh                     ← staging pipeline (optional)
│       └── backups/                     ← rollback history (starts empty)
│           ├── filename.1
│           ├── filename.2
│           └── filename.3
│
├── machines/
│   ├── defaults.sh                      ← shared values across all machines
│   └── Arona.sh                         ← this machine's overrides
│
├── scripts/
│   ├── core/
│   │   ├── iuno.sh                      ← router only
│   │   ├── common.sh                    ← shared toolset
│   │   ├── clean.sh                     ← staging and cache cleanup
│   │   └── bootstrap-alias.sh           ← shell alias installer
│   └── user/                            ← personal scripts
│       ├── launcher-toggle.sh
│       └── clean_cache.sh
│
└── home/
    └── .zshrc
```

---

## The App Directory

A directory exists for every app that has config files worth managing.
No config files — no directory. Simple installs go in essentials lists.

Every app directory has the same file names. The router never needs to know
what's inside — it just calls the right file by name.

### Files

**info.sh** — the manifest. Single source of truth for the app.
Sourced by arch.sh, backup.sh, restore.sh, detect, and anything else that
needs to know about this app. Never contains logic.

```bash
# apps/niri/info.sh
NAME="niri"
PACKAGE="niri"
DESCRIPTION="A scrollable-tiling Wayland compositor. Windows tile horizontally."
CONFIG_PATHS=(
    "$HOME/.config/niri/config.kdl"
    "$HOME/.config/niri/custom.kdl"
    "$HOME/.config/niri/outputs.kdl"
    "$HOME/.config/niri/input.kdl"
    "$HOME/.config/niri/layout.kdl"
)
```

**arch.sh** — Arch install logic. Sources info.sh for NAME, PACKAGE, DESCRIPTION.
Contains before_install() and after_install() hooks if needed.

**backup.sh** — reads CONFIG_PATHS from info.sh. Copies live files into the
app directory with 3-deep rotation into backups/.

**restore.sh** — reads CONFIG_PATHS from info.sh. Copies repo files to live
locations. Backs up existing live file to backups/ before overwriting.

**stage.sh** — optional. Only for apps where a bad config is costly.
Safe edit → diff → finalize or rollback pipeline.

**backups/** — exists from day one even if empty. Room for rollback history.

---

## info.sh — The Manifest

```bash
# apps/[appname]/info.sh
NAME=""           # display name
PACKAGE=""        # package name passed to install_package()
DESCRIPTION=""    # one or two sentences, shown during install prompt
CONFIG_PATHS=(    # live config file locations, $HOME not hardcoded paths
    ""
)
```

Everything that needs to know about an app sources this file.
When the package name changes or a new config file is added — edit here only.

---

## arch.sh — Arch Install Script

Sources info.sh. Installs the package with a prompt. Hooks for custom steps.

```bash
#!/bin/bash
# apps/[appname]/arch.sh

source "$(dirname "$0")/info.sh"
source "$(dirname "$0")/../../scripts/core/common.sh"

before_install() {
    # Optional — runs before install
    # Check for conflicts, warn user, pre-install steps
    :
}

after_install() {
    # Optional — runs after install
    # Enable services, write initial configs, post-install notes
    :
}

# ── Main ──────────────────────────────────────────────────────────────────────

declare -f before_install > /dev/null && before_install
install_with_prompt "$NAME" "$DESCRIPTION" "$PACKAGE"
declare -f after_install > /dev/null && after_install
```

**before_install() / after_install()** — optional. Defined if needed, skipped
silently if not. declare -f checks existence before calling — no errors if absent.

This is where distro-specific work happens. The hooks are what make each app
installation unique. Examples:

- niri after_install: enable sddm, print next steps
- sddm after_install: write /etc/sddm.conf.d/niri.conf
- pipewire after_install: copy combined sink config, restart service

---

## Essentials Lists — One-Shot Installs

Simple packages with no config to manage. Installed once on setup.
Live inside the distro or DE install script directly — not in app directories.

```bash
# apps/_distro/arch/install.sh
source "$(dirname "$0")/../../../scripts/core/common.sh"

ESSENTIALS=(
    git
    ripgrep
    fd
    fzf
    zoxide
    btop
    fastfetch
    wl-clipboard
    tree
    wget
    rsync
)

log "Installing Arch essentials..."
for pkg in "${ESSENTIALS[@]}"; do
    install_package "$pkg"
done
ok "Arch essentials done."
```

```bash
# apps/_de/niri/install.sh
source "$(dirname "$0")/../../../scripts/core/common.sh"

ESSENTIALS=(
    niri
    dunst
    polkit-gnome
    xwayland-satellite
    sddm
)

log "Installing Niri essentials..."
for pkg in "${ESSENTIALS[@]}"; do
    install_package "$pkg"
done
ok "Niri essentials done."
```

These are personal one-shot lists. Edit the arrays over time as preferences change.
No prompts — if you're running essentials you want all of them.

---

## common.sh — The Shared Toolset

Sourced by every script. Never run directly.

```bash
source "$(dirname "$0")/../../scripts/core/common.sh"
```

### IUNO_ROOT

```bash
IUNO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
```

Resolved from common.sh's own location. Works regardless of where iuno lives.

### Functions

**Output helpers**
```bash
log()  { echo "[iuno] $*"; }
ok()   { echo "[iuno] ✓  $*"; }
warn() { echo "[iuno] ⚠  $*"; }
err()  { echo "[iuno] ✗  $*"; }
```

**load_machine()** — sources defaults.sh then hostname-matched machine file.
Called automatically when common.sh is sourced.

**detect_distro()** — checks package manager. Returns: arch, deb, unknown.

**install_package(name)** — installs one package. Detects distro, uses paru
if available, falls back to pacman. Calls log_action() on success.

**install_with_prompt(name, description, package)** — shows name and description,
prompts [y/N], calls install_package() if confirmed.

**log_action(action, app, detail)** — appends timestamped record to iuno.log.

**file_hash(file)** — returns sha256 of a file. Foundation for change detection.

**configs_match(file_a, file_b)** — returns 0 if identical, 1 if different.

---

## iuno.sh — The Router

```
iuno --install              interactive setup
iuno --install -appname     install one app
iuno --backup  -appname     backup one app
iuno --backup  -all         backup all apps
iuno --restore -appname     restore one app
iuno --restore -all         restore all apps
iuno --stage   -appname     run staging pipeline
iuno --detect               list apps and status
iuno --clean   [flags]      clean staging/cache/bak
iuno --log                  print iuno.log
iuno --log     -appname     filter log by app
iuno --log     -tail        last 20 entries
iuno --help                 show commands
```

No logic in iuno.sh. It finds the right script and calls it.
Adding a new app never requires touching iuno.sh.

---

## Install Flow

### Interactive (first setup)

```
iuno --install
    ↓
detect_distro()
    ↓
run apps/_distro/arch/install.sh    (essentials, no prompts)
    ↓
prompt: which DE? (niri / hyprland / none)
    ↓
run apps/_de/niri/install.sh        (DE essentials, no prompts)
    ↓
walk apps/ directories:
    for each app with arch.sh:
        source info.sh
        install_with_prompt()
```

### Single app

```
iuno --install -niri
    ↓
apps/niri/arch.sh
    ↓
before_install() if defined
install_with_prompt()
after_install() if defined
```

---

## Backup Flow

```
iuno --backup -niri
    ↓
apps/niri/backup.sh
    ↓
source info.sh → get CONFIG_PATHS
    ↓
for each path:
    skip comments and blanks
    expand $HOME
    check file exists
    rotate backups (.2→.3, .1→.2, current→.1)
    copy live file into app directory
    log_action()
```

---

## Restore Flow

```
iuno --restore -niri
    ↓
apps/niri/restore.sh
    ↓
source info.sh → get CONFIG_PATHS
    ↓
for each path:
    skip comments and blanks
    expand $HOME
    check repo file exists
    if live file exists: back up to backups/filename.pre-restore
    copy repo file to live location
    log_action()
```

---

## Stage Flow

For apps where a bad config is costly. Not every app needs this.

```
iuno --stage -niri
    ↓
apps/niri/stage.sh
    ↓
copy live → /tmp/iuno/niri/
user edits in staging
diff staging vs live
finalize → copy staged to live + log
rollback → restore .bak + log
```

---

## Detect

Walks apps/ (excluding _distro/ and _de/). For each app directory:
1. Sources info.sh — gets PACKAGE and CONFIG_PATHS
2. Checks if PACKAGE is installed (pacman -Q)
3. Checks if config files exist in app directory
4. Compares live files to repo files with configs_match()
5. Reports status

```
iuno --detect

  niri     ✓ installed   ✓ backed up   ⚠ live differs
  kitty    ✓ installed   ✓ backed up   ✓ in sync
  krita    ✓ installed   ✗ not backed up
  yazi     ✗ not installed
```

---

## Machine Files

**defaults.sh** — values shared across all machines:
```bash
IUNO_ROOT="$HOME/iuno"
EDITOR=nvim
TERMINAL=kitty
```

**Arona.sh** — this machine's overrides:
```bash
MONITOR_PRIMARY="DP-3"
MONITOR_SECONDARY="HDMI-A-1"
MONITOR_TABLET="DP-2"
```

Sourced automatically by load_machine() in common.sh.
New machine = new file. Nothing else changes.

---

## Log

Format:
```
[2026-05-02 17:30] backup   niri    custom.kdl
[2026-05-02 17:45] install  kitty   arch
```

Append-only. Never auto-truncated.

---

## What You Learn, In Order

1. Bash functions and scripts
2. For loops and file reading
3. Distro detection
4. Logging
5. Idempotency — check before acting
6. Diff — one new skill per stage.sh
7. Rollback — rotation pattern
8. Hash-based change detection
9. Machine values and variable substitution
10. Templating — config files that reference $MONITOR_PRIMARY
11. Auto-update — fetch upstream, diff, merge

Each step is additive. Nothing rewrites what came before.

---

## Roadmap

### Current State
- v1 scripts live in ~/iuno/scripts/ and are functional
- v2 spec is written and committed
- common.sh is written but not installed
- No v2 directory structure exists yet

Migration happens phase by phase. v1 stays functional throughout.

---

### Phase 1 — Foundation
Build once. Never touch again.

- [ ] Create directory structure
      apps/  scripts/core/  scripts/user/  machines/
- [ ] Install common.sh to scripts/core/
- [ ] Write machines/defaults.sh
- [ ] Write machines/Arona.sh
- [ ] Write scripts/core/iuno.sh router
- [ ] Migrate bootstrap-alias.sh to scripts/core/
- [ ] Migrate clean.sh to scripts/core/

### Phase 2 — First App
Proves the pattern works end to end.

- [ ] Create apps/niri/
- [ ] Write apps/niri/info.sh
- [ ] Write apps/niri/arch.sh
- [ ] Write apps/niri/backup.sh
- [ ] Write apps/niri/restore.sh
- [ ] Test: iuno --backup -niri
- [ ] Test: iuno --restore -niri

### Phase 3 — Essentials Lists
One-shot install on fresh setup.

- [ ] Write apps/_distro/arch/install.sh
- [ ] Write apps/_de/niri/install.sh
- [ ] Wire into iuno --install interactive flow
- [ ] Test full fresh install flow

### Phase 4 — Migrate Remaining Apps
Each app proves the pattern further.

- [ ] kitty
- [ ] alacritty
- [ ] nvim
- [ ] zsh
- [ ] hypr
- [ ] yazi
- [ ] pipewire (combined sink config)
- [ ] Retire v1 sync.sh, restore.sh, install.sh when all apps migrated

### Phase 5 — Stage Pipeline
Safe live editing for high-risk configs.

- [ ] Write apps/niri/stage.sh (migrated from niri-tool)
- [ ] Wire iuno --stage into router
- [ ] Test: iuno --stage -niri end to end

### Phase 6 — Detect
System status at a glance.

- [ ] Write detect handler in iuno.sh
- [ ] Sources info.sh from each app directory
- [ ] Reports: installed, backed up, in sync

---

v1 scripts stay functional during migration. Move apps one at a time.
Create apps/appname/, write its scripts, test, retire the v1 function.
No big bang rewrite.

---

## Not In Iuno

- Secrets — private setup on encrypted USB
- Network config — fstab, samba, UFW are private
- SSH keys — never in any repo
- Noctalia/Caelestia — install only, no config management

---

## Future

- Rollback command — iuno --rollback -appname
- Hash-based skip in backup — skip if unchanged
- Drift detection in detect
- Auto-update — fetch upstream, diff, merge
- Flatpak install method
- Deb support — add deb.sh per app when needed
- Encryption — gpg for in-repo secrets
