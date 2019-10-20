test -s ~/.alias && . ~/.alias || true

export PATH=~/.local/bin:$PATH

[[ -s ~/.bashrc_local ]] && . ~/.bashrc_local
