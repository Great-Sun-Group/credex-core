variable "environment" {
  description = "The deployment environment (e.g., production, staging, development)"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
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

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "The IDs of the subnets"
  type        = list(string)
}

variable "target_group_arn" {
  description = "The ARN of the target group"
  type        = string
}

variable "alb_security_group_id" {
  description = "The ID of the security group attached to the ALB"
  type        = string
}

variable "jwt_secret_arn" {
  description = "The ARN of the JWT secret in Parameter Store"
  type        = string
}

variable "whatsapp_bot_api_key_arn" {
  description = "The ARN of the WhatsApp bot API key in Parameter Store"
  type        = string
}

variable "open_exchange_rates_api_arn" {
  description = "The ARN of the Open Exchange Rates API key in Parameter Store"
  type        = string
}

variable "neo4j_ledger_space_bolt_url_arn" {
  description = "The ARN of the Neo4j LedgerSpace Bolt URL in Parameter Store"
  type        = string
}

variable "neo4j_ledger_space_user_arn" {
  description = "The ARN of the Neo4j LedgerSpace username in Parameter Store"
  type        = string
}

variable "neo4j_ledger_space_pass_arn" {
  description = "The ARN of the Neo4j LedgerSpace password in Parameter Store"
  type        = string
}

variable "neo4j_search_space_bolt_url_arn" {
  description = "The ARN of the Neo4j SearchSpace Bolt URL in Parameter Store"
  type        = string
}

variable "neo4j_search_space_user_arn" {
  description = "The ARN of the Neo4j SearchSpace username in Parameter Store"
  type        = string
}

variable "neo4j_search_space_pass_arn" {
  description = "The ARN of the Neo4j SearchSpace password in Parameter Store"
  type        = string
}