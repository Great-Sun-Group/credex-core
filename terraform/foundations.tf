# Provider configuration
provider "aws" {
  region = var.aws_region
}

# Local variables
locals {
  common_tags = {
    Environment = var.environment
    Project     = "CredEx"
    ManagedBy   = "Terraform"
  }
}

# Generate key pair
resource "tls_private_key" "credex_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Shared Resources Module
module "shared_resources" {
  source      = "./shared_resources"
  environment = var.environment
  common_tags = local.common_tags
  domain      = var.domain
  public_key  = tls_private_key.credex_key.public_key_openssh
}

# Variables
variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}

variable "domain" {
  description = "The domain name for the application"
  type        = string
}

# Outputs
output "vpc_id" {
  value       = module.shared_resources.vpc_id
  description = "The ID of the VPC"
}

output "subnet_ids" {
  value       = module.shared_resources.subnet_ids
  description = "The IDs of the subnets"
}

output "neo4j_security_group_id" {
  value       = module.shared_resources.neo4j_security_group_id
  description = "The ID of the Neo4j security group"
}

output "key_pair_name" {
  value       = module.shared_resources.key_pair_name
  description = "The name of the key pair"
}

output "alb_security_group_id" {
  value       = module.shared_resources.alb_security_group_id
  description = "The ID of the ALB security group"
}

output "ecs_tasks_security_group_id" {
  value       = module.shared_resources.ecs_tasks_security_group_id
  description = "The ID of the ECS tasks security group"
}

output "alb_dns_name" {
  value       = module.shared_resources.alb_dns_name
  description = "The DNS name of the Application Load Balancer"
}

output "target_group_arn" {
  value       = module.shared_resources.target_group_arn
  description = "The ARN of the target group"
}

output "alb_listener" {
  value       = module.shared_resources.alb_listener
  description = "The ARN of the ALB listener"
}
