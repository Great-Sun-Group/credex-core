variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "neo4j_security_group_id" {
  description = "The ID of the Neo4j security group"
  type        = string
}

variable "subnet_ids" {
  description = "The IDs of the subnets where Neo4j instances will be launched"
  type        = list(string)
}

variable "neo4j_enterprise_license" {
  description = "The Neo4j Enterprise license key"
  type        = string
}

variable "neo4j_instance_type" {
  description = "The instance type for Neo4j instances"
  type        = map(string)
  default = {
    development = "t3.medium"
    staging     = "t3.large"
    production  = "m5.xlarge"
  }
}

variable "neo4j_instance_size" {
  description = "The instance size (in GB) for Neo4j instances"
  type        = map(number)
  default = {
    development = 50
    staging     = 100
    production  = 200
  }
}

variable "key_name" {
  description = "The name of the key pair to use for Neo4j instances"
  type        = string
}

variable "create_key_pair" {
  description = "Whether to create a new key pair or use an existing one"
  type        = bool
  default     = false
}
