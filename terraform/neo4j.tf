data "aws_ami" "neo4j" {
  most_recent = true
  owners      = ["aws-marketplace"]

  filter {
    name   = "product-code"
    values = ["dqrabnxp30hjc7o4184bpw8hd"]
  }

  filter {
    name   = "name"
    values = ["neo4j-community-*"]
  }
}

resource "aws_key_pair" "neo4j_key_pair" {
  key_name   = "neo4j-key-pair-${local.effective_environment}"
  public_key = tls_private_key.neo4j_private_key.public_key_openssh

  tags = local.common_tags

  lifecycle {
    ignore_changes = [public_key]
  }
}

resource "tls_private_key" "neo4j_private_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_instance" "neo4j_ledger" {
  ami           = data.aws_ami.neo4j.id
  instance_type = local.effective_environment == "production" ? "m5.large" : "t3.medium"
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = data.aws_subnets.available.ids[0]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${local.effective_environment}-LedgerSpace"
    Role = "LedgerSpace"
  })

  user_data = <<-EOF
              #!/bin/bash
              echo "Configuring Neo4j Community Edition for LedgerSpace"
              NEO4J_PASSWORD=${var.neo4j_ledger_space_pass}
              NEO4J_USERNAME=${var.neo4j_ledger_space_user}
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
              neo4j-admin set-initial-password $NEO4J_PASSWORD
              cypher-shell -u neo4j -p $NEO4J_PASSWORD "CREATE USER $NEO4J_USERNAME SET PASSWORD '$NEO4J_PASSWORD' CHANGE NOT REQUIRED"
              cypher-shell -u neo4j -p $NEO4J_PASSWORD "GRANT ROLE admin TO $NEO4J_USERNAME"
              systemctl restart neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

resource "aws_instance" "neo4j_search" {
  ami           = data.aws_ami.neo4j.id
  instance_type = local.effective_environment == "production" ? "m5.large" : "t3.medium"
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = data.aws_subnets.available.ids[0]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${local.effective_environment}-SearchSpace"
    Role = "SearchSpace"
  })

  user_data = <<-EOF
              #!/bin/bash
              echo "Configuring Neo4j Community Edition for SearchSpace"
              NEO4J_PASSWORD=${var.neo4j_search_space_pass}
              NEO4J_USERNAME=${var.neo4j_search_space_user}
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
              neo4j-admin set-initial-password $NEO4J_PASSWORD
              cypher-shell -u neo4j -p $NEO4J_PASSWORD "CREATE USER $NEO4J_USERNAME SET PASSWORD '$NEO4J_PASSWORD' CHANGE NOT REQUIRED"
              cypher-shell -u neo4j -p $NEO4J_PASSWORD "GRANT ROLE admin TO $NEO4J_USERNAME"
              systemctl restart neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

resource "aws_security_group" "neo4j" {
  name        = "neo4j-sg-${local.effective_environment}"
  description = "Security group for Neo4j ${local.effective_environment} instances"
  vpc_id      = local.vpc_id

  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}