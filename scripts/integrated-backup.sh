#!/bin/bash

# Credex Core Integrated Backup System
# CURRENTLY OF NO USE, AS ALL MEANINGFUL DATA IS BACKED UP IN AURA

# Integrates with MTQ and DCO processes for comprehensive data protection
# Usage: ./integrated-backup.sh [pre-dco|post-dco|post-mtq|hourly|daily|weekly|maintenance]

BACKUP_TYPE=${1:-daily}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_BASE="/backups"
LOG_FILE="/app/logs/backup.log"

# Create timestamped backup directory
BACKUP_DIR="${BACKUP_BASE}/${BACKUP_TYPE}/${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# Function to log messages with timestamp
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [$BACKUP_TYPE] $1"
    echo "$message"
    echo "$message" >> "$LOG_FILE"
}

# Neo4j Aura handles database backups automatically, so we focus on application data only

# Function to backup Redis with consistency
backup_redis_consistent() {
    log "Creating consistent Redis backup"
    
    # Force save and wait for completion
    docker exec vimbiso-redis-state-prod redis-cli BGSAVE || {
        log "ERROR: Failed to trigger Redis background save"
        return 1
    }
    
    # Wait for save to complete
    local save_complete=false
    local wait_count=0
    while [ "$save_complete" = false ] && [ $wait_count -lt 30 ]; do
        local last_save=$(docker exec vimbiso-redis-state-prod redis-cli LASTSAVE)
        sleep 2
        local current_save=$(docker exec vimbiso-redis-state-prod redis-cli LASTSAVE)
        if [ "$last_save" != "$current_save" ]; then
            save_complete=true
        fi
        wait_count=$((wait_count + 1))
    done
    
    # Copy RDB and AOF files
    docker cp vimbiso-redis-state-prod:/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb" || {
        log "ERROR: Failed to copy Redis dump file"
        return 1
    }
    
    docker cp vimbiso-redis-state-prod:/data/appendonly.aof "$BACKUP_DIR/redis_appendonly.aof" 2>/dev/null || {
        log "WARNING: AOF file not found (this is normal if AOF is disabled)"
    }
    
    log "Redis backup completed successfully"
}

# Function to backup Vimbiso data
backup_vimbiso_data() {
    log "Backing up Vimbiso ChatServer data"
    
    # Copy SQLite database and other data
    docker cp vimbiso-chatserver-prod:/app/data "$BACKUP_DIR/vimbiso_data" || {
        log "ERROR: Failed to copy Vimbiso data"
        return 1
    }
    
    log "Vimbiso data backed up successfully"
}

# Function to create system snapshot
create_system_snapshot() {
    log "Creating system snapshot"
    
    # Docker container status
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" > "$BACKUP_DIR/docker_status.txt"
    
    # System resources
    echo "=== MEMORY USAGE ===" > "$BACKUP_DIR/system_status.txt"
    free -h >> "$BACKUP_DIR/system_status.txt"
    echo -e "\n=== DISK USAGE ===" >> "$BACKUP_DIR/system_status.txt"
    df -h >> "$BACKUP_DIR/system_status.txt"
    echo -e "\n=== DOCKER STATS ===" >> "$BACKUP_DIR/system_status.txt"
    timeout 10 docker stats --no-stream >> "$BACKUP_DIR/system_status.txt"
    
    # Application logs (last 1000 lines)
    docker logs --tail 1000 credex-core-prod > "$BACKUP_DIR/credex_core_logs.txt" 2>&1
    docker logs --tail 1000 vimbiso-chatserver-prod > "$BACKUP_DIR/vimbiso_logs.txt" 2>&1
    
    log "System snapshot created successfully"
}

# Function to compress and finalize backup
finalize_backup() {
    log "Finalizing backup archive"
    
    cd "$BACKUP_BASE/${BACKUP_TYPE}"
    tar -czf "${TIMESTAMP}.tar.gz" "$TIMESTAMP" || {
        log "ERROR: Failed to compress backup"
        return 1
    }
    
    # Calculate and store checksum
    sha256sum "${TIMESTAMP}.tar.gz" > "${TIMESTAMP}.sha256"
    
    # Remove uncompressed directory
    rm -rf "$TIMESTAMP"
    
    local backup_size=$(du -h "${TIMESTAMP}.tar.gz" | cut -f1)
    log "Backup compressed successfully: ${TIMESTAMP}.tar.gz (${backup_size})"
}

# Function to upload to cloud storage
upload_to_cloud() {
    if [ -n "$AWS_S3_BACKUP_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ]; then
        log "Uploading backup to AWS S3"
        
        which aws >/dev/null || {
            log "AWS CLI not found, skipping cloud upload"
            return 1
        }
        
        aws s3 cp "$BACKUP_BASE/${BACKUP_TYPE}/${TIMESTAMP}.tar.gz" \
            "s3://$AWS_S3_BACKUP_BUCKET/credex-backups/${BACKUP_TYPE}/${TIMESTAMP}.tar.gz" || {
            log "ERROR: Failed to upload to S3"
            return 1
        }
        
        aws s3 cp "$BACKUP_BASE/${BACKUP_TYPE}/${TIMESTAMP}.sha256" \
            "s3://$AWS_S3_BACKUP_BUCKET/credex-backups/${BACKUP_TYPE}/${TIMESTAMP}.sha256" || {
            log "ERROR: Failed to upload checksum to S3"
            return 1
        }
        
        log "Backup uploaded to S3 successfully"
    else
        log "Cloud backup not configured, skipping upload"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups"
    
    case $BACKUP_TYPE in
        hourly|post-mtq)
            # Keep last 48 hourly/MTQ backups (2 days)
            find "$BACKUP_BASE/hourly" -name "*.tar.gz" -type f -mtime +2 -delete 2>/dev/null
            find "$BACKUP_BASE/post-mtq" -name "*.tar.gz" -type f -mtime +2 -delete 2>/dev/null
            ;;
        daily|post-dco)
            # Keep last 30 daily/DCO backups
            find "$BACKUP_BASE/daily" -name "*.tar.gz" -type f -mtime +30 -delete 2>/dev/null
            find "$BACKUP_BASE/post-dco" -name "*.tar.gz" -type f -mtime +30 -delete 2>/dev/null
            ;;
        weekly)
            # Keep last 12 weekly backups
            find "$BACKUP_BASE/weekly" -name "*.tar.gz" -type f -mtime +84 -delete 2>/dev/null
            ;;
        maintenance|pre-dco)
            # Keep last 7 maintenance backups
            find "$BACKUP_BASE/maintenance" -name "*.tar.gz" -type f -mtime +7 -delete 2>/dev/null
            find "$BACKUP_BASE/pre-dco" -name "*.tar.gz" -type f -mtime +7 -delete 2>/dev/null
            ;;
    esac
    
    log "Cleanup completed"
}

# Function to send notification
send_notification() {
    local status=$1
    local message="Credex Core ${BACKUP_TYPE} backup ${status} at $(date)"
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"$message\"}" \
            >/dev/null 2>&1
    fi
    
    log "Notification sent: $message"
}

# Main backup execution function
execute_backup() {
    log "=== Starting Credex Core Integrated Backup Process ==="
    log "Backup type: $BACKUP_TYPE"
    log "Backup directory: $BACKUP_DIR"
    log "NOTE: Neo4j databases are backed up automatically by Aura"
    
    # Check if core containers are running
    if ! docker ps | grep -q "credex-core-prod"; then
        log "ERROR: Production containers not running"
        send_notification "FAILED - containers not running"
        exit 1
    fi
    
    # Execute simplified backup steps - Neo4j Aura handles database backups
    case $BACKUP_TYPE in
        pre-dco|post-dco|maintenance)
            log "Executing ${BACKUP_TYPE} backup"
            backup_redis_consistent
            backup_vimbiso_data
            create_system_snapshot
            ;;
        post-mtq|hourly)
            log "Executing ${BACKUP_TYPE} backup"
            backup_redis_consistent
            backup_vimbiso_data
            ;;
        *)
            log "Executing standard backup"
            backup_redis_consistent
            backup_vimbiso_data
            create_system_snapshot
            ;;
    esac
    
    # Finalize backup
    finalize_backup
    cleanup_old_backups
    upload_to_cloud
    
    log "=== Backup Process Completed Successfully ==="
    send_notification "COMPLETED"
}

# Execute main backup function
execute_backup "$@"
