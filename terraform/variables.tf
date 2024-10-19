# Hardcoded variables
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
  default     = "placeholder"
}

variable "open_exchange_rates_api" {
  description = "API key for Open Exchange Rates"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "neo4j_enterprise_license" {
  description = "Neo4j Enterprise License"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

locals {
  # Neo4j instance count compliant with the Startup Software License Agreement
  neo4j_instance_count = 2

  # Neo4j instance types compliant with the 24 Cores / 256 GB RAM limit
  # see docs/deploy/instance_size_first200k.md
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

# Note: This configuration complies with the Neo4j Startup Software License Agreement:
# - Limits production instances to a maximum of 3
# - Ensures each instance doesn't exceed 24 Cores / 256 GB of RAM (limited in neo4j.tf)
# - Provides separate instances for LedgerSpace and SearchSpace in all environments
# - Allows up to 3 instances for non-production testing (currently set to 2 for staging)
