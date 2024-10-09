# Look for the default VPC
data "aws_vpc" "default" {
  default = true
}

# If default VPC doesn't exist, create a new one
resource "aws_vpc" "main" {
  count      = data.aws_vpc.default.id == "" ? 1 : 0
  cidr_block = "10.0.0.0/16"

  tags = merge(local.common_tags, {
    Name = "credex-vpc-${local.effective_environment}"
  })
}

data "aws_subnets" "available" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "credex-core-ecs-tasks-sg-${local.effective_environment}"
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

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "neo4j" {
  name_prefix = "credex-neo4j-sg-${local.effective_environment}"
  description = "Security group for Neo4j instances"
  vpc_id      = local.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 7474
    to_port     = 7474
    cidr_blocks = [local.effective_environment == "production" ? "10.0.0.0/16" : "10.0.0.0/8"]
    description = "Allow Neo4j HTTP"
  }

  ingress {
    protocol    = "tcp"
    from_port   = 7687
    to_port     = 7687
    cidr_blocks = [local.effective_environment == "production" ? "10.0.0.0/16" : "10.0.0.0/8"]
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
    Name = "credex-neo4j-sg-${local.effective_environment}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Use data sources for existing ALB and Target Group
data "aws_lb" "credex_alb" {
  name = "credex-alb-${local.effective_environment}"
}

data "aws_lb_target_group" "credex_tg" {
  name = "credex-tg-${local.effective_environment}"
}

data "aws_lb_listener" "credex_listener" {
  load_balancer_arn = data.aws_lb.credex_alb.arn
  port              = 443
}

data "aws_acm_certificate" "credex_cert" {
  domain   = local.domain
  statuses = ["ISSUED"]
}

data "aws_route53_zone" "selected" {
  name         = "mycredex.app."
  private_zone = false
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = local.domain
  type    = "A"

  alias {
    name                   = data.aws_lb.credex_alb.dns_name
    zone_id                = data.aws_lb.credex_alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_security_group" "alb" {
  name_prefix = "credex-alb-sg-${local.effective_environment}"
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

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}