# dotback — back up configs to ~/.dotfiles
# File: ~/.config/fish/functions/dotback.fish
#
# Usage:
#   dotback -all
#   dotback -niri
#   dotback -niri -fish
#   dotback -list

function dotback
    bash ~/.dotfiles/scripts/sync.sh $argv
end
