# dotback — back up configs to ~/iuno
# File: ~/.config/fish/functions/dotback.fish
#
# Usage:
#   dotback -all
#   dotback -niri
#   dotback -niri -fish
#   dotback -list

function dotback
    bash ~/iuno/scripts/sync.sh $argv
end
