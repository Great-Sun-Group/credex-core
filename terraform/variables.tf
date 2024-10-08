variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "af-south-1"
}

variable "environment" {
  description = "The deployment environment (production, staging, or development)"
  type        = string
  default     = null # This allows us to use terraform.workspace as a fallback
}

variable "neo4j_version" {
  description = "Version of Neo4j to install"
  type        = string
  default     = "5.15.0"  # Updated to the latest available version
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
}

variable "whatsapp_bot_api_key" {
  description = "API key for WhatsApp bot"
  type        = string
}

variable "open_exchange_rates_api" {
  description = "API key for Open Exchange Rates"
  type        = string
}

variable "neo4j_ledger_space_bolt_url" {
  description = "Neo4j LedgerSpace Bolt URL"
  type        = string
}

variable "neo4j_ledger_space_user" {
  description = "Neo4j LedgerSpace username"
  type        = string
}

variable "neo4j_ledger_space_pass" {
  description = "Neo4j LedgerSpace password"
  type        = string
}

variable "neo4j_search_space_bolt_url" {
  description = "Neo4j SearchSpace Bolt URL"
  type        = string
}

variable "neo4j_search_space_user" {
  description = "Neo4j SearchSpace username"
  type        = string
}

variable "neo4j_search_space_pass" {
  description = "Neo4j SearchSpace password"
  type        = string
}