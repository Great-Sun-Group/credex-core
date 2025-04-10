#!/bin/bash
set -e

# Setup logging
exec > /var/log/neo4j-setup.log 2>&1

# Check for required environment variables
if [ -z "$ENVIRONMENT" ] || [ -z "$AWS_REGION" ] || [ -z "$NEO4J_LICENSE" ]; then
    echo "Error: Required environment variables are not set."
    echo "ENVIRONMENT: $ENVIRONMENT"
    echo "AWS_REGION: $AWS_REGION"
    echo "NEO4J_LICENSE: ${NEO4J_LICENSE:0:10}... (truncated for security)"
    exit 1
fi

# Function to send installation status to CloudWatch
send_status_to_cloudwatch() {
    local status=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create a temporary JSON file
    cat > /tmp/cloudwatch-event.json << EOL
{
  "environment": "${ENVIRONMENT}",
  "instance_id": "$$(curl -s http://169.254.169.254/latest/meta-data/instance-id)",
  "status": "$status",
  "message": "$message",
  "timestamp": "$timestamp"
}
EOL
    
    # Try to send the event to CloudWatch
    aws cloudwatch put-metric-data \
      --namespace "Neo4j/Installation" \
      --metric-name "InstallationStatus" \
      --dimensions Environment=${ENVIRONMENT},InstanceId=$$(curl -s http://169.254.169.254/latest/meta-data/instance-id) \
      --value $$([ "$status" == "SUCCESS" ] && echo 1 || echo 0) \
      --region ${AWS_REGION} || true
      
    # Also log to the instance's console output (retrievable via AWS API)
    echo "NEO4J_INSTALL_STATUS: $status - $message" > /dev/console
}

# Log environment information
echo "=== Environment Information ==="
echo "Environment: $ENVIRONMENT"
echo "AWS Region: $AWS_REGION"
echo "Instance ID: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)"

# System setup
echo "=== System Initialization ==="
echo "Waiting for initial system updates to complete..."
until ! pgrep -f "yum" > /dev/null; do
    echo "System is updating, waiting 30 seconds..."
    sleep 30
done

# Install AWS CLI and CloudWatch agent early for logging
echo "=== Installing AWS CLI and CloudWatch Agent ==="
yum install -y aws-cli amazon-cloudwatch-agent || {
    echo "Failed to install AWS CLI or CloudWatch agent"
    send_status_to_cloudwatch "FAILED" "Failed to install AWS CLI or CloudWatch agent"
    exit 1
}

# Install SSM agent
echo "=== Installing SSM Agent ==="
# First check if SSM agent is already installed
if rpm -q amazon-ssm-agent > /dev/null; then
    echo "SSM agent is already installed"
else
    # Download and install the SSM agent
    echo "Downloading SSM agent..."
    mkdir -p /tmp/ssm
    cd /tmp/ssm
    wget https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
    echo "Installing SSM agent..."
    yum install -y amazon-ssm-agent.rpm
    cd -
    rm -rf /tmp/ssm
fi

# Configure and start SSM agent
echo "=== Configuring and Starting SSM Agent ==="
# Ensure SSM agent is enabled and started
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Verify SSM agent is running
echo "=== Verifying SSM Agent Status ==="
if systemctl is-active amazon-ssm-agent > /dev/null; then
    echo "SSM agent is running"
else
    echo "SSM agent is not running, attempting to restart..."
    systemctl restart amazon-ssm-agent
    sleep 5
    if systemctl is-active amazon-ssm-agent > /dev/null; then
        echo "SSM agent is now running after restart"
    else
        echo "Failed to start SSM agent"
        send_status_to_cloudwatch "WARNING" "Failed to start SSM agent"
        # Continue anyway, as we'll try to fix it later
    fi
fi

# Configure early CloudWatch logging - with more robust setup
mkdir -p /opt/aws/amazon-cloudwatch-agent/
cat > /opt/aws/amazon-cloudwatch-agent/early-config.json << 'CWCONFIG'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/neo4j-setup.log",
            "log_group_name": "/aws/ec2/neo4j/$${ENVIRONMENT}",
            "log_stream_name": "$$(curl -s http://169.254.169.254/latest/meta-data/instance-id)-setup",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/var/log/cloud-init.log",
            "log_group_name": "/aws/ec2/neo4j/$${ENVIRONMENT}",
            "log_stream_name": "$$(curl -s http://169.254.169.254/latest/meta-data/instance-id)-cloud-init",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/var/log/cloud-init-output.log",
            "log_group_name": "/aws/ec2/neo4j/$${ENVIRONMENT}",
            "log_stream_name": "$$(curl -s http://169.254.169.254/latest/meta-data/instance-id)-cloud-init-output",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          }
        ]
      }
    },
    "force_flush_interval": 15
  }
}
CWCONFIG

# Create log group explicitly - using bash variables to avoid Terraform interpolation
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
aws logs create-log-group --log-group-name "/aws/ec2/neo4j/$ENVIRONMENT" --region $AWS_REGION || true
aws logs create-log-stream --log-group-name "/aws/ec2/neo4j/$ENVIRONMENT" --log-stream-name "$INSTANCE_ID-setup" --region $AWS_REGION || true

# Start CloudWatch agent with early configuration and verify it's running
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/early-config.json
systemctl status amazon-cloudwatch-agent || systemctl start amazon-cloudwatch-agent

# Test CloudWatch logging
echo "Testing CloudWatch logging at $(date)" >> /var/log/neo4j-setup.log
sleep 5  # Give CloudWatch agent time to send initial logs

# Test S3 connectivity to Neo4j repository
echo "=== Testing S3 Connectivity ==="
echo "Testing connectivity to Neo4j repository..."
aws s3 ls s3://yum.neo4j.com/ --region ${AWS_REGION} || {
    echo "WARNING: Cannot access Neo4j repository via S3. This may indicate an S3 VPC endpoint policy issue."
    echo "Attempting to diagnose S3 endpoint issues..."
    
    # Check if we can reach other S3 buckets
    echo "Testing access to S3 service..."
    aws s3 ls --region ${AWS_REGION}
    
    # Check VPC endpoint configuration
    echo "Checking VPC endpoints..."
    aws ec2 describe-vpc-endpoints --region ${AWS_REGION} --query "VpcEndpoints[?ServiceName=='com.amazonaws.${AWS_REGION}.s3'].VpcEndpointId" --output text
    
    # Log the warning but continue - we'll try the installation anyway
    send_status_to_cloudwatch "WARNING" "S3 connectivity issue detected - may affect Neo4j installation"
}

echo "=== Java Installation ==="
amazon-linux-extras install java-openjdk17 -y || yum install -y java-17-amazon-corretto || {
    echo "Failed to install Java"
    send_status_to_cloudwatch "FAILED" "Failed to install Java"
    exit 1
}

echo "=== Neo4j Repository Setup ==="
rpm --import https://debian.neo4j.com/neotechnology.gpg.key || {
    echo "Failed to import Neo4j GPG key"
    send_status_to_cloudwatch "FAILED" "Failed to import Neo4j GPG key"
    exit 1
}

cat > /etc/yum.repos.d/neo4j.repo << 'REPO'
[neo4j]
name=Neo4j RPM Repository
baseurl=https://yum.neo4j.com/stable/5
enabled=1
gpgcheck=1
REPO

# Verify repository configuration
echo "Verifying Neo4j repository configuration..."
yum repolist | grep neo4j || {
    echo "Neo4j repository not properly configured"
    send_status_to_cloudwatch "FAILED" "Neo4j repository not properly configured"
    exit 1
}

echo "=== Installing Required Packages ==="
echo "Installing Neo4j Enterprise..."

# First check if we can access the Neo4j repository
echo "Testing direct HTTPS access to Neo4j repository..."
curl -v https://yum.neo4j.com/stable/5/ || {
    echo "WARNING: Cannot access Neo4j repository via HTTPS"
    send_status_to_cloudwatch "WARNING" "Cannot access Neo4j repository via HTTPS"
}

echo "Testing S3 access to Neo4j repository..."
aws s3 ls s3://yum.neo4j.com/ --region $AWS_REGION || {
    echo "WARNING: Cannot access Neo4j repository via S3"
    send_status_to_cloudwatch "WARNING" "Cannot access Neo4j repository via S3"
    
    # Check S3 VPC endpoint policy
    echo "Checking S3 VPC endpoint policy..."
    ENDPOINT_ID=$(aws ec2 describe-vpc-endpoints --region $AWS_REGION --filters "Name=service-name,Values=com.amazonaws.$AWS_REGION.s3" --query "VpcEndpoints[0].VpcEndpointId" --output text)
    if [ -n "$ENDPOINT_ID" ]; then
        echo "S3 VPC endpoint found: $ENDPOINT_ID"
        aws ec2 describe-vpc-endpoints --region $AWS_REGION --vpc-endpoint-ids $ENDPOINT_ID --query "VpcEndpoints[0].PolicyDocument" --output text || echo "Could not retrieve endpoint policy"
    else
        echo "No S3 VPC endpoint found"
    fi
}

# Set environment variable to accept Neo4j license
export NEO4J_ACCEPT_LICENSE_AGREEMENT=yes

# Try to install Neo4j with detailed error capture
echo "Attempting to install Neo4j Enterprise..."
yum install -y neo4j-enterprise || {
    echo "Neo4j installation failed. Detailed diagnostic information:"
    echo "=== YUM Log ==="
    cat /var/log/yum.log
    echo "=== YUM Error Log ==="
    cat /var/log/yum.log | grep -i error
    echo "=== Neo4j Repository ==="
    cat /etc/yum.repos.d/neo4j.repo
    echo "=== System Memory ==="
    free -m
    echo "=== Disk Space ==="
    df -h
    echo "=== Network Connectivity Test ==="
    curl -v https://yum.neo4j.com/stable/5/
    echo "=== S3 Endpoint Test ==="
    aws s3 ls s3://yum.neo4j.com/ --region $AWS_REGION || echo "S3 endpoint access failed"
    echo "=== DNS Resolution Test ==="
    nslookup yum.neo4j.com || echo "DNS resolution failed"
    echo "=== Route to Neo4j Repository ==="
    traceroute yum.neo4j.com || echo "Traceroute failed"
    
    # Try alternative installation method
    echo "Attempting alternative installation method..."
    mkdir -p /tmp/neo4j
    cd /tmp/neo4j
    
    # Try to download directly
    echo "Downloading Neo4j package directly..."
    curl -L -O https://neo4j.com/artifact.php?name=neo4j-enterprise-5.13.0-unix.tar.gz || {
        echo "Direct download failed"
        send_status_to_cloudwatch "FAILED" "Neo4j installation failed - all methods exhausted"
        exit 1
    }
    
    # Extract and install manually
    echo "Extracting Neo4j package..."
    tar -xf neo4j-enterprise-5.13.0-unix.tar.gz
    echo "Installing Neo4j manually..."
    cp -r neo4j-enterprise-5.13.0 /var/lib/neo4j
    
    # Create service file
    echo "Creating Neo4j service..."
    cat > /etc/systemd/system/neo4j.service << 'NEOSERVICE'
[Unit]
Description=Neo4j Graph Database
After=network.target

[Service]
ExecStart=/var/lib/neo4j/bin/neo4j start
ExecStop=/var/lib/neo4j/bin/neo4j stop
Type=forking
User=neo4j
Group=neo4j
Restart=on-failure

[Install]
WantedBy=multi-user.target
NEOSERVICE

    # Create neo4j user if it doesn't exist
    id -u neo4j &>/dev/null || useradd -r -d /var/lib/neo4j neo4j
    
    # Set permissions
    chown -R neo4j:neo4j /var/lib/neo4j
    
    # Enable service
    systemctl daemon-reload
    systemctl enable neo4j
    
    # Clean up
    cd -
    rm -rf /tmp/neo4j
    
    send_status_to_cloudwatch "WARNING" "Neo4j installed via alternative method"
}

# Verify Neo4j package installation
if ! rpm -q neo4j-enterprise > /dev/null; then
    echo "Neo4j package not found after installation"
    exit 1
fi

# Create required directories if they don't exist
echo "Creating Neo4j directories..."
mkdir -p /var/lib/neo4j /var/log/neo4j

# Configure CloudWatch
cat > /opt/aws/amazon-cloudwatch-agent/config.json << 'CWCONFIG'
{
  "agent": {
    "metrics_collection_interval": 60
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/neo4j/neo4j.log",
            "log_group_name": "/aws/ec2/neo4j/$${ENVIRONMENT}",
            "log_stream_name": "$${instance_id}",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          }
        ]
      }
    }
  },
  "metrics": {
    "append_dimensions": {
      "InstanceId": "$${aws:InstanceId}"
    },
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"],
        "metrics_collection_interval": 60
      }
    }
  }
}
CWCONFIG

# Start required agents
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/config.json
systemctl enable amazon-cloudwatch-agent amazon-ssm-agent
systemctl start amazon-cloudwatch-agent amazon-ssm-agent

# Verify agents are running
echo "=== Verifying Agent Status ==="
systemctl status amazon-cloudwatch-agent
systemctl status amazon-ssm-agent

# Configure Neo4j with reduced memory settings
echo "Configuring Neo4j with reduced memory settings"
cat > /etc/neo4j/neo4j.conf << 'NEOCONFIG'
# Network configuration
server.default_listen_address=0.0.0.0
server.bolt.listen_address=0.0.0.0:7687
server.http.listen_address=0.0.0.0:7474
server.https.listen_address=0.0.0.0:7473

# Security settings
dbms.security.auth_enabled=false
dbms.security.allow_csv_import_from_file_urls=false

# Memory configuration
server.memory.heap.initial_size=512m
server.memory.heap.max_size=512m
server.memory.pagecache.size=512m
server.memory.off_heap.transaction_max_size=128m

# Performance settings
server.jvm.additional=-XX:+UseG1GC
server.jvm.additional=-XX:G1HeapRegionSize=4m
server.jvm.additional=-XX:+UseStringDeduplication
server.jvm.additional=-XX:MaxGCPauseMillis=200
server.jvm.additional=-XX:+ExitOnOutOfMemoryError
server.jvm.additional=-XX:+HeapDumpOnOutOfMemoryError
server.jvm.additional=-XX:HeapDumpPath=/var/log/neo4j/

# Logging settings
db.logs.query.enabled=INFO

# Transaction and operation settings
db.transaction.timeout=15m
db.transaction.concurrent.maximum=100
server.memory.pagecache.flush.buffer.enabled=true
server.memory.pagecache.flush.buffer.size_in_pages=100

# Disable strict validation
server.config.strict_validation.enabled=false
NEOCONFIG

# Verify configuration
echo "Neo4j configuration:"
cat /etc/neo4j/neo4j.conf

# Set Neo4j license
echo "${NEO4J_LICENSE}" > /etc/neo4j/neo4j.license

# Set permissions
chown -R neo4j:neo4j /var/lib/neo4j /var/log/neo4j /etc/neo4j
chmod 600 /etc/neo4j/neo4j.conf

# Start Neo4j and verify it's running
echo "Enabling and starting Neo4j service..."
systemctl enable neo4j
systemctl start neo4j || {
    echo "Failed to start Neo4j service. Detailed diagnostics:"
    echo "=== Neo4j Service Status ==="
    systemctl status neo4j
    echo "=== Neo4j Service Logs ==="
    journalctl -u neo4j -n 100
    echo "=== Neo4j Configuration ==="
    cat /etc/neo4j/neo4j.conf
    echo "=== Neo4j Data Directory ==="
    ls -la /var/lib/neo4j/
    echo "=== Neo4j Log Directory ==="
    ls -la /var/log/neo4j/
    echo "=== Neo4j Permissions ==="
    ls -la /etc/neo4j/
    echo "=== Java Version ==="
    java -version
    echo "=== System Limits ==="
    ulimit -a
    
    # Try to fix common issues
    echo "Attempting to fix common issues..."
    
    # Fix permissions
    echo "Fixing permissions..."
    chown -R neo4j:neo4j /var/lib/neo4j /var/log/neo4j /etc/neo4j
    chmod 755 /var/lib/neo4j /var/log/neo4j
    
    # Try starting again
    echo "Trying to start Neo4j again..."
    systemctl start neo4j || {
        send_status_to_cloudwatch "FAILED" "Neo4j service failed to start after fixes"
        exit 1
    }
}

# Give Neo4j time to initialize
echo "Waiting for Neo4j to initialize..."
sleep 30  # Increased from 10 to 30 seconds for better startup chance

# Check if Neo4j is running and listening
echo "Checking Neo4j service status..."
systemctl status neo4j
echo "Checking Neo4j ports..."
netstat -tlpn | grep neo4j

# Wait for Neo4j to be ready
echo "Waiting for Neo4j bolt connection..."
for i in {1..30}; do
  if cypher-shell --non-interactive "RETURN 1;" >/dev/null 2>&1; then
    echo "Neo4j is ready"
    send_status_to_cloudwatch "SUCCESS" "Neo4j is ready and accepting connections"
    
    # Verify Neo4j is listening on the correct ports
    echo "Verifying Neo4j ports..."
    netstat -tlpn | grep neo4j
    
    # Create a test node to verify database functionality
    echo "Creating test node..."
    cypher-shell --non-interactive "CREATE (n:Test {name: 'test'}) RETURN n;" || echo "Failed to create test node"
    
    exit 0
  fi
  echo "Waiting for Neo4j to be ready... ($i/30)"
  sleep 10
done

echo "Neo4j failed to start properly. Final diagnostics:"
echo "=== Neo4j Service Status ==="
systemctl status neo4j
echo "=== Neo4j Service Logs ==="
journalctl -u neo4j -n 100
echo "=== Neo4j Process ==="
ps aux | grep neo4j
echo "=== Neo4j Ports ==="
netstat -tlpn | grep neo4j || echo "No Neo4j ports found"
echo "=== System Resources ==="
free -m
df -h
echo "=== Last 50 lines of system log ==="
tail -n 50 /var/log/messages || tail -n 50 /var/log/syslog || echo "System logs not available"

send_status_to_cloudwatch "FAILED" "Neo4j failed to start properly after 30 attempts"
exit 1
