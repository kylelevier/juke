#!/bin/bash

# Load full user PATH (picks up Node from standard install locations)
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null

cd "$(dirname "$0")"
rm -f .git/index.lock 2>/dev/null

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  JUKE — Deploy to Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "→ Node $(node -v) / npm $(npm -v)"
echo ""

# Install Vercel CLI if needed
if ! command -v vercel &> /dev/null; then
  echo "→ Installing Vercel CLI..."
  npm install -g vercel
  echo ""
fi

# Stage any changes
git add . 2>/dev/null
git diff --cached --quiet 2>/dev/null || git commit -m "chore: update" 2>/dev/null

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
