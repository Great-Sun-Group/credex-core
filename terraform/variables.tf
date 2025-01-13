# Required variables
variable "environment" {
  description = "The deployment environment (development, staging, production, model_001)"
  type        = string

  validation {
    condition     = contains(["production", "development", "staging", "model_001"], var.environment)
    error_message = "Environment must be one of: production, development, staging, model_001"
  }
}

variable "docker_image" {
  description = "The full Docker image to deploy (including repository and tag)"
  type        = string
  default     = "dummy-image:latest"  # Default value for connectors workflow
}


# Neo4j related variables needed by databases module
variable "neo_4j_ledger_space_bolt_url" {
  description = "The Neo4j Bolt URL for Ledger Space"
  type        = string
  sensitive   = true
}

variable "neo_4j_search_space_bolt_url" {
  description = "The Neo4j Bolt URL for Search Space"
  type        = string
  sensitive   = true
}

variable "neo_4j_ledger_space_user" {
  description = "The username for the Neo4j Ledger Space"
  type        = string
  sensitive   = true
}

variable "neo_4j_search_space_user" {
  description = "The username for the Neo4j Search Space"
  type        = string
  sensitive   = true
}

variable "neo_4j_ledger_space_password" {
  description = "The password for the Neo4j Ledger Space"
  type        = string
  sensitive   = true
}

variable "neo_4j_search_space_password" {
  description = "The password for the Neo4j Search Space"
  type        = string
  sensitive   = true
}

variable "neo4j_enterprise_license" {
  description = "The Neo4j Enterprise License"
  type        = string
  sensitive   = true
}

# Firebase variables
variable "firebase_project_id" {
  description = "The Firebase project ID"
  type        = string
  sensitive   = true
}

variable "firebase_client_email" {
  description = "The Firebase client email"
  type        = string
  sensitive   = true
}

variable "firebase_private_key" {
  description = "The Firebase private key"
  type        = string
  sensitive   = true
}
