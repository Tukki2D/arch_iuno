#!/bin/bash

sudo rm -rf /var/cache/pacman/pkg/download-*

paru -Scc

sudo pacman -Scc
