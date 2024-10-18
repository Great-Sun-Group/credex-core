# Shared Infrastructure

# VPC-related data sources
data "aws_vpc" "default" {
  default = true
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_internet_gateway" "default" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

locals {
  vpc_id     = data.aws_vpc.default.id
  subnet_ids = slice(data.aws_subnets.default.ids, 0, 2)
}

# Neo4j security group
resource "aws_security_group" "neo4j" {
  name        = "credex-neo4j-sg-${var.environment}"
  description = "Security group for Neo4j instances"
  vpc_id      = local.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 7474
    to_port     = 7474
    cidr_blocks = [var.environment == "production" ? "10.0.0.0/16" : "10.0.0.0/8"]
    description = "Allow Neo4j HTTP"
  }

  ingress {
    protocol    = "tcp"
    from_port   = 7687
    to_port     = 7687
    cidr_blocks = [var.environment == "production" ? "10.0.0.0/16" : "10.0.0.0/8"]
    description = "Allow Neo4j Bolt"
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "credex-neo4j-sg-${var.environment}"
  })
}

# ALB security group
resource "aws_security_group" "alb" {
  name        = "credex-alb-sg-${var.environment}"
  description = "Controls access to the ALB"
  vpc_id      = local.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP inbound traffic"
  }

  ingress {
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS inbound traffic"
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "credex-alb-sg-${var.environment}"
  })
}

# ECS tasks security group
resource "aws_security_group" "ecs_tasks" {
  name        = "credex-core-ecs-tasks-sg-${var.environment}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = local.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 5000
    to_port         = 5000
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "credex-core-ecs-tasks-sg-${var.environment}"
  })
}
