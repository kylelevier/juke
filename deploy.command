#!/bin/bash

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null

cd "$(dirname "$0")"
rm -f .git/index.lock 2>/dev/null

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  JUKE — Deploy to Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

git add . 2>/dev/null
git diff --cached --quiet 2>/dev/null || git commit -m "chore: update" 2>/dev/null

echo "→ Deploying..."
npx vercel@latest --yes

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done! Copy the URL above."
echo "  Press Enter to close."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read
