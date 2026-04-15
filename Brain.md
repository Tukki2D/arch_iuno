# Brain.md — Tyler's Arch/CachyOS Setup Record

## System Overview

- **OS:** CachyOS (Arch-based), CachyOS kernel 6.19.12
- **DE/Compositor:** Niri 25.11 (scrollable tiling Wayland)
- **Shell:** Noctalia (Quickshell-based), noctalia-qs + noctalia-shell
- **Terminal:** Kitty (primary), Alacritty (secondary)
- **Machine hostname:** Arona
- **User:** tyler
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
- Tablet mapped to DP-2 in niri config: `tablet { map-to-output "DP-2" }`
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

### Scripts
| Script | Location | Purpose |
|--------|----------|---------|
| `common.sh` | `~/.dotfiles/scripts/` | Shared functions, app registry, `-list` table |
| `sync.sh` | `~/.dotfiles/scripts/` | Backup configs `~/.config → ~/.dotfiles` |
| `restore.sh` | `~/.dotfiles/scripts/` | Restore configs + check/install packages |
| `install.sh` | `~/.dotfiles/scripts/` | Fresh install package bootstrapper |
| `clean_cache.sh` | `~/.dotfiles/scripts/` | Clean pacman/paru caches |
| `launcher-toggle.sh` | `~/.dotfiles/scripts/` | Toggle active shell launcher (shell-agnostic) |

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

### Key Settings
- `focus-follows-mouse max-scroll-amount="0%"` — focus on hover, no scroll
- `tablet { map-to-output "DP-2" }` — pen maps to Cintiq display
- `spawn-at-startup "xsettingsd"` — GTK icon theme support (replaces dead waybar line)
- `spawn-at-startup "xwayland-satellite"` — X11 app support

### Key Bindings (custom)
| Bind | Action |
|------|--------|
| `Mod+Space` | Toggle Noctalia launcher via `launcher-toggle.sh` |
| `Mod+T` | Kitty terminal |
| `Mod+D` | Fuzzel launcher |
| `Mod+W` | Waterfox |
| `Mod+E` | Dolphin |
| `Super+Alt+L` | Swaylock |

### Launcher Toggle Script
```bash
# Shell-agnostic — tries noctalia first, falls back to caelestia, then fuzzel
~/.dotfiles/scripts/launcher-toggle.sh
# Calls: qs ipc -c noctalia-shell call launcher toggle
```

---

## Known Issues / Limitations

### Noctalia Tray Icon Clicks
- Tray icons (Steam, Discord, Telegram) use StatusNotifierItem protocol
- Left click opens tray menu — cannot be overridden to focus window
- Middle click calls `secondaryActivate()` — app-defined, inconsistent
- This is an upstream limitation, not configurable from niri or noctalia config
- Suggested upstream feature request: configurable middle click to focus window by app-id

### Niri Blur (pending)
- Blur merged into niri `main` on April 15, 2026 (PR #3483 by YaLTeR)
- **Not yet in a release** — currently on niri 25.11, blur requires next release
- Config syntax when available:
  ```kdl
  window-rule {
      background-effect {
          blur true
      }
  }
  layer-rule {
      background-effect {
          blur true
      }
  }
  ```
- Xray (blur wallpaper only) is the default — most efficient
- Non-xray (blur everything below) is experimental, has animation glitches
- Kitty and Quickshell have PRs in progress for `ext-background-effect` protocol support

### Starship
- Currently installed manually to `/usr/local/bin/starship` (not via pacman)
- Available in `extra/` repo as `starship 1.24.2-2`
- On next fresh install: `paru -S starship`
- `dotback -list` will show `✗` for starship until reinstalled via paru

### OPNSense / Samba
- Samba share mounts require ports 445/TCP (modern), 137-139 (legacy NetBIOS)
- `cifs-utils` required on Arch client
- Credentials stored in `/etc/samba/credentials` (chmod 600)
- fstab uses `_netdev` flag for network mounts
- Current issue: error 115 (ETIMEDOUT) after OPNSense rule update — diagnosed as
  possible stale state table or rule ordering issue

---

## Config File Update Strategy (planned)

### The Problem
Dotfile backups are snapshots. When apps ship new default configs, restoring old
snapshots means missing new options or potentially conflicting with new formats.

### Solution: Include-based separation (Option 5)

Split configs into two files per app:
1. **Upstream default** — never edited, never backed up, replaced freely on updates
2. **Personal override** — only your intentional changes, small, backed up in dotfiles

Apps that support this:
| App | Include syntax | Personal file |
|-----|---------------|---------------|
| Niri | `include "tyler.kdl"` in config.kdl | `tyler.kdl` |
| Kitty | `include tyler.conf` in kitty.conf | `tyler.conf` |
| Alacritty | `import: [tyler.toml]` in alacritty.toml | `tyler.toml` |
| Fish | already done — functions are separate files | no change needed |
| Nvim | `:source tyler.vim` in init.vim | `tyler.vim` |

Apps without include support:
| App | Strategy |
|-----|---------|
| Noctalia | Option 1 — watch changelogs on updates |
| Krita | Option 1 — rc files are stable, low risk |

### How niri include works
```
niri reads config.kdl (upstream defaults, never touched)
    └── include "tyler.kdl" at the bottom
            └── tyler.kdl contains ONLY your personal settings
```

For sections that cannot be repeated (output, input, layout etc.) — move your
entire version to tyler.kdl and remove it from config.kdl entirely.

For sections that can be repeated (window-rule, binds etc.) — yours in tyler.kdl
simply add to or override what config.kdl sets.

`tyler.kdl` becomes a clear, readable record of every intentional decision you've made.
`config.kdl` is disposable — replace it with upstream on every update, your settings survive.

---

## What's Next

- [ ] Implement include split for niri (`tyler.kdl`)
- [ ] Implement include split for kitty (`tyler.conf`)
- [ ] Implement include split for alacritty (`tyler.toml`)
- [ ] Update dotfiles sync to back up personal files only
- [ ] Update dotback -list to reflect new file structure
- [ ] Enable blur once niri next release lands on CachyOS
- [ ] Set background_opacity in kitty/alacritty for blur to show
- [ ] Private setup script (USB only): fstab, samba, UFW
- [ ] Future: switch to git-based dotback workflow (commit on each backup)
- [ ] Future: switch to GNU Stow if symlink approach preferred later
