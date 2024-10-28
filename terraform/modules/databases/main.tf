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

# Helper to create user data script
locals {
  neo4j_install_script = <<-EOF
              #!/bin/bash
              set -e
              exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

              echo "Starting Neo4j installation and configuration..."

              # Update the system
              echo "Updating system packages..."
              yum update -y || {
                echo "Failed to update system packages"
                exit 1
              }

              # Install Java
              echo "Installing Java..."
              amazon-linux-extras install java-openjdk11 -y || {
                echo "Failed to install Java"
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
              sed -i 's/#dbms.default_listen_address=0.0.0.0/dbms.default_listen_address=0.0.0.0/' /etc/neo4j/neo4j.conf || {
                echo "Failed to configure Neo4j listen address"
                exit 1
              }

              # Set Neo4j license
              echo "${var.neo4j_enterprise_license}" > /etc/neo4j/neo4j.license || {
                echo "Failed to set Neo4j license"
                exit 1
              }

              # Configure memory settings based on instance size
              total_mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
              heap_size_mb=$((total_mem_kb / 1024 / 4))  # Use 25% of total memory for heap
              page_cache_mb=$((total_mem_kb / 1024 / 2))  # Use 50% of total memory for page cache

              echo "dbms.memory.heap.initial_size=${heap_size_mb}m" >> /etc/neo4j/neo4j.conf
              echo "dbms.memory.heap.max_size=${heap_size_mb}m" >> /etc/neo4j/neo4j.conf
              echo "dbms.memory.pagecache.size=${page_cache_mb}m" >> /etc/neo4j/neo4j.conf

              # Start Neo4j
              echo "Starting Neo4j service..."
              systemctl enable neo4j || {
                echo "Failed to enable Neo4j service"
                exit 1
              }
              systemctl start neo4j || {
                echo "Failed to start Neo4j service"
                exit 1
              }

              # Wait for Neo4j to start and verify it's running
              echo "Waiting for Neo4j to start..."
              for i in {1..30}; do
                if systemctl is-active neo4j >/dev/null 2>&1; then
                  echo "Neo4j started successfully"
                  exit 0
                fi
                echo "Waiting... ($i/30)"
                sleep 10
              done

              echo "Failed to confirm Neo4j startup"
              exit 1
              EOF
}

# Neo4j instance for ledgerSpace
resource "aws_instance" "neo4j_ledger" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id]
  subnet_id              = var.subnet_ids[0]

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

  lifecycle {
    create_before_destroy = true
  }
}

# Neo4j instance for searchSpace
resource "aws_instance" "neo4j_search" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id]
  subnet_id              = var.subnet_ids[1]

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

  lifecycle {
    create_before_destroy = true
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
