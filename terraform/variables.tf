variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "af-south-1"
}

variable "environment" {
  description = "The deployment environment (production, staging, or development)"
  type        = string
  default     = null # This allows us to use terraform.workspace as a fallback
}

variable "create_vpc" {
  description = "Whether to create a new VPC or use the default one"
  type        = bool
  default     = false
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "task_cpu" {
  description = "The number of CPU units used by the task"
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "The amount of memory used by the task (in MiB)"
  type        = string
  default     = "512"
}

variable "service_desired_count" {
  description = "The number of instances of the task definition to place and keep running"
  type        = number
  default     = 1
}

variable "update_neo4j_ami" {
  description = "Whether to update the Neo4j AMI to the latest version"
  type        = bool
  default     = false
}

variable "current_neo4j_ami_id" {
  description = "The current Neo4j AMI ID in use"
  type        = string
  default     = ""
}

variable "neo4j_ledger_space_user" {
  description = "The username for Neo4j LedgerSpace"
  type        = string
}

variable "neo4j_ledger_space_pass" {
  description = "The password for Neo4j LedgerSpace"
  type        = string
}

variable "neo4j_search_space_user" {
  description = "The username for Neo4j SearchSpace"
  type        = string
}

variable "neo4j_search_space_pass" {
  description = "The password for Neo4j SearchSpace"
  type        = string
}

variable "route53_zone_name" {
  description = "The name of the Route 53 hosted zone"
  type        = string
  default     = "mycredex.app."
}

variable "jwt_secret" {
  description = "The JWT secret for authentication"
  type        = string
}

variable "whatsapp_bot_api_key" {
  description = "The API key for the WhatsApp bot"
  type        = string
}

variable "open_exchange_rates_api" {
  description = "The API key for Open Exchange Rates"
  type        = string
}

variable "neo4j_ledger_space_bolt_url" {
  description = "The Bolt URL for Neo4j LedgerSpace, stored in AWS Parameter Store"
  type        = string
  default     = ""
}

variable "neo4j_search_space_bolt_url" {
  description = "The Bolt URL for Neo4j SearchSpace, stored in AWS Parameter Store"
  type        = string
  default     = ""
}