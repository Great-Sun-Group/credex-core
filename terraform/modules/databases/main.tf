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

# Additional security group for internal Neo4j communication
resource "aws_security_group" "neo4j_internal" {
  name        = "neo4j-internal-${var.environment}"
  description = "Security group for internal Neo4j communication"
  vpc_id      = var.vpc_id

  ingress {
    description = "Neo4j Bolt"
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    self        = true
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

# Helper to create user data script
locals {
  neo4j_install_script = <<-EOF
              #!/bin/bash
              set -e
              exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

              echo "Starting Neo4j installation and configuration..."

              # Update the system and install required packages
              echo "Updating system packages..."
              yum update -y || {
                echo "Failed to update system packages"
                exit 1
              }

              echo "Installing required packages..."
              yum install -y net-tools || {
                echo "Failed to install net-tools"
                exit 1
              }

              # Install Java
              echo "Installing Java..."
              amazon-linux-extras install java-openjdk11 -y || {
                echo "Failed to install Java"
                exit 1
              }

              # Install CloudWatch agent
              echo "Installing CloudWatch agent..."
              yum install -y amazon-cloudwatch-agent || {
                echo "Failed to install CloudWatch agent"
                exit 1
              }

              # Create CloudWatch agent configuration
              echo "Configuring CloudWatch agent..."
              mkdir -p /opt/aws/amazon-cloudwatch-agent/bin/
              cat > /opt/aws/amazon-cloudwatch-agent/bin/config.json << CWCONF
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
            "file_path": "/var/log/neo4j/neo4j.log",
            "log_group_name": "/aws/ec2/neo4j/${var.environment}",
            "log_stream_name": "{instance_id}/neo4j",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/neo4j/${var.environment}",
            "log_stream_name": "{instance_id}/user-data",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          }
        ]
      }
    }
  },
  "metrics": {
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"]
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"]
      }
    }
  }
}
CWCONF

              # Start CloudWatch agent
              echo "Starting CloudWatch agent..."
              /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json || {
                echo "Failed to configure CloudWatch agent"
                exit 1
              }
              
              systemctl enable amazon-cloudwatch-agent || {
                echo "Failed to enable CloudWatch agent"
                exit 1
              }
              
              systemctl start amazon-cloudwatch-agent || {
                echo "Failed to start CloudWatch agent"
                exit 1
              }

              # Add Neo4j repository
              echo "Adding Neo4j repository..."
              rpm --import https://debian.neo4j.com/neotechnology.gpg.key || {
                echo "Failed to import Neo4j GPG key"
                exit 1
              }
              cat << REPO > /etc/yum.repos.d/neo4j.repo
              [neo4j]
              name=Neo4j RPM Repository
              baseurl=https://yum.neo4j.com/stable
              enabled=1
              gpgcheck=1
              REPO

              # Install Neo4j
              echo "Installing Neo4j..."
              yum install neo4j-enterprise -y || {
                echo "Failed to install Neo4j"
                exit 1
              }

              # Configure Neo4j
              echo "Configuring Neo4j..."
              
              # Basic configuration
              cat > /etc/neo4j/neo4j.conf << NEOCONF
              # Network configuration
              dbms.default_listen_address=0.0.0.0
              dbms.connector.bolt.listen_address=:7687
              dbms.connector.http.listen_address=:7474
              dbms.connector.https.listen_address=:7473
              
              # Security settings
              dbms.security.auth_enabled=true
              dbms.security.allow_csv_import_from_file_urls=false
              
              # Transaction logs configuration
              dbms.tx_log.rotation.retention_policy=1 days
              dbms.tx_log.rotation.size=100M
              
              # Logging configuration
              dbms.logs.query.enabled=true
              dbms.logs.query.rotation.keep_number=7
              dbms.logs.query.rotation.size=20m
              
              # Bolt connection timeout
              dbms.connector.bolt.thread_pool_min_size=5
              dbms.connector.bolt.thread_pool_max_size=40
              dbms.connector.bolt.thread_pool_keep_alive=5m
              
              # System resource settings
              dbms.memory.use_memrec=true
              dbms.jvm.additional=-XX:+ExitOnOutOfMemoryError
              dbms.jvm.additional=-XX:+HeapDumpOnOutOfMemoryError
              dbms.jvm.additional=-XX:HeapDumpPath=/var/log/neo4j/
              NEOCONF
              
              # Set Neo4j license
              echo "${var.neo4j_enterprise_license}" > /etc/neo4j/neo4j.license || {
                echo "Failed to set Neo4j license"
                exit 1
              }
              
              # Create log directory with proper permissions
              mkdir -p /var/log/neo4j
              chown -R neo4j:neo4j /var/log/neo4j
              chmod 755 /var/log/neo4j

              # Configure memory settings more conservatively
              total_mem_kb=$$(grep MemTotal /proc/meminfo | awk '{print $$2}')
              total_mem_mb=$$(($total_mem_kb / 1024))
              
              # More conservative memory allocation:
              # - 20% for heap (instead of 25%)
              # - 40% for page cache (instead of 50%)
              # This leaves more room for OS and other processes
              heap_size_mb=$$(($total_mem_mb / 5))
              page_cache_mb=$$(($total_mem_mb * 2 / 5))
              
              # Ensure minimum values
              heap_size_mb=$$(( heap_size_mb < 1024 ? 1024 : heap_size_mb ))
              page_cache_mb=$$(( page_cache_mb < 2048 ? 2048 : page_cache_mb ))
              
              # Add memory settings to neo4j.conf
              cat << CONF >> /etc/neo4j/neo4j.conf
              # Memory settings
              dbms.memory.heap.initial_size=$${heap_size_mb}m
              dbms.memory.heap.max_size=$${heap_size_mb}m
              dbms.memory.pagecache.size=$${page_cache_mb}m
              
              # Performance tuning
              dbms.memory.off_heap.max_size=2g
              dbms.jvm.additional=-XX:+UseG1GC
              dbms.jvm.additional=-XX:G1HeapRegionSize=16m
              dbms.jvm.additional=-XX:+UseGCLogFileRotation
              dbms.jvm.additional=-XX:NumberOfGCLogFiles=5
              dbms.jvm.additional=-XX:GCLogFileSize=20m
              CONF

              # Start Neo4j with better error handling
              echo "Starting Neo4j service..."
              systemctl enable neo4j || {
                echo "Failed to enable Neo4j service"
                journalctl -u neo4j -n 50
                exit 1
              }
              
              systemctl start neo4j || {
                echo "Failed to start Neo4j service"
                systemctl status neo4j
                journalctl -u neo4j -n 50
                exit 1
              }

              # More comprehensive verification with better logging
              echo "Verifying Neo4j startup..."
              max_attempts=30  # Increased from 12 to 30
              attempt=1
              
              while [ $attempt -le $max_attempts ]; do
                echo "Verification attempt $attempt/$max_attempts..."
                
                # Check service status
                if ! systemctl is-active neo4j >/dev/null 2>&1; then
                  echo "Neo4j service is not active"
                  systemctl status neo4j
                  journalctl -u neo4j -n 50
                  sleep 10
                  attempt=$((attempt + 1))
                  continue
                fi
                
                # Check ports
                if ! nc -z localhost 7687; then
                  echo "Bolt port 7687 is not accessible"
                  netstat -plnt | grep 7687 || true
                  sleep 10
                  attempt=$((attempt + 1))
                  continue
                fi
                
                # Check if Neo4j is responding to basic queries
                if cypher-shell -u neo4j -p neo4j --non-interactive "RETURN 1;" >/dev/null 2>&1; then
                  # Change default password after successful connection
                  echo "Setting secure password..."
                  cypher-shell -u neo4j -p neo4j "ALTER CURRENT USER SET PASSWORD FROM 'neo4j' TO 'Neo4j@${var.environment}'" || {
                    echo "Failed to change default password"
                    exit 1
                  }
                  echo "Neo4j is fully operational"
                  exit 0
                else
                  echo "Neo4j is not responding to queries"
                  sleep 10
                  attempt=$((attempt + 1))
                  continue
                fi
              done

              # Collect comprehensive diagnostics if startup fails
              echo "Neo4j failed to start properly after $max_attempts attempts"
              echo "System Status:"
              free -m
              df -h
              echo "Neo4j Status:"
              systemctl status neo4j
              echo "Neo4j Logs:"
              journalctl -u neo4j -n 100
              echo "Network Status:"
              netstat -plnt
              exit 1
              EOF
}

# Create IAM role and instance profile for SSM access
resource "aws_iam_role" "neo4j_ssm_role" {
  name = "neo4j-ssm-role-${var.environment}"

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

# Add CloudWatch monitoring permissions
resource "aws_iam_role_policy_attachment" "neo4j_cloudwatch_policy" {
  role       = aws_iam_role.neo4j_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "neo4j_ssm_policy" {
  role       = aws_iam_role.neo4j_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "neo4j_instance_profile" {
  name = "neo4j-instance-profile-${var.environment}"
  role = aws_iam_role.neo4j_ssm_role.name
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

  # Add IAM instance profile for SSM access
  iam_instance_profile = aws_iam_instance_profile.neo4j_instance_profile.name

  lifecycle {
    create_before_destroy = false # Prevent instance replacement during verification
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

  # Add IAM instance profile for SSM access
  iam_instance_profile = aws_iam_instance_profile.neo4j_instance_profile.name

  lifecycle {
    create_before_destroy = false # Prevent instance replacement during verification
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
