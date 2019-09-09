[[ -s "$HOME/.profile" ]] && . "$HOME/.profile" # Load the default .profile

export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

export PATH=~/.local/bin:${PATH}
export PATH="/usr/local/opt/ruby/bin:$PATH"
export PATH=$(python3 -c "import site; print(site.USER_BASE)")/bin:${PATH}
export PATH=$(ruby -e "puts Gem.user_dir")/bin:${PATH}

export PIPENV_VENV_IN_PROJECT=1

for file in ~/.bash_completion.d/*; do
    [[ -f "${file}" ]] && . "${file}"
done

[[ -f ~/.bash_profile_local ]] && . ~/.bash_profile_local
