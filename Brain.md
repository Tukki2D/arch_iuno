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

- **OS:** CachyOS (Arch-based), kernel 6.19.12
- **DE/Compositor:** Niri 25.11 (b35bcae)
- **Login manager:** SDDM 0.21.0 (auto-login to niri, config at `/etc/sddm.conf.d/niri.conf`)
- **Shell:** Noctalia (Quickshell-based), noctalia-qs + noctalia-shell
- **Interactive shell:** Zsh + Starship prompt (switched from Fish)
- **Terminal:** Kitty (primary), Alacritty (secondary/scripting)
- **File manager:** Thunar (replaced Dolphin)
- **Machine hostname:** Arona
- **GPU:** AMD (ROCm, radeon driver)
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
- **Personal tool, not a product** — built to learn, not to sell
- **Simple is right** — start with the dumbest version that works, make it smarter when you understand how to
- **No backtracking** — the structure supports future growth without rewrites
- **Understand everything** — if a feature exists in iuno, it was written by hand and is understood completely
- **One router** — iuno.sh dispatches, never contains logic
- **Copy-based** — live configs are never moved or touched by backup
- **Deliberate snapshots** — backup is run manually when configs are in a known-good state
- **Install never touches ~/.config/** — packages only, config decisions are separate
- **Distro-agnostic by design** — configs and architecture are portable, package management is isolated to install_package() in common.sh

### Directory Structure
```
~/iuno/
├── Brain.md                     ← source of truth, session record
├── README.md                    ← honest entry point
├── .gitignore
├── apps/                        ← one directory per managed app
│   └── [appname]/
│       ├── arch.sh              ← arch/cachyos install
│       ├── deb.sh               ← debian install (add when needed)
│       ├── backup.sh            ← copy live configs into iuno
│       ├── restore.sh           ← copy iuno configs to live
│       ├── stage.sh             ← staging pipeline (add when needed)
│       ├── config-paths         ← plain text list of live config locations
│       └── backups/             ← rollback history
├── machines/                    ← machine-specific values
│   ├── defaults.sh              ← shared across all machines
│   └── Arona.sh                 ← this machine's overrides
├── scripts/
│   ├── core/                    ← iuno's own machinery
│   │   ├── iuno.sh              ← router only
│   │   ├── common.sh            ← distro detection, install dispatcher, log_action
│   │   ├── clean.sh             ← staging and cache cleanup
│   │   └── bootstrap-alias.sh   ← shell alias installer
│   └── user/                    ← personal scripts
│       ├── launcher-toggle.sh
│       └── clean_cache.sh
└── home/                        ← stray dotfiles that live in ~/
    └── .zshrc
```

### Future Architecture — Multi-Distro Support

Currently iuno is Arch/CachyOS specific. The install system uses paru/pacman directly inside for loops. When migrating to Debian/PikaOS or any other distro the plan is:

**The for loop stays dumb** — it iterates a list of names and calls `install_package()`. No changes needed.

**The intelligence moves to a package map** — a table that defines the package name and install method per distro:

```bash
# Format: "app-name|arch-package|debian-package|method"
# Methods: pkg (native PM), flatpak, aur, manual, none
PACKAGE_MAP=(
    "starship|starship|starship|pkg"
    "niri|niri|flatpak:io.github.nicoulaj.niri|flatpak"
    "paru|paru|none|aur-bootstrap"
)
```

**`install_package()` becomes a dispatcher** — detects distro, looks up the app in the table, calls the correct install method:

```bash
install_package() {
    local name="$1"
    # detect distro → pacman/apt/etc
    # look up name in PACKAGE_MAP
    # call correct method (pkg/flatpak/manual)
    # if method=none: warn and print manual install note
}
```

**`check-aur.sh` becomes `check-pkg-manager.sh`** — same concept, broader scope.

**Packages marked `none`** get a warning and a manual install note — no silent failures.

This is not built yet. Current install.sh works correctly for Arch/CachyOS. This pattern is the target when multi-distro support is needed.

### Directory Structure
```
~/iuno/
├── Brain.md                           ← this file, source of truth
├── README.md                          ← GitHub entry point, mirrors iuno --help
├── .gitignore
├── scripts/
│   ├── common.sh                      ← shared functions, app registry
│   ├── sync.sh                        ← backup ~/.config → ~/iuno
│   ├── restore.sh                     ← restore configs + check packages
│   ├── install.sh                     ← package bootstrapper
│   ├── clean.sh                       ← clean staging and .bak files
│   ├── launcher-toggle.sh             ← shell-agnostic launcher toggle
│   ├── iuno.sh                        ← top-level router
│   ├── bootstrap-alias.sh             ← shell alias installer
│   ├── check-aur.sh                   ← verify AUR helper, install paru if needed
│   ├── niri/
│   │   ├── niri-tool.sh               ← niri config update pipeline
│   │   └── niri-install.sh            ← niri fresh install
│   ├── hyprland/
│   │   └── hyprland-install.sh        ← hyprland fresh install
│   ├── zsh/
│   │   └── zsh-install.sh             ← zsh fresh install
│   ├── kitty/
│   │   └── kitty-install.sh           ← kitty fresh install
│   ├── alacritty/
│   │   └── alacritty-install.sh       ← alacritty fresh install
│   └── nvim/
│       └── nvim-install.sh            ← neovim fresh install
├── niri/                              ← backed up niri configs (flat)
├── kitty/                             ← backed up kitty configs (flat)
├── alacritty/                         ← alacritty.toml
├── hypr/                              ← hyprland configs (flat)
├── ckb-next/                          ← ckb-next profiles
├── fastfetch/                         ← fastfetch config
├── nvim/                              ← init.vim
├── starship/                          ← starship.toml
├── fish/                              ← fish config (flat, fish_variables excluded)
├── krita/                             ← krita rc files + .local/share/ (nested, two destinations)
├── home/                              ← stray dotfiles that live in ~/
│   └── .zshrc
└── bin/                               ← personal utility scripts (not iuno tools)
    └── clean_cache.sh
```

### Flat structure convention
Config files are stored directly in `~/iuno/appname/` — no nested `.config/appname/` subdirectory.
The restore scripts know the live destination for each app explicitly.

**Exception: krita** — krita maps to two live locations (`~/.config/` and `~/.local/share/`).
It keeps its nested structure so the restore script knows which files go where:
```
krita/
├── .config/
│   ├── kritarc
│   ├── kritadisplayrc
│   └── kritashortcutsrc
└── .local/share/krita/
    └── brushes, palettes etc.
```

### bin/ directory
Personal utility scripts that are used frequently but are not iuno tools live here.
Called via `iuno --clean-cache` or directly. Not part of the sync/restore pipeline.

---

## iuno Command

`iuno` is a bash script at `~/iuno/scripts/iuno.sh`. A one-line alias in any shell
points to it. Set up with:

| Command | Routes to | Purpose |
|---------|-----------|---------|
| `-i, --install` | `scripts/install.sh` | Install packages |
| `-b, --backup` | `scripts/sync.sh` | Back up configs to ~/iuno |
| `-r, --restore` | `scripts/restore.sh` | Restore configs from ~/iuno |
| `-c, --clean [--temp\|--bak\|--cache\|--full]` | `scripts/clean.sh` | Clean staging, .bak files, or package cache |
| `-d, --detect` | reads common.sh registry | Show installed apps + available tools |
| `-h, --help` | inline | Show all commands, tool list, README link |
| `--clean-cache` | `bin/clean_cache.sh` | Clean pacman/paru package cache |

### Shell alias bootstrap
The README instructs the user to run this before anything else:
```bash
bash ~/iuno/scripts/bootstrap-alias.sh
```
Detects active shell (fish, bash, zsh), adds `iuno` alias to the correct config file.

### iuno --detect output format
```
Installed apps with dotfile support:
  ✓ niri        installed   tool: niri-tool --help
  ✓ kitty       installed   tool: (none yet)
  ✓ fish        installed   managed by iuno --backup / --restore
  ✗ hyprland    not installed

Run iuno --help for full usage.
```

---

## App Inventory

| App | Config path | Package(s) | Tool |
|-----|-------------|-----------|------|
| niri | `~/.config/niri/` | `niri` | `niri-tool` |
| hypr | `~/.config/hypr/` | `hyprland` | none yet |
| kitty | `~/.config/kitty/` | `kitty` | none yet |
| alacritty | `~/.config/alacritty/` | `alacritty` | none yet |
| fastfetch | `~/.config/fastfetch/` | `fastfetch` | none |
| noctalia | not backed up — install only | `noctalia-qs noctalia-shell` | none |
| fish | `~/.config/fish/` | `fish` | none |
| starship | `~/.config/starship.toml` | `starship` | none |
| nvim | `~/.config/nvim/` | `neovim` | none yet |
| krita | `~/.config/krita* + .local/share/` | `krita` | none |
| ckb-next | `~/.config/ckb-next/` | `ckb-next-git` | none |

### Hyprland config note
`~/.config/hypr/` contains `hyprland.conf` and `scheme/current.conf`.
`scheme/current.conf` holds a full Material You color palette.
Hyprland is not currently installed but configs are preserved in `~/iuno/hypr/`.

---

## Install Script Categories

| Flag | Packages |
|------|---------|
| `-core` | git, neovim, kitty, alacritty, fish, starship, fastfetch, btop, wl-clipboard, ripgrep, tree, wget, rsync |
| `-browsers` | brave-bin, waterfox-bin, librewolf-bin, firefox, telegram-desktop, discord |
| `-media` | steam, vlc, vlc-plugins-all, heroic-games-launcher-bin, bottles, pavucontrol |
| `-creative` | krita, krita-plugin-gmic, libreoffice-fresh |
| `-hardware` | ckb-next-git, openrgb |
| `-ai` | ollama-rocm |
| `-repos` | Momoisay |
| `-niri` | niri, dunst, swayidle, swaylock, swaybg, xwayland-satellite, xdg-desktop-portal-gnome, polkit-gnome |
| `-hyprland` | hyprland, dunst, hyprpolkitagent, xdg-desktop-portal-hyprland, hyprlauncher, hyprpaper |
| `-wacom` | Wacom udev rule + kernel module config (standalone) |
| `-noctalia` | noctalia-qs (first), noctalia-shell |
| `-caelestia` | caelestia-shell, caelestia-cli |
| `-zsh` | zsh, zsh-syntax-highlighting, zsh-autosuggestions, zsh-history-substring-search, fzf, oh-my-zsh-git, starship |

### Package manager fallback chain
`paru → yay → pacman`

---

## Niri Configuration

### File Structure
```
~/.config/niri/
├── config.kdl      ← upstream default + include lines, never personally edited
├── custom.kdl      ← binds, window-rules, spawns, prefer-no-csd, screenshot-path
├── outputs.kdl     ← monitor output blocks, named workspaces, workspace window-rules
├── input.kdl       ← full input{} block
└── layout.kdl      ← full layout{} block
```

### config.kdl include block
```kdl
// ── Personal Configuration ────────────────────────────────────────────────
// Managed by niri-tool. See ~/iuno/scripts/niri/niri-tool.sh

// Always safe — does not conflict with upstream defaults:
include "custom.kdl"

// System-specific — verify connector names with: niri msg outputs
// Then uncomment:
// include "outputs.kdl"

// Remove layout{} from config.kdl above, then uncomment:
// include "layout.kdl"

// Remove input{} from config.kdl above, then uncomment:
// include "input.kdl"
```

### What gets committed to ~/iuno
| File | Committed | Reason |
|------|-----------|--------|
| `custom.kdl` | ✓ | Personal binds and rules |
| `outputs.kdl` | ✓ | Monitor config (verify connector names on new hardware) |
| `layout.kdl` | ✓ | Personal layout preferences |
| `input.kdl` | ✓ | Personal input preferences |
| `config.kdl` | ✗ | Regenerated by niri-tool, not personal |
| `*.bak` | ✗ | Gitignored, temporary |

### Key settings
- `focus-follows-mouse max-scroll-amount="0%"` — in `input.kdl`
- `tablet { map-to-output "DP-2" }` — in `input.kdl`
- `spawn-at-startup "xsettingsd"` — in `custom.kdl`
- `spawn-at-startup "xwayland-satellite"` — in `custom.kdl`
- `spawn-at-startup "/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1"` — in `custom.kdl`
- `spawn-sh-at-startup "qs -c noctalia-shell -d"` — in `custom.kdl`

### Key bindings (in custom.kdl)
| Bind | Action |
|------|--------|
| `Mod+Space` | Toggle launcher via `~/iuno/scripts/launcher-toggle.sh` |
| `Mod+T` | Kitty terminal |
| `Mod+W` | Waterfox |
| `Mod+E` | Dolphin |
| `Mod+C` | Close window (overrides default center-column) |
| `Mod+M` | Maximize to edges |
| `Mod+O` | Toggle overview |
| `Mod+Tab` | Toggle overview |
| `Mod+Shift+W` | Toggle tabbed display |
| `Super+Alt+L` | Swaylock |

### Named workspaces and window rules (in outputs.kdl)
Named workspaces are top-level blocks — not inside `output {}`. They live in `outputs.kdl`
because they are hardware-specific and only make sense alongside the output configuration.

| Workspace | Output | Apps |
|-----------|--------|------|
| `flexible` | DP-3 | Waterfox |
| `chat` | DP-3 | Telegram, Discord |
| `gaming` | DP-3 | Steam |
| `secondary` | HDMI-A-1 | Brave |

Syntax:
```kdl
workspace "chat" {
    open-on-output "DP-3"
}
window-rule {
    match app-id="discord"
    open-on-workspace "chat"
}
```

---

## niri-tool — Niri Config Update Pipeline

### Location
`~/iuno/scripts/niri/niri-tool.sh`

### Commands
| Command | Purpose |
|---------|---------|
| `-b, --bak` | Back up all live niri config files to .bak |
| `-s, --stage` | Scaffold staging at /tmp/iuno/niri/, copy live files in |
| `-d, --diff` | Show differences between staging and live (optional) |
| `-f, --finalize` | Check staging integrity, promote to live |
| `-r, --rollback` | Restore all live files from .bak (all or nothing) |
| `-p, --push` | Save to ~/iuno and push to GitHub |
| `-h, --help` | Show usage |

### Typical update flow
```
1. niri-tool --stage
2. Edit files in /tmp/iuno/niri/
   - Move layout{} from config.kdl → layout.kdl
   - Move input{} from config.kdl → input.kdl
   - Use .bak files as reference, LLM for complex merges
3. niri-tool --diff        (optional)
4. niri-tool --finalize
5. niri-tool --rollback    (if something breaks)
6. niri-tool --push
```

### Staging directory
```
/tmp/iuno/niri/
├── config.kdl      ← new upstream default + include block
├── custom.kdl      ← copied from live
├── outputs.kdl     ← copied from live (or blank template if missing)
├── layout.kdl      ← copied from live (or blank template if missing)
├── input.kdl       ← copied from live (or blank template if missing)
└── niri-changes.md ← diff report (--diff only, never promoted to live)
```

### Safety model
- Live config never touched until `--finalize` promotes
- `--finalize` backs up ALL live files to `.bak` before promoting
- Promotion is all or nothing — any failure triggers automatic full rollback
- `--rollback` requires ALL `.bak` files to exist — aborts entirely if any are missing
- `.bak` files overwritten on next `--bak` or `--finalize` run

### Managed files (MANAGED array in niri-tool.sh)
```bash
MANAGED=(
    "layout.kdl|layout"
    "input.kdl|input"
)
```
Add entries here as more sections are migrated to their own files.

### Phase 2 — LLM-assisted merging
For complex block merges paste the `.bak` file and the new upstream block into
an LLM conversation. Ask it to merge old values into the new block. Review,
paste into the staging file, validate. This is the right tool for judgment work.

---

## Config Update Strategy

### The problem
When apps ship new default configs, restoring old snapshots means missing new
options or conflicting with new formats.

### The convention (proven with niri and kitty)
Personal includes are always appended to the **bottom of the upstream default
config file**. Never put includes inside other include files. The pattern:

```
upstream-default.conf   ← never personally edited, replaced freely on updates
    └── (bottom) include block:
            include custom.conf      ← active immediately, safe on updates
            include window.conf      ← active on this system
            # include font.conf      ← commented, uncomment after verifying
            # include theme.conf     ← commented, uncomment when ready
```

On updates: replace upstream default, re-append include block. Personal files
are untouched. New upstream options appear automatically.

### Include separation status
| App | Include syntax | Status |
|-----|---------------|--------|
| Niri | `include "custom.kdl"` etc. | ✓ Implemented |
| Kitty | `include custom.conf` etc. | ✓ Implemented |
| Hyprland | `source = ~/.config/hypr/custom.conf` | ✓ Implemented |
| Alacritty | single file, all personal — no split needed | ✓ Done by design |
| Fish | functions are already separate files | ✓ Done by design |
| Nvim | single file, all personal — no split needed | ✓ Done by design |

### Apps without include support
| App | Strategy |
|-----|---------|
| Krita | Watch changelogs — rc files are stable, low risk |

---

## Kitty Configuration

### File structure
```
~/.config/kitty/
├── kitty.conf              ← upstream default + include block at bottom, not backed up
├── custom.conf             ← key overrides and any future personal settings
├── window.conf             ← geometry, opacity, blur, tab bar
├── font.conf               ← font settings (commented in kitty.conf until verified)
├── current-theme.conf      ← managed by kitten theme automatically
└── themes/
    └── Arona.conf          ← custom color theme
```

### kitty.conf include block
```conf
# ── Personal Configuration ────────────────────────────────────────────────────
# Managed by iuno. See ~/iuno/

# Window and tab settings:
include window.conf

# Font settings — uncomment after verifying font is installed:
# include font.conf

# Theme — managed by kitten theme, uncomment if needed:
# include current-theme.conf
```

### What gets committed to ~/iuno
| File | Committed | Reason |
|------|-----------|--------|
| `custom.conf` | ✓ | Personal overrides |
| `window.conf` | ✓ | Window preferences |
| `font.conf` | ✓ | Font settings |
| `themes/Arona.conf` | ✓ | Custom color theme |
| `current-theme.conf` | ✓ | Kitty-managed theme reference |
| `kitty.conf` | ✗ | Regenerated on updates |

### Notes
- `background_blur 80` is set but requires compositor blur support — pending niri next release
- Kitty manages `# BEGIN_KITTY_FONTS` and `# BEGIN_KITTY_THEME` blocks in kitty.conf automatically — do not remove them
- Theme selection via: `kitten theme`

---

## Hyprland Configuration

Hyprland is not currently installed — configs are preserved in `~/iuno/hypr/` for future use.

### File structure
```
~/.config/hypr/
├── hyprland.conf    ← upstream default + source block at bottom, not backed up
├── custom.conf      ← variables, autostart, look and feel, keybinds, window rules
└── monitors.conf    ← monitor output blocks (system-specific, commented by default)
```

### hyprland.conf source block
```bash
# ── Personal Configuration ────────────────────────────────────────────────────
# Managed by iuno. See ~/iuno/

# System-specific monitor configuration:
# source = ~/.config/hypr/monitors.conf

# Personal overrides — variables, autostart, look and feel, binds, rules:
source = ~/.config/hypr/custom.conf
```

### Notes
- `monitors.conf` commented by default — uncomment after verifying connector names with `hyprctl monitors`
- Hyprland supports last-definition-wins overrides — no block migration needed, custom.conf overrides anything in hyprland.conf
- Include syntax: `source =` (different from niri's `include` and kitty's `include`)

---

## Zsh Configuration

Switched from Fish to Zsh as the interactive shell. Fish is still used for iuno bash scripts.

### Setup
- CachyOS ships `cachyos-config.zsh` which bundles p10k — not sourced to avoid conflict with Starship
- Plugins sourced directly from system paths
- Starship initialized last to take prompt ownership

### `.zshrc` structure
```zsh
# Zsh plugins
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
source /usr/share/zsh/plugins/zsh-history-substring-search/zsh-history-substring-search.zsh

# Oh-my-zsh
export ZSH="/usr/share/oh-my-zsh"
plugins=(git fzf extract)
source $ZSH/oh-my-zsh.sh

# History
export HISTCONTROL=ignoreboth
export HISTORY_IGNORE="(&|[bf]g|c|clear|history|exit|q|pwd|* --help)"

# FZF
export FZF_BASE=/usr/share/fzf

# iuno and tool aliases (written by bootstrap-alias.sh)
alias iuno="bash $HOME/iuno/scripts/iuno.sh"
alias niri-tool="bash $HOME/iuno/scripts/niri/niri-tool.sh"

# Starship prompt — must be last
prompt_powerlevel10k_setup() { :; }
eval "$(starship init zsh)"
```

### Notes
- `prompt_powerlevel10k_setup() { :; }` overrides p10k's setup function so Starship can take prompt ownership
- `.zshrc` backed up in `~/iuno/home/.zshrc`
- Aliases use `$HOME` not hardcoded paths — safe to make repo public
- `zsh-install.sh` built and live at `~/iuno/scripts/zsh/zsh-install.sh`

### Base Arch warning — oh-my-zsh path
On CachyOS, oh-my-zsh installs to `/usr/share/oh-my-zsh/` — this is the path in `.zshrc`.
On base Arch, `oh-my-zsh-git` may not be available. The manual install from GitHub puts files in `~/.oh-my-zsh/` instead.
If installing manually on base Arch, update `.zshrc`:
```zsh
# Change this:
export ZSH="/usr/share/oh-my-zsh"
# To this:
export ZSH="$HOME/.oh-my-zsh"
```

---

## CachyOS Wins — Notes for Base Arch Migration

CachyOS provides assistive packages and configs that don't exist on base Arch.
This section tracks what needs to be manually sourced or installed when moving
back to base Arch Linux.

### Zsh
CachyOS provides these packages pre-installed that need to be sourced in `.zshrc`:

| Package | Path | Purpose |
|---------|------|---------|
| `zsh-syntax-highlighting` | `/usr/share/zsh/plugins/zsh-syntax-highlighting/` | Syntax coloring as you type |
| `zsh-autosuggestions` | `/usr/share/zsh/plugins/zsh-autosuggestions/` | Fish-style inline suggestions |
| `zsh-history-substring-search` | `/usr/share/zsh/plugins/zsh-history-substring-search/` | Up arrow searches history by prefix |
| `oh-my-zsh` | `/usr/share/oh-my-zsh/` | Plugin framework (git, fzf, extract plugins) |
| `fzf` | `/usr/share/fzf/` | Fuzzy finder integration |

On base Arch these need to be installed via `paru` and sourced from their installed paths.

### Fish
CachyOS likely provides similar assistive packages for Fish. Document when investigated.

### General
- CachyOS `cachyos-config.zsh` bundles p10k, oh-my-zsh, and aliases — useful reference
  but not sourced directly (conflicts with Starship, too opinionated)
- CachyOS kernel (6.19.12) includes patches not in mainline — performance difference
  may be noticeable on base Arch
- `pkgfile` command-not-found handler — available on Arch via `pkgfile` package

### Action items for Arch migration
- [x] Write `zsh-install.sh` that installs packages and deploys `.zshrc`
- [ ] Investigate Fish assistive packages CachyOS provides
- [ ] Write `fish-install.sh` similarly

---

## Private Setup (offline only)

- Location: `~/iuno-private/` — never pushed to GitHub
- Contains: fstab mounts, samba credentials, UFW rules, network topology
- Backed up to encrypted USB only
- Script: `private-setup.sh` (planned)

---

## Known Issues / Limitations

### Noctalia tray icon clicks
- StatusNotifierItem protocol limitation
- Left click opens tray menu — cannot focus window
- Upstream limitation, not configurable from niri or noctalia

### Niri blur (pending next release)
- Merged into niri main April 15 2026 (PR #3483 by YaLTeR)
- Not yet in a release — currently on niri 25.11
- When available, add to `custom.kdl`:
  ```kdl
  window-rule { background-effect { blur true } }
  layer-rule  { background-effect { blur true } }
  ```
- Also set `background_opacity` in kitty/alacritty configs

### Starship
- Currently installed manually to `/usr/local/bin/starship` (not via pacman)
- Use `paru -S starship` on next fresh install (available in extra/ repo)
- `iuno --backup -list` shows `✗` until reinstalled via paru

### OPNSense / Samba
- Ports: 445/TCP required, 137-139 optional (legacy NetBIOS)
- `cifs-utils` required on Arch client
- Credentials: `/etc/samba/credentials` (chmod 600)
- fstab flag: `_netdev`
- Error 115 (ETIMEDOUT): check OPNSense state table and rule ordering

---

## What's Next

### Iuno v2 migration
- [ ] Create `apps/` directory structure
- [ ] Migrate niri first — most complete app, best teacher
- [ ] Move core scripts to `scripts/core/`
- [ ] Move personal scripts to `scripts/user/`
- [ ] Write `common.sh` with `install_package()` dispatcher and `log_action()`
- [ ] Retire sync.sh, restore.sh, install.sh as apps migrate to new structure

### When niri blur lands
- [ ] Set `background_opacity` in kitty and alacritty configs
- [ ] Add blur window-rule and layer-rule to `custom.kdl`
- [ ] `niri-tool --push`

### Private setup
- [ ] Write `private-setup.sh` for fstab, samba, UFW (USB only, never pushed)

### Order of operations doc
- [ ] Write fresh install recovery flow document

### Fish install
- [ ] Investigate CachyOS Fish assistive packages
- [ ] Write `fish-install.sh`

### Completed
- [x] iuno.sh — top-level router built and live
- [x] bootstrap-alias.sh — shell alias installer, writes `$HOME` not hardcoded paths
- [x] check-aur.sh — AUR helper verification built and live
- [x] install.sh — clean rewrite, all app flags wired including hyprland and zsh
- [x] clean.sh — staging + .bak cleaner with --temp/--bak/--cache/--full flags
- [x] niri-install.sh — niri fresh install, DE check before staging
- [x] niri-tool.sh — full pipeline with stage/diff/finalize/rollback/push
- [x] hyprland-install.sh — hyprland fresh install, DE check before restore
- [x] zsh-install.sh — zsh fresh install, deploys .zshrc, sets default shell
- [x] kitty-install.sh — kitty fresh install built and live
- [x] alacritty-install.sh — alacritty fresh install built and live
- [x] nvim-install.sh — neovim fresh install built and live
- [x] Niri — include separation, niri-tool pipeline, named workspaces + window rules
- [x] Kitty — include separation implemented (custom.conf, window.conf, font.conf)
- [x] Hyprland — config cleaned, custom.conf and monitors.conf split, source block added
- [x] Alacritty — single file, all personal, backed up
- [x] Nvim — single file, all personal, backed up
- [x] Repo flattened — no more nested .config/appname/ paths
- [x] Noctalia removed from backup/restore — install-only
- [x] Switched interactive shell from Fish to Zsh + Starship
- [x] home/ directory established for stray dotfiles
- [x] bin/ directory established for personal utilities
- [x] ~/.dotfiles/ retired — ~/iuno/ is the only source of truth
- [x] KDE removed — 223 packages, 962MB freed
- [x] Migrated from plasmalogin to SDDM with auto-login to niri
- [x] Thunar installed as Dolphin replacement with Breeze-Dark GTK theme

### Completed
- [x] iuno.sh — top-level router built and live
- [x] bootstrap-alias.sh — shell alias installer, writes `$HOME` not hardcoded paths
- [x] check-aur.sh — AUR helper verification built and live
- [x] install.sh — clean rewrite, all app flags wired including hyprland and zsh
- [x] clean.sh — staging + .bak cleaner with --temp/--bak/--cache/--full flags
- [x] niri-install.sh — niri fresh install, DE check before staging
- [x] niri-tool.sh — full pipeline with stage/diff/finalize/rollback/push
- [x] hyprland-install.sh — hyprland fresh install, DE check before restore
- [x] zsh-install.sh — zsh fresh install, deploys .zshrc, sets default shell
- [x] kitty-install.sh — kitty fresh install built and live
- [x] alacritty-install.sh — alacritty fresh install built and live
- [x] nvim-install.sh — neovim fresh install built and live
- [x] Niri — include separation, niri-tool pipeline, named workspaces + window rules
- [x] Kitty — include separation implemented (custom.conf, window.conf, font.conf)
- [x] Hyprland — config cleaned, custom.conf and monitors.conf split, source block added
- [x] Alacritty — single file, all personal, backed up
- [x] Nvim — single file, all personal, backed up
- [x] Repo flattened — no more nested .config/appname/ paths
- [x] Noctalia removed from backup/restore — install-only
- [x] Switched interactive shell from Fish to Zsh + Starship
- [x] home/ directory established for stray dotfiles
- [x] bin/ directory established for personal utilities
- [x] ~/.dotfiles/ retired — ~/iuno/ is the only source of truth
