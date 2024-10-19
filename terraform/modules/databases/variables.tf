variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "The IDs of the subnets"
  type        = list(string)
}

variable "neo4j_security_group_id" {
  description = "The ID of the Neo4j security group"
  type        = string
}

variable "key_pair_name" {
  description = "The name of the key pair"
  type        = string
}

variable "neo4j_instance_type" {
  description = "The instance type for Neo4j"
  type        = string
  default     = "t3.medium"
}

variable "neo4j_volume_size" {
  description = "The size of the EBS volume for Neo4j in GB"
  type        = number
  default     = 100
}

variable "neo4j_enterprise_license" {
  description = "The Neo4j Enterprise License"
  type        = string
  sensitive   = true
}

variable "create_neo4j_instances" {
  description = "Whether to create Neo4j instances"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}
