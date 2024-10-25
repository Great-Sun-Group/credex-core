# Input variables for shared resources
variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "The IDs of the subnets"
  type        = list(string)
}

variable "neo4j_security_group_id" {
  description = "The ID of the Neo4j security group"
  type        = string
}

variable "key_pair_name" {
  description = "The name of the key pair"
  type        = string
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}

variable "neo4j_instance_type" {
  description = "The instance type for Neo4j"
  type        = string
}

variable "neo4j_volume_size" {
  description = "The root volume size for Neo4j instances"
  type        = number
}

variable "neo4j_enterprise_license" {
  description = "The Neo4j Enterprise license key"
  type        = string
}

# Use the latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Random string for Neo4j passwords
resource "random_password" "neo4j_password" {
  count   = 2
  length  = 16
  special = true
}

# Generate usernames
resource "random_string" "neo4j_username" {
  count   = 2
  length  = 8
  special = false
  upper   = false
}

# Neo4j instances
resource "aws_instance" "neo4j" {
  count         = 2
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = var.neo4j_instance_type
  key_name      = var.key_pair_name

  vpc_security_group_ids = [var.neo4j_security_group_id]
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]

  tags = {
    Name = "Neo4j-${var.environment}-${count.index == 0 ? "LedgerSpace" : "SearchSpace"}"
    Role = count.index == 0 ? "LedgerSpace" : "SearchSpace"
  }

  user_data = <<-EOF
              #!/bin/bash
              # Install Neo4j
              wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
              echo 'deb https://debian.neo4j.com stable latest' | sudo tee -a /etc/apt/sources.list.d/neo4j.list
              sudo apt-get update
              sudo apt-get install -y neo4j-enterprise

              # Configure Neo4j
              sudo sed -i 's/#dbms.default_listen_address=0.0.0.0/dbms.default_listen_address=0.0.0.0/' /etc/neo4j/neo4j.conf
              sudo sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
              
              # Set Neo4j password
              sudo neo4j-admin set-initial-password "${random_password.neo4j_password[count.index].result}"

              # Set Neo4j Enterprise License
              echo "${var.neo4j_enterprise_license}" | sudo tee /etc/neo4j/neo4j.license

              # Start Neo4j
              sudo systemctl enable neo4j
              sudo systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = var.neo4j_volume_size
    encrypted   = true
  }
}

# Outputs
output "NEO_4J_LEDGER_SPACE_BOLT_URL" {
  value       = "bolt://${aws_instance.neo4j[0].private_ip}:7687"
  description = "Neo4j LedgerSpace Bolt URL"
}

output "NEO_4J_SEARCH_SPACE_BOLT_URL" {
  value       = "bolt://${aws_instance.neo4j[1].private_ip}:7687"
  description = "Neo4j SearchSpace Bolt URL"
}

output "NEO_4J_LEDGER_SPACE_USERNAME" {
  value       = random_string.neo4j_username[0].result
  description = "Neo4j LedgerSpace username"
}

output "NEO_4J_SEARCH_SPACE_USER" {
  value       = random_string.neo4j_username[1].result
  description = "Neo4j SearchSpace username"
}

output "NEO_4J_LEDGER_SPACE_PASS" {
  value       = random_password.neo4j_password[0].result
  sensitive   = true
  description = "Neo4j LedgerSpace password"
}

output "NEO_4J_SEARCH_SPACE_PASS" {
  value       = random_password.neo4j_password[1].result
  sensitive   = true
  description = "Neo4j SearchSpace password"
}
