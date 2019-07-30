[[ -s "$HOME/.profile" ]] && source "$HOME/.profile" # Load the default .profile

export R9SRC=~/r9/git

export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

export PATH=~/Sync/KAYAK/Tools:${PATH}
export PATH=$(python3 -c "import site; print(site.USER_BASE)")/bin:${PATH}
export PATH=$(ruby -e "puts Gem.user_dir")/bin:${PATH}

export PIPENV_VENV_IN_PROJECT=1
