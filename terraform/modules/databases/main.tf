# Validate configurations
resource "null_resource" "validations" {
  lifecycle {
    precondition {
      condition     = length(var.subnet_ids) >= 2
      error_message = "At least 2 subnets are required for Neo4j deployment"
    }
    
    precondition {
      condition     = can(regex("^[tr][3-6][.][\\w]+$", var.neo4j_instance_type))
      error_message = "Invalid Neo4j instance type. Must be a valid AWS instance type (e.g., t3.medium, r5.xlarge)"
    }
    
    precondition {
      condition     = var.neo4j_volume_size >= 20 && var.neo4j_volume_size <= 16384
      error_message = "Neo4j volume size must be between 20 and 16384 GB"
    }
  }
}

# Use the data source to access VPC and subnet information
resource "aws_db_subnet_group" "neo4j" {
  name       = "neo4j-subnet-group-${var.environment}"
  subnet_ids = var.subnet_ids

  tags = merge(var.common_tags, {
    Name = "Neo4j DB subnet group"
  })
}

# Latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# VPC Endpoint for CloudWatch Logs
resource "aws_vpc_endpoint" "logs" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.subnet_ids
  security_group_ids = [aws_security_group.neo4j_internal.id]
  private_dns_enabled = true

  tags = merge(var.common_tags, {
    Name = "CloudWatch-Logs-${var.environment}"
  })
}

# Security group for Neo4j internal communication
resource "aws_security_group" "neo4j_internal" {
  name        = "neo4j-internal-${var.environment}"
  description = "Security group for internal Neo4j communication"
  vpc_id      = var.vpc_id

  ingress {
    description = "Neo4j Bolt Internal"
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description     = "Neo4j Bolt from App"
    from_port       = 7687
    to_port         = 7687
    protocol        = "tcp"
    security_groups = [var.ecs_tasks_security_group_id]  # Allow Bolt from ECS tasks
  }

  ingress {
    description = "Neo4j Bolt Cross-Subnet"
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]  # Allow Bolt traffic within the VPC
  }

  ingress {
    description = "Neo4j HTTP"
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "Neo4j HTTPS"
    from_port   = 7473
    to_port     = 7473
    protocol    = "tcp"
    self        = true
  }

  # Allow HTTPS for AWS services (CloudWatch, SSM)
  ingress {
    description     = "HTTPS from ECS tasks"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.ecs_tasks_security_group_id]
  }

  ingress {
    description = "HTTPS for VPC Endpoints"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "Neo4j Internal Communication - ${var.environment}"
  })
}

# CloudWatch Log Group for Neo4j logs
resource "aws_cloudwatch_log_group" "neo4j_logs" {
  name              = "/aws/ec2/neo4j/${var.environment}"
  retention_in_days = 14

  tags = var.common_tags
}

# Create IAM role for CloudWatch access
resource "aws_iam_role" "neo4j_role" {
  name = "neo4j-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Add required AWS service permissions
resource "aws_iam_role_policy_attachment" "neo4j_cloudwatch_policy" {
  role       = aws_iam_role.neo4j_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "neo4j_ssm_policy" {
  role       = aws_iam_role.neo4j_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "neo4j_ssm_policy_full" {
  role       = aws_iam_role.neo4j_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMFullAccess"
}

resource "aws_iam_instance_profile" "neo4j_instance_profile" {
  name = "neo4j-instance-profile-${var.environment}"
  role = aws_iam_role.neo4j_role.name
}

# Helper to create user data script
locals {
  neo4j_install_script = <<EOF
#!/bin/bash
set -e

# Setup logging
exec > /var/log/neo4j-setup.log 2>&1

# Set environment for CloudWatch agent
export ENVIRONMENT="${var.environment}"

# System setup
echo "=== System Initialization ==="
echo "Waiting for initial system updates to complete..."
until ! pgrep -f "yum" > /dev/null; do
    echo "System is updating, waiting 30 seconds..."
    sleep 30
done

echo "=== Java Installation ==="
amazon-linux-extras install java-openjdk11 -y || {
    echo "Failed to install Java"
    exit 1
}

echo "=== Neo4j Repository Setup ==="
rpm --import https://debian.neo4j.com/neotechnology.gpg.key
cat > /etc/yum.repos.d/neo4j.repo << 'REPO'
[neo4j]
name=Neo4j RPM Repository
baseurl=https://yum.neo4j.com/stable/5
enabled=1
gpgcheck=1
REPO

echo "=== Installing Required Packages ==="
echo "Installing Neo4j Enterprise, CloudWatch agent, and SSM agent..."
yum install -y neo4j-enterprise amazon-cloudwatch-agent amazon-ssm-agent || {
    echo "Installation failed. Diagnostic information:"
    echo "=== YUM Log ==="
    cat /var/log/yum.log
    echo "=== Neo4j Repository ==="
    cat /etc/yum.repos.d/neo4j.repo
    echo "=== System Memory ==="
    free -m
    echo "=== Disk Space ==="
    df -h
    exit 1
}

# Verify Neo4j package installation
if ! rpm -q neo4j-enterprise > /dev/null; then
    echo "Neo4j package not found after installation"
    exit 1
fi

# Create required directories if they don't exist
echo "Creating Neo4j directories..."
mkdir -p /var/lib/neo4j /var/log/neo4j

# Download and install APOC Core plugin
mkdir -p /var/lib/neo4j/plugins
curl -L https://github.com/neo4j/apoc/releases/download/5.26.1/apoc-5.26.1-core.jar -o /var/lib/neo4j/plugins/apoc.jar
chown -R neo4j:neo4j /var/lib/neo4j/plugins
echo "APOC plugin downloaded and configured."

# Enable APOC procedures
echo "dbms.security.procedures.unrestricted=apoc.*" >> /etc/neo4j/neo4j.conf
echo "dbms.security.procedures.allowlist=apoc.*" >> /etc/neo4j/neo4j.conf

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

# Calculate memory settings
total_mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
total_mem_mb=$((total_mem_kb / 1024))
heap_size_mb=$((total_mem_mb * 10 / 100))  # Reduced from 15% to 10%
page_cache_mb=$((total_mem_mb * 20 / 100))  # Reduced from 30% to 20%
off_heap_mb=$((total_mem_mb * 5 / 100))    # Added explicit off-heap calculation at 5%

# Apply minimum and maximum limits
heap_size_mb=$(( heap_size_mb < 512 ? 512 : heap_size_mb ))      # Reduced min from 1024m to 512m
heap_size_mb=$(( heap_size_mb > 16384 ? 16384 : heap_size_mb ))  # Reduced max from 31744m to 16384m
page_cache_mb=$(( page_cache_mb < 1024 ? 1024 : page_cache_mb )) # Reduced min from 2048m to 1024m
off_heap_mb=$(( off_heap_mb < 256 ? 256 : off_heap_mb ))         # Set min off-heap to 256m

# Configure Neo4j using printf to avoid heredoc issues
echo "Configuring Neo4j with memory settings: heap=$heap_size_mb MB, page_cache=$page_cache_mb MB"
cat > /etc/neo4j/neo4j.conf << 'NEOCONFIG'
# Network configuration
dbms.default_listen_address=0.0.0.0
dbms.connector.bolt.listen_address=:7687
dbms.connector.http.listen_address=:7474
dbms.connector.https.listen_address=:7473
dbms.default_advertised_address=0.0.0.0

# Security settings
dbms.security.auth_enabled=false
dbms.security.allow_csv_import_from_file_urls=false

# Memory configuration
server.memory.heap.initial_size=$${heap_size_mb}m
server.memory.heap.max_size=$${heap_size_mb}m
server.memory.pagecache.size=$${page_cache_mb}m
server.memory.off_heap.max_size=$${off_heap_mb}m

# Performance settings
server.jvm.additional=-XX:+UseG1GC
server.jvm.additional=-XX:G1HeapRegionSize=4m
server.jvm.additional=-XX:+UseStringDeduplication
server.jvm.additional=-XX:MaxGCPauseMillis=200
server.jvm.additional=-XX:+ExitOnOutOfMemoryError
server.jvm.additional=-XX:+HeapDumpOnOutOfMemoryError
server.jvm.additional=-XX:HeapDumpPath=/var/log/neo4j/

# Logging settings
db.logs.debug.level=INFO
db.logs.query.enabled=true
db.logs.query.rotation.keep_number=7
db.logs.query.rotation.size=20m

# Transaction and operation settings
db.transaction.timeout=15m
db.transaction.concurrent.maximum=100
server.memory.pagecache.flush.buffer.enabled=true
server.memory.pagecache.flush.buffer.size_in_pages=100
NEOCONFIG

# Replace placeholders with actual values
sed -i "s/\$${heap_size_mb}/$heap_size_mb/g" /etc/neo4j/neo4j.conf
sed -i "s/\$${page_cache_mb}/$page_cache_mb/g" /etc/neo4j/neo4j.conf
sed -i "s/\$${off_heap_mb}/$off_heap_mb/g" /etc/neo4j/neo4j.conf

# Verify configuration
echo "Neo4j configuration:"
cat /etc/neo4j/neo4j.conf

# Set Neo4j license
echo "${var.neo4j_enterprise_license}" > /etc/neo4j/neo4j.license

# Set permissions
chown -R neo4j:neo4j /var/lib/neo4j /var/log/neo4j
chmod 600 /etc/neo4j/neo4j.conf

# Start Neo4j and verify it's running
echo "Enabling and starting Neo4j service..."
systemctl enable neo4j
systemctl start neo4j || {
    echo "Failed to start Neo4j service. Checking logs..."
    journalctl -u neo4j -n 100
    echo "Checking Neo4j configuration..."
    cat /etc/neo4j/neo4j.conf
    exit 1
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
    exit 0
  fi
  echo "Waiting for Neo4j to be ready... ($i/30)"
  sleep 10
done

echo "Neo4j failed to start properly"
journalctl -u neo4j -n 100
exit 1
EOF
}

# Neo4j instance for ledgerSpace
resource "aws_instance" "neo4j_ledger" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id, aws_security_group.neo4j_internal.id]
  subnet_id              = var.subnet_ids[0]
  monitoring             = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.neo4j_volume_size
    iops        = 3000
    throughput  = 125
    encrypted   = true

    tags = merge(var.common_tags, {
      Name = "Neo4j-LedgerSpace-Volume-${var.environment}"
    })
  }

  user_data = local.neo4j_install_script

  tags = merge(var.common_tags, {
    Name = "Neo4j-LedgerSpace-${var.environment}"
  })

  iam_instance_profile = aws_iam_instance_profile.neo4j_instance_profile.name

  lifecycle {
    create_before_destroy = false
  }
}

# Neo4j instance for searchSpace
resource "aws_instance" "neo4j_search" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id, aws_security_group.neo4j_internal.id]
  subnet_id              = var.subnet_ids[1]
  monitoring             = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.neo4j_volume_size
    iops        = 3000
    throughput  = 125
    encrypted   = true

    tags = merge(var.common_tags, {
      Name = "Neo4j-SearchSpace-Volume-${var.environment}"
    })
  }

  user_data = local.neo4j_install_script

  tags = merge(var.common_tags, {
    Name = "Neo4j-SearchSpace-${var.environment}"
  })

  iam_instance_profile = aws_iam_instance_profile.neo4j_instance_profile.name

  lifecycle {
    create_before_destroy = false
  }
}

# Outputs
output "neo4j_ledger_instance_id" {
  description = "The ID of the Neo4j LedgerSpace instance"
  value       = aws_instance.neo4j_ledger.id
}

output "neo4j_search_instance_id" {
  description = "The ID of the Neo4j SearchSpace instance"
  value       = aws_instance.neo4j_search.id
}

output "neo4j_ledger_private_ip" {
  description = "The private IP of the Neo4j LedgerSpace instance"
  value       = aws_instance.neo4j_ledger.private_ip
}

output "neo4j_search_private_ip" {
  description = "The private IP of the Neo4j SearchSpace instance"
  value       = aws_instance.neo4j_search.private_ip
}

output "neo4j_ledger_bolt_endpoint" {
  description = "The Bolt endpoint for the Neo4j LedgerSpace instance"
  value       = "bolt://${aws_instance.neo4j_ledger.private_ip}:7687"
}

output "neo4j_search_bolt_endpoint" {
  description = "The Bolt endpoint for the Neo4j SearchSpace instance"
  value       = "bolt://${aws_instance.neo4j_search.private_ip}:7687"
}
