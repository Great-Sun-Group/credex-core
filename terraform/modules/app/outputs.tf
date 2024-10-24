# Outputs for the app module

output "ecr_repository_url" {
  value       = aws_ecr_repository.credex_core.repository_url
  description = "The URL of the ECR repository"
}

output "ecs_cluster_arn" {
  value       = aws_ecs_cluster.credex_cluster.arn
  description = "The ARN of the ECS cluster"
}

output "ecs_task_definition_arn" {
  value       = aws_ecs_task_definition.credex_core.arn
  description = "The ARN of the ECS task definition"
}

output "ecs_service_name" {
  value       = aws_ecs_service.credex_core.name
  description = "The name of the ECS service"
}

output "ecs_service_id" {
  value       = aws_ecs_service.credex_core.id
  description = "The ID of the ECS service"
}
