output "acm_certificate_arn" {
  description = "The ARN of the ACM certificate"
  value       = aws_acm_certificate.credex_cert.arn
}

output "route53_zone_id" {
  description = "The ID of the Route 53 hosted zone"
  value       = data.aws_route53_zone.selected.zone_id
}

output "api_domain" {
  description = "The domain name of the API"
  value       = aws_route53_record.api.name
}

output "jwt_secret_arn" {
  description = "The ARN of the SSM parameter storing the JWT secret"
  value       = aws_ssm_parameter.jwt_secret.arn
}

output "whatsapp_bot_api_key_arn" {
  description = "The ARN of the SSM parameter storing the WhatsApp bot API key"
  value       = aws_ssm_parameter.whatsapp_bot_api_key.arn
}

output "open_exchange_rates_api_arn" {
  description = "The ARN of the SSM parameter storing the Open Exchange Rates API key"
  value       = aws_ssm_parameter.open_exchange_rates_api.arn
}