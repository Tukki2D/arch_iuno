# niri-tool — niri configuration update tool
# File: ~/.config/fish/functions/niri-tool.fish
#
# Usage:
#   niri-tool --backup      Back up all live config files to .bak
#   niri-tool --build       Scaffold staging, copy live files in
#   niri-tool --diff        Show differences between staging and live (optional)
#   niri-tool --validate    Check staging, promote to live
#   niri-tool --rollback    Restore all live files from .bak (all or nothing)
#   niri-tool --push        Save to dotfiles and push to GitHub
#   niri-tool --help        Show usage

function niri-tool
    bash ~/.dotfiles/scripts/update/niri-tool.sh $argv
end
