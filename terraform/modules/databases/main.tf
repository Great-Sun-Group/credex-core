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

# Add CloudWatch permissions
resource "aws_iam_role_policy_attachment" "neo4j_cloudwatch_policy" {
  role       = aws_iam_role.neo4j_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "neo4j_instance_profile" {
  name = "neo4j-instance-profile-${var.environment}"
  role = aws_iam_role.neo4j_role.name
}

# Helper to create user data script
locals {
  neo4j_install_script = <<-EOF
              #!/bin/bash
              set -e

              # Setup logging
              exec > >(tee /var/log/neo4j-setup.log) 2>&1
              
              # System setup
              yum update -y
              amazon-linux-extras install java-openjdk11 -y
              
              # Install Neo4j Enterprise
              rpm --import https://debian.neo4j.com/neotechnology.gpg.key
              cat > /etc/yum.repos.d/neo4j.repo << 'REPO'
              [neo4j]
              name=Neo4j RPM Repository
              baseurl=https://yum.neo4j.com/stable
              enabled=1
              gpgcheck=1
              REPO
              
              yum install -y neo4j-enterprise amazon-cloudwatch-agent
              
              # Configure CloudWatch
              cat > /opt/aws/amazon-cloudwatch-agent/config.json << 'EOF2'
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
                          "log_group_name": "/aws/ec2/neo4j/${var.environment}",
                          "log_stream_name": "{instance_id}",
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
              EOF2

              # Start CloudWatch agent
              /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/config.json
              systemctl enable amazon-cloudwatch-agent
              systemctl start amazon-cloudwatch-agent

              # Calculate memory settings
              total_mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
              total_mem_mb=$((total_mem_kb / 1024))
              heap_size_mb=$((total_mem_mb * 15 / 100))
              page_cache_mb=$((total_mem_mb * 30 / 100))
              heap_size_mb=$(( heap_size_mb < 1024 ? 1024 : heap_size_mb ))
              heap_size_mb=$(( heap_size_mb > 31744 ? 31744 : heap_size_mb ))
              page_cache_mb=$(( page_cache_mb < 2048 ? 2048 : page_cache_mb ))

              # Configure Neo4j using printf to avoid heredoc issues
              printf "# Network configuration
dbms.default_listen_address=0.0.0.0
dbms.connector.bolt.listen_address=:7687
dbms.connector.http.listen_address=:7474
dbms.connector.https.listen_address=:7473

# Security settings
dbms.security.auth_enabled=true
dbms.security.allow_csv_import_from_file_urls=false

# Memory configuration
dbms.memory.heap.initial_size=%dm
dbms.memory.heap.max_size=%dm
dbms.memory.pagecache.size=%dm

# Performance settings
dbms.jvm.additional=-XX:+UseG1GC
dbms.jvm.additional=-XX:G1HeapRegionSize=16m
dbms.jvm.additional=-XX:+ParallelRefProcEnabled
dbms.jvm.additional=-XX:+UseStringDeduplication
dbms.jvm.additional=-XX:+AlwaysPreTouch
dbms.jvm.additional=-XX:+DisableExplicitGC
dbms.jvm.additional=-XX:MaxGCPauseMillis=500
dbms.jvm.additional=-XX:+HeapDumpOnOutOfMemoryError
dbms.jvm.additional=-XX:HeapDumpPath=/var/log/neo4j/

# Logging settings
dbms.logs.debug.level=INFO
dbms.logs.query.enabled=true
dbms.logs.query.rotation.keep_number=7
dbms.logs.query.rotation.size=20m

# Transaction settings
dbms.transaction.timeout=5m
dbms.transaction.concurrent.maximum=100
" $heap_size_mb $heap_size_mb $page_cache_mb > /etc/neo4j/neo4j.conf

              # Verify configuration
              echo "Neo4j configuration:"
              cat /etc/neo4j/neo4j.conf

              # Set Neo4j license
              echo "${var.neo4j_enterprise_license}" > /etc/neo4j/neo4j.license
              
              # Set permissions
              chown -R neo4j:neo4j /var/lib/neo4j /var/log/neo4j
              chmod 600 /etc/neo4j/neo4j.conf
              
              # Start Neo4j
              systemctl enable neo4j
              systemctl start neo4j
              
              # Wait for Neo4j to be ready
              for i in {1..30}; do
                if cypher-shell -u neo4j -p neo4j --non-interactive "RETURN 1;" >/dev/null 2>&1; then
                  echo "Neo4j is ready, changing default password..."
                  cypher-shell -u neo4j -p neo4j "ALTER CURRENT USER SET PASSWORD FROM 'neo4j' TO 'Neo4j@${var.environment}'"
                  echo "Neo4j setup complete"
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
