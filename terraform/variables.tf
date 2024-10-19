variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "af-south-1"
}

variable "domain_base" {
  description = "The base domain for all environments"
  type        = string
  default     = "mycredex.app"
}

locals {
  environment = terraform.workspace
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = map(string)
  default = {
    development = "10.0.0.0/16"
    staging     = "10.1.0.0/16"
    production  = "10.2.0.0/16"
  }
}

variable "ecs_task_cpu" {
  description = "The amount of CPU to allocate for the ECS task"
  type        = map(string)
  default = {
    development = "256"
    staging     = "1024"
    production  = "1024"
  }
}

variable "ecs_task_memory" {
  description = "The amount of memory to allocate for the ECS task"
  type        = map(string)
  default = {
    development = "512"
    staging     = "2048"
    production  = "2048"
  }
}

variable "app_port" {
  description = "The port the app runs on"
  type        = number
  default     = 5000
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

variable "create_key_pair" {
  description = "Whether to create the key pair"
  type        = bool
  default     = true
}

variable "create_load_balancer" {
  description = "Whether to create the load balancer"
  type        = bool
  default     = true
}

variable "create_target_group" {
  description = "Whether to create the target group"
  type        = bool
  default     = true
}

variable "create_security_groups" {
  description = "Whether to create security groups"
  type        = bool
  default     = true
}

variable "create_neo4j_instances" {
  description = "Whether to create Neo4j instances"
  type        = bool
  default     = true
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "open_exchange_rates_api" {
  description = "API key for Open Exchange Rates"
  type        = string
  sensitive   = true
}

variable "neo4j_enterprise_license" {
  description = "Neo4j Enterprise License"
  type        = string
  sensitive   = true
}

variable "terraform_state_bucket" {
  description = "The S3 bucket name for Terraform state"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

variable "neo4j_instance_type" {
  description = "Map of environment to Neo4j instance types"
  type        = map(string)
  default = {
    development = "t3.medium"
    staging     = "r5.2xlarge"
    production  = "r5.2xlarge"
  }
}

variable "neo4j_volume_size" {
  description = "Map of environment to Neo4j volume sizes (in GB)"
  type        = map(number)
  default = {
    development = 50
    staging     = 100
    production  = 100
  }
}
