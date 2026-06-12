#!/bin/bash

# Load full user PATH (picks up nvm, homebrew, etc.)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null
[ -f "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh" 2>/dev/null && nvm use default 2>/dev/null

cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  JUKE — Deploy to Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clear any stale git lock
rm -f .git/index.lock 2>/dev/null

# Init git if needed
if [ ! -d ".git" ]; then
  echo "→ Initializing git repo..."
  git init
  git checkout -b main 2>/dev/null || true
  git config user.email "kylelevier@gmail.com"
  git config user.name "Kyle Levier"
fi

echo "→ Staging files..."
git add .
git commit -m "feat: JUKE prototype" --allow-empty 2>/dev/null

echo ""

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
  echo "→ Installing Vercel CLI..."
  npm install -g vercel
  echo ""
fi

echo "→ Deploying to Vercel (valorgirlsflag team)..."
echo "   A browser window will open to log in if needed."
echo ""
vercel --yes --scope valorgirlsflag

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done! Copy the URL above."
echo "  Press Enter to close."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read
