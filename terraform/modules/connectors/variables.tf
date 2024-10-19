variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = map(string)
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
}

variable "create_key_pair" {
  description = "Whether to create the key pair"
  type        = bool
}

variable "create_load_balancer" {
  description = "Whether to create the load balancer"
  type        = bool
}

variable "create_target_group" {
  description = "Whether to create the target group"
  type        = bool
}

variable "create_security_groups" {
  description = "Whether to create security groups"
  type        = bool
}

variable "public_key" {
  description = "The public key for the EC2 key pair"
  type        = string
}
