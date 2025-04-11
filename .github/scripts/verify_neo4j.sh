#!/bin/bash
set -e

# This script verifies that Neo4j is running correctly
# It is designed to be executed via AWS SSM Run Command

# Check Neo4j service status
echo "Checking Neo4j service status..."
systemctl status neo4j

# Check if Neo4j is listening on port 7687
echo "Checking if Neo4j is listening on port 7687..."
ss -tlnp | grep 7687 || echo "No process listening on port 7687"

# Check Neo4j logs for any errors
echo "Checking Neo4j logs for errors..."
tail -n 50 /var/log/neo4j/neo4j.log || echo "No Neo4j logs found"

# Try to run a simple query with cypher-shell with verbose output
echo "Testing Neo4j with cypher-shell..."
cypher-shell --verbose --non-interactive "RETURN 1 AS test;" || echo "Cypher-shell command failed"

# Check Neo4j configuration
echo "Neo4j configuration:"
cat /etc/neo4j/neo4j.conf | grep -v '^#' | grep -v '^$' || echo "No Neo4j configuration found"

# Check system resources
echo "Checking system resources..."
free -m
df -h

# Check Java version
echo "Checking Java version..."
java -version

# Check for any port conflicts
echo "Checking for port conflicts..."
ss -tulpn | grep -E ':(7474|7687|59000|59001|59002|59003)' || echo "No Neo4j ports in use"

# Check SELinux/AppArmor status
echo "Checking security modules status..."
getenforce || echo "SELinux not installed"
aa-status || echo "AppArmor not installed"

# Check Neo4j user permissions
echo "Checking Neo4j user permissions..."
sudo -u neo4j touch /var/lib/neo4j/test_file && echo "Neo4j user can write to data directory" || echo "Neo4j user CANNOT write to data directory"
sudo -u neo4j rm /var/lib/neo4j/test_file 2>/dev/null
