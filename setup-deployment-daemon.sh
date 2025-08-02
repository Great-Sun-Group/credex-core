#!/bin/bash

# Setup script for Credex Deployment Daemon
# This script installs and configures the host-level deployment system

set -e

echo "=== Credex Deployment Daemon Setup ==="
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)"
    exit 1
fi

# Configuration
DAEMON_SCRIPT="/app/deploy-daemon.sh"
SERVICE_FILE="/etc/systemd/system/credex-deploy.service"
SOURCE_DIR="/app/source"
QUEUE_DIR="$SOURCE_DIR/deploy-queue"
LOG_DIR="$SOURCE_DIR/logs"

echo "1. Checking prerequisites..."

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

if ! systemctl is-active --quiet docker; then
    echo "Error: Docker service is not running"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    apt-get update && apt-get install -y jq
fi

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "Installing curl..."
    apt-get update && apt-get install -y curl
fi

echo "✓ Prerequisites check completed"
echo

echo "2. Setting up directories..."

# Create necessary directories
mkdir -p "$QUEUE_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$DAEMON_SCRIPT")"

# Set proper permissions
chown -R root:root "$QUEUE_DIR"
chown -R root:root "$LOG_DIR"
chmod 755 "$QUEUE_DIR"
chmod 755 "$LOG_DIR"

echo "✓ Directories created"
echo

echo "3. Installing deployment daemon script..."

# Copy daemon script to target location
if [ -f "./deploy-daemon.sh" ]; then
    cp "./deploy-daemon.sh" "$DAEMON_SCRIPT"
    chmod +x "$DAEMON_SCRIPT"
    chown root:root "$DAEMON_SCRIPT"
    echo "✓ Daemon script installed at $DAEMON_SCRIPT"
else
    echo "Error: deploy-daemon.sh not found in current directory"
    exit 1
fi

echo

echo "4. Installing systemd service..."

# Copy service file to systemd directory
if [ -f "./credex-deploy.service" ]; then
    cp "./credex-deploy.service" "$SERVICE_FILE"
    chown root:root "$SERVICE_FILE"
    chmod 644 "$SERVICE_FILE"
    echo "✓ Service file installed at $SERVICE_FILE"
else
    echo "Error: credex-deploy.service not found in current directory"
    exit 1
fi

echo

echo "5. Configuring systemd service..."

# Reload systemd daemon
systemctl daemon-reload

# Enable the service to start on boot
systemctl enable credex-deploy.service

echo "✓ Service enabled for automatic startup"
echo

echo "6. Starting deployment daemon..."

# Start the service
systemctl start credex-deploy.service

# Wait a moment for service to start
sleep 2

# Check service status
if systemctl is-active --quiet credex-deploy.service; then
    echo "✓ Deployment daemon started successfully"
else
    echo "Error: Failed to start deployment daemon"
    echo "Service status:"
    systemctl status credex-deploy.service --no-pager
    exit 1
fi

echo

echo "7. Verifying installation..."

# Check if daemon is processing requests
echo "Testing deployment queue..."
TEST_REQUEST_FILE="$QUEUE_DIR/test-$(date +%s).json"
cat > "$TEST_REQUEST_FILE" << EOF
{
  "service": "test",
  "branch": "test",
  "requestId": "setup-test",
  "timestamp": "$(date -Iseconds)",
  "actor": "setup-script"
}
EOF

# Wait a moment and check if file was processed
sleep 6

if [ ! -f "$TEST_REQUEST_FILE" ]; then
    echo "✓ Deployment queue is working (test file was processed)"
else
    echo "Warning: Test file was not processed, daemon may not be working correctly"
    rm -f "$TEST_REQUEST_FILE"
fi

echo

echo "=== Setup Complete ==="
echo
echo "Deployment daemon has been successfully installed and started."
echo
echo "Service Information:"
echo "  - Service name: credex-deploy.service"
echo "  - Daemon script: $DAEMON_SCRIPT"
echo "  - Queue directory: $QUEUE_DIR"
echo "  - Log file: $LOG_DIR/deployment-daemon.log"
echo
echo "Useful Commands:"
echo "  - Check status: systemctl status credex-deploy"
echo "  - View logs: journalctl -u credex-deploy -f"
echo "  - View daemon logs: tail -f $LOG_DIR/deployment-daemon.log"
echo "  - Restart service: systemctl restart credex-deploy"
echo "  - Stop service: systemctl stop credex-deploy"
echo
echo "The deployment daemon is now ready to process deployment requests!"
echo "GitHub Actions workflows will now queue deployments instead of hanging."
