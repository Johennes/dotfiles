# Homebrew
export HOMEBREW_PREFIX="/usr/local";
export HOMEBREW_CELLAR="${HOMEBREW_PREFIX}/Cellar";
export HOMEBREW_REPOSITORY="${HOMEBREW_PREFIX}";
export PATH="${HOMEBREW_PREFIX}/bin:${HOMEBREW_PREFIX}/sbin${PATH+:$PATH}";
export MANPATH="${HOMEBREW_PREFIX}/share/man${MANPATH+:$MANPATH}:";
export INFOPATH="${HOMEBREW_PREFIX}/share/info:${INFOPATH:-}";

# Ruby (via brew)
#export PATH="${HOMEBREW_PREFIX}/opt/ruby/bin:$PATH"
#export PATH="${HOMEBREW_PREFIX}/lib/ruby/gems/3.0.0/bin:$PATH"

# Ruby (system)
export GEM_HOME=$HOME/.gem
export PATH=$GEM_HOME/bin:$PATH

# Python
export PATH=$(python3 -c "import site; print(site.USER_BASE)")/bin:$PATH

# VSCode
export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"

# Bash completion
[[ -r "/usr/local/etc/profile.d/bash_completion.sh" ]] && . "/usr/local/etc/profile.d/bash_completion.sh"
for file in ~/.bash_completion.d/*; do
    [[ -f "${file}" ]] && . "${file}"
done

# User binaries
export PATH=~/.local/bin:$PATH

# Source private file
[[ -f ~/.bash_profile_local ]] && . ~/.bash_profile_local
