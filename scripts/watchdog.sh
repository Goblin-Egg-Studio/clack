#!/bin/bash
# Clack Watchdog - Monitors service health and restarts if needed

set -euo pipefail

SERVICE_NAME="clack"
HEALTH_URL="http://localhost:3000/__health"
MAX_RETRIES=3
RETRY_DELAY=5

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WATCHDOG: $1"
}

check_service_running() {
    systemctl is-active --quiet "$SERVICE_NAME"
}

check_health_endpoint() {
    curl -sf "$HEALTH_URL" > /dev/null 2>&1
}

restart_service() {
    log "Restarting $SERVICE_NAME service..."
    systemctl restart "$SERVICE_NAME"
    sleep 5
    
    if check_service_running; then
        log "Service restarted successfully"
        return 0
    else
        log "Failed to restart service"
        return 1
    fi
}

main() {
    log "Starting health check..."
    
    # Check if service is running
    if ! check_service_running; then
        log "Service is not running, attempting restart..."
        restart_service
        exit $?
    fi
    
    # Check health endpoint
    if ! check_health_endpoint; then
        log "Health endpoint failed, attempting restart..."
        restart_service
        exit $?
    fi
    
    log "Service is healthy"
    exit 0
}

main "$@"
