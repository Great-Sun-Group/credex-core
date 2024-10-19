module "app" {
  source = "./modules/app"

  environment                = var.environment
  aws_region                 = var.aws_region
  terraform_state_bucket     = var.terraform_state_bucket
  create_ecr                 = var.create_ecr
  create_ecs_cluster         = var.create_ecs_cluster
  create_log_group           = var.create_log_group
  create_iam_roles           = var.create_iam_roles
  jwt_secret                 = var.jwt_secret
  open_exchange_rates_api    = var.open_exchange_rates_api
  common_tags                = var.common_tags

  vpc_id                     = module.connectors.vpc_id
  subnet_ids                 = module.connectors.subnet_ids
  ecs_tasks_security_group_id = module.connectors.ecs_tasks_security_group_id
  target_group_arn           = module.connectors.target_group_arn
  alb_listener               = module.connectors.alb_listener

  neo4j_bolt_urls            = module.databases.neo4j_bolt_urls
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
