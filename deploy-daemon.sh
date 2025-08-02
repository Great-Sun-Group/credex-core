#!/bin/bash

# Credex Deployment Daemon
# Monitors deployment queue and executes deployments on host system

set -e

# Configuration
QUEUE_DIR="${QUEUE_DIR:-/app/source/deploy-queue}"
LOG_FILE="${LOG_FILE:-/app/source/logs/deployment-daemon.log}"
SOURCE_DIR="${SOURCE_DIR:-/app/source}"
LOCK_FILE="/tmp/credex-deploy.lock"

# Ensure directories exist
mkdir -p "$QUEUE_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if another deployment is running
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "Another deployment is running (PID: $pid), skipping"
            return 1
        else
            log "Stale lock file found, removing"
            rm -f "$LOCK_FILE"
        fi
    fi
    return 0
}

# Create deployment lock
create_lock() {
    echo $$ > "$LOCK_FILE"
}

# Remove deployment lock
remove_lock() {
    rm -f "$LOCK_FILE"
}

# Deploy credex-core service
deploy_credex_core() {
    local branch="$1"
    local deployment_id="credex-core-$(date +%s)"
    
    log "Starting credex-core deployment: $deployment_id (branch: $branch)"
    
    # Create deployment directory
    local deploy_dir="/tmp/deployment-credex-core-$(date +%s)"
    
    # Clone repository to deployment directory
    log "Cloning repository to $deploy_dir"
    git clone "$SOURCE_DIR" "$deploy_dir"
    
    # Checkout specified branch
    cd "$deploy_dir"
    git fetch origin
    git checkout "$branch"
    git pull origin "$branch"
    
    # Copy environment files
    cp "$SOURCE_DIR/.env.prod" "$deploy_dir/.env.prod" || log "Warning: Could not copy .env.prod"
    
    # Build new image
    log "Building credex-core image"
    docker build --target production -t credex-core-deployment:latest .
    
    # Execute deployment
    log "Executing credex-core deployment"
    
    # Clean up any existing test containers
    docker stop credex-core-prod-new 2>/dev/null || true
    docker rm credex-core-prod-new 2>/dev/null || true
    
    # Backup current container if it exists
    if docker inspect credex-core-prod >/dev/null 2>&1; then
        log "Backing up current container"
        docker stop --time=30 credex-core-prod
        docker rename credex-core-prod credex-core-prod-backup
    fi
    
    # Start new production container
    log "Starting new production container"
    docker run -d \
        --name credex-core-prod \
        --env-file "$SOURCE_DIR/.env.prod" \
        -e NODE_ENV=production \
        -e PORT=4000 \
        -e LOG_LEVEL=info \
        -p 4000:4000 \
        -v "$SOURCE_DIR/logs/prod:/app/logs" \
        -v "$SOURCE_DIR/backups/credex-core:/app/backups" \
        -v "$SOURCE_DIR:/app/source" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v "$SOURCE_DIR/docker-compose.prod.yml:/app/docker-compose.prod.yml:ro" \
        --restart unless-stopped \
        --network credex-prod-network \
        credex-core-deployment:latest
    
    # Wait for container to initialize
    log "Waiting for container to initialize..."
    sleep 15
    
    # Health check
    log "Performing health check"
    local health_check_passed=false
    for i in {1..15}; do
        if curl -f -s http://localhost:4000/health >/dev/null 2>&1; then
            health_check_passed=true
            break
        fi
        log "Health check attempt $i/15 failed, retrying in 3 seconds..."
        sleep 3
    done
    
    if [ "$health_check_passed" = true ]; then
        log "Health check passed, cleaning up backup container"
        docker stop credex-core-prod-backup 2>/dev/null || true
        docker rm credex-core-prod-backup 2>/dev/null || true
        log "Deployment $deployment_id completed successfully"
    else
        log "Health check failed, rolling back"
        # Stop failed container
        docker stop credex-core-prod 2>/dev/null || true
        docker rm credex-core-prod 2>/dev/null || true
        
        # Restore backup if it exists
        if docker inspect credex-core-prod-backup >/dev/null 2>&1; then
            docker rename credex-core-prod-backup credex-core-prod
            docker start credex-core-prod
            log "Rollback completed"
        fi
        
        log "Deployment $deployment_id failed"
        return 1
    fi
    
    # Clean up deployment directory
    rm -rf "$deploy_dir"
    
    return 0
}

# Deploy vimbiso-chatserver service
deploy_chatserver() {
    local branch="$1"
    local deployment_id="chatserver-$(date +%s)"
    
    log "Starting chatserver deployment: $deployment_id (branch: $branch)"
    
    # Check if chatserver directory exists
    local chatserver_path="${VIMBISO_CHATSERVER_PATH:-../vimbiso-chatserver}"
    if [ ! -d "$chatserver_path" ]; then
        log "Error: vimbiso-chatserver directory not found at $chatserver_path"
        return 1
    fi
    
    # Pull latest changes
    cd "$chatserver_path"
    git fetch origin
    git checkout "$branch"
    git pull origin "$branch"
    
    # Build chatserver image
    log "Building vimbiso-chatserver image"
    docker build --target production -t vimbiso-chatserver-deployment:latest .
    
    # Stop current chatserver container
    docker stop vimbiso-chatserver-prod 2>/dev/null || true
    docker rm vimbiso-chatserver-prod 2>/dev/null || true
    
    # Start new chatserver container
    log "Starting new chatserver container"
    docker run -d \
        --name vimbiso-chatserver-prod \
        --env-file "$SOURCE_DIR/.env.prod" \
        -e REDIS_URL=redis://redis-state-prod:6379/0 \
        -e USE_PROGRESSIVE_FLOW=True \
        -e PORT=9000 \
        -p 9000:9000 \
        -v vimbiso-prod-data:/app/data \
        -v "$SOURCE_DIR/backups/vimbiso:/app/backups" \
        --restart unless-stopped \
        --network credex-prod-network \
        vimbiso-chatserver-deployment:latest \
        bash -c "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:9000 --workers 2 --timeout 120"
    
    # Wait for service to start
    sleep 10
    
    # Health check
    log "Performing chatserver health check"
    local health_check_passed=false
    for i in {1..10}; do
        if curl -f -s http://localhost:9000/health/ >/dev/null 2>&1; then
            health_check_passed=true
            break
        fi
        log "Chatserver health check attempt $i/10 failed, retrying in 3 seconds..."
        sleep 3
    done
    
    if [ "$health_check_passed" = true ]; then
        log "Chatserver deployment $deployment_id completed successfully"
        return 0
    else
        log "Chatserver deployment $deployment_id failed health check"
        return 1
    fi
}

# Process deployment request
process_deployment() {
    local request_file="$1"
    
    if [ ! -f "$request_file" ]; then
        return
    fi
    
    log "Processing deployment request: $(basename "$request_file")"
    
    # Parse deployment request
    local service=$(jq -r '.service // empty' "$request_file" 2>/dev/null)
    local branch=$(jq -r '.branch // "prod"' "$request_file" 2>/dev/null)
    local request_id=$(jq -r '.requestId // "unknown"' "$request_file" 2>/dev/null)
    
    if [ -z "$service" ]; then
        log "Error: Invalid deployment request - missing service"
        rm -f "$request_file"
        return
    fi
    
    log "Deployment request - Service: $service, Branch: $branch, RequestID: $request_id"
    
    # Check lock before proceeding
    if ! check_lock; then
        return
    fi
    
    create_lock
    
    # Execute deployment based on service
    local deployment_result=0
    case "$service" in
        "credex-core")
            deploy_credex_core "$branch" || deployment_result=$?
            ;;
        "vimbiso-chatserver")
            deploy_chatserver "$branch" || deployment_result=$?
            ;;
        *)
            log "Error: Unknown service: $service"
            deployment_result=1
            ;;
    esac
    
    remove_lock
    
    # Write result file
    local result_file="${request_file%.json}.result"
    if [ $deployment_result -eq 0 ]; then
        echo '{"status": "success", "timestamp": "'$(date -Iseconds)'"}' > "$result_file"
        log "Deployment completed successfully"
    else
        echo '{"status": "failed", "timestamp": "'$(date -Iseconds)'"}' > "$result_file"
        log "Deployment failed"
    fi
    
    # Clean up request file
    rm -f "$request_file"
}

# Main daemon loop
main() {
    log "Starting Credex Deployment Daemon"
    log "Queue directory: $QUEUE_DIR"
    log "Log file: $LOG_FILE"
    log "Source directory: $SOURCE_DIR"
    log "Lock file: $LOCK_FILE"
    
    # Check if directories are accessible
    if [ -d "$QUEUE_DIR" ]; then
        log "Queue directory exists and is accessible"
        log "Queue directory contents: $(ls -la "$QUEUE_DIR" 2>/dev/null || echo 'empty or inaccessible')"
    else
        log "ERROR: Queue directory does not exist or is not accessible"
    fi
    
    if [ -d "$SOURCE_DIR" ]; then
        log "Source directory exists and is accessible"
    else
        log "ERROR: Source directory does not exist or is not accessible"
    fi
    
    # Ensure Docker network exists
    docker network create credex-prod-network 2>/dev/null || true
    
    log "Starting main monitoring loop..."
    local loop_count=0
    
    while true; do
        loop_count=$((loop_count + 1))
        
        # Log every 12 iterations (1 minute)
        if [ $((loop_count % 12)) -eq 0 ]; then
            log "Daemon heartbeat - loop $loop_count, checking queue..."
            log "Current queue contents: $(ls -la "$QUEUE_DIR" 2>/dev/null || echo 'empty or error')"
        fi
        
        # Process all deployment requests
        local found_files=false
        for request_file in "$QUEUE_DIR"/*.json; do
            if [ -f "$request_file" ]; then
                found_files=true
                log "Found deployment request file: $request_file"
                process_deployment "$request_file"
            fi
        done
        
        # Log if we found files but only occasionally if we didn't
        if [ "$found_files" = false ] && [ $((loop_count % 60)) -eq 0 ]; then
            log "No deployment requests found in queue (checked $loop_count times)"
        fi
        
        # Sleep before next check
        sleep 5
    done
}

# Handle signals
cleanup() {
    log "Received shutdown signal, cleaning up..."
    remove_lock
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start daemon
main
