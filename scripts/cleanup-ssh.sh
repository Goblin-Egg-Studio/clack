#!/bin/bash
set -euo pipefail

echo "🧹 Cleaning up SSH-based deployment configuration..."

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

print_status "Reverting SSH configuration to defaults..."

# Revert SSH config to original state
if [ -f "/etc/ssh/sshd_config.backup" ]; then
    sudo cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
    print_status "Restored original SSH configuration"
else
    print_warning "No SSH backup found, manually reverting..."
    # Remove any custom port configurations
    sudo sed -i 's/^Port [0-9]*/#Port 22/' /etc/ssh/sshd_config
    # Re-enable password authentication (if it was disabled)
    sudo sed -i 's/^PasswordAuthentication no/#PasswordAuthentication yes/' /etc/ssh/sshd_config
    # Re-enable root login (if it was disabled)
    sudo sed -i 's/^PermitRootLogin no/#PermitRootLogin yes/' /etc/ssh/sshd_config
    print_status "Manually reverted SSH configuration"
fi

# Restart SSH service
print_status "Restarting SSH service..."
if systemctl list-units --type=service | grep -q sshd; then
    sudo systemctl restart sshd
    print_status "Restarted sshd service"
elif systemctl list-units --type=service | grep -q ssh; then
    sudo systemctl restart ssh
    print_status "Restarted ssh service"
else
    print_warning "Could not find SSH service to restart"
fi

# Clean up firewall rules
print_status "Cleaning up firewall rules..."
# Remove any custom SSH ports (keep port 22)
sudo ufw status | grep -E "tcp.*[0-9]{4,5}" | awk '{print $1}' | while read rule; do
    if [[ "$rule" != "22/tcp" ]]; then
        sudo ufw delete allow "$rule" 2>/dev/null || true
        print_status "Removed firewall rule: $rule"
    fi
done

# Ensure port 22 is still allowed
if ! sudo ufw status | grep -q "22/tcp"; then
    sudo ufw allow 22/tcp
    print_status "Re-added SSH port 22 to firewall"
fi

# Clean up fail2ban (optional - you might want to keep this for security)
print_status "Cleaning up fail2ban configuration..."
if [ -f "/etc/fail2ban/jail.local" ]; then
    sudo rm /etc/fail2ban/jail.local
    print_status "Removed custom fail2ban configuration"
fi

# Stop and disable fail2ban if you don't want it
read -p "Do you want to remove fail2ban completely? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo systemctl stop fail2ban
    sudo systemctl disable fail2ban
    sudo apt remove -y fail2ban
    print_status "Removed fail2ban completely"
else
    print_status "Keeping fail2ban installed (recommended for security)"
fi

# Clean up any SSH keys in authorized_keys that were added for deployment
print_status "Cleaning up SSH keys..."
if [ -f "/home/clack/.ssh/authorized_keys" ]; then
    # Backup current authorized_keys
    sudo cp /home/clack/.ssh/authorized_keys /home/clack/.ssh/authorized_keys.backup
    
    # Remove any keys that look like they were added for deployment
    # (This is conservative - only removes keys with common deployment patterns)
    sudo sed -i '/brooswit@gmail.com/d' /home/clack/.ssh/authorized_keys
    sudo sed -i '/github/d' /home/clack/.ssh/authorized_keys
    sudo sed -i '/deploy/d' /home/clack/.ssh/authorized_keys
    
    print_status "Cleaned up deployment SSH keys"
    print_warning "Original authorized_keys backed up to authorized_keys.backup"
fi

# Clean up any environment variables related to SSH deployment
print_status "Cleaning up environment variables..."
# Remove any SSH_PORT environment variables from systemd service
sudo sed -i '/SSH_PORT/d' /etc/systemd/system/clack.service 2>/dev/null || true

# Reload systemd if we made changes
if sudo systemctl daemon-reload; then
    print_status "Reloaded systemd configuration"
fi

# Clean up any temporary files
print_status "Cleaning up temporary files..."
sudo rm -f /tmp/ssh-* 2>/dev/null || true
sudo rm -f /tmp/deploy-* 2>/dev/null || true

print_success "SSH cleanup completed! 🎉"
echo ""
echo "Next steps:"
echo "1. Set up your Linode API token and Instance ID"
echo "2. Add GitHub secrets:"
echo "   - LINODE_API_TOKEN"
echo "   - LINODE_INSTANCE_ID"
echo "3. Test the new API-based deployment"
echo ""
echo "Your server is now ready for API-based deployments! 🚀"
