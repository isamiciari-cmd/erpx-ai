#!/bin/bash

# ERPX-AI Deployment Script
# This script builds and prepares the project for deployment

echo "🚀 Building ERPX-AI..."
pnpm build

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Your deployment files are in the 'dist' folder"
echo ""
echo "To deploy to Vercel:"
echo "1. Go to https://vercel.com/new"
echo "2. Drag and drop the 'dist' folder"
echo "3. Click 'Deploy'"
echo ""
echo "OR connect to Git:"
echo "1. Create a GitHub repository"
echo "2. Run: git remote add origin YOUR_REPO_URL"
echo "3. Run: git push -u origin main"
echo "4. Vercel will auto-deploy"
echo ""
