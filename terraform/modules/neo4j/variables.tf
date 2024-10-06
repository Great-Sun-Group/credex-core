variable "environment" {
  description = "The deployment environment (e.g., production, staging, development)"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "neo4j_ami_id" {
  description = "The ID of the Neo4j AMI to use for EC2 instances"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "vpc_cidr" {
  description = "The CIDR block of the VPC"
  type        = string
}

variable "subnet_id" {
  description = "The ID of the subnet to launch the Neo4j instances in"
  type        = string
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

variable "neo4j_ledger_space_bolt_url" {
  description = "The Bolt URL for Neo4j LedgerSpace, stored in AWS Parameter Store"
  type        = string
  default     = ""
}