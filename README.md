# dotfiles

Personal config backup and restore system for Arch/CachyOS.
Currently running: Niri compositor + Noctalia shell.

## How it works

Configs are copied deliberately into this repo when in a known-good state.
Nothing is symlinked — your live configs in ~/.config are never moved or touched
by the backup process. You are always in control of when a snapshot is taken.

```
dotback -all        # copy working configs → ~/.dotfiles/
git add .
git commit -m "what changed and why"
git push            # safe offsite copy on GitHub
```

On a fresh install or after breaking something:
```
git clone git@github.com:yourname/dotfiles.git ~/.dotfiles
restore -all        # checks packages, restores configs → ~/.config/
```

## Commands

### Backup
```
dotback -all          back up everything
dotback -niri         back up one app
dotback -niri -fish   back up multiple apps
dotback -list         show backup and package status
```

### Restore
```
restore -all          check packages + restore everything
restore -niri         check packages + restore one app
restore -list         show backup and package status
```

### Utilities
```
clean-cache           clean pacman and paru package caches
```

## App inventory

| App       | Config path                        | Package(s)                    |
|-----------|------------------------------------|-------------------------------|
| niri      | ~/.config/niri/                    | niri                          |
| kitty     | ~/.config/kitty/                   | kitty                         |
| alacritty | ~/.config/alacritty/               | alacritty                     |
| fastfetch | ~/.config/fastfetch/               | fastfetch                     |
| noctalia  | ~/.config/noctalia/                | noctalia-qs  noctalia-shell   |
| fish      | ~/.config/fish/ (no fish_variables)| fish                          |
| starship  | ~/.config/starship.toml            | starship (extra/ repo)        |
| nvim      | ~/.config/nvim/                    | neovim                        |
| krita     | ~/.config/krita* + .local/share/   | krita                         |

## Repo structure

```
~/.dotfiles/
├── README.md
├── scripts/
│   ├── common.sh        shared functions, app registry, -list
│   ├── sync.sh          backup: ~/.config → ~/.dotfiles
│   ├── restore.sh       restore: ~/.dotfiles → ~/.config
│   └── clean_cache.sh   cache cleaning
├── niri/.config/niri/
├── kitty/.config/kitty/
├── alacritty/.config/alacritty/
├── fastfetch/.config/fastfetch/
├── noctalia/.config/noctalia/
├── fish/.config/fish/
├── starship/.config/starship.toml
├── nvim/.config/nvim/
└── krita/
    ├── .config/
    │   ├── kritarc
    │   ├── kritadisplayrc
    │   └── kritashortcutsrc
    └── .local/share/krita/
```

## Backups

When restore runs and a config already exists at the target path, it is moved
to ~/.dotfiles/backups/ before restoring. One backup is kept per app —
it is overwritten on the next restore run.

## Notes

- **fish_variables** is never backed up or restored — it is runtime generated
  by Fish and is machine specific.
- **starship** — currently installed manually to /usr/local/bin/starship.
  On next fresh install use: paru -S starship (available in extra/ repo).
- **KDE** configs excluded — use KDE's built-in import/export instead.
- **Wacom Cintiq Pro 24** requires two system files outside this repo:
    /etc/udev/rules.d/99-wacom-cintiq-pro24.rules
    /etc/modules-load.d/wacom.conf
  Recreate these manually after a fresh install.

## Adding a new app

1. Add the app name to APP_NAMES in scripts/common.sh
2. Add its config check path to APP_CONFIG_CHECK
3. Add its package(s) to APP_PACKAGES
4. Add a backup_appname() function to sync.sh
5. Add a restore_appname() function to restore.sh
6. Add the flag to the case statement and -all block in both scripts
7. Run dotback -appname to test
# arch_iuno
