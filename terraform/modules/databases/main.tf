# Data source to access connectors outputs
data "terraform_remote_state" "connectors" {
  backend = "s3"
  config = {
    bucket = "credex-terraform-state"
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

# Neo4j instance
resource "aws_instance" "neo4j" {
  count                  = var.create_neo4j_instances ? 1 : 0
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id]
  subnet_id              = var.subnet_ids[0]

  root_block_device {
    volume_type = "gp2"
    volume_size = var.neo4j_instance_size
  }

  tags = merge(var.common_tags, {
    Name = "Neo4j-${var.environment}"
  })

  user_data = <<-EOF
              #!/bin/bash
              # Update the system
              yum update -y

              # Install Java
              amazon-linux-extras install java-openjdk11 -y

              # Add Neo4j repository
              rpm --import https://debian.neo4j.com/neotechnology.gpg.key
              cat << REPO > /etc/yum.repos.d/neo4j.repo
              [neo4j]
              name=Neo4j RPM Repository
              baseurl=https://yum.neo4j.com/stable
              enabled=1
              gpgcheck=1
              REPO

              # Install Neo4j
              yum install neo4j-enterprise -y

              # Configure Neo4j
              sed -i 's/#dbms.default_listen_address=0.0.0.0/dbms.default_listen_address=0.0.0.0/' /etc/neo4j/neo4j.conf
              echo "${var.neo4j_enterprise_license}" > /etc/neo4j/neo4j.license

              # Start Neo4j
              systemctl enable neo4j
              systemctl start neo4j
              EOF
}

# Outputs
output "neo4j_instance_id" {
  description = "The ID of the Neo4j instance"
  value       = var.create_neo4j_instances ? aws_instance.neo4j[0].id : null
}

output "neo4j_private_ip" {
  description = "The private IP of the Neo4j instance"
  value       = var.create_neo4j_instances ? aws_instance.neo4j[0].private_ip : null
}
