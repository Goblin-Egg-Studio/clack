#!/bin/bash
set -euo pipefail

echo "🧹 Killing processes on port 3000..."

# Kill processes on port 3000
echo "Killing processes on port 3000..."
lsof -i :3000 -t | xargs -r kill -9 || true

# Kill any remaining bun server processes
echo "Killing any remaining bun server processes..."
pkill -f "bun run server.ts" || true

# Give processes a moment to die
sleep 2

echo "✅ All processes killed"