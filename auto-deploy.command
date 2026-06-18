#!/bin/bash
# Juke Auto-Deploy — double-click to start, leave running in background
cd "$(dirname "$0")"
echo "🚀 Juke auto-deploy watcher running..."
echo "   Leave this window open. It pushes automatically when Claude makes changes."
echo ""
LAST=$(cat .git/refs/heads/main 2>/dev/null)
while true; do
  CURRENT=$(cat .git/refs/heads/main 2>/dev/null)
  if [ -n "$CURRENT" ] && [ "$CURRENT" != "$LAST" ]; then
    echo "📦 $(date '+%H:%M:%S') — New commit detected, pushing to GitHub..."
    git push && echo "✅ Deployed to shejukes.com" || echo "❌ Push failed — check your internet connection"
    LAST=$CURRENT
  fi
  sleep 3
done
