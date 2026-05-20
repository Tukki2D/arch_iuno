# Brain.md — System Setup Record

## Important Rules
- **Never hardcode hardware-specific values** — output connector names, IPs, device paths come from the user's terminal only
- **Never write personal names or usernames** into scripts, configs, or documentation — use `$HOME` not `/home/username/`
- **README.md must stay in sync with `iuno --help` output** — if one changes, both change
- **iuno is a router, not a monolith** — logic lives in underlying scripts, never in iuno.sh
- **No automation of judgment calls** — scaffold and report, let the user decide
- **Always verify before writing** — never guess at versions, paths, or hardware values
- **Include convention** — personal includes are always appended to the bottom of the upstream default config file. Never put includes inside other include files. The upstream default + include block at the bottom is the only pattern used across all apps.

---

## System Overview

- **OS:** CachyOS (Arch-based)
- **Kernel:** linux-cachyos (7.x) / linux-cachyos-lts (6.18.x)
- **DE/Compositor:** Niri (latest)
- **Login manager:** SDDM (auto-login to niri, config at `/etc/sddm.conf.d/autologin.conf`)
- **Shell:** Noctalia (Quickshell-based)
- **Interactive shell:** Zsh + Starship
- **Terminal:** Kitty (primary), Alacritty (secondary)
- **File manager:** Thunar
- **Machine hostname:** Arona
- **GPU:** AMD RX 9070 XT (RDNA4)
- **Audio:** PipeWire 1.6.4 — combined sink (Schiit Modi 3E + Starship/Matisse HD)
- **Tablet:** Wacom Cintiq Pro 24 (DTK-2420), product ID 056a:037c

---

## Hardware Configuration

### Monitors
| Output | Device | Resolution | Scale | Position |
|--------|--------|-----------|-------|----------|
| DP-3 | BenQ EX2780Q | 2560x1440 @ 144Hz | 1.0 | 0, 0 (primary) |
| HDMI-A-1 | Samsung SMS23A350H | 1920x1080 @ 60Hz | 1.0 | -1920, 0 |
| DP-2 | Wacom CintiqPro24P | 3840x2160 @ 60Hz | 1.75 | 0, 1440 |

### Wacom Cintiq Pro 24 Setup
- Kernel driver: `wacom` module (not OTD)
- Module persisted: `/etc/modules-load.d/wacom.conf`
- Custom udev rule: `/etc/udev/rules.d/99-wacom-cintiq-pro24.rules`
  - Required because product IDs 037c/037f/0380/0381/0331 are missing from OTD 0.6.6.2
- Tablet mapped to DP-2 in `input.kdl`: `tablet { map-to-output "DP-2" }`
- `libwacom 2.18.0-2` installed

---

## Repository

- **Location:** `~/iuno/`
- **GitHub:** `git@github.com:Tukki2D/arch_iuno.git`
- **Branch:** `main`
- **Previously:** `~/.dotfiles/` → `git@github.com:Tukki2D/arch_dotfiles.git` (retired, kept as fallback until fully migrated)

### Why `~/iuno` not `~/.dotfiles`
`~/iuno` is not a traditional dotfile backup directory — it is a tool with an install
pipeline, an update pipeline, app-specific tools, and documentation. Unhidden is correct.
Convention for dotfile repos is hidden, but this has outgrown that pattern.

---


## iuno Architecture

### Philosophy
- Generic core scripts do all the work. App directories hold data only.
- Every app gets a directory. Same layout every time. No exceptions.
- info.sh is the single source of truth for each app — name, description, config paths.
- arch.sh declares the package and install method. Nothing else.
- iuno.sh routes only. Never contains logic.
- IUNO_ROOT is never hardcoded — resolved at runtime from the script's own location.
- Arch/CachyOS is the current focus. Deb support is future work.
- backup.sh and restore.sh are generic — they work for any app by reading info.sh.
- fish_variables should be gitignored — it is machine-specific.

### Directory Structure (v2 — current as of May 2026)
```
~/iuno/
├── Brain.md                             ← source of truth, session record
├── README.md                            ← honest entry point
├── iuno.log                             ← append-only action log
├── iuno-v2-spec.md                      ← full architecture spec and roadmap
├── .gitignore
├── apps/
│   ├── _distro/arch/                    ← one-shot Arch essentials (not built yet)
│   ├── _de/niri/                        ← one-shot Niri essentials (not built yet)
│   └── [appname]/
│       ├── info.sh                      ← NAME, DESCRIPTION, CONFIG_PATHS
│       ├── arch.sh                      ← PACKAGE, METHOD (not built yet)
│       ├── stage.sh                     ← staging pipeline (optional, niri only)
│       ├── dotfiles/                    ← current backup of live configs
│       └── dotfiles.bak/               ← previous backup (auto-rotated on each backup)
├── machines/
│   ├── defaults.sh                      ← IUNO_ROOT, EDITOR, TERMINAL
│   └── Arona.sh                         ← MONITOR_PRIMARY/SECONDARY/TABLET
├── scripts/
│   ├── core/
│   │   ├── iuno.sh                      ← router only
│   │   ├── common.sh                    ← shared toolset
│   │   ├── backup.sh                    ← generic backup, reads info.sh
│   │   ├── restore.sh                   ← generic restore, reads info.sh
│   │   ├── clean.sh                     ← staging and cache cleanup
│   │   ├── bootstrap-alias.sh           ← shell alias installer
│   │   └── check-aur.sh                 ← AUR helper verification
│   ├── user/
│   │   ├── launcher-toggle.sh           ← Noctalia launcher toggle
│   │   └── combined_audio.sh            ← PipeWire combined sink reference
│   └── niri/
│       └── niri-tool.sh                 ← v1 staging reference, migrate to stage.sh later
└── dev/                                 ← sandbox — test scripts here before promoting
```

### Managed Apps (May 2026)
| App | info.sh | dotfiles | Notes |
|-----|---------|----------|-------|
| alacritty | ✓ | ✓ | secondary terminal |
| ckb-next | ✓ | ✓ | RGB keyboard profiles |
| fastfetch | ✓ | ✓ | custom Arona logo at ~/Pictures/arona/ |
| fish | ✓ | ✓ | fish_variables must be gitignored |
| hypr | ✓ | ✗ | not installed, config preserved |
| kitty | ✓ | ✓ | primary terminal |
| krita | ✓ | ✓ | MOST IMPORTANT — two live locations, handle carefully |
| mango | ✓ | ✓ | preserved DE config, not currently active |
| niri | ✓ | ✓ | active compositor, cfg/ and dms/ subdirs |
| nvim | ✓ | ✓ | lazy.nvim, init.lua (migrated from init.vim) |
| pipewire | ✓ | ✓ | combined-sink.conf for Schiit Modi 3E + Matisse HD |
| starship | ✓ | ✗ | not yet installed on this build |

### iuno Commands (v2 — fully working)
```
iuno -b -appname     backup one app
iuno -b -all         backup all managed apps
iuno -r -appname     restore one app
iuno -r -all         restore all managed apps
iuno --detect        list all apps, backup status, install status
iuno -c              clean (--temp / --bak / --cache / --full)
iuno --help          show all commands and managed app list
```

### The Backup Flow
```
iuno -b -niri
    ↓ scripts/core/iuno.sh (router)
    ↓ scripts/core/backup.sh niri
    ↓ source apps/niri/info.sh → CONFIG_PATHS
    ↓ rotate: rm dotfiles.bak → mv dotfiles → dotfiles.bak → mkdir dotfiles
    ↓ for each path in CONFIG_PATHS:
          directory → cp -r live/. → dotfiles/dirname/
          file      → cp live     → dotfiles/filename
    ↓ log_action() → iuno.log
```

### The Restore Flow
```
iuno -r -niri
    ↓ scripts/core/iuno.sh (router)
    ↓ scripts/core/restore.sh niri
    ↓ source apps/niri/info.sh → CONFIG_PATHS
    ↓ for each path in CONFIG_PATHS:
          directory → rm -rf live && cp -r dotfiles/dirname → live
          file      → cp dotfiles/filename → live
    ↓ log_action() → iuno.log
```

### Krita — Special Handling
Krita spans two live locations. CONFIG_PATHS lists them all individually.
Backup stores everything flat in apps/krita/dotfiles/ by basename.
Restore uses basename to find each item and puts it back in the correct location.
Always make a manual .bak before restoring krita:
```bash
cp -r ~/.config/kritarc ~/.config/kritarc.bak
cp -r ~/.config/kritadisplayrc ~/.config/kritadisplayrc.bak
cp -r ~/.config/kritashortcutsrc ~/.config/kritashortcutsrc.bak
cp -r ~/.local/share/krita ~/.local/share/krita.bak
```

### Shell Alias
Fish (current): `alias iuno "bash $HOME/iuno/scripts/core/iuno.sh"`
Lives in: `~/.config/fish/config.fish`
Bootstrap for fresh installs: `bash ~/iuno/scripts/core/bootstrap-alias.sh`
Detects fish/zsh/bash and writes the correct alias format automatically.

### common.sh Functions
- IUNO_ROOT — resolved from BASH_SOURCE[0], works wherever iuno lives on disk
- load_machine() — sources machines/defaults.sh then machines/$(hostname).sh
- detect_distro() — returns arch | deb | unknown via package manager presence check
- install_package(name) — distro-aware, tries paru → yay → pacman → apt in order
- log_action(action, app, detail) — appends timestamped entry to iuno.log
- file_hash(file) — sha256sum fingerprint, foundation for future change detection
- configs_match(a, b) — diff -q wrapper, returns 0 if files are identical
- log / ok / warn / err — output helpers, all prefixed with [iuno]

---

## What's Next

### Immediate (small, do these first)
- [ ] Add PACKAGE variable to all info.sh files — fixes "— unknown" in iuno --detect
- [ ] Add fish_variables to .gitignore — it is machine-specific and was accidentally committed
- [ ] Fix script headers — backup.sh and restore.sh still say "dev/" in comments

### Stage Pipeline (medium — highest value next feature)
- [ ] Write apps/niri/stage.sh migrating niri-tool.sh logic into v2 structure
- [ ] Wire iuno --stage -appname into iuno.sh router
- [ ] niri-tool.sh in scripts/niri/ is the reference — do not delete until stage.sh is proven
- [ ] Pattern: copy live → /tmp/iuno/appname/ → user edits → diff → finalize or rollback

### Install System (low priority — only used once per fresh install)
- [ ] Write apps/_distro/arch/install.sh — Arch essentials array
- [ ] Write apps/_de/niri/install.sh — Niri essentials array
- [ ] Write per-app arch.sh files with PACKAGE and METHOD
- [ ] Wire iuno --install into router

### Future (not planned, just noted)
- Rollback command — iuno --rollback -appname restores from dotfiles.bak
- Hash-based skip — skip backup if file unchanged since last run (file_hash already in common.sh)
- Drift detection — improve iuno --detect to show when live differs from repo
- Auto-update — fetch upstream config, diff, present changes to user
- Deb support — deb.sh per app, detect_distro() already handles apt
- Encryption — gpg for secrets when needed

---

## Completed Work Log

- [x] KDE removed — 223 packages, 962MB freed
- [x] Migrated from plasmalogin to SDDM with auto-login to niri
- [x] Thunar installed as Dolphin replacement with Breeze-Dark GTK theme
- [x] v2 directory structure created
- [x] common.sh written and installed to scripts/core/
- [x] machines/defaults.sh and Arona.sh written
- [x] backup.sh — generic, tested on all apps including krita
- [x] restore.sh — generic, tested on all apps including krita
- [x] iuno.sh v2 router — all commands working
- [x] bootstrap-alias.sh updated to point to scripts/core/iuno.sh
- [x] All 12 apps migrated to apps/ directory structure with info.sh
- [x] v1 scripts cleaned up — sync.sh, restore.sh, install.sh, per-app install scripts removed
- [x] helium browser data removed from repo and history (git filter-repo)
- [x] fish alias updated to scripts/core/iuno.sh

---
