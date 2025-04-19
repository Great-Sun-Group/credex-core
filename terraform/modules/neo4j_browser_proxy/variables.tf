# Variables for the Neo4j Browser Proxy module

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where the proxy will be deployed"
  type        = string
}

variable "domain" {
  description = "Domain name for the proxy (e.g., example.com)"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "neo4j_ledger_instance_id" {
  description = "ID of the Neo4j Ledger instance"
  type        = string
}

variable "neo4j_search_instance_id" {
  description = "ID of the Neo4j Search instance"
  type        = string
}

variable "alb_listener_arn" {
  description = "ARN of the ALB listener to attach rules to"
  type        = string
}

variable "browser_auth_password" {
  description = "Password for Neo4j Browser authentication (temporarily not used, will be re-enabled later)"
  type        = string
  sensitive   = true
}
