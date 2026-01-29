#!/bin/bash
# Comprehensive release script for CACE v1.1.0

set -e

echo "🚀 CACE Release Script v1.1.0"
echo "==============================="
echo ""

# Step 1: Clean build
echo "📦 Step 1: Clean build"
rm -rf dist/
npm run build

# Step 2: Run all tests
echo "🧪 Step 2: Running all tests"
bun test

# Step 3: Check for TypeScript errors
echo "🔍 Step 3: Type checking"
npm run typecheck

# Step 4: Lint
echo "🧹 Step 4: Linting"
npm run lint || echo "⚠️ Linting issues found (non-blocking)"

# Step 5: Version check
echo "📋 Step 5: Version check"
node -e "console.log('Version:', require('./package.json').version)"

# Step 6: Pack test
echo "📦 Step 6: Testing package"
npm pack --dry-run

echo ""
echo "✅ Release preparation complete!"
echo ""
echo "To publish, run:"
echo "  npm publish"
