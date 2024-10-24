variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
}

variable "create_ecr" {
  description = "Whether to create the ECR repository"
  type        = bool
  default     = true
}

variable "create_ecs_cluster" {
  description = "Whether to create the ECS cluster"
  type        = bool
  default     = true
}

variable "create_log_group" {
  description = "Whether to create the CloudWatch log group"
  type        = bool
  default     = true
}

variable "create_iam_roles" {
  description = "Whether to create IAM roles"
  type        = bool
  default     = true
}

variable "jwt_secret" {
  description = "The secret used for JWT token generation"
  type        = string
  sensitive   = true
}

variable "open_exchange_rates_api" {
  description = "API key for Open Exchange Rates"
  type        = string
  sensitive   = true
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

variable "ecs_task_cpu" {
  description = "The amount of CPU to allocate for the ECS task"
  type        = string
}

variable "ecs_task_memory" {
  description = "The amount of memory to allocate for the ECS task"
  type        = string
}

variable "app_port" {
  description = "The port the app runs on"
  type        = number
  default     = 3000
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "ecs_tasks_security_group_id" {
  description = "The ID of the ECS tasks security group"
  type        = string
}

variable "target_group_arn" {
  description = "The ARN of the target group"
  type        = string
}

variable "alb_listener" {
  description = "The ARN of the ALB listener"
  type        = string
}

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

# Updated and new variables from main.tf
variable "subnet_ids" {
  description = "List of subnet IDs (public) for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the ECS tasks"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ID of the ALB security group"
  type        = string
}
