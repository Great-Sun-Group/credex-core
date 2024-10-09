variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "af-south-1"
}

variable "environment" {
  description = "The deployment environment (e.g., development, staging, production)"
  type        = string
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

variable "neo4j_ledger_space_user" {
  description = "Neo4j LedgerSpace username"
  type        = string
}

variable "neo4j_ledger_space_pass" {
  description = "Neo4j LedgerSpace password"
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

variable "neo4j_enterprise_license" {
  description = "Neo4j Enterprise License"
  type        = string
}

variable "neo4j_public_key" {
  description = "Public key for Neo4j EC2 instances"
  type        = string
}