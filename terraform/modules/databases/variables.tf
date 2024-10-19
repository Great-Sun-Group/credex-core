variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "The IDs of the subnets for Neo4j instances"
  type        = list(string)
}

variable "neo4j_security_group_id" {
  description = "The ID of the Neo4j security group"
  type        = string
}

variable "key_pair_name" {
  description = "The name of the key pair for Neo4j instances"
  type        = string
}

variable "neo4j_instance_type" {
  description = "The instance type for both LedgerSpace and SearchSpace Neo4j instances"
  type        = string
}

variable "neo4j_volume_size" {
  description = "The size of the EBS volume for both LedgerSpace and SearchSpace Neo4j instances in GB"
  type        = number
}

variable "neo4j_enterprise_license" {
  description = "The Neo4j Enterprise License for both LedgerSpace and SearchSpace instances"
  type        = string
  sensitive   = true
}

variable "create_neo4j_instances" {
  description = "Whether to create Neo4j instances for both LedgerSpace and SearchSpace"
  type        = bool
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "terraform_state_bucket" {
  description = "The S3 bucket name for Terraform state"
  type        = string
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
}
