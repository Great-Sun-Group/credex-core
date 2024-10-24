# Outputs for the app module

output "ecr_repository_url" {
  value       = var.create_ecr ? aws_ecr_repository.credex_core[0].repository_url : null
  description = "The URL of the ECR repository"
}

output "ecs_cluster_arn" {
  value       = var.create_ecs_cluster ? aws_ecs_cluster.credex_cluster[0].arn : null
  description = "The ARN of the ECS cluster"
}

output "ecs_task_definition_arn" {
  value       = aws_ecs_task_definition.credex_core.arn
  description = "The ARN of the ECS task definition"
}

output "ecs_service_name" {
  value       = var.create_ecs_cluster ? aws_ecs_service.credex_core[0].name : null
  description = "The name of the ECS service"
}

output "ecs_service_id" {
  value       = var.create_ecs_cluster ? aws_ecs_service.credex_core[0].id : null
  description = "The ID of the ECS service"
}
