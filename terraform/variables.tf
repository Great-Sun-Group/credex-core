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
  description = "Whether to use existing resources or create new ones"
  type        = bool
  default     = false
}

locals {
  environment = terraform.workspace

  neo4j_instance_count = {
    development = 1
    staging     = 1
    production  = 2
  }

  neo4j_instance_type = {
    development = "t3.micro"
    staging     = "t3.medium"
    production  = "t3.medium"
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