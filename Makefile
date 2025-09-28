dev:
	bun run server.ts

build:
	cd client && bun run build
	./bin/spacetimedb build server

# Deployment commands
deploy-setup:
	@echo "🚀 Setting up deployment environment..."
	@chmod +x scripts/setup-linode.sh
	@echo "Run: ./scripts/setup-linode.sh on your Linode instance"

deploy-check:
	@echo "🔍 Checking deployment configuration..."
	@echo "GitHub Actions workflow: .github/workflows/deploy.yml"
	@echo "Systemd service: systemd/mygame.service"
	@echo "Nginx config: nginx/clack.conf"
	@echo "Setup script: scripts/setup-linode.sh"

deploy-docs:
	@echo "📚 Opening deployment documentation..."
	@cat DEPLOYMENT.md

# Production commands
prod-build:
	@echo "🔨 Building for production..."
	cd client && bun run build
	@echo "✅ Production build complete"

prod-start:
	@echo "🚀 Starting production server..."
	NODE_ENV=production bun run server.ts

# Utility commands
logs:
	@echo "📋 Viewing application logs..."
	sudo journalctl -u clack -f

status:
	@echo "📊 Checking service status..."
	sudo systemctl status clack --no-pager

restart:
	@echo "🔄 Restarting service..."
	sudo systemctl restart clack
	@echo "✅ Service restarted"

