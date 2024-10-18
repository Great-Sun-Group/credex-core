locals {
  neo4j_ports = [7474, 7687]
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
  count         = 2
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = var.neo4j_instance_type[var.environment]
  key_name      = var.key_name

  vpc_security_group_ids = [var.neo4j_security_group_id]
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]

  tags = merge(var.common_tags, {
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
    volume_size = var.neo4j_instance_size[var.environment]
    encrypted   = true
  }
}
