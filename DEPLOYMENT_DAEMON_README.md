# Credex Deployment Daemon

## Overview

This solution fixes the deployment hanging issue by implementing a **host-level deployment daemon** that processes deployment requests outside of the containers being deployed. This eliminates the circular dependency that was causing deployments to hang indefinitely.

## The Problem

The original deployment system had a fundamental flaw:

1. **GitHub Action** calls deployment API inside container
2. **Container API** tries to replace its own container
3. **Container** receives SIGTERM and waits for HTTP connections to close
4. **HTTP connection** waits for deployment to complete
5. **Infinite deadlock** - deployment never completes, container never shuts down

## The Solution

**Host-Level Deployment Queue System:**

1. **GitHub Action** calls deployment API
2. **Container API** queues deployment request and responds immediately (202 Accepted)
3. **Host Daemon** processes queue and executes actual deployment
4. **Container** can shut down gracefully without blocking deployment
5. **Deployment** completes successfully with new container

## Architecture

```
GitHub Actions → Container API → Deployment Queue → Host Daemon → Docker Commands
                      ↓
                 202 Accepted
                 (immediate response)
```

### Components

1. **Deployment Queue** (`/app/source/deploy-queue/`)
   - JSON files containing deployment requests
   - Processed by host daemon every 5 seconds

2. **Host Daemon** (`/app/deploy-daemon.sh`)
   - Bash script running as systemd service
   - Monitors queue and executes deployments
   - Handles Docker operations, health checks, rollbacks

3. **Systemd Service** (`credex-deploy.service`)
   - Manages daemon lifecycle
   - Auto-restart on failure
   - Starts on boot

4. **Modified API** (Container-based)
   - Validates tokens and queues requests
   - Returns immediate responses
   - No longer executes deployments directly

## Installation

### Prerequisites

- Docker installed and running
- Root access for systemd service installation
- `jq` and `curl` utilities (installed automatically)

### Setup Steps

1. **Run the setup script:**
   ```bash
   sudo ./setup-deployment-daemon.sh
   ```

2. **Verify installation:**
   ```bash
   systemctl status credex-deploy
   ```

3. **Check logs:**
   ```bash
   tail -f /app/source/logs/deployment-daemon.log
   ```

## Usage

### Deployment Flow

The deployment process is now completely transparent to existing workflows:

1. **GitHub Actions** continue to call the same API endpoints
2. **API responds immediately** with 202 Accepted
3. **Host daemon processes** the actual deployment
4. **Logs show progress** in daemon log file

### Monitoring

**Service Status:**
```bash
systemctl status credex-deploy
```

**Real-time Logs:**
```bash
# Systemd logs
journalctl -u credex-deploy -f

# Daemon logs
tail -f /app/source/logs/deployment-daemon.log
```

**Queue Status:**
```bash
ls -la /app/source/deploy-queue/
```

### Manual Operations

**Restart Daemon:**
```bash
systemctl restart credex-deploy
```

**Stop Daemon:**
```bash
systemctl stop credex-deploy
```

**Manual Deployment (for testing):**
```bash
# Create deployment request
cat > /app/source/deploy-queue/manual-test.json << EOF
{
  "service": "credex-core",
  "branch": "prod",
  "requestId": "manual-$(date +%s)",
  "timestamp": "$(date -Iseconds)",
  "actor": "manual-test"
}
EOF
```

## File Structure

```
/app/
├── deploy-daemon.sh              # Host daemon script
├── source/
│   ├── deploy-queue/             # Deployment request queue
│   ├── logs/
│   │   └── deployment-daemon.log # Daemon logs
│   └── ...                       # Application files
└── ...

/etc/systemd/system/
└── credex-deploy.service         # Systemd service file
```

## Configuration

### Environment Variables

The daemon uses these environment variables:

- `VIMBISO_CHATSERVER_PATH`: Path to chatserver repository (default: `/app/vimbiso-chatserver`)

### Service Configuration

Edit `/etc/systemd/system/credex-deploy.service` to modify:
- Environment variables
- Resource limits
- Restart policies

After changes, reload systemd:
```bash
systemctl daemon-reload
systemctl restart credex-deploy
```

## Deployment Process Details

### credex-core Deployment

1. Clone repository to temporary directory
2. Checkout specified branch
3. Build Docker image
4. Stop current container (30s timeout)
5. Rename current container to backup
6. Start new container
7. Health check (45s timeout, 15 retries)
8. Clean up backup container on success
9. Rollback on failure

### vimbiso-chatserver Deployment

1. Pull latest changes in chatserver directory
2. Build Docker image
3. Stop current chatserver container
4. Start new chatserver container
5. Health check (30s timeout, 10 retries)

## Error Handling

### Deployment Failures

- **Build failures**: Logged with full error details
- **Health check failures**: Automatic rollback to previous container
- **Network issues**: Retry logic with exponential backoff

### Daemon Failures

- **Automatic restart**: Systemd restarts daemon on failure
- **Lock files**: Prevent concurrent deployments
- **Cleanup**: Temporary directories cleaned on failure

### Recovery

**If daemon stops:**
```bash
systemctl start credex-deploy
```

**If deployments fail:**
```bash
# Check logs
tail -f /app/source/logs/deployment-daemon.log

# Manual rollback (if needed)
docker rename credex-core-prod-backup credex-core-prod
docker start credex-core-prod
```

## Benefits

### ✅ Fixes

- **No more hanging deployments** - Queue system eliminates circular dependency
- **Reliable container replacement** - Host daemon survives container restarts
- **Proper error handling** - Clear failure modes and rollback procedures
- **Consistent logging** - All deployment activity logged in one place

### ✅ Maintains

- **Existing workflows** - No changes needed to GitHub Actions
- **API compatibility** - Same endpoints, same authentication
- **Health checks** - Comprehensive deployment verification
- **Rollback capability** - Automatic rollback on failure

### ✅ Improves

- **Deployment speed** - No more indefinite waits
- **Reliability** - Fewer moving parts, clearer failure modes
- **Monitoring** - Centralized logging and status checking
- **Maintenance** - Simple systemd service management

## Troubleshooting

### Common Issues

**Daemon not starting:**
```bash
# Check service status
systemctl status credex-deploy

# Check logs
journalctl -u credex-deploy --no-pager
```

**Deployments not processing:**
```bash
# Check queue directory
ls -la /app/source/deploy-queue/

# Check daemon logs
tail -f /app/source/logs/deployment-daemon.log
```

**Permission issues:**
```bash
# Fix queue permissions
sudo chown -R root:root /app/source/deploy-queue
sudo chmod 755 /app/source/deploy-queue
```

### Log Analysis

**Successful deployment pattern:**
```
[timestamp] Starting credex-core deployment: credex-core-xxxxx (branch: prod)
[timestamp] Cloning repository to /tmp/deployment-credex-core-xxxxx
[timestamp] Building credex-core image
[timestamp] Backing up current container
[timestamp] Starting new production container
[timestamp] Health check passed
[timestamp] Deployment credex-core-xxxxx completed successfully
```

**Failed deployment pattern:**
```
[timestamp] Starting credex-core deployment: credex-core-xxxxx (branch: prod)
[timestamp] Health check failed, rolling back
[timestamp] Rollback completed
[timestamp] Deployment credex-core-xxxxx failed
```

## Migration Notes

### From Previous System

The new system is **backward compatible**:

- GitHub Actions workflows unchanged
- API endpoints unchanged
- Authentication unchanged
- Response format updated (202 instead of 200)

### Rollback Plan

If needed, you can disable the daemon and revert to direct deployment:

1. Stop daemon: `systemctl stop credex-deploy`
2. Revert API changes in `DeploymentController.ts`
3. Restart application

## Security Considerations

- **Root privileges**: Daemon runs as root (required for Docker operations)
- **File permissions**: Queue directory secured with proper permissions
- **Token validation**: Same deployment token security as before
- **Process isolation**: Systemd manages daemon lifecycle

## Performance

- **Queue processing**: 5-second polling interval
- **Deployment time**: ~2-3 minutes for typical deployment
- **Resource usage**: Minimal overhead from daemon
- **Concurrent deployments**: Prevented by lock file mechanism

---

**Status**: ✅ Production Ready  
**Last Updated**: August 2, 2025  
**Version**: 1.0.0
