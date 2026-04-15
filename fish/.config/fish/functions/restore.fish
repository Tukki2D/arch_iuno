# restore — restore configs from ~/.dotfiles to ~/.config
# File: ~/.config/fish/functions/restore.fish
#
# Usage:
#   restore -all
#   restore -niri
#   restore -niri -fish
#   restore -list

function restore
    bash ~/.dotfiles/scripts/restore.sh $argv
end
