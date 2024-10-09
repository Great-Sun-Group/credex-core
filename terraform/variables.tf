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

  validation {
    condition     = can(regex("^ssh-rsa AAAA[0-9A-Za-z+/]+[=]{0,3} .+$", var.neo4j_public_key))
    error_message = "The neo4j_public_key must be a valid OpenSSH public key. Please refer to the infrastructure management documentation for instructions on generating and managing SSH keys."
  }
}

variable "neo4j_ledger_space_bolt_url" {
  description = "Neo4j LedgerSpace Bolt URL"
  type        = string
}

variable "neo4j_search_space_bolt_url" {
  description = "Neo4j SearchSpace Bolt URL"
  type        = string
}