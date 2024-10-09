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

data "aws_security_group" "ecs_tasks" {
  name = "credex-core-ecs-tasks-sg-${local.environment}"
  vpc_id = local.vpc_id
}

data "aws_lb" "credex_alb" {
  name = "credex-alb-${local.environment}"
}

data "aws_lb_target_group" "credex_tg" {
  name = "credex-tg-${local.environment}"
}

data "aws_acm_certificate" "credex_cert" {
  domain = local.domain
  statuses = ["ISSUED"]
  most_recent = true
}

data "aws_route53_zone" "selected" {
  name         = "mycredex.app."
  private_zone = false
}

data "aws_lb_listener" "https" {
  load_balancer_arn = data.aws_lb.credex_alb.arn
  port              = 443
}

data "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = local.domain
  type    = "A"
}

data "aws_security_group" "alb" {
  name = "credex-alb-sg-${local.environment}"
  vpc_id = local.vpc_id
}

# Only create resources if they don't exist

resource "aws_security_group" "ecs_tasks" {
  count       = data.aws_security_group.ecs_tasks.id == null ? 1 : 0
  name_prefix = "credex-core-ecs-tasks-sg-${local.environment}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = local.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 5000
    to_port         = 5000
    security_groups = [data.aws_security_group.alb.id]
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

resource "aws_acm_certificate" "credex_cert" {
  count             = data.aws_acm_certificate.credex_cert.arn == null ? 1 : 0
  domain_name       = local.domain
  validation_method = "DNS"

  tags = merge(local.common_tags, {
    Name = "credex-cert-${local.environment}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.credex_cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.selected.zone_id
}

resource "aws_acm_certificate_validation" "cert_validation" {
  count                   = data.aws_acm_certificate.credex_cert.arn == null ? 1 : 0
  certificate_arn         = aws_acm_certificate.credex_cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

resource "aws_lb_listener" "credex_listener" {
  count             = data.aws_lb_listener.https.arn == null ? 1 : 0
  load_balancer_arn = data.aws_lb.credex_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.credex_cert.arn

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
  count   = data.aws_route53_record.api.name == null ? 1 : 0
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = local.domain
  type    = "A"

  alias {
    name                   = data.aws_lb.credex_alb.dns_name
    zone_id                = data.aws_lb.credex_alb.zone_id
    evaluate_target_health = true
  }

  lifecycle {
    ignore_changes = [alias]
  }
}

resource "aws_security_group" "alb" {
  count       = data.aws_security_group.alb.id == null ? 1 : 0
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

  lifecycle {
    create_before_destroy = true
  }
}