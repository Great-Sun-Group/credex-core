#!/bin/bash

# Credex Deployment Daemon
# Monitors deployment queue and executes deployments on host system

set -e

# Configuration
QUEUE_DIR="${QUEUE_DIR:-/app/deploy-queue}"
LOG_FILE="${LOG_FILE:-/app/logs/deployment-daemon.log}"
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
    
    # Clone repository from remote GitHub to deployment directory
    log "Cloning repository from GitHub to $deploy_dir"
    git clone https://github.com/Great-Sun-Group/credex-core.git "$deploy_dir"
    
    # Checkout specified branch
    cd "$deploy_dir"
    
    # Ensure we're using the correct remote origin
    log "Configuring remote origin to GitHub"
    git remote set-url origin https://github.com/Great-Sun-Group/credex-core.git
    git remote -v
    
    # Fetch and checkout the specified branch
    log "Fetching latest changes from GitHub"
    git fetch origin
    git checkout "$branch"
    
    # Force pull from remote GitHub repository
    log "Pulling latest code from GitHub branch: $branch"
    git pull origin "$branch"
    
    # Verify we have the latest commit
    log "Current commit: $(git rev-parse HEAD)"
    log "Latest commit on GitHub $branch: $(git rev-parse origin/$branch)"
    
    log "Successfully pulled latest code from GitHub branch: $branch"
    
    # Copy environment files
    if [ -f "$SOURCE_DIR/.env.prod" ]; then
        cp "$SOURCE_DIR/.env.prod" "$deploy_dir/.env.prod" || log "Warning: Could not copy .env.prod"
    else
        log "Warning: .env.prod not found at $SOURCE_DIR/.env.prod"
    fi
    
    # Build new image
    log "Building credex-core image from directory: $deploy_dir"
    log "Current working directory: $(pwd)"
    log "Deploy directory contents: $(ls -la "$deploy_dir" | head -10)"
    
    # Build with explicit context and no cache to avoid fallbacks
    if ! docker build --no-cache --target production -t credex-core-deployment:latest "$deploy_dir"; then
        log "❌ ERROR: Docker build failed - stopping deployment to expose root cause"
        log "Build context directory: $deploy_dir"
        log "Directory exists: $(test -d "$deploy_dir" && echo "YES" || echo "NO")"
        log "Dockerfile exists: $(test -f "$deploy_dir/Dockerfile" && echo "YES" || echo "NO")"
        rm -rf "$deploy_dir"
        return 1
    fi
    
    log "✅ Docker build completed successfully"
    
    # Execute blue-green deployment
    log "Executing blue-green credex-core deployment"
    
    # Clean up any existing test containers
    docker stop credex-core-prod-new 2>/dev/null || true
    docker rm credex-core-prod-new 2>/dev/null || true
    
    # Start new container on test port (4001) for health checking
    log "Starting new container on test port 4001 for health checking"
    docker run -d \
        --name credex-core-prod-new \
        --env-file "$SOURCE_DIR/.env.prod" \
        -e NODE_ENV=production \
        -e PORT=4000 \
        -e LOG_LEVEL=info \
        -p 4001:4000 \
        -v "$SOURCE_DIR/logs/prod:/app/logs" \
        -v "$SOURCE_DIR/backups/credex-core:/app/backups" \
        -v "$SOURCE_DIR:/app/source" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v "$SOURCE_DIR/docker-compose.prod.yml:/app/docker-compose.prod.yml:ro" \
        --network credex-prod-network \
        credex-core-deployment:latest
    
    # Wait for container to initialize
    log "Waiting for new container to initialize..."
    sleep 20
    
    # Check if container is running
    if ! docker ps --filter "name=credex-core-prod-new" --filter "status=running" | grep -q credex-core-prod-new; then
        log "New container failed to start, checking logs..."
        docker logs credex-core-prod-new --tail 20 || true
        log "Cleaning up failed container"
        docker stop credex-core-prod-new 2>/dev/null || true
        docker rm credex-core-prod-new 2>/dev/null || true
        log "Deployment $deployment_id failed - container startup failed"
        rm -rf "$deploy_dir"
        return 1
    fi
    
    # Health check on test port via container network
    log "Performing health check on test container via Docker network"
    local health_check_passed=false
    for i in {1..20}; do
        if curl -f -s http://credex-core-prod-new:4000/health >/dev/null 2>&1; then
            health_check_passed=true
            log "Health check passed on attempt $i"
            break
        fi
        log "Health check attempt $i/20 failed, retrying in 3 seconds..."
        sleep 3
    done
    
    if [ "$health_check_passed" = true ]; then
        log "Health check passed, switching to production"
        
        # Backup current production container if it exists
        if docker inspect credex-core-prod >/dev/null 2>&1; then
            log "Stopping and backing up current production container"
            docker stop --time=30 credex-core-prod
            docker rename credex-core-prod credex-core-prod-backup
        fi
        
        # Stop the test container
        log "Stopping test container"
        docker stop credex-core-prod-new
        
        # Start new production container on production port
        log "Starting new production container on port 4000"
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
            -v credex-core_deploy-queue:/app/deploy-queue \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$SOURCE_DIR/docker-compose.prod.yml:/app/docker-compose.prod.yml:ro" \
            --restart unless-stopped \
            --network credex-prod-network \
            credex-core-deployment:latest
        
        # Wait for production container to start
        sleep 10
        
        # Final health check on production port via container network
        log "Final health check on production container via Docker network"
        local final_health_passed=false
        for i in {1..10}; do
            if curl -f -s http://credex-core-prod:4000/health >/dev/null 2>&1; then
                final_health_passed=true
                break
            fi
            log "Final health check attempt $i/10 failed, retrying in 2 seconds..."
            sleep 2
        done
        
        if [ "$final_health_passed" = true ]; then
            log "Production deployment successful, cleaning up"
            # Clean up test and backup containers
            docker rm credex-core-prod-new 2>/dev/null || true
            docker stop credex-core-prod-backup 2>/dev/null || true
            docker rm credex-core-prod-backup 2>/dev/null || true
            log "Deployment $deployment_id completed successfully"
        else
            log "Production health check failed, rolling back"
            # Stop failed production container
            docker stop credex-core-prod 2>/dev/null || true
            docker rm credex-core-prod 2>/dev/null || true
            
            # Restore backup if it exists
            if docker inspect credex-core-prod-backup >/dev/null 2>&1; then
                docker rename credex-core-prod-backup credex-core-prod
                docker start credex-core-prod
                log "Rollback completed"
            fi
            
            # Clean up test container
            docker rm credex-core-prod-new 2>/dev/null || true
            log "Deployment $deployment_id failed - production health check failed"
            rm -rf "$deploy_dir"
            return 1
        fi
    else
        log "Health check failed on test container, deployment aborted"
        # Get container logs for debugging
        log "Test container logs:"
        docker logs credex-core-prod-new --tail 20 || true
        
        # Clean up test container
        docker stop credex-core-prod-new 2>/dev/null || true
        docker rm credex-core-prod-new 2>/dev/null || true
        log "Deployment $deployment_id failed - health check failed"
        rm -rf "$deploy_dir"
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
    
    # Enhanced directory accessibility checks
    if [ -d "$QUEUE_DIR" ]; then
        log "Queue directory exists and is accessible"
        log "Queue directory path: $QUEUE_DIR"
        log "Queue directory permissions: $(ls -ld "$QUEUE_DIR" 2>/dev/null || echo 'cannot read permissions')"
        log "Queue directory contents: $(ls -la "$QUEUE_DIR" 2>/dev/null || echo 'empty or inaccessible')"
        
        # Test write permissions
        local test_file="$QUEUE_DIR/.daemon-write-test-$(date +%s)"
        if echo "test" > "$test_file" 2>/dev/null; then
            log "✅ Queue directory is writable"
            rm -f "$test_file"
        else
            log "❌ ERROR: Queue directory is not writable"
        fi
        
        # Check if it's a Docker volume mount
        if mount | grep -q "$QUEUE_DIR"; then
            log "✅ Queue directory is mounted (likely Docker volume)"
            log "Mount info: $(mount | grep "$QUEUE_DIR")"
        else
            log "⚠️  Queue directory is not mounted (may be local directory)"
        fi
    else
        log "❌ ERROR: Queue directory does not exist or is not accessible"
        log "Attempting to create queue directory: $QUEUE_DIR"
        if mkdir -p "$QUEUE_DIR" 2>/dev/null; then
            log "✅ Successfully created queue directory"
        else
            log "❌ ERROR: Failed to create queue directory"
        fi
    fi
    
    if [ -d "$SOURCE_DIR" ]; then
        log "✅ Source directory exists and is accessible"
        log "Source directory path: $SOURCE_DIR"
    else
        log "❌ ERROR: Source directory does not exist or is not accessible"
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
