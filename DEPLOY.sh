#!/bin/bash

# ERPX-AI Automatic Deployment Script
# Run this script from your computer to deploy everything

echo "🚀 ERPX-AI Deployment Starting..."
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the erpx-ai project directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build project
echo "🔨 Building project..."
pnpm build

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git..."
    git init
    git config user.email "deploy@erpx-ai.com"
    git config user.name "ERPX Deployment"
fi

# Add all files
echo "📝 Adding files to Git..."
git add -A

# Commit
echo "💾 Creating commit..."
git commit -m "Deploy ERPX-AI with company registration system" || echo "No changes to commit"

# Add remote if not exists
if ! git remote | grep -q origin; then
    echo "🔗 Adding GitHub remote..."
    git remote add origin https://github.com/isamiciari-cmd/erpx-ai.git
fi

# Rename branch to main
git branch -M main

echo ""
echo "✅ Project is ready to deploy!"
echo ""
echo "🔐 Now run this command and enter your GitHub credentials:"
echo ""
echo "   git push -u origin main --force"
echo ""
echo "Username: isamiciari-cmd"
echo "Password: [Your GitHub Personal Access Token]"
echo ""
echo "Get token from: https://github.com/settings/tokens"
echo ""
