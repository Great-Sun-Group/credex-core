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

# Check for existing ECS tasks security group
data "aws_security_group" "existing_ecs_tasks" {
  name   = "credex-core-ecs-tasks-sg-${local.environment}"
  vpc_id = local.vpc_id

  count = var.use_existing_resources ? 1 : 0
}

resource "aws_security_group" "ecs_tasks" {
  count       = var.use_existing_resources ? 0 : 1
  name_prefix = "credex-core-ecs-tasks-sg-${local.environment}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = local.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 5000
    to_port         = 5000
    security_groups = [var.use_existing_resources ? data.aws_security_group.existing_alb[0].id : aws_security_group.alb[0].id]
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

# Check for existing Neo4j security group
data "aws_security_group" "existing_neo4j" {
  name   = "credex-neo4j-sg-${local.environment}"
  vpc_id = local.vpc_id

  count = var.use_existing_resources ? 1 : 0
}

resource "aws_security_group" "neo4j" {
  count       = var.use_existing_resources ? 0 : 1
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

data "aws_lb" "credex_alb" {
  name = "credex-alb-${local.environment}"
}

data "aws_lb_target_group" "credex_tg" {
  name = "credex-tg-${local.environment}"
}

# Check for existing ACM certificate
data "aws_acm_certificate" "existing_cert" {
  domain   = local.domain
  statuses = ["ISSUED"]

  count = var.use_existing_resources ? 1 : 0
}

resource "aws_acm_certificate" "credex_cert" {
  count             = var.use_existing_resources ? 0 : 1
  domain_name       = local.domain
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
  count   = var.use_existing_resources ? 0 : 1
  name    = tolist(aws_acm_certificate.credex_cert[0].domain_validation_options)[0].resource_record_name
  type    = tolist(aws_acm_certificate.credex_cert[0].domain_validation_options)[0].resource_record_type
  zone_id = data.aws_route53_zone.selected.zone_id
  records = [tolist(aws_acm_certificate.credex_cert[0].domain_validation_options)[0].resource_record_value]
  ttl     = 60

  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "cert_validation" {
  count                   = var.use_existing_resources ? 0 : 1
  certificate_arn         = aws_acm_certificate.credex_cert[0].arn
  validation_record_fqdns = [aws_route53_record.cert_validation[0].fqdn]
}

data "aws_lb_listener" "https" {
  load_balancer_arn = data.aws_lb.credex_alb.arn
  port              = 443
}

resource "aws_lb_listener" "credex_listener" {
  count             = data.aws_lb_listener.https.arn == null ? 1 : 0
  load_balancer_arn = data.aws_lb.credex_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.use_existing_resources ? data.aws_acm_certificate.existing_cert[0].arn : aws_acm_certificate.credex_cert[0].arn

  default_action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_group.credex_tg.arn
  }

  depends_on = [aws_acm_certificate_validation.cert_validation]
}

resource "aws_lb_listener" "redirect_http_to_https" {
  count             = data.aws_lb_listener.https.arn == null ? 1 : 0
  load_balancer_arn = data.aws_lb.credex_alb.arn
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
  zone_id         = data.aws_route53_zone.selected.zone_id
  name            = local.domain
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = data.aws_lb.credex_alb.dns_name
    zone_id                = data.aws_lb.credex_alb.zone_id
    evaluate_target_health = true
  }
}

# Check for existing ALB security group
data "aws_security_group" "existing_alb" {
  name   = "credex-alb-sg-${local.environment}"
  vpc_id = local.vpc_id

  count = var.use_existing_resources ? 1 : 0
}

resource "aws_security_group" "alb" {
  count       = var.use_existing_resources ? 0 : 1
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