# Remove the provider "aws" block from the top of this file

# Data sources to fetch shared resources
data "terraform_remote_state" "connectors" {
  backend = "s3"
  config = {
    bucket = var.terraform_state_bucket
    key    = "connectors/terraform.tfstate"
    region = var.aws_region
  }
}

# Neo4j Module
module "neo4j" {
  source                   = "./neo4j"
  environment              = var.environment
  vpc_id                   = data.terraform_remote_state.connectors.outputs.vpc_id
  subnet_ids               = data.terraform_remote_state.connectors.outputs.subnet_ids
  neo4j_security_group_id  = data.terraform_remote_state.connectors.outputs.neo4j_security_group_id
  key_pair_name            = data.terraform_remote_state.connectors.outputs.key_pair_name
  neo4j_instance_type      = local.neo4j_instance_type[var.environment]
  neo4j_instance_size      = local.neo4j_instance_size[var.environment]
  neo4j_enterprise_license = var.neo4j_enterprise_license
}

# Variables
variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "af-south-1"
}

variable "domain_base" {
  description = "The base domain for all environments"
  type        = string
  default     = "mycredex.app"
}

variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "The environment must be one of: development, staging, production."
  }
}

variable "subdomain_prefix" {
  description = "Map of environment to subdomain prefixes"
  type        = map(string)
  default = {
    development = "dev.api"
    staging     = "stage.api"
    production  = "api"
  }
}

variable "log_level" {
  description = "Map of environment to log levels"
  type        = map(string)
  default = {
    development = "debug"
    staging     = "info"
    production  = "info"
  }
}

# Variables for resource creation control
variable "create_ecr" {
  description = "Whether to create the ECR repository"
  type        = bool
  default     = true
}

variable "create_ecs_cluster" {
  description = "Whether to create the ECS cluster"
  type        = bool
  default     = true
}

variable "create_log_group" {
  description = "Whether to create the CloudWatch log group"
  type        = bool
  default     = true
}

variable "create_iam_roles" {
  description = "Whether to create IAM roles"
  type        = bool
  default     = true
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

variable "create_neo4j_instances" {
  description = "Whether to create Neo4j instances"
  type        = bool
  default     = true
}

# Variables for secrets (passed from GitHub Actions)
variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "open_exchange_rates_api" {
  description = "API key for Open Exchange Rates"
  type        = string
  sensitive   = true
}

variable "neo4j_enterprise_license" {
  description = "Neo4j Enterprise License"
  type        = string
  sensitive   = true
}

variable "terraform_state_bucket" {
  description = "The S3 bucket name for Terraform state"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

locals {
  # Neo4j instance count compliant with the Startup Software License Agreement
  neo4j_instance_count = 2

  # Neo4j instance types compliant with the 24 Cores / 256 GB RAM limit
  neo4j_instance_type = {
    development = "t3.medium"  
    staging     = "r5.2xlarge" 
    production  = "r5.2xlarge"
  }

  # Neo4j instance sizes (in GB)
  neo4j_instance_size = {
    development = 50
    staging     = 100
    production  = 100
  }

  # Full domain construction
  full_domain = "${var.subdomain_prefix[var.environment]}.${var.domain_base}"
}

# Outputs
output "neo4j_instance_ips" {
  value       = module.neo4j.neo4j_instance_ips
  description = "Private IPs of Neo4j instances"
}

output "neo4j_bolt_urls" {
  value       = module.neo4j.neo4j_bolt_urls
  description = "Neo4j Bolt URLs"
  sensitive   = true
}
