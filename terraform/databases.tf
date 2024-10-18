# Provider configuration
provider "aws" {
  region = var.aws_region
}

# Data sources to fetch shared resources
data "terraform_remote_state" "foundations" {
  backend = "s3"
  config = {
    bucket = var.terraform_state_bucket
    key    = "foundations/terraform.tfstate"
    region = var.aws_region
  }
}

# Neo4j Module
module "neo4j" {
  source                   = "./neo4j"
  environment              = var.environment
  vpc_id                   = data.terraform_remote_state.foundations.outputs.vpc_id
  subnet_ids               = data.terraform_remote_state.foundations.outputs.subnet_ids
  neo4j_security_group_id  = data.terraform_remote_state.foundations.outputs.neo4j_security_group_id
  key_name                 = data.terraform_remote_state.foundations.outputs.key_pair_name
  neo4j_instance_type      = var.neo4j_instance_type
  neo4j_instance_size      = var.neo4j_instance_size
  neo4j_enterprise_license = var.neo4j_enterprise_license
}

# Variables
variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}

variable "terraform_state_bucket" {
  description = "The S3 bucket name for Terraform state"
  type        = string
}

variable "neo4j_instance_type" {
  description = "The EC2 instance type for Neo4j"
  type        = string
}

variable "neo4j_instance_size" {
  description = "The root volume size for Neo4j instances"
  type        = number
}

variable "neo4j_enterprise_license" {
  description = "The Neo4j Enterprise license key"
  type        = string
}

# Outputs
output "neo4j_instance_ips" {
  value       = module.neo4j.neo4j_instance_ips
  description = "Private IPs of Neo4j instances"
}

output "neo4j_bolt_urls" {
  value       = module.neo4j.neo4j_bolt_urls
  description = "Neo4j Bolt URLs"
  sensitive   = true
}
