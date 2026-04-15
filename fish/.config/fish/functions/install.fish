# install — run the fresh install script
# File: ~/.config/fish/functions/install.fish
#
# Usage:
#   install                  interactive mode
#   install -all
#   install -core -browsers
#   install -niri -noctalia

function install
    bash ~/.dotfiles/scripts/install.sh $argv
end
