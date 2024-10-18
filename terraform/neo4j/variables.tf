variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "create_key_pair" {
  description = "Whether to create a new key pair"
  type        = bool
}

variable "neo4j_security_group_id" {
  description = "ID of the Neo4j security group"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for Neo4j instances"
  type        = list(string)
}

variable "neo4j_enterprise_license" {
  description = "Neo4j Enterprise License"
  type        = string
  sensitive   = true
}

variable "neo4j_instance_type" {
  description = "Map of environment to Neo4j instance types"
  type        = map(string)
}

variable "neo4j_instance_size" {
  description = "Map of environment to Neo4j instance sizes"
  type        = map(number)
}
