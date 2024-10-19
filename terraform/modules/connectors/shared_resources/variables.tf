variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "domain" {
  description = "The full domain name for the ALB certificate"
  type        = string
}

variable "public_key" {
  description = "The public key for the EC2 key pair"
  type        = string
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
}

variable "az_count" {
  description = "Number of AZs to cover in a given region"
  type        = number
  default     = 2
}
