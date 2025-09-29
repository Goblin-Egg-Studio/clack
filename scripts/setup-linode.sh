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

# Create clack user (if missing)
if ! id clack &>/dev/null; then
  log "Creating clack user"; sudo useradd -m -s /bin/bash clack
else
  log "clack user exists"
fi
sudo mkdir -p /home/clack/.ssh && sudo chown -R clack:clack /home/clack

# Install Bun for clack
if ! sudo -u clack bash -lc 'command -v bun >/dev/null 2>&1'; then
  log "Installing Bun"; sudo -u clack bash -lc 'curl -fsSL https://bun.sh/install | bash'
else
  log "Bun already installed"
fi
# Ensure PATH
sudo -u clack bash -lc 'grep -q "\.bun/bin" ~/.bashrc || echo "export PATH=\"$HOME/.bun/bin:$PATH\"" >> ~/.bashrc'

# Project directory
sudo mkdir -p /opt/clack && sudo chown -R clack:clack /opt/clack

# Clone or update repo
if [ -d /opt/clack/.git ]; then
  log "Updating repository"; sudo -u clack bash -lc 'cd /opt/clack && git fetch origin && git reset --hard origin/main'
else
  log "Cloning repository"; sudo -u clack git clone https://github.com/Goblin-Egg-Studio/clack.git /opt/clack
fi

# Install deps and build (root and client)
log "Installing dependencies"; sudo -u clack bash -lc 'cd /opt/clack && export PATH="$HOME/.bun/bin:$PATH" && bun install'
log "Installing client dependencies"; sudo -u clack bash -lc 'cd /opt/clack/client && export PATH="$HOME/.bun/bin:$PATH" && bun install'
log "Building application"; sudo -u clack bash -lc 'cd /opt/clack && export PATH="$HOME/.bun/bin:$PATH" && bun run build'

# Systemd service
if [ ! -f "/etc/systemd/system/clack.service" ] || ! cmp -s /opt/clack/systemd/mygame.service /etc/systemd/system/clack.service; then
  log "Updating systemd unit"; sudo cp /opt/clack/systemd/mygame.service /etc/systemd/system/clack.service
else
  log "Systemd unit already up to date"
fi
sudo systemctl daemon-reload
sudo systemctl enable clack || true

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

# Database file
sudo -u clack touch /opt/clack/chat.db
sudo chown clack:clack /opt/clack/chat.db
sudo chmod 664 /opt/clack/chat.db

# Install watchdog service
log "Installing watchdog service..."
sudo cp /opt/clack/systemd/clack-watchdog.service /etc/systemd/system/
sudo cp /opt/clack/systemd/clack-watchdog.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable clack-watchdog.timer
sudo systemctl start clack-watchdog.timer

# Start service
if ! systemctl is-active --quiet clack; then
  log "Starting clack"; sudo systemctl start clack
else
  log "Clack already running"
fi

ok "Setup complete."
echo "Service status:"; sudo systemctl status clack --no-pager | sed -n '1,12p'
echo
IP=$(curl -s ifconfig.me || echo "YOUR_IP")
echo "Visit: http://${IP}/  |  Version: http://${IP}/__version"