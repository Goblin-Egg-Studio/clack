#!/bin/bash
set -euo pipefail

echo "🚀 Setting up Clack Chat on Linode server (no SSH/firewall changes)..."

# Colors
BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log(){ echo -e "${BLUE}[INFO]${NC} $1"; }
ok(){ echo -e "${GREEN}[OK]${NC} $1"; }
fail(){ echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Update packages
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Required packages (no SSH/firewall tools changed here)
REQ="curl git nginx certbot python3-certbot-nginx unzip"
for p in $REQ; do
  if ! dpkg -l | grep -q "^ii  $p "; then
    log "Installing $p"; sudo apt install -y "$p"
  else
    log "$p already installed"
  fi
done

# Use current user (no additional user creation)
CURRENT_USER=$(whoami)
log "Using current user: $CURRENT_USER"

# Install Bun for current user
if ! command -v bun >/dev/null 2>&1; then
  log "Installing Bun"; curl -fsSL https://bun.sh/install | bash
else
  log "Bun already installed"
fi
# Ensure PATH
grep -q "\.bun/bin" ~/.bashrc || echo "export PATH=\"$HOME/.bun/bin:$PATH\"" >> ~/.bashrc

# Project directory (use current user's home)
APP_DIR="$HOME/clack"
mkdir -p "$APP_DIR"

# Clone or update repo
if [ -d "$APP_DIR/.git" ]; then
  log "Updating repository"; cd "$APP_DIR" && git fetch origin && git reset --hard origin/main
else
  log "Cloning repository"; git clone https://github.com/Goblin-Egg-Studio/clack.git "$APP_DIR"
fi

# Install deps and build
log "Installing dependencies"; cd "$APP_DIR" && export PATH="$HOME/.bun/bin:$PATH" && bun install
log "Installing client dependencies"; cd "$APP_DIR/client" && export PATH="$HOME/.bun/bin:$PATH" && bun install
log "Building application"; cd "$APP_DIR" && export PATH="$HOME/.bun/bin:$PATH" && bun run build

# Systemd service
if [ ! -f "/etc/systemd/system/clack.service" ] || ! cmp -s "$APP_DIR/systemd/clack.service" /etc/systemd/system/clack.service; then
  log "Updating systemd unit"; sudo cp "$APP_DIR/systemd/clack.service" /etc/systemd/system/clack.service
else
  log "Systemd unit already up to date"
fi
sudo systemctl daemon-reload
sudo systemctl enable clack@$CURRENT_USER || true

# Nginx reverse proxy (IP default)
if [ ! -f /etc/nginx/sites-available/clack ]; then
  log "Creating nginx site"
  sudo tee /etc/nginx/sites-available/clack > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
fi
sudo ln -sf /etc/nginx/sites-available/clack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Database file (persistent location outside git repo)
mkdir -p "$APP_DIR/data"
if [ ! -f "$APP_DIR/data/chat.db" ]; then
  log "Creating persistent database..."
  touch "$APP_DIR/data/chat.db"
  chmod 664 "$APP_DIR/data/chat.db"
else
  log "Database already exists, preserving data"
fi

# Watchdog removed for simplicity (systemd handles restarts)

# Start service
if ! systemctl is-active --quiet clack@$CURRENT_USER; then
  log "Starting clack"; sudo systemctl start clack@$CURRENT_USER
else
  log "Clack already running"
fi

ok "Setup complete."
echo "Service status:"; sudo systemctl status clack@$CURRENT_USER --no-pager | sed -n '1,12p'
echo
IP=$(curl -s ifconfig.me || echo "YOUR_IP")
echo "Visit: http://${IP}/  |  Version: http://${IP}/__version"