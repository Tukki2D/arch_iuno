source /usr/share/cachyos-fish-config/cachyos-config.fish

# overwrite greeting
# potentially disabling fastfetch
#function fish_greeting
#    # smth smth
#end
#
starship init fish | source

# iuno — config management tool
alias iuno "bash /home/tyler/iuno/scripts/iuno.sh"
