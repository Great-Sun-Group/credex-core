variable "domain" {
  description = "The domain name for the application"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "route53_zone_name" {
  description = "The name of the Route 53 hosted zone"
  type        = string
}

variable "alb_dns_name" {
  description = "The DNS name of the application load balancer"
  type        = string
}

variable "alb_zone_id" {
  description = "The zone ID of the application load balancer"
  type        = string
}

variable "environment" {
  description = "The deployment environment (e.g., production, staging, development)"
  type        = string
}

variable "jwt_secret" {
  description = "The JWT secret for authentication"
  type        = string
}

variable "whatsapp_bot_api_key" {
  description = "The API key for the WhatsApp bot"
  type        = string
}

variable "open_exchange_rates_api" {
  description = "The API key for Open Exchange Rates"
  type        = string
}