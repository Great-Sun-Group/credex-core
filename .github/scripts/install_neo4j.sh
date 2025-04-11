#!/bin/bash
set -e

# This script installs and configures Neo4j on an EC2 instance
# It is designed to be executed via AWS SSM Run Command

# Function to handle errors
handle_error() {
    echo "ERROR: $1"
    exit 1
}

# Function to wait for yum lock to be released
wait_for_yum_lock() {
    echo "Waiting for yum lock to be released..."
    local max_wait=300  # Maximum wait time in seconds
    local wait_time=0
    
    while [ -f /var/run/yum.pid ] && [ $wait_time -lt $max_wait ]; do
        echo "Yum is locked. Waiting... ($wait_time/$max_wait seconds)"
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    if [ $wait_time -ge $max_wait ]; then
        handle_error "Timed out waiting for yum lock to be released"
    fi
    
    echo "Yum lock released or not present. Proceeding..."
}

# Accept Neo4j license agreement
export NEO4J_ACCEPT_LICENSE_AGREEMENT=yes

# Install Java 17 and set as default
echo "Installing Java 17..."
yum install -y java-17-amazon-corretto || handle_error "Failed to install Java 17"
echo "Setting Java 17 as default..."
alternatives --set java $(alternatives --display java | grep 'java-17-amazon-corretto' | grep -o '/usr/lib/jvm/.*java' | head -1) || handle_error "Failed to set Java 17 as default"
java -version

# Import Neo4j GPG key
echo "Importing Neo4j GPG key..."
rpm --import https://debian.neo4j.com/neotechnology.gpg.key || handle_error "Failed to import Neo4j GPG key"

# Configure Neo4j repository
echo "Configuring Neo4j repository..."
cat > /etc/yum.repos.d/neo4j.repo << EOF
[neo4j]
name=Neo4j RPM Repository
baseurl=https://yum.neo4j.com/stable/5
enabled=1
gpgcheck=1
EOF

# Install Neo4j Enterprise
echo "Installing Neo4j Enterprise..."
wait_for_yum_lock
sudo -E yum clean all || echo "Warning: Failed to clean yum cache"
wait_for_yum_lock
sudo -E yum install -y neo4j-enterprise || handle_error "Failed to install Neo4j Enterprise"

# Accept Neo4j license agreement
echo "Accepting Neo4j license agreement..."
sudo -E neo4j-admin server license --accept-commercial || echo "Warning: License acceptance command failed, using direct file creation"
echo "Creating license acceptance file directly..."
sudo mkdir -p /usr/share/neo4j/licenses || handle_error "Failed to create licenses directory"
sudo bash -c 'echo "commercial" > /usr/share/neo4j/licenses/accept-license.txt'
sudo bash -c 'echo "yes" > /usr/share/neo4j/licenses/ACCEPT_LICENSE_AGREEMENT'
sudo chown -R neo4j:neo4j /usr/share/neo4j/licenses || handle_error "Failed to set permissions on licenses directory"

# Create required directories
echo "Creating required directories..."
sudo mkdir -p /etc/neo4j /usr/share/neo4j/conf /usr/share/neo4j/plugins /usr/share/neo4j/licenses /var/lib/neo4j /var/log/neo4j

# Check listening ports
echo "Checking all listening ports:"
sudo netstat -tulpn | grep LISTEN

# Check for SELinux/AppArmor
echo "Checking security modules..."
getenforce || echo "SELinux not installed"
aa-status || echo "AppArmor not installed"

# Check system limits
echo "Checking system limits..."
ulimit -a

# Check network configuration
echo "Checking network configuration..."
ip addr
ip route

# Check for existing processes using ports
echo "Checking for processes using relevant ports..."
ss -tulpn | grep -E ':(5000|7474|7687|59000|59001|59002|59003)' || echo "No processes using relevant ports"

# Configure Neo4j with the private IP we already have from Terraform
echo "Configuring Neo4j with private IP: $PRIVATE_IP"
sudo cat > /etc/neo4j/neo4j.conf << EOF
# Network configuration
server.default_listen_address=0.0.0.0
server.bolt.listen_address=0.0.0.0:7687
server.http.listen_address=0.0.0.0:7474
server.https.listen_address=0.0.0.0:7473
server.bolt.advertised_address=$PRIVATE_IP:7687

# Security settings
dbms.security.auth_enabled=false
initial.dbms.default_database=neo4j

# Completely disable clustering for single instance mode
server.cluster.enabled=false

# Memory configuration - reduced for testing
server.memory.heap.initial_size=512m
server.memory.heap.max_size=512m
server.memory.pagecache.size=512m

# Connectivity settings
dbms.routing.enabled=false
server.bolt.tls_level=DISABLED
server.http.enabled=true
server.https.enabled=false

# Disable strict validation
server.config.strict_validation.enabled=false
EOF

# Verify license files
echo "Verifying license files..."
ls -la /usr/share/neo4j/licenses/
cat /usr/share/neo4j/licenses/accept-license.txt
sudo -u neo4j cat /usr/share/neo4j/licenses/accept-license.txt || echo "Neo4j user cannot read license file"

# Ensure Neo4j user owns all relevant directories
echo "Setting correct permissions..."
sudo chown -R neo4j:neo4j /etc/neo4j /var/lib/neo4j /var/log/neo4j /usr/share/neo4j
sudo chmod -R 755 /etc/neo4j /var/lib/neo4j /var/log/neo4j /usr/share/neo4j

# Create symlink for config file
sudo ln -sf /etc/neo4j/neo4j.conf /usr/share/neo4j/conf/neo4j.conf

# Check for port availability before starting
echo "Checking port availability before starting Neo4j..."
if ss -tulpn | grep -q ':7687'; then echo "WARNING: Port 7687 is already in use"; fi
if ss -tulpn | grep -q ':7474'; then echo "WARNING: Port 7474 is already in use"; fi

# Enable and start Neo4j service
echo "Enabling and starting Neo4j service..."
systemctl enable neo4j || handle_error "Failed to enable Neo4j service"
systemctl start neo4j || handle_error "Failed to start Neo4j service"

# Wait for Neo4j to fully initialize
echo "Waiting for Neo4j to initialize (30 seconds)..."
sleep 30

# Verify Neo4j is running
echo "Verifying Neo4j is running..."
systemctl status neo4j || echo "Warning: Neo4j service status check failed"
ss -tlnp | grep -E ':(7474|7687)' || echo "Warning: Neo4j ports not detected"

# Check for any errors in the logs
echo "Checking Neo4j logs for errors..."
if [ -f /var/log/neo4j/neo4j.log ]; then
    grep -i error /var/log/neo4j/neo4j.log || echo "No errors found in log"
    grep -i exception /var/log/neo4j/neo4j.log || echo "No exceptions found in log"
else
    echo "Warning: Neo4j log file not found"
fi

echo "Neo4j installation and configuration completed"
