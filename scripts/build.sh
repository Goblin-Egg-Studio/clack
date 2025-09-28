#!/bin/bash
set -euo pipefail

echo "🔨 Building Clack Chat App..."

# Build client
echo "📦 Building React client..."
cd client
bun run build
echo "✅ Client built successfully"

echo "🎉 Build complete! Ready to run:"
echo "  1. Start Bun server: bun run server.ts"
echo "  2. Open: http://localhost:3000"


