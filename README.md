# Clack Chat

A modern real-time chat application built with Bun, React, and SQLite. Features direct messaging, room-based chat, sound notifications, and automatic deployment to Linode.

## ✨ Features

- **Real-time messaging** with Server-Sent Events (SSE)
- **Direct messages** between users
- **Room-based chat** with ownership management
- **Sound notifications** with customizable settings
- **User authentication** with bcrypt password hashing
- **Responsive design** with modern UI
- **Automatic deployment** to Linode with CI/CD

## 🏗️ Architecture

- **Frontend**: React with TypeScript, Clack client SDK (SSE + MCP)
- **Backend**: Bun server with SQLite database
- **Real-time**: Server-Sent Events (SSE)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Communication**: Model Context Protocol (MCP) for AI integration

## 🚀 Quick Start

### Prerequisites
- Bun installed
- Linux/macOS/Windows

### Local Development

```bash
# Clone the repository
git clone https://github.com/Goblin-Egg-Studio/clack.git
cd clack

# Install dependencies
bun install

# Build the client
bun run build

# Start the development server
bun run server.ts
```

Visit: http://localhost:3000

### Development Commands

```bash
# Start development server
make dev

# Build for production
make build

# View deployment documentation
make deploy-docs

# Check deployment configuration
make deploy-check
```

## 📦 Production Deployment

### Automated Deployment

This project uses GitHub Actions for automatic deployment to Linode. Do these two steps:

1) Setup Clack on Linode
```bash
# On your Linode instance
git clone https://github.com/Goblin-Egg-Studio/clack.git
cd clack
chmod +x scripts/setup-linode.sh
./scripts/setup-linode.sh
```

If you don't care about automatically deploying updates when the main branch in your repository, then you're done! Otherwise, continue below.

2) Get your Linode API credentials
```bash
# Get your Linode API token:
# 1. Go to Linode Dashboard → API Tokens
# 2. Create Personal Access Token
# 3. Copy the token

# Get your Instance ID:
# 1. Go to Linode Dashboard → Linodes
# 2. Click on your server
# 3. Copy the ID from the URL or details page
```

3) Set GitHub repository secrets
Go to your GitHub repo → Settings → Secrets and variables → Actions → Repository secrets
Click "New repository secret" and add:

**Add these secrets:**
- LINODE_API_TOKEN (your Linode API token from dashboard)
- LINODE_INSTANCE_ID (your Linode instance ID)

**To get your Linode API token:**
1. Go to [Linode Dashboard](https://cloud.linode.com)
2. Click your profile icon (top right) → **API Tokens**
3. Click **Create Personal Access Token**
4. Give it a name like "GitHub Actions Deploy"
5. Set expiration (recommended: 1 year)
6. **Set permissions:**
   - **Linodes**: Read/Write ✅
   - **Account**: Read Only ✅
7. Copy the token (you won't see it again!)

**To get your Instance ID:**
1. Go to [Linode Dashboard](https://cloud.linode.com) → **Linodes**
2. Click on your server
3. Copy the ID from the URL (e.g., `linode.com/linodes/123456`) or from the server details


Push to `main` to deploy automatically. Manual dispatch is available in Actions.

**Optional but recommended:** Set up Linode Cloud Firewall for better security:
1. Go to Linode Dashboard → Firewalls → Create Firewall
2. Add rule: Allow SSH (port 22) from GitHub Actions IPs
3. Apply to your server

If you plan on using HTTP, not HTTPS (not recommended), and/or don't have a domain to use, then you're done! Otherwise, continue below (recommended):

5) In your domain registrar (GoDaddy, Namecheap, etc.):
- Add an A record: `your-domain.com` → `YOUR_LINODE_IP`
- Add an A record: `www.your-domain.com` → `YOUR_LINODE_IP`

6) On your Linode server:
```bash
# Update Nginx domain
sudo nano /etc/nginx/sites-available/clack
# set: server_name your-domain.com www.your-domain.com;

# Update environment variables
sudo nano /etc/systemd/system/clack.service
# set: Environment=CORS_ORIGIN=https://your-domain.com

# Restart services
sudo systemctl daemon-reload && sudo systemctl restart clack
sudo nginx -t && sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```


### Production Configuration

The application includes production-ready configurations:
- **Systemd service** for process management
- **Nginx reverse proxy** with SSL support
- **Security headers** and rate limiting
- **Automatic restarts** and health monitoring

## 📁 Project Structure

```
clack/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API and sound services
│   │   └── sdk/          # MCP client
├── server/                # Backend services
│   ├── services/          # Business logic
│   └── validation/          # Input validation
├── scripts/              # Deployment scripts
├── nginx/                # Nginx configuration
├── systemd/              # Systemd service files
├── .github/workflows/    # CI/CD pipelines
└── DEPLOYMENT.md         # Detailed deployment guide
```

## 🛠️ Development

### Key Components

- **ChatLayout**: Main chat interface with sidebar
- **ChatView**: Direct message interface
- **RoomChatView**: Room-based chat interface
- **SettingsPage**: User preferences and sound configuration
- **ProfilePage**: User profile management
- **RoomsPage**: Room management with ownership controls

### API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/events` - Server-Sent Events stream
- `POST /api/mcp` - Model Context Protocol for AI integration

### Database Schema

- `users` - User accounts with bcrypt hashed passwords
- `rooms` - Chat rooms with ownership
- `room_members` - Room membership
- `messages` - Chat messages with pagination

## 🔒 Security

- **Password hashing** with bcrypt (12 rounds)
- **JWT authentication** with configurable secrets
- **CORS protection** with origin validation
- **Rate limiting** to prevent abuse
- **Security headers** via Nginx
- **User isolation** in systemd service

## 📊 Monitoring

### Service Management

```bash
# Check service status
make status

# View logs
make logs

# Restart service
make restart
```

### Health Checks

- Application: http://localhost:3000/health
- Systemd: `sudo systemctl status clack`
- Nginx: `sudo systemctl status nginx`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Goblin-Egg-Studio/clack/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Goblin-Egg-Studio/clack/discussions)




