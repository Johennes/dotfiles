[[ -s "$HOME/.profile" ]] && . "$HOME/.profile" # Load the default .profile

alias fork="/Applications/Fork.app/Contents/MacOS/Fork > /dev/null 2>&1 &"

export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

export PATH=~/.local/bin:${PATH}
export PATH=$(python3 -c "import site; print(site.USER_BASE)")/bin:${PATH}
export PATH=${PATH}:/usr/local/go/bin

export PIPENV_VENV_IN_PROJECT=1
export RUBYOPT='-W0'

powerline_root=$(pip3 show powerline-status | grep 'Location:' | sed 's/Location: //')
if [[ ! -z ${powerline_root} ]]; then
    powerline-daemon -q
    POWERLINE_BASH_CONTINUATION=1
    POWERLINE_BASH_SELECT=1
    . ${powerline_root}/powerline/bindings/bash/powerline.sh
fi

for file in ~/.bash_completion.d/*; do
    [[ -f "${file}" ]] && . "${file}"
done

[[ -r "/usr/local/etc/profile.d/bash_completion.sh" ]] && . "/usr/local/etc/profile.d/bash_completion.sh"

[[ -f ~/.bash_profile_local ]] && . ~/.bash_profile_local

eval "$(rbenv init -)"
