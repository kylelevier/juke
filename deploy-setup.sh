#!/bin/bash
# JUKE — one-time GitHub + Vercel setup
# Run this from your JUKE folder: bash deploy-setup.sh

set -e

echo "→ Initializing git repo..."
git init
git add .
git commit -m "feat: initial JUKE prototype"

echo ""
echo "→ Done! Next steps:"
echo ""
echo "1. Create a new GitHub repo at https://github.com/new"
echo "   - Name it: juke"
echo "   - Set it to Private or Public (your choice)"
echo "   - Do NOT initialize with README"
echo ""
echo "2. Copy the two commands GitHub shows you (they look like this):"
echo "   git remote add origin https://github.com/YOUR_USERNAME/juke.git"
echo "   git push -u origin main"
echo ""
echo "3. Paste and run those two commands here in Terminal"
echo ""
echo "4. Go to https://vercel.com/new"
echo "   - Import your 'juke' GitHub repo"
echo "   - Framework: Other (or Static)"
echo "   - Click Deploy"
echo ""
echo "   Vercel will give you a URL like: https://juke-xyz.vercel.app"
