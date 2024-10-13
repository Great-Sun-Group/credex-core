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

variable "subdomain_development" {
  description = "The subdomain for the development environment"
  type        = string
  default     = "dev.api"
}

variable "subdomain_staging" {
  description = "The subdomain for the staging environment"
  type        = string
  default     = "stage.api"
}

variable "subdomain_production" {
  description = "The subdomain for the production environment"
  type        = string
  default     = "api"
}

variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "The environment must be one of: development, staging, production."
  }
}

variable "domain" {
  description = "Map of environment to domain names"
  type        = map(string)
  default = {
    development = "dev.api.mycredex.app"
    staging     = "stage.api.mycredex.app"
    production  = "api.mycredex.app"
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

variable "operation_type" {
  description = "The type of operation to perform (create, delete, redeploy)"
  type        = string
  default     = "create"

  validation {
    condition     = contains(["create", "delete", "redeploy"], var.operation_type)
    error_message = "The operation_type must be one of: create, delete, redeploy."
  }
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

locals {
  # Neo4j instance count compliant with the Startup Software License Agreement
  neo4j_instance_count = {
    development = 2  # Up to 6 allowed for development
    staging     = 2  # Up to 3 allowed for non-production testing
    production  = 2  # Up to 3 allowed for production
  }

  # Neo4j instance types compliant with the 24 Cores / 256 GB RAM limit
  neo4j_instance_type = {
    development = "t3.xlarge"  # 4 vCPU, 16 GB RAM
    staging     = "r5.2xlarge" # 8 vCPU, 64 GB RAM
    production  = "r5.12xlarge" # 48 vCPU, 384 GB RAM (will be limited to 24 cores in user_data)
  }
}

# Note: This configuration complies with the Neo4j Startup Software License Agreement:
# - Limits production instances to a maximum of 3
# - Ensures each instance doesn't exceed 24 Cores / 256 GB of RAM (limited in neo4j.tf)
# - Allows for both LedgerSpace and SearchSpace on a single instance for non-production environments
# - Provides up to 6 instances for development (currently set to 2, but can be increased up to 6)
# - Allows up to 3 instances for non-production testing (currently set to 2 for staging)
