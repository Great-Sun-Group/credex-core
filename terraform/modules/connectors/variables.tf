variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "af-south-1"
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_base" {
  description = "The base domain for all environments"
  type        = string
}

variable "subdomain_prefix" {
  description = "The subdomain prefix for each environment"
  type        = map(string)
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

variable "create_key_pair" {
  description = "Whether to create the key pair"
  type        = bool
  default     = true
}

variable "create_load_balancer" {
  description = "Whether to create the load balancer"
  type        = bool
  default     = true
}

variable "create_target_group" {
  description = "Whether to create the target group"
  type        = bool
  default     = true
}

variable "create_security_groups" {
  description = "Whether to create security groups"
  type        = bool
  default     = true
}

variable "public_key" {
  description = "The public key for the EC2 key pair"
  type        = string
}
