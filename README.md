# Iuno

Personal setup tool for Arch/CachyOS. Installs packages, manages configs, stages changes.

---

## Setup

```bash
git clone git@github.com:Tukki2D/arch_iuno.git ~/iuno
bash ~/iuno/scripts/core/bootstrap-alias.sh
```

---

## Commands

```
iuno --install              interactive setup (distro + DE essentials, then apps)
iuno --install -appname     install one app
iuno --backup  -appname     backup configs
iuno --backup  -all
iuno --restore -appname     restore configs
iuno --restore -all
iuno --stage   -appname     safe staging pipeline
iuno --detect               list apps and status
iuno --clean   [flags]      --temp --bak --cache --full
iuno --log                  action log
iuno --log     -appname
iuno --log     -tail
```

---

## Structure

```
apps/
  _distro/arch/install.sh   one-shot Arch essentials
  _de/niri/install.sh       one-shot Niri essentials
  [appname]/
    info.sh                 name, package, description, config paths
    arch.sh                 install logic
    backup.sh / restore.sh
    stage.sh                optional
    backups/

scripts/core/               iuno machinery
scripts/user/               personal scripts
machines/                   machine-specific values
home/                       dotfiles that live in ~/
```

---

## Full docs

Brain.md
