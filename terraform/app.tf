module "app" {
  source = "./modules/app"

  environment                = var.environment
  aws_region                 = var.aws_region
  jwt_secret                 = var.jwt_secret
  open_exchange_rates_api    = var.open_exchange_rates_api
  common_tags                = var.common_tags

  ecs_task_cpu               = var.ecs_task_cpu[var.environment]
  ecs_task_memory            = var.ecs_task_memory[var.environment]

  vpc_id                     = module.connectors.vpc_id
  subnet_ids                 = module.connectors.private_subnet_ids
  private_subnet_ids         = module.connectors.private_subnet_ids
  ecs_tasks_security_group_id = module.connectors.ecs_tasks_security_group_id
  alb_security_group_id      = module.connectors.alb_security_group_id
  target_group_arn           = module.connectors.target_group_arn
  alb_listener               = module.connectors.alb_listener

  neo_4j_ledger_space_bolt_url   = var.neo_4j_ledger_space_bolt_url
  neo_4j_search_space_bolt_url   = var.neo_4j_search_space_bolt_url
  neo_4j_ledger_space_user   = var.neo_4j_ledger_space_user
  neo_4j_search_space_user   = var.neo_4j_search_space_user
  neo_4j_ledger_space_password = var.neo_4j_ledger_space_password
  neo_4j_search_space_password = var.neo_4j_search_space_password
}

output "ecr_repository_url" {
  value       = module.app.ecr_repository_url
  description = "The URL of the ECR repository"
}

output "ecs_cluster_arn" {
  value       = module.app.ecs_cluster_arn
  description = "The ARN of the ECS cluster"
}

output "ecs_task_definition_arn" {
  value       = module.app.ecs_task_definition_arn
  description = "The ARN of the ECS task definition"
}

output "ecs_service_name" {
  value       = module.app.ecs_service_name
  description = "The name of the ECS service"
}

output "ecs_service_id" {
  value       = module.app.ecs_service_id
  description = "The ID of the ECS service"
}
