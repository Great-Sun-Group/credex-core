# Look for the default VPC
data "aws_vpc" "default" {
  default = true
}

locals {
  vpc_id = data.aws_vpc.default.id
}

data "aws_subnets" "available" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }
}

# Data source for existing ECS tasks security group
data "aws_security_group" "existing_ecs_tasks" {
  count = lookup(var.use_existing_resources, "security_groups", false) ? 1 : 0
  name  = "credex-core-ecs-tasks-sg-${local.environment}"
  vpc_id = local.vpc_id
}

# ECS tasks security group
resource "aws_security_group" "ecs_tasks" {
  count       = var.create_resources && !lookup(var.use_existing_resources, "security_groups", false) ? 1 : 0
  name_prefix = "credex-core-ecs-tasks-sg-${local.environment}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = local.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 5000
    to_port         = 5000
    security_groups = [lookup(var.use_existing_resources, "security_groups", false) ? data.aws_security_group.existing_alb[0].id : aws_security_group.alb[0].id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = local.common_tags
}

# Data source for existing Neo4j security group
data "aws_security_group" "existing_neo4j" {
  count = lookup(var.use_existing_resources, "security_groups", false) ? 1 : 0
  name  = "credex-neo4j-sg-${local.environment}"
  vpc_id = local.vpc_id
}

# Neo4j security group
resource "aws_security_group" "neo4j" {
  count       = var.create_resources && !lookup(var.use_existing_resources, "security_groups", false) ? 1 : 0
  name_prefix = "credex-neo4j-sg-${local.environment}"
  description = "Security group for Neo4j instances"
  vpc_id      = local.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 7474
    to_port     = 7474
    cidr_blocks = [local.environment == "production" ? "10.0.0.0/16" : "10.0.0.0/8"]
    description = "Allow Neo4j HTTP"
  }

  ingress {
    protocol    = "tcp"
    from_port   = 7687
    to_port     = 7687
    cidr_blocks = [local.environment == "production" ? "10.0.0.0/16" : "10.0.0.0/8"]
    description = "Allow Neo4j Bolt"
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = local.common_tags
}

# Data source for existing ALB
data "aws_lb" "existing_alb" {
  count = lookup(var.use_existing_resources, "alb", false) ? 1 : 0
  name  = "credex-alb-${local.environment}"
}

# ALB
resource "aws_lb" "credex_alb" {
  count              = var.create_resources && !lookup(var.use_existing_resources, "alb", false) ? 1 : 0
  name               = "credex-alb-${local.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [lookup(var.use_existing_resources, "security_groups", false) ? data.aws_security_group.existing_alb[0].id : aws_security_group.alb[0].id]
  subnets            = data.aws_subnets.available.ids

  tags = local.common_tags
}

# Data source for existing target group
data "aws_lb_target_group" "existing_tg" {
  count = lookup(var.use_existing_resources, "alb", false) ? 1 : 0
  name  = "credex-tg-${local.environment}"
}

resource "aws_lb_target_group" "credex_core" {
  count       = var.create_resources && !lookup(var.use_existing_resources, "alb", false) ? 1 : 0
  name        = "credex-tg-${local.environment}"
  port        = 5000
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "ip"

  health_check {
    healthy_threshold   = "3"
    interval            = "30"
    protocol            = "HTTP"
    matcher             = "200"
    timeout             = "3"
    path                = "/health"
    unhealthy_threshold = "2"
  }

  tags = local.common_tags
}

# Data source for existing ACM certificate
data "aws_acm_certificate" "existing_cert" {
  count    = lookup(var.use_existing_resources, "acm_certificate", false) ? 1 : 0
  domain   = local.domain[local.environment]
  statuses = ["ISSUED"]
}

# ACM Certificate
resource "aws_acm_certificate" "credex_cert" {
  count             = var.create_resources && !lookup(var.use_existing_resources, "acm_certificate", false) ? 1 : 0
  domain_name       = local.domain[local.environment]
  validation_method = "DNS"

  tags = merge(local.common_tags, {
    Name = "credex-cert-${local.environment}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_route53_zone" "selected" {
  name         = "mycredex.app."
  private_zone = false
}

resource "aws_route53_record" "cert_validation" {
  for_each = var.create_resources && !lookup(var.use_existing_resources, "acm_certificate", false) ? {
    for dvo in aws_acm_certificate.credex_cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.selected.zone_id
}

resource "aws_acm_certificate_validation" "cert_validation" {
  count                   = var.create_resources && !lookup(var.use_existing_resources, "acm_certificate", false) ? 1 : 0
  certificate_arn         = aws_acm_certificate.credex_cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Data source for existing HTTPS listener
data "aws_lb_listener" "existing_https" {
  count             = lookup(var.use_existing_resources, "alb", false) ? 1 : 0
  load_balancer_arn = lookup(var.use_existing_resources, "alb", false) ? data.aws_lb.existing_alb[0].arn : aws_lb.credex_alb[0].arn
  port              = 443
}

# ALB Listener
resource "aws_lb_listener" "credex_listener" {
  count             = var.create_resources && !lookup(var.use_existing_resources, "alb", false) ? 1 : 0
  load_balancer_arn = aws_lb.credex_alb[0].arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = lookup(var.use_existing_resources, "acm_certificate", false) ? data.aws_acm_certificate.existing_cert[0].arn : aws_acm_certificate.credex_cert[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.credex_core[0].arn
  }

  depends_on = [aws_acm_certificate_validation.cert_validation]
}

resource "aws_lb_listener" "redirect_http_to_https" {
  count             = var.create_resources && !lookup(var.use_existing_resources, "alb", false) ? 1 : 0
  load_balancer_arn = aws_lb.credex_alb[0].arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_route53_record" "api" {
  count           = var.create_resources ? 1 : 0
  zone_id         = data.aws_route53_zone.selected.zone_id
  name            = local.domain[local.environment]
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = lookup(var.use_existing_resources, "alb", false) ? data.aws_lb.existing_alb[0].dns_name : aws_lb.credex_alb[0].dns_name
    zone_id                = lookup(var.use_existing_resources, "alb", false) ? data.aws_lb.existing_alb[0].zone_id : aws_lb.credex_alb[0].zone_id
    evaluate_target_health = true
  }
}

# Data source for existing ALB security group
data "aws_security_group" "existing_alb" {
  count = lookup(var.use_existing_resources, "security_groups", false) ? 1 : 0
  name  = "credex-alb-sg-${local.environment}"
  vpc_id = local.vpc_id
}

# ALB security group
resource "aws_security_group" "alb" {
  count       = var.create_resources && !lookup(var.use_existing_resources, "security_groups", false) ? 1 : 0
  name_prefix = "credex-alb-sg-${local.environment}"
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
}
