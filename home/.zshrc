# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
#if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
#  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
#fi

#CachyOS defaults
#source /usr/share/cachyos-zsh-config/cachyos-config.zsh

### ---- OVERRIDDING CACHYOS ---- ###
# Zsh plugins
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
source /usr/share/zsh/plugins/zsh-history-substring-search/zsh-history-substring-search.zsh

# Oh-my-zsh
export ZSH="/usr/share/oh-my-zsh"
plugins=(git fzf extract)
source $ZSH/oh-my-zsh.sh

# History
export HISTCONTROL=ignoreboth
export HISTORY_IGNORE="(&|[bf]g|c|clear|history|exit|q|pwd|* --help)"

# FZF
export FZF_BASE=/usr/share/fzf


# iuno — config management tool
alias iuno="bash $HOME/iuno/scripts/iuno.sh"

# niri-tool — added by bootstrap-alias.sh
alias niri-tool="bash $HOME/iuno/scripts/niri/niri-tool.sh"

prompt_powerlevel10k_setup() { :; }
eval "$(starship init zsh)"

