#!/bin/bash
# Auto-deploy JUKE to Vercel via GitHub whenever files change.
# Uses polling — no fswatch or other dependencies required.

DIR="$(dirname "$0")"
cd "$DIR"

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null

echo "[JUKE watcher] Polling for changes every 5 seconds..."

while true; do
  sleep 5

  # Clear stale git locks
  rm -f .git/HEAD.lock .git/index.lock 2>/dev/null

  # Stage everything
  git add -A 2>/dev/null

  # Commit and push only if there's something staged
  if ! git diff --cached --quiet 2>/dev/null; then
    git -c user.email="kylelevier@gmail.com" -c user.name="Kyle" \
      commit -m "chore: auto-deploy $(date '+%H:%M:%S')" 2>/dev/null
    git push origin main 2>/dev/null && \
      echo "[JUKE watcher] $(date '+%H:%M:%S') — pushed to GitHub, Vercel deploying..."
  fi
done
