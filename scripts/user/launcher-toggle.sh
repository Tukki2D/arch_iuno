#!/bin/bash
# launcher-toggle.sh — toggle the active shell's launcher
# Falls back to fuzzel if no supported shell is detected

if qs ipc -c noctalia-shell call launcher toggle 2>/dev/null; then
    exit 0
elif qs ipc -c caelestia-shell call launcher toggle 2>/dev/null; then
    exit 0
elif command -v fuzzel &>/dev/null; then
    fuzzel
fi
