#!/bin/bash
set -euo pipefail

echo "🚀 Starting Clack Chat development environment..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
./scripts/kill.sh

# Build client
echo "📦 Building React client..."
cd client
bun run build
cd ..
echo "✅ Client built"

# Start Bun server
echo "🌐 Starting Bun server..."
bun run server.ts &
BUN_PID=$!
echo "✅ Bun server started (PID: $BUN_PID)"

echo ""
echo "🎉 Development environment ready!"
echo "📱 Open: http://localhost:3000"
echo "📊 SQLite database: chat.db"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "🛑 Stopping services..."; kill $BUN_PID 2>/dev/null || true; exit 0' INT
wait