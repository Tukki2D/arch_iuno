# niri-install.sh — Specification

## Brief

`niri-install.sh` handles everything needed to get niri running on a fresh system.
It installs packages, sets up hardware, calls `iuno --detect` so the user sees what
is installed and what tools are available, then offers to run `niri-tool --stage`.
It never touches `~/.config/`. Config decisions are made separately by the user.

---

## Guiding Principles

- **Packages only.** Never touches `~/.config/` or any user config.
- **Sources install.sh.** Reuses existing functions — no duplication.
- **Calls `iuno --detect`.** Never hardcodes a summary. Detect is always current.
- **Offers `niri-tool --stage`.** User decides when to set up the config pipeline.
- **No assumptions about hardware.** Never writes output connector names or device paths.

---

## How It Gets Called

```
install.sh -niri
    └── bash "$SCRIPTS_DIR/niri/niri-install.sh"

install.sh interactive → select_de() → choice 1
    └── bash "$SCRIPTS_DIR/niri/niri-install.sh"

or directly:
    bash ~/iuno/scripts/niri/niri-install.sh
```

---

## What Changed in install.sh

The following changes were made to `install.sh` to support this routing:

1. Removed `DOTFILES="$HOME/iuno"` — unused variable
2. Removed `setup_wacom` auto-call from `install_niri()` — now prompted in niri-install.sh
3. Removed `prompt_restore()` function — install never deploys configs
4. Removed `prompt_restore` calls from interactive mode and flag mode end
5. Updated `select_de()` choice 1 to call `niri-install.sh` instead of `install_niri()`
6. Updated `-niri` flag dispatch to call `niri-install.sh` instead of `install_niri()`

`install_niri()`, `setup_wacom()`, `select_shell()` remain in `install.sh` and are
sourced by `niri-install.sh`.

---

## Pipeline

```
1. Source install.sh
       gives access to: install_niri(), setup_wacom(), select_shell()
       gives access to: common.sh helpers via install.sh's source

2. Install niri packages
       calls: install_niri()
       packages: niri, dunst, swayidle, swaylock, swaybg,
                 xwayland-satellite, xdg-desktop-portal-gnome

3. Install shell
       calls: select_shell()
       options: Noctalia, Caelestia, Both, None

4. Wacom setup
       prompts: "Set up Wacom Cintiq Pro 24? [y/N]"
       on y: calls setup_wacom()
       on n: skips silently

5. Run iuno --detect
       shows installed apps and available tools
       if iuno.sh not yet built: falls back to dotback -list with a notice

6. Offer niri-tool --stage
       "Run niri-tool --stage now to set up your config pipeline? [y/N]"
       on y: calls niri-tool --stage
       on n: prints reminder

7. Print next steps
```

---

## Next Steps Output

```
  Next steps:

  1. Log into niri
     niri-session

  2. Set up your config pipeline (if you skipped it above)
     niri-tool --stage

  3. Restore your backed-up configs (if migrating from another machine)
     iuno --restore -niri

  4. Verify your monitor outputs
     niri msg outputs

  5. Fill outputs.kdl with your connector names
     then uncomment include "outputs.kdl" in config.kdl
```

---

## What It Does Not Do

- Does not clone the iuno repo (assumed already done)
- Does not restore configs from the iuno repo
- Does not write anything to `~/.config/`
- Does not make assumptions about monitor hardware
- Does not install hyprland or other DEs

---

## Dependencies

```
~/iuno/scripts/install.sh          sourced for install_niri(), setup_wacom(), select_shell()
~/iuno/scripts/common.sh           sourced via install.sh
~/iuno/scripts/niri/niri-tool.sh   called if user opts into --build
~/iuno/scripts/iuno.sh             called for --detect (planned, falls back to dotback -list)
```
