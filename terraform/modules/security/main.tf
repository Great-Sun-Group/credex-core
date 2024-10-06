resource "aws_acm_certificate" "credex_cert" {
  domain_name       = var.domain
  validation_method = "DNS"

  tags = var.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_route53_zone" "selected" {
  name         = var.route53_zone_name
  private_zone = false
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.credex_cert.domain_validation_options : dvo.domain_name => {
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
  certificate_arn         = aws_acm_certificate.credex_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/credex/${var.environment}/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
  tags  = var.common_tags
}

resource "aws_ssm_parameter" "whatsapp_bot_api_key" {
  name  = "/credex/${var.environment}/whatsapp_bot_api_key"
  type  = "SecureString"
  value = var.whatsapp_bot_api_key
  tags  = var.common_tags
}

resource "aws_ssm_parameter" "open_exchange_rates_api" {
  name  = "/credex/${var.environment}/open_exchange_rates_api"
  type  = "SecureString"
  value = var.open_exchange_rates_api
  tags  = var.common_tags
}