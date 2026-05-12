#!/bin/bash
# apps/niri/info.sh — niri app manifest
# Sourced by arch.sh, backup.sh, restore.sh

NAME="niri"
PACKAGE="niri"
DESCRIPTION="A scrollable-tiling Wayland compositor. Windows tile horizontally."
CONFIG_PATHS=(
    "$HOME/.config/niri/config.kdl"
    "$HOME/.config/niri/custom.kdl"
    "$HOME/.config/niri/outputs.kdl"
    "$HOME/.config/niri/input.kdl"
    "$HOME/.config/niri/layout.kdl"
    "$HOME/.config/niri/animations.kdl"
)

