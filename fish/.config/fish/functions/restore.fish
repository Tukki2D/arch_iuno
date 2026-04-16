# restore — restore configs from ~/iuno to ~/.config
# File: ~/.config/fish/functions/restore.fish
#
# Usage:
#   restore -all
#   restore -niri
#   restore -niri -fish
#   restore -list

function restore
    bash ~/iuno/scripts/restore.sh $argv
end
