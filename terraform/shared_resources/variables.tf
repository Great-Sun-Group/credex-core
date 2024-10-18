variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "domain" {
  description = "The domain name for the ALB certificate"
  type        = string
}

variable "public_key" {
  description = "The public key for the EC2 key pair"
  type        = string
}
