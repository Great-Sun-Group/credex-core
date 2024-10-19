# Data source to access connectors outputs
data "terraform_remote_state" "connectors" {
  backend = "s3"
  config = {
    bucket = var.terraform_state_bucket
    key    = "${var.environment}/connectors.tfstate"
    region = var.aws_region
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

# Neo4j instance for ledgerSpace
resource "aws_instance" "neo4j_ledger" {
  count                  = var.create_neo4j_instances ? 1 : 0
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id]
  subnet_id              = var.subnet_ids[0]

  root_block_device {
    volume_type = "gp2"
    volume_size = var.neo4j_volume_size
  }

  tags = merge(var.common_tags, {
    Name = "Neo4j-LedgerSpace-${var.environment}"
  })

  user_data = <<-EOF
              #!/bin/bash
              set -e
              exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

              echo "Starting Neo4j installation and configuration for LedgerSpace..."

              # Update the system
              echo "Updating system packages..."
              yum update -y || { echo "Failed to update system packages"; exit 1; }

              # Install Java
              echo "Installing Java..."
              amazon-linux-extras install java-openjdk11 -y || { echo "Failed to install Java"; exit 1; }

              # Add Neo4j repository
              echo "Adding Neo4j repository..."
              rpm --import https://debian.neo4j.com/neotechnology.gpg.key || { echo "Failed to import Neo4j GPG key"; exit 1; }
              cat << REPO > /etc/yum.repos.d/neo4j.repo
              [neo4j]
              name=Neo4j RPM Repository
              baseurl=https://yum.neo4j.com/stable
              enabled=1
              gpgcheck=1
              REPO

              # Install Neo4j
              echo "Installing Neo4j..."
              yum install neo4j-enterprise -y || { echo "Failed to install Neo4j"; exit 1; }

              # Configure Neo4j
              echo "Configuring Neo4j..."
              sed -i 's/#dbms.default_listen_address=0.0.0.0/dbms.default_listen_address=0.0.0.0/' /etc/neo4j/neo4j.conf || { echo "Failed to configure Neo4j listen address"; exit 1; }
              echo "${var.neo4j_enterprise_license}" > /etc/neo4j/neo4j.license || { echo "Failed to set Neo4j license"; exit 1; }

              # Start Neo4j
              echo "Starting Neo4j service..."
              systemctl enable neo4j || { echo "Failed to enable Neo4j service"; exit 1; }
              systemctl start neo4j || { echo "Failed to start Neo4j service"; exit 1; }

              echo "Neo4j installation and configuration for LedgerSpace completed successfully."
              EOF
}

# Neo4j instance for searchSpace
resource "aws_instance" "neo4j_search" {
  count                  = var.create_neo4j_instances ? 1 : 0
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id]
  subnet_id              = var.subnet_ids[1 % length(var.subnet_ids)]

  root_block_device {
    volume_type = "gp2"
    volume_size = var.neo4j_volume_size
  }

  tags = merge(var.common_tags, {
    Name = "Neo4j-SearchSpace-${var.environment}"
  })

  user_data = <<-EOF
              #!/bin/bash
              set -e
              exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

              echo "Starting Neo4j installation and configuration for SearchSpace..."

              # Update the system
              echo "Updating system packages..."
              yum update -y || { echo "Failed to update system packages"; exit 1; }

              # Install Java
              echo "Installing Java..."
              amazon-linux-extras install java-openjdk11 -y || { echo "Failed to install Java"; exit 1; }

              # Add Neo4j repository
              echo "Adding Neo4j repository..."
              rpm --import https://debian.neo4j.com/neotechnology.gpg.key || { echo "Failed to import Neo4j GPG key"; exit 1; }
              cat << REPO > /etc/yum.repos.d/neo4j.repo
              [neo4j]
              name=Neo4j RPM Repository
              baseurl=https://yum.neo4j.com/stable
              enabled=1
              gpgcheck=1
              REPO

              # Install Neo4j
              echo "Installing Neo4j..."
              yum install neo4j-enterprise -y || { echo "Failed to install Neo4j"; exit 1; }

              # Configure Neo4j
              echo "Configuring Neo4j..."
              sed -i 's/#dbms.default_listen_address=0.0.0.0/dbms.default_listen_address=0.0.0.0/' /etc/neo4j/neo4j.conf || { echo "Failed to configure Neo4j listen address"; exit 1; }
              echo "${var.neo4j_enterprise_license}" > /etc/neo4j/neo4j.license || { echo "Failed to set Neo4j license"; exit 1; }

              # Start Neo4j
              echo "Starting Neo4j service..."
              systemctl enable neo4j || { echo "Failed to enable Neo4j service"; exit 1; }
              systemctl start neo4j || { echo "Failed to start Neo4j service"; exit 1; }

              echo "Neo4j installation and configuration for SearchSpace completed successfully."
              EOF
}

# Outputs
output "neo4j_ledger_instance_id" {
  description = "The ID of the Neo4j LedgerSpace instance"
  value       = var.create_neo4j_instances ? aws_instance.neo4j_ledger[0].id : null
}

output "neo4j_search_instance_id" {
  description = "The ID of the Neo4j SearchSpace instance"
  value       = var.create_neo4j_instances ? aws_instance.neo4j_search[0].id : null
}

output "neo4j_ledger_private_ip" {
  description = "The private IP of the Neo4j LedgerSpace instance"
  value       = var.create_neo4j_instances ? aws_instance.neo4j_ledger[0].private_ip : null
}

output "neo4j_search_private_ip" {
  description = "The private IP of the Neo4j SearchSpace instance"
  value       = var.create_neo4j_instances ? aws_instance.neo4j_search[0].private_ip : null
}

output "neo4j_ledger_bolt_endpoint" {
  description = "The Bolt endpoint for the Neo4j LedgerSpace instance"
  value       = var.create_neo4j_instances ? "bolt://${aws_instance.neo4j_ledger[0].private_ip}:7687" : null
}

output "neo4j_search_bolt_endpoint" {
  description = "The Bolt endpoint for the Neo4j SearchSpace instance"
  value       = var.create_neo4j_instances ? "bolt://${aws_instance.neo4j_search[0].private_ip}:7687" : null
}
