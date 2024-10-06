output "api_url" {
  value       = "https://${module.security.api_domain}"
  description = "The URL of the deployed API"
}

output "api_domain" {
  value       = module.security.api_domain
  description = "The domain name of the API"
}

output "ecs_cluster_name" {
  value       = module.ecs.ecs_cluster_name
  description = "The name of the ECS cluster"
}

output "ecs_service_name" {
  value       = module.ecs.ecs_service_name
  description = "The name of the ECS service"
}

output "ecr_repository_url" {
  value       = module.ecs.ecr_repository_url
  description = "The URL of the ECR repository"
}

output "neo4j_ledger_private_ip" {
  value       = module.neo4j.neo4j_ledger_private_ip
  description = "The private IP address of the Neo4j LedgerSpace instance"
}

output "neo4j_search_private_ip" {
  value       = module.neo4j.neo4j_search_private_ip
  description = "The private IP address of the Neo4j SearchSpace instance"
}

output "neo4j_ami_id" {
  value       = local.neo4j_ami_id
  description = "The ID of the Neo4j AMI used for EC2 instances"
}

output "acm_certificate_arn" {
  value       = module.security.acm_certificate_arn
  description = "ARN of the ACM certificate created for HTTPS"
}

output "vpc_id" {
  value       = module.networking.vpc_id
  description = "The ID of the VPC used for deployment"
}

output "environment" {
  value       = local.effective_environment
  description = "The current deployment environment"
}