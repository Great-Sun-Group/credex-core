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

variable "create_resource" {
  description = "Boolean flag to indicate whether to create/update (true) or delete (false) resources"
  type        = bool
  default     = true
}

# Variables passed from Github Action script checks on whether these resources exist
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

variable "neo4j_ledger_space_user" {
  description = "Neo4j LedgerSpace username"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "neo4j_ledger_space_pass" {
  description = "Neo4j LedgerSpace password"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "neo4j_search_space_user" {
  description = "Neo4j SearchSpace username"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "neo4j_search_space_pass" {
  description = "Neo4j SearchSpace password"
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

variable "neo4j_ledger_space_bolt_url" {
  description = "Neo4j LedgerSpace Bolt URL"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "neo4j_search_space_bolt_url" {
  description = "Neo4j SearchSpace Bolt URL"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "neo4j_public_key" {
  description = "Public key for Neo4j instances"
  type        = string
  default     = ""
}

variable "ssh_key_name" {
  description = "The name of the SSH key pair to use for EC2 instances"
  type        = string
  default     = ""
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
