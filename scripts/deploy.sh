#!/bin/bash

# W3-Energy Deployment Script
# This script builds and deploys the application

set -e

echo "🚀 Starting W3-Energy deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run type checking
echo "🔍 Running type checks..."
npm run type-check

# Run linting
echo "🧹 Running ESLint..."
npm run lint

# Build the application
echo "🏗️  Building application..."
npm run build

# Optional: Run tests if they exist
if [ -f "jest.config.js" ] || [ -f "vitest.config.ts" ]; then
    echo "🧪 Running tests..."
    npm test
fi

echo "✅ Build completed successfully!"

# If deploying to Vercel
if command -v vercel &> /dev/null; then
    echo "🌐 Deploying to Vercel..."
    vercel --prod
else
    echo "💡 To deploy to Vercel, install the Vercel CLI: npm i -g vercel"
fi

echo "🎉 Deployment process completed!"