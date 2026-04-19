# Iuno

Personal Linux setup tool. Handles installs, config staging, and backups.
Built for Arch/CachyOS, designed to grow with its author.

This is not a product. It is a personal tool and a learning project.
If something is broken it means the author hasn't fixed it yet.

---

## Setup

Clone and run bootstrap to register the iuno alias for your shell:

```bash
git clone git@github.com:Tukki2D/arch_iuno.git ~/iuno
bash ~/iuno/scripts/core/bootstrap-alias.sh
```

---

## Commands

```
iuno --install  [-app]    install an app from apps/
iuno --backup   [-app]    copy live configs into iuno
iuno --restore  [-app]    copy iuno configs to live locations
iuno --stage    [-app]    run the staging pipeline for an app
iuno --detect             list managed apps and their status
iuno --clean              clean /tmp/iuno and package cache
iuno --log                show the iuno action log
```

---

## Structure

```
~/iuno/
├── apps/              one directory per managed app
├── machines/          machine-specific values
├── scripts/
│   ├── core/          iuno's own machinery
│   └── user/          personal scripts
└── home/              stray dotfiles that live in ~/
```

Each app directory contains its own install, backup, restore, and stage scripts.
Adding a new app means creating a new directory. Nothing else changes.

---

## Current Machine

Arona — CachyOS, Niri 25.11, Zsh, SDDM

---

## Brain.md

Full system record, architecture notes, and session history lives in Brain.md.
That's the real documentation. This file is just the entry point.
