#!/bin/bash
set -euo pipefail

echo "🚀 Setting up Clack Chat on Linode server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Allow running as root (commands use sudo appropriately)

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing required packages..."
sudo apt install -y curl git nginx certbot python3-certbot-nginx ufw unzip

print_status "Creating clack user..."
sudo useradd -m -s /bin/bash clack || true
sudo usermod -aG sudo clack
# Ensure home directory exists and has proper permissions
sudo mkdir -p /home/clack/.ssh
sudo chown clack:clack /home/clack
sudo chown clack:clack /home/clack/.ssh

print_status "Installing Bun for clack user..."
sudo -u clack bash -lc 'curl -fsSL https://bun.sh/install | bash'
# Ensure Bun is in PATH for clack user
sudo -u clack bash -lc 'echo "export PATH=\"\$HOME/.bun/bin:\$PATH\"" >> ~/.bashrc'

print_status "Setting up project directory..."
sudo mkdir -p /opt/clack
sudo chown clack:clack /opt/clack

print_status "Cloning repository..."
if [ -d "/opt/clack/.git" ]; then
    print_status "Repository already exists, updating..."
    sudo -u clack bash -lc 'cd /opt/clack && git pull'
else
    sudo -u clack git clone https://github.com/Goblin-Egg-Studio/clack.git /opt/clack
fi

print_status "Installing project dependencies..."
sudo -u clack bash -lc 'cd /opt/clack && export PATH="$HOME/.bun/bin:$PATH" && bun install'

print_status "Installing client dependencies..."
sudo -u clack bash -lc 'cd /opt/clack/client && export PATH="$HOME/.bun/bin:$PATH" && bun install'

print_status "Building the application..."
sudo -u clack bash -lc 'cd /opt/clack && export PATH="$HOME/.bun/bin:$PATH" && bun run build'

print_status "Setting up systemd service..."
sudo cp systemd/mygame.service /etc/systemd/system/clack.service
sudo systemctl daemon-reload
sudo systemctl enable clack

print_status "Configuring nginx..."
sudo tee /etc/nginx/sites-available/clack > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain name

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

sudo ln -sf /etc/nginx/sites-available/clack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

print_status "Configuring SSH on port 31415..."
# Backup original SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Configure SSH to use port 31415
sudo sed -i 's/#Port 22/Port 31415/' /etc/ssh/sshd_config
sudo sed -i 's/Port 22/Port 31415/' /etc/ssh/sshd_config

# Restart SSH service
sudo systemctl restart sshd

print_status "Configuring firewall..."
sudo ufw allow 31415/tcp
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

print_status "Configuring environment variables..."
# Update systemd service with environment variables
sudo sed -i '/^Environment=/d' /etc/systemd/system/clack.service
sudo tee -a /etc/systemd/system/clack.service > /dev/null << 'EOF'
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=change-this-jwt-secret-in-production
Environment=DATABASE_URL=./chat.db
Environment=CORS_ORIGIN=https://your-domain.com
EOF

sudo systemctl daemon-reload

print_status "Starting services..."
sudo systemctl start clack
sudo systemctl status clack --no-pager

print_success "Setup completed! 🎉"
echo ""
echo "Next steps:"
echo "1. Update environment variables in /etc/systemd/system/clack.service (especially JWT_SECRET and CORS_ORIGIN)"
echo "2. Run: sudo systemctl daemon-reload && sudo systemctl restart clack"
echo "3. Update your domain name in /etc/nginx/sites-available/clack"
echo "4. Run: sudo certbot --nginx -d yourdomain.com"
echo "5. Set up GitHub secrets:"
echo "   - LINODE_HOST: your server IP"
echo "   - LINODE_USER: clack"
echo "   - LINODE_SSH_KEY: your private SSH key"
echo "   - LINODE_PORT: 31415 (optional, 31415 is now the default)"
echo ""
echo "Your app should be running at: http://$(curl -s ifconfig.me)"
