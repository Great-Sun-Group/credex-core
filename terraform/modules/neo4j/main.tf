resource "aws_key_pair" "neo4j_key_pair" {
  key_name   = "neo4j-key-pair-${var.environment}"
  public_key = tls_private_key.neo4j_private_key.public_key_openssh

  tags = var.common_tags
}

resource "tls_private_key" "neo4j_private_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_instance" "neo4j_ledger" {
  ami           = var.neo4j_ami_id
  instance_type = var.environment == "production" ? "m5.large" : "t3.medium"
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = var.subnet_id

  tags = merge(var.common_tags, {
    Name = "Neo4j-${var.environment}-LedgerSpace"
    Role = "LedgerSpace"
  })

  user_data = templatefile("${path.module}/neo4j_user_data.tpl", {
    neo4j_password = var.neo4j_ledger_space_pass
    neo4j_username = var.neo4j_ledger_space_user
  })

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
  ami           = var.neo4j_ami_id
  instance_type = var.environment == "production" ? "m5.large" : "t3.medium"
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = var.subnet_id

  tags = merge(var.common_tags, {
    Name = "Neo4j-${var.environment}-SearchSpace"
    Role = "SearchSpace"
  })

  user_data = templatefile("${path.module}/neo4j_user_data.tpl", {
    neo4j_password = var.neo4j_search_space_pass
    neo4j_username = var.neo4j_search_space_user
  })

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
  name        = "neo4j-sg-${var.environment}"
  description = "Security group for Neo4j ${var.environment} instances"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.common_tags
}

resource "aws_ssm_parameter" "neo4j_ledger_space_bolt_url" {
  name  = "/credex/${var.environment}/neo4j_ledger_space_bolt_url"
  type  = "String"
  value = var.neo4j_ledger_space_bolt_url != "" ? var.neo4j_ledger_space_bolt_url : "bolt://${aws_instance.neo4j_ledger.private_ip}:7687"
  tags  = var.common_tags
}

resource "aws_ssm_parameter" "neo4j_search_space_bolt_url" {
  name  = "/credex/${var.environment}/neo4j_search_space_bolt_url"
  type  = "String"
  value = var.neo4j_search_space_bolt_url != "" ? var.neo4j_search_space_bolt_url : "bolt://${aws_instance.neo4j_search.private_ip}:7687"
  tags  = var.common_tags
}

resource "aws_ssm_parameter" "neo4j_ledger_space_user" {
  name  = "/credex/${var.environment}/neo4j_ledger_space_user"
  type  = "String"
  value = var.neo4j_ledger_space_user
  tags  = var.common_tags
}

resource "aws_ssm_parameter" "neo4j_ledger_space_pass" {
  name  = "/credex/${var.environment}/neo4j_ledger_space_pass"
  type  = "SecureString"
  value = var.neo4j_ledger_space_pass
  tags  = var.common_tags
}

resource "aws_ssm_parameter" "neo4j_search_space_user" {
  name  = "/credex/${var.environment}/neo4j_search_space_user"
  type  = "String"
  value = var.neo4j_search_space_user
  tags  = var.common_tags
}

resource "aws_ssm_parameter" "neo4j_search_space_pass" {
  name  = "/credex/${var.environment}/neo4j_search_space_pass"
  type  = "SecureString"
  value = var.neo4j_search_space_pass
  tags  = var.common_tags
}