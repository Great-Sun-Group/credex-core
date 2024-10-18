locals {
  neo4j_ports = [7474, 7687]
  key_pair_name = "neo4j-key-pair-${var.environment}"
  
  max_production_instances = 3
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_key_pair" "neo4j_key_pair" {
  count      = var.create_resource && var.neo4j_public_key != "" ? 1 : 0
  key_name   = local.key_pair_name
  public_key = var.neo4j_public_key
  tags       = local.common_tags
}

data "aws_key_pair" "existing_neo4j_key_pair" {
  count    = var.create_resource && var.neo4j_public_key == "" ? 1 : 0
  key_name = local.key_pair_name
}

resource "random_string" "neo4j_password" {
  count   = 2
  length  = 16
  special = true
}

resource "random_string" "neo4j_username_suffix" {
  count   = 2
  length  = 6
  special = false
  upper   = false
  numeric = true
}

resource "aws_instance" "neo4j" {
  count         = var.create_resource ? 2 : 0
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = local.neo4j_instance_type[var.environment]
  key_name      = var.neo4j_public_key != "" ? aws_key_pair.neo4j_key_pair[0].key_name : try(data.aws_key_pair.existing_neo4j_key_pair[0].key_name, null)

  vpc_security_group_ids = [aws_security_group.neo4j[0].id]
  subnet_id              = data.aws_subnets.default.ids[count.index % length(data.aws_subnets.default.ids)]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${var.environment}-${count.index == 0 ? "LedgerSpace" : "SearchSpace"}"
    Role = count.index == 0 ? "LedgerSpace" : "SearchSpace"
  })

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
              
              # Set Neo4j password and create user with random suffix
              NEO4J_USERNAME="neo4j${random_string.neo4j_username_suffix[count.index].result}"
              sudo neo4j-admin set-initial-password "${random_string.neo4j_password[count.index].result}"
              sudo neo4j-admin set-user-password $NEO4J_USERNAME "${random_string.neo4j_password[count.index].result}"

              # Set Neo4j Enterprise License
              echo "${var.neo4j_enterprise_license}" | sudo tee /etc/neo4j/neo4j.license

              # Start Neo4j
              sudo systemctl enable neo4j
              sudo systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [ami, user_data]
  }
}

output "neo4j_instance_ips" {
  value       = aws_instance.neo4j[*].private_ip
  description = "Private IPs of Neo4j instances"
}

output "neo4j_bolt_urls" {
  value = [for instance in aws_instance.neo4j : "bolt://${instance.private_ip}:7687"]
  description = "Neo4j Bolt URLs"
  sensitive   = true
}

output "neo4j_ledger_space_bolt_url" {
  value       = length(aws_instance.neo4j) > 0 ? "bolt://${aws_instance.neo4j[0].private_ip}:7687" : ""
  description = "Neo4j Ledger Space Bolt URL"
  sensitive   = true
}

output "neo4j_search_space_bolt_url" {
  value       = length(aws_instance.neo4j) > 1 ? "bolt://${aws_instance.neo4j[1].private_ip}:7687" : ""
  description = "Neo4j Search Space Bolt URL"
  sensitive   = true
}

# Note: The security group for Neo4j is defined in networking.tf
