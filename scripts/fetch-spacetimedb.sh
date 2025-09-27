#!/bin/bash
set -euo pipefail

echo "Installing SpaceTimeDB via official installer..."
curl -sSf https://install.spacetimedb.com | sh

echo "Attempting to locate 'spacetime' binary..."
BIN_PATH="$(command -v spacetime || true)"
if [[ -z "$BIN_PATH" ]]; then
  echo "Installation completed but 'spacetime' not found in PATH. Ensure your shell PATH includes the installer output directory (e.g. ~/.local/bin)."
  exit 1
fi

echo "Found spacetime at: $BIN_PATH"
mkdir -p bin
ln -sf "$BIN_PATH" bin/spacetime
echo "Linked spacetime to ./bin/spacetime"