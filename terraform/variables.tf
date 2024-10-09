variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "af-south-1"
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "whatsapp_bot_api_key" {
  description = "API key for WhatsApp bot"
  type        = string
  sensitive   = true
}

variable "open_exchange_rates_api" {
  description = "API key for Open Exchange Rates"
  type        = string
  sensitive   = true
}

variable "neo4j_ledger_space_user" {
  description = "Neo4j LedgerSpace username"
  type        = string
  sensitive   = true
}

variable "neo4j_ledger_space_pass" {
  description = "Neo4j LedgerSpace password"
  type        = string
  sensitive   = true
}

variable "neo4j_search_space_user" {
  description = "Neo4j SearchSpace username"
  type        = string
  sensitive   = true
}

variable "neo4j_search_space_pass" {
  description = "Neo4j SearchSpace password"
  type        = string
  sensitive   = true
}

variable "neo4j_enterprise_license" {
  description = "Neo4j Enterprise License"
  type        = string
  sensitive   = true
}

variable "neo4j_public_key" {
  description = "Public key for Neo4j EC2 instances"
  type        = string

  validation {
    condition     = can(regex("^ssh-rsa AAAA[0-9A-Za-z+/]+[=]{0,3} .+$", var.neo4j_public_key))
    error_message = "The neo4j_public_key must be a valid OpenSSH public key. Please refer to the infrastructure management documentation for instructions on generating and managing SSH keys."
  }
}

variable "use_existing_resources" {
  description = "Map of resource types to boolean indicating whether to use existing resources"
  type = map(bool)
  default = {
    vpc                 = false
    subnets             = false
    security_groups     = false
    ecs_cluster         = false
    ecs_service         = false
    ecs_task_definition = false
    alb                 = false
    acm_certificate     = false
    route53_record      = false
    neo4j_instances     = false
    ssm_parameters      = false
  }
}

variable "neo4j_ledger_space_bolt_url" {
  description = "Neo4j LedgerSpace Bolt URL"
  type        = string
  default     = ""
}

variable "neo4j_search_space_bolt_url" {
  description = "Neo4j SearchSpace Bolt URL"
  type        = string
  default     = ""
}

locals {
  environment = terraform.workspace

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

  domain = {
    development = "dev.api.mycredex.app"
    staging     = "stage.api.mycredex.app"
    production  = "api.mycredex.app"
  }

  log_level = {
    development = "debug"
    staging     = "info"
    production  = "info"
  }
}

# Note: This configuration complies with the Neo4j Startup Software License Agreement:
# - Limits production instances to a maximum of 3
# - Ensures each instance doesn't exceed 24 Cores / 256 GB of RAM (limited in neo4j.tf)
# - Allows for both LedgerSpace and SearchSpace on a single instance for non-production environments
# - Provides up to 6 instances for development (currently set to 1, but can be increased up to 6)
# - Allows up to 3 instances for non-production testing (currently set to 1 for staging)