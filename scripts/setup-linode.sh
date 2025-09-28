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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is running
service_running() {
    systemctl is-active --quiet "$1"
}

# Function to check if a port is open
port_open() {
    ss -tlnp | grep -q ":$1 "
}

# Allow running as root (commands use sudo appropriately)

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing required packages..."
# Check if packages are already installed
REQUIRED_PACKAGES="curl git nginx certbot python3-certbot-nginx ufw unzip"
for package in $REQUIRED_PACKAGES; do
    if ! dpkg -l | grep -q "^ii  $package "; then
        print_status "Installing $package..."
        sudo apt install -y "$package"
    else
        print_status "$package already installed"
    fi
done

print_status "Creating clack user..."
if ! id "clack" &>/dev/null; then
    sudo useradd -m -s /bin/bash clack
    print_status "Created clack user"
else
    print_status "clack user already exists"
fi

# Ensure clack user is in sudo group
if ! groups clack | grep -q sudo; then
    sudo usermod -aG sudo clack
    print_status "Added clack to sudo group"
else
    print_status "clack already in sudo group"
fi

# Ensure home directory exists and has proper permissions
sudo mkdir -p /home/clack/.ssh
sudo chown clack:clack /home/clack
sudo chown clack:clack /home/clack/.ssh

print_status "Installing Bun for clack user..."
if ! sudo -u clack bash -lc 'command -v bun >/dev/null 2>&1'; then
    sudo -u clack bash -lc 'curl -fsSL https://bun.sh/install | bash'
    print_status "Installed Bun"
else
    print_status "Bun already installed"
fi

# Ensure Bun is in PATH for clack user
if ! sudo -u clack bash -lc 'echo $PATH' | grep -q ".bun/bin"; then
    sudo -u clack bash -lc 'echo "export PATH=\"\$HOME/.bun/bin:\$PATH\"" >> ~/.bashrc'
    print_status "Added Bun to PATH"
else
    print_status "Bun already in PATH"
fi

print_status "Setting up project directory..."
sudo mkdir -p /opt/clack
sudo chown clack:clack /opt/clack

print_status "Cloning/updating repository..."
if [ -d "/opt/clack/.git" ]; then
    print_status "Repository exists, updating..."
    sudo -u clack bash -lc 'cd /opt/clack && git pull'
else
    print_status "Cloning repository..."
    sudo -u clack git clone https://github.com/Goblin-Egg-Studio/clack.git /opt/clack
fi

print_status "Installing project dependencies..."
sudo -u clack bash -lc 'cd /opt/clack && export PATH="$HOME/.bun/bin:$PATH" && bun install'

print_status "Installing client dependencies..."
sudo -u clack bash -lc 'cd /opt/clack/client && export PATH="$HOME/.bun/bin:$PATH" && bun install'

print_status "Building the application..."
sudo -u clack bash -lc 'cd /opt/clack && export PATH="$HOME/.bun/bin:$PATH" && bun run build'

print_status "Setting up systemd service..."
# Check if service file exists and is different
if [ ! -f "/etc/systemd/system/clack.service" ] || ! cmp -s "systemd/mygame.service" "/etc/systemd/system/clack.service"; then
    sudo cp systemd/mygame.service /etc/systemd/system/clack.service
    print_status "Updated systemd service file"
else
    print_status "Systemd service file already up to date"
fi

sudo systemctl daemon-reload
sudo systemctl enable clack

print_status "Configuring nginx..."
# Check if nginx config is different
if [ ! -f "/etc/nginx/sites-available/clack" ] || ! grep -q "proxy_pass http://localhost:3000" /etc/nginx/sites-available/clack; then
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
    print_status "Updated nginx configuration"
else
    print_status "Nginx configuration already up to date"
fi

sudo ln -sf /etc/nginx/sites-available/clack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
    sudo systemctl restart nginx
else
    print_error "Nginx configuration is invalid"
    exit 1
fi

print_status "Hardening SSH security..."
# Backup original SSH config if not already backed up
if [ ! -f "/etc/ssh/sshd_config.backup" ]; then
    sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    print_status "Backed up original SSH config"
fi

# Configure SSH security settings
print_status "Configuring SSH security settings..."

# Ensure SSH is on port 22 (standard)
if ! grep -q "^Port 22" /etc/ssh/sshd_config; then
    sudo sed -i 's/#Port 22/Port 22/' /etc/ssh/sshd_config
    print_status "Set SSH to port 22"
fi

# Disable password authentication
if ! grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config; then
    sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    print_status "Disabled password authentication"
fi

# Disable root login
if ! grep -q "^PermitRootLogin no" /etc/ssh/sshd_config; then
    sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    print_status "Disabled root login"
fi

# Enable public key authentication
if ! grep -q "^PubkeyAuthentication yes" /etc/ssh/sshd_config; then
    sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
    print_status "Enabled public key authentication"
fi

# Restart SSH service
if systemctl list-units --type=service | grep -q sshd; then
    sudo systemctl restart sshd
    print_status "Restarted sshd service"
elif systemctl list-units --type=service | grep -q ssh; then
    sudo systemctl restart ssh
    print_status "Restarted ssh service"
else
    print_warning "Could not find SSH service to restart automatically."
    print_warning "Please restart SSH manually: sudo systemctl restart sshd"
fi

print_status "Installing and configuring fail2ban..."
# Install fail2ban if not already installed
if ! command_exists fail2ban-server; then
    sudo apt install -y fail2ban
    print_status "Installed fail2ban"
else
    print_status "fail2ban already installed"
fi

# Configure fail2ban for SSH
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

# Start and enable fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
print_status "Configured fail2ban for SSH protection"

print_status "Configuring firewall..."
# Allow SSH on port 22
if ! sudo ufw status | grep -q "22/tcp"; then
    sudo ufw allow 22/tcp
    print_status "Added SSH port 22 to firewall"
else
    print_status "SSH port 22 already allowed in firewall"
fi

# Check if Nginx is already allowed
if ! sudo ufw status | grep -q "Nginx Full"; then
    sudo ufw allow 'Nginx Full'
    print_status "Added Nginx to firewall"
else
    print_status "Nginx already allowed in firewall"
fi

sudo ufw --force enable

print_status "Configuring environment variables..."
# Check if environment variables are already configured
if ! grep -q "Environment=NODE_ENV=production" /etc/systemd/system/clack.service; then
    sudo sed -i '/^Environment=/d' /etc/systemd/system/clack.service
    sudo tee -a /etc/systemd/system/clack.service > /dev/null << 'EOF'
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=change-this-jwt-secret-in-production
Environment=DATABASE_URL=./chat.db
Environment=CORS_ORIGIN=https://your-domain.com
EOF
    print_status "Added environment variables to systemd service"
else
    print_status "Environment variables already configured"
fi

sudo systemctl daemon-reload

print_status "Starting services..."
# Start clack service if not already running
if ! service_running clack; then
    sudo systemctl start clack
    print_status "Started clack service"
else
    print_status "Clack service already running"
fi

# Show service status
sudo systemctl status clack --no-pager

print_success "Setup completed! 🎉"
echo ""
echo "Next steps:"
echo "1. Update environment variables in /etc/systemd/system/clack.service (especially JWT_SECRET and CORS_ORIGIN)"
echo "2. Run: sudo systemctl daemon-reload && sudo systemctl restart clack"
echo "3. Update your domain name in /etc/nginx/sites-available/clack"
echo "4. Run: sudo certbot --nginx -d yourdomain.com"
echo "5. Set up GitHub secrets:"
echo "   - LINODE_API_TOKEN: your Linode API token (from dashboard)"
echo "   - LINODE_INSTANCE_ID: your Linode instance ID"
echo ""
echo "To get your Linode API token:"
echo "   1. Go to Linode Dashboard → API Tokens"
echo "   2. Create Personal Access Token"
echo "   3. Copy the token"
echo ""
echo "To get your Instance ID:"
echo "   1. Go to Linode Dashboard → Linodes"
echo "   2. Click on your server"
echo "   3. Copy the ID from the URL or details page"
echo ""
echo "Your app should be running at: http://$(curl -s ifconfig.me)"