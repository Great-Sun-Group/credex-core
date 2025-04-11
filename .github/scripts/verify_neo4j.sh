#!/bin/bash
set -e

# This script verifies that Neo4j is running correctly
# It is designed to be executed via AWS SSM Run Command

# Function to handle errors
handle_error() {
    echo "ERROR: $1"
    # Don't exit immediately, continue with checks to gather more diagnostic information
}

# Function to check if Neo4j is running
check_neo4j_running() {
    local max_attempts=5
    local attempt=1
    local status=false
    
    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts to verify Neo4j is running..."
        
        if systemctl is-active --quiet neo4j; then
            echo "Neo4j service is active"
            status=true
            break
        else
            echo "Neo4j service is not active yet, waiting..."
            sleep 10
            attempt=$((attempt + 1))
        fi
    done
    
    if [ "$status" = false ]; then
        handle_error "Neo4j service failed to start after $max_attempts attempts"
        return 1
    fi
    
    return 0
}

# Wait a moment before starting verification
echo "Waiting 10 seconds before starting verification..."
sleep 10

# Check Neo4j service status
echo "Checking Neo4j service status..."
systemctl status neo4j || handle_error "Neo4j service is not running"

# Verify Neo4j is running
check_neo4j_running

# Check if Neo4j is listening on port 7687
echo "Checking if Neo4j is listening on port 7687..."
ss -tlnp | grep 7687 || handle_error "No process listening on port 7687"

# Check Neo4j logs for any errors
echo "Checking Neo4j logs for errors..."
if [ -f /var/log/neo4j/neo4j.log ]; then
    tail -n 50 /var/log/neo4j/neo4j.log
else
    handle_error "Neo4j log file not found"
fi

# Try to run a simple query with cypher-shell with verbose output
echo "Testing Neo4j with cypher-shell..."
cypher-shell --verbose --non-interactive "RETURN 1 AS test;" || handle_error "Cypher-shell command failed"

# Check Neo4j configuration
echo "Neo4j configuration:"
if [ -f /etc/neo4j/neo4j.conf ]; then
    cat /etc/neo4j/neo4j.conf | grep -v '^#' | grep -v '^$'
else
    handle_error "Neo4j configuration file not found"
fi

# Check system resources
echo "Checking system resources..."
free -m
df -h

# Check Java version
echo "Checking Java version..."
java -version || handle_error "Java not installed or not in PATH"

# Check for any port conflicts
echo "Checking for port conflicts..."
ss -tulpn | grep -E ':(7474|7687|59000|59001|59002|59003)' || echo "No Neo4j ports in use"

# Check SELinux/AppArmor status
echo "Checking security modules status..."
getenforce || echo "SELinux not installed"
aa-status || echo "AppArmor not installed"

# Check Neo4j user permissions
echo "Checking Neo4j user permissions..."
sudo -u neo4j touch /var/lib/neo4j/test_file && echo "Neo4j user can write to data directory" || handle_error "Neo4j user CANNOT write to data directory"
sudo -u neo4j rm /var/lib/neo4j/test_file 2>/dev/null

# Final verification summary
echo "========================================"
echo "Neo4j Verification Summary:"
echo "========================================"
echo "Service Status: $(systemctl is-active neo4j)"
echo "Bolt Port (7687): $(ss -tlnp | grep -q 7687 && echo "LISTENING" || echo "NOT LISTENING")"
echo "HTTP Port (7474): $(ss -tlnp | grep -q 7474 && echo "LISTENING" || echo "NOT LISTENING")"
echo "Log File: $([ -f /var/log/neo4j/neo4j.log ] && echo "EXISTS" || echo "MISSING")"
echo "Config File: $([ -f /etc/neo4j/neo4j.conf ] && echo "EXISTS" || echo "MISSING")"
echo "========================================"

echo "Neo4j verification completed"
