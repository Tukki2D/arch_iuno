# iuno

Personal config management and install tooling for Arch/CachyOS.
Currently running: Niri compositor + Noctalia shell + Zsh.

## Getting started

The first thing to do on a fresh clone is set up the `iuno` alias for your shell:

```bash
bash ~/iuno/scripts/bootstrap-alias.sh
```

This detects your shell (fish, bash, zsh) and adds the `iuno` alias to the correct
config file. After that, `iuno --help` is your entry point for everything.

---

## How it works

Configs are copied deliberately into this repo when in a known-good state.
Nothing is symlinked — your live configs in `~/.config/` are never moved or touched
by the backup process. You are always in control of when a snapshot is taken.

```bash
iuno --backup -all  # copy working configs → ~/iuno/
git add .
git commit -m "what changed and why"
git push            # safe offsite copy on GitHub
```

On a fresh install or after breaking something:

```bash
git clone git@github.com:Tukki2D/arch_iuno.git ~/iuno
bash ~/iuno/scripts/bootstrap-alias.sh
iuno --install      # install packages
iuno --restore      # restore configs → ~/.config/
```

---

## Commands

### iuno
```
-i, --install  [-flag]   install packages
-b, --backup   [-app]    back up configs to ~/iuno/
-r, --restore  [-app]    restore configs from ~/iuno/ to ~/.config/
-c, --clean  [--temp|--bak|--cache|--full]   clean staging, .bak files, or package cache
-d, --detect             show installed apps and available tools
-h, --help               show all commands and available tools
```

### niri-tool
```
-b, --bak       back up all live niri config files to .bak
-s, --stage     scaffold staging at /tmp/iuno/niri/
-d, --diff      show differences between staging and live (optional)
-f, --finalize  check staging, promote to live
-r, --rollback  restore all live files from .bak (all or nothing)
-p, --push      save to ~/iuno and push to GitHub
-h, --help      show usage
```

---

## App inventory

| App | Config path | Package(s) | Tool |
|-----|-------------|-----------|------|
| niri | `~/.config/niri/` | `niri` | `niri-tool` |
| hypr | `~/.config/hypr/` | `hyprland` | ✓ include split |
| kitty | `~/.config/kitty/` | `kitty` | ✓ include split |
| alacritty | `~/.config/alacritty/` | `alacritty` | ✓ single file |
| fastfetch | `~/.config/fastfetch/` | `fastfetch` | — |
| noctalia | `~/.config/noctalia/` | `noctalia-qs noctalia-shell` | — |
| fish | `~/.config/fish/` (no fish_variables) | `fish` | — |
| starship | `~/.config/starship.toml` | `starship` (extra/ repo) | — |
| nvim | `~/.config/nvim/` | `neovim` | ✓ single file |
| krita | `~/.config/krita* + .local/share/` | `krita` | — |
| ckb-next | `~/.config/ckb-next/` | `ckb-next-git` | — |

---

## Repo structure

```
~/iuno/
├── Brain.md                           source of truth and session record
├── README.md                          this file
├── scripts/
│   ├── common.sh                      shared functions, app registry
│   ├── sync.sh                        backup: ~/.config → ~/iuno
│   ├── restore.sh                     restore: ~/iuno → ~/.config
│   ├── install.sh                     package bootstrapper
│   ├── clean.sh                       clean staging and .bak files
│   ├── launcher-toggle.sh             shell-agnostic launcher toggle
│   ├── iuno.sh                        top-level router
│   ├── bootstrap-alias.sh             shell alias installer
│   ├── check-aur.sh                   verify AUR helper, install paru if needed
│   ├── niri/
│   │   ├── niri-tool.sh               niri config update pipeline
│   │   └── niri-install.sh            niri fresh install
│   ├── kitty/
│   │   └── kitty-install.sh           kitty fresh install
│   ├── alacritty/
│   │   └── alacritty-install.sh       alacritty fresh install
│   └── nvim/
│       └── nvim-install.sh            neovim fresh install
├── fish/.config/fish/functions/
├── niri/.config/niri/
├── kitty/.config/kitty/
├── alacritty/.config/alacritty/
├── hypr/.config/hypr/
├── ckb-next/.config/ckb-next/
├── fastfetch/.config/fastfetch/
├── noctalia/.config/noctalia/
├── nvim/.config/nvim/
├── starship/.config/
├── home/                              stray dotfiles that live in ~/
│   └── .zshrc
├── bin/                               personal utility scripts
└── krita/
```

---

## Backups

When restore runs and a config already exists at the target path, it is moved
to `~/iuno/backups/` before restoring. One backup is kept per app —
it is overwritten on the next restore run.

---

## Notes

- **starship** — currently installed manually to `/usr/local/bin/starship`.
  On next fresh install use: `paru -S starship` (available in extra/ repo).
- **zsh** — `.zshrc` backed up in `home/.zshrc`. Aliases use `$HOME` not hardcoded paths.
- **KDE** configs excluded — use KDE's built-in import/export instead.
- **Wacom Cintiq Pro 24** requires two system files outside this repo:
  ```
  /etc/udev/rules.d/99-wacom-cintiq-pro24.rules
  /etc/modules-load.d/wacom.conf
  ```
  Handled automatically by `install.sh -wacom` or `install.sh -niri`.

---

## Adding a new app

1. Add the app name to `APP_NAMES` in `scripts/common.sh`
2. Add its config check path to `APP_CONFIG_CHECK`
3. Add its package(s) to `APP_PACKAGES`
4. Add a `backup_appname()` function to `sync.sh`
5. Add a `restore_appname()` function to `restore.sh`
6. Add the flag to the case statement and `-all` block in both scripts
7. Run `iuno --backup -appname` to test
