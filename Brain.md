# Brain.md — Arch/CachyOS Setup Record

## System Overview

- **OS:** CachyOS (Arch-based), CachyOS kernel 6.19.12
- **DE/Compositor:** Niri 25.11 (scrollable tiling Wayland)
- **Shell:** Noctalia (Quickshell-based), noctalia-qs + noctalia-shell
- **Terminal:** Kitty (primary), Alacritty (secondary)
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

## Dotfiles System

### Repository
- **Location:** `~/.dotfiles/`
- **GitHub:** `git@github.com:Tukki2D/arch_dotfiles.git`
- **Branch:** `main`

### Philosophy
- **Copy-based, not symlink-based** — live configs in `~/.config/` are never moved or touched
- **Deliberate snapshots** — `dotback` is run manually when configs are in a known-good state
- **One backup** — `restore` keeps one prior state in `~/.dotfiles/backups/`, overwritten each run
- **No fish_variables** — excluded from backup, runtime-generated and machine-specific
- **Hardware values never hardcoded by scripts** — output names, IPs, device paths come from
  the user's terminal only

### Scripts
| Script | Location | Purpose |
|--------|----------|---------|
| `common.sh` | `~/.dotfiles/scripts/` | Shared functions, app registry, `-list` table |
| `sync.sh` | `~/.dotfiles/scripts/` | Backup configs `~/.config → ~/.dotfiles` |
| `restore.sh` | `~/.dotfiles/scripts/` | Restore configs + check/install packages |
| `install.sh` | `~/.dotfiles/scripts/` | Fresh install package bootstrapper |
| `clean_cache.sh` | `~/.dotfiles/scripts/` | Clean pacman/paru caches |
| `launcher-toggle.sh` | `~/.dotfiles/scripts/` | Toggle active shell launcher (shell-agnostic) |
| `niri-update.sh` | `~/.dotfiles/scripts/update/` | Niri config update pipeline (planned) |

### Fish Functions
| Command | Purpose |
|---------|---------|
| `dotback -all` | Backup all configs |
| `dotback -app` | Backup one app (e.g. `dotback -niri`) |
| `dotback -list` | Show backup and package status |
| `restore -all` | Check packages + restore all configs |
| `restore -app` | Restore one app |
| `install` | Interactive fresh install |
| `install -all` | Install all packages |
| `install -flag` | Install one category |
| `clean-cache` | Clean pacman/paru caches |
| `dothelp` | Show all custom commands |
| `niri-update` | Run niri-update.sh (planned) |

### App Inventory
| App | Config path | Package(s) |
|-----|-------------|-----------|
| niri | `~/.config/niri/` | `niri` |
| hypr | `~/.config/hypr/` | `hyprland` |
| kitty | `~/.config/kitty/` | `kitty` |
| alacritty | `~/.config/alacritty/` | `alacritty` |
| fastfetch | `~/.config/fastfetch/` | `fastfetch` |
| noctalia | `~/.config/noctalia/` | `noctalia-qs noctalia-shell` |
| fish | `~/.config/fish/` | `fish` |
| starship | `~/.config/starship.toml` | `starship` |
| nvim | `~/.config/nvim/` | `neovim` |
| krita | `~/.config/krita* + .local/share/` | `krita` |
| ckb-next | `~/.config/ckb-next/` | `ckb-next-git` |

### Install Script Categories
| Flag | Packages |
|------|---------|
| `-core` | git, neovim, kitty, alacritty, fish, starship, fastfetch, btop, wl-clipboard, ripgrep, tree, wget, rsync |
| `-browsers` | brave-bin, waterfox-bin, librewolf-bin, firefox, telegram-desktop, discord |
| `-media` | steam, vlc, vlc-plugins-all, heroic-games-launcher-bin, bottles, pavucontrol |
| `-creative` | krita, krita-plugin-gmic, libreoffice-fresh |
| `-hardware` | ckb-next-git, openrgb |
| `-ai` | ollama-rocm |
| `-repos` | Momoisay |
| `-niri` | niri, dunst, swayidle, swaylock, swaybg, xwayland-satellite, xdg-desktop-portal-gnome + Wacom setup |
| `-hyprland` | hyprland, dunst, hyprpolkitagent, xdg-desktop-portal-hyprland, hyprlauncher, hyprpaper |
| `-wacom` | Wacom udev rule + module config (standalone) |
| `-noctalia` | noctalia-qs (first), noctalia-shell |
| `-caelestia` | caelestia-shell, caelestia-cli |

### Package Manager Fallback Chain
`paru → yay → pacman`

### Private Setup (offline, USB only)
- Location: `~/.dotfiles-private/` — never pushed to GitHub
- Contains: fstab mounts, samba credentials, UFW rules, network topology
- Backed up to encrypted USB only

---

## Niri Configuration

### File Structure
```
~/.config/niri/
├── config.kdl      ← upstream default + include lines only, never edited, replaced on updates
├── custom.kdl      ← binds, window-rules, spawns, prefer-no-csd, screenshot-path
├── outputs.kdl     ← monitor output blocks
├── input.kdl       ← full input{} block
└── layout.kdl      ← full layout{} block
```

### config.kdl include block (appended to upstream default)
```kdl
// ── Personal Configuration ─────────────────────────────────────────────────
// Files managed by dotfiles. Uncomment includes as you migrate blocks out.
// See ~/.dotfiles/scripts/update/niri-changes.md after running niri-update.

// Safe to include immediately — does not conflict with defaults:
include "custom.kdl"
include "outputs.kdl"

// Remove layout{} from config.kdl above, then uncomment:
// include "layout.kdl"

// Remove input{} from config.kdl above, then uncomment:
// include "input.kdl"
```

### What gets committed to dotfiles
| File | Committed | Reason |
|------|-----------|--------|
| `custom.kdl` | ✓ | Personal binds and rules |
| `outputs.kdl` | ✓ | Monitor config (may need updating on new hardware) |
| `layout.kdl` | ✓ | Personal layout preferences |
| `input.kdl` | ✓ | Personal input preferences |
| `config.kdl` | ✗ | Regenerated on each update, not personal |
| `*.bak` | ✗ | Gitignored, temporary reference only |
| `reference.kdl` | ✗ | Gitignored, machine state |

### Key Settings
- `focus-follows-mouse max-scroll-amount="0%"` — in `input.kdl`
- `tablet { map-to-output "DP-2" }` — in `input.kdl`
- `spawn-at-startup "xsettingsd"` — in `custom.kdl`
- `spawn-at-startup "xwayland-satellite"` — in `custom.kdl`
- `spawn-sh-at-startup "qs -c noctalia-shell -d"` — in `custom.kdl`

### Key Bindings (custom, in custom.kdl)
| Bind | Action |
|------|--------|
| `Mod+Space` | Toggle Noctalia launcher via `launcher-toggle.sh` |
| `Mod+T` | Kitty terminal |
| `Mod+W` | Waterfox |
| `Mod+E` | Dolphin |
| `Mod+C` | Close window (overrides default center-column) |
| `Mod+M` | Maximize to edges |
| `Mod+O` | Toggle overview |
| `Mod+Tab` | Toggle overview |
| `Mod+Shift+W` | Toggle tabbed display |
| `Super+Alt+L` | Swaylock |

### Launcher Toggle
```bash
# Shell-agnostic — tries noctalia first, falls back to caelestia, then fuzzel
~/.dotfiles/scripts/launcher-toggle.sh
# Uses spawn-sh for $HOME expansion
# Calls: qs ipc -c noctalia-shell call launcher toggle
```

---

## Config Update Strategy

### The Problem
When apps ship new default configs, restoring old snapshots means missing new
options. The include-based separation solves this cleanly.

### Include-based separation (implemented for niri)

**Philosophy:**
- `config.kdl` — upstream default, disposable, replaced freely on updates
- `custom.kdl` — binds, rules, spawns — things that layer safely on top
- `outputs.kdl` — monitor config, owned entirely
- `layout.kdl` — layout block, owned entirely
- `input.kdl` — input block, owned entirely

**On niri update (manual process):**
1. Run `niri-update --update` (planned script)
2. Review `~/.dotfiles/scripts/update/niri-changes.md`
3. Move `layout{}` block from new `config.kdl` to `layout.kdl`
4. Use LLM or manual diff to merge `layout.kdl.bak` values into `layout.kdl`
5. Same for `input.kdl`
6. Run `niri-update --apply` to validate and confirm

**Key insight — Phase 2 (LLM-assisted merging):**
Paste `layout.kdl.bak` and the new upstream `layout{}` block into an LLM conversation.
Ask it to merge your old values into the new block. Review, paste into `layout.kdl`,
validate. This is the right tool for the judgment work.

### niri-update.sh (planned)
```
~/.dotfiles/scripts/update/niri-update.sh

--fresh   (called by install.sh)
  Download default → config.kdl
  Append include lines (safe ones active, owned blocks commented)
  Restore custom.kdl, outputs.kdl from dotfiles repo
  Treat layout.kdl, input.kdl from repo as .bak immediately
  Create blank layout.kdl, input.kdl
  niri validate
  Print instructions for next steps

--update  (called by niri-update Fish function)
  Download new default
  Diff new default vs reference.kdl → write niri-changes.md
  Rename layout.kdl → layout.kdl.bak, input.kdl → input.kdl.bak
  Create blank layout.kdl, input.kdl
  Replace config.kdl with new default + include lines
  Print: review niri-changes.md, move blocks, then run --apply

--apply   (called after user has updated .kdl files)
  Check no managed .kdl files are blank → abort if any are
  niri validate
  If valid: save new default as reference.kdl, done
  If invalid: abort, print error, .bak files are safety net
```

### Apps supporting include separation
| App | Include syntax | Status |
|-----|---------------|--------|
| Niri | `include "custom.kdl"` etc. | ✓ Implemented |
| Kitty | `include custom.conf` | Planned |
| Alacritty | `import: [custom.toml]` | Planned |
| Fish | functions are already separate files | ✓ Done by design |
| Nvim | `:source custom.vim` | Planned |

### Apps without include support
| App | Strategy |
|-----|---------|
| Noctalia | Watch changelogs — JSON format has no include support |
| Krita | Watch changelogs — rc files are stable, low risk |

---

## Known Issues / Limitations

### Noctalia Tray Icon Clicks
- Tray icons (Steam, Discord, Telegram) use StatusNotifierItem protocol
- Left click opens tray menu — cannot be overridden to focus window
- Middle click calls `secondaryActivate()` — app-defined, inconsistent
- Upstream limitation — suggested feature request: configurable middle click
  to focus window by app-id

### Niri Blur (pending next release)
- Blur merged into niri `main` on April 15, 2026 (PR #3483 by YaLTeR)
- Not yet in a release — currently on niri 25.11
- When available, add to `custom.kdl`:
  ```kdl
  window-rule {
      background-effect { blur true }
  }
  layer-rule {
      background-effect { blur true }
  }
  ```
- Xray (blur wallpaper only) is default — most efficient
- Also set `background_opacity` in kitty/alacritty for blur to show through

### Starship
- Installed manually to `/usr/local/bin/starship` — not via pacman
- Available as `paru -S starship` on next fresh install
- `dotback -list` shows `✗` until reinstalled via paru

### OPNSense / Samba
- Samba ports: 445/TCP (required), 137-139 (legacy, optional)
- `cifs-utils` required on Arch client
- Credentials: `/etc/samba/credentials` (chmod 600)
- fstab flag: `_netdev`
- Error 115 (ETIMEDOUT) after OPNSense rule update — check state table and rule order

---

## What's Next

### Immediate
- [ ] Write `niri-update.sh` (--fresh, --update, --apply)
- [ ] Write `niri-update` Fish function
- [ ] Update `restore -niri` to call `niri-update.sh --fresh`
- [ ] Update `install.sh -niri` to call `niri-update.sh --fresh`
- [ ] Add `niri-update` to `dothelp`

### Config separation for other apps
- [ ] Kitty — extract `custom.conf`, implement include
- [ ] Alacritty — extract `custom.toml`, implement import
- [ ] Nvim — extract `custom.vim`, implement source

### When niri blur lands
- [ ] Set `background_opacity 0.85` in kitty config
- [ ] Add blur window-rule and layer-rule to `custom.kdl`
- [ ] `dotback -niri`

### Private setup (USB only)
- [ ] Write `private-setup.sh` for fstab, samba, UFW

### Future
- [ ] git-based dotback workflow (commit on each backup)
- [ ] Consider GNU Stow when setup is stable
