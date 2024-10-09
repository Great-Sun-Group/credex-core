terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  api_domain  = local.domain[local.environment]
  common_tags = {
    Environment = local.environment
    Project     = "CredEx"
    ManagedBy   = "Terraform"
  }
}

data "aws_ecr_repository" "credex_core" {
  name = "credex-core-${local.environment}"
}

data "aws_ecs_cluster" "credex_cluster" {
  cluster_name = "credex-cluster-${local.environment}"
}

data "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role-${local.environment}"
}

data "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role-${local.environment}"
}

# Check if CloudWatch log group already exists
data "aws_cloudwatch_log_group" "existing_ecs_logs" {
  name = "/ecs/credex-core-${local.environment}"
}

# Create CloudWatch log group only if it doesn't exist and use_existing_resources is false
resource "aws_cloudwatch_log_group" "ecs_logs" {
  count             = (!var.use_existing_resources && data.aws_cloudwatch_log_group.existing_ecs_logs.arn == null) ? 1 : 0
  name              = "/ecs/credex-core-${local.environment}"
  retention_in_days = 30

  tags = local.common_tags

  lifecycle {
    prevent_destroy       = true
    create_before_destroy = true
    ignore_changes        = [tags]
  }
}

# Ensure ECS execution role has necessary permissions for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = data.aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Data source for existing ECS task definition
data "aws_ecs_task_definition" "existing_task_definition" {
  task_definition = "credex-core-${local.environment}"
}

resource "aws_ecs_task_definition" "credex_core_task" {
  count                    = var.use_existing_resources ? 0 : 1
  family                   = "credex-core-${local.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.aws_iam_role.ecs_execution_role.arn
  task_role_arn            = data.aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "credex-core"
      image = "${data.aws_ecr_repository.credex_core.repository_url}:latest"
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
        }
      ]
      environment = [
        { name = "NODE_ENV", value = local.environment },
        { name = "LOG_LEVEL", value = local.log_level[local.environment] },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "NEO4J_LEDGER_SPACE_BOLT_URL", value = data.aws_ssm_parameter.existing_params["neo4j_ledger_space_bolt_url"].value },
        { name = "NEO4J_SEARCH_SPACE_BOLT_URL", value = data.aws_ssm_parameter.existing_params["neo4j_search_space_bolt_url"].value }
      ]
      secrets = [
        for key, param in data.aws_ssm_parameter.existing_params : {
          name      = upper(replace(key, "/credex/${local.environment}/", ""))
          valueFrom = param.arn
        }
        if !contains(["neo4j_ledger_space_bolt_url", "neo4j_search_space_bolt_url"], key)
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = coalesce(try(aws_cloudwatch_log_group.ecs_logs[0].name, null), data.aws_cloudwatch_log_group.existing_ecs_logs.name)
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags

  depends_on = [aws_iam_role_policy_attachment.ecs_execution_role_policy]
}

# Data source for existing ECS service
data "aws_ecs_service" "existing_service" {
  service_name = "credex-core-service-${local.environment}"
  cluster_arn  = data.aws_ecs_cluster.credex_cluster.arn
}

# Create or update ECS service based on use_existing_resources
resource "aws_ecs_service" "credex_core_service" {
  count           = var.use_existing_resources ? 0 : 1
  name            = "credex-core-service-${local.environment}"
  cluster         = data.aws_ecs_cluster.credex_cluster.id
  task_definition = var.use_existing_resources ? data.aws_ecs_task_definition.existing_task_definition.arn : aws_ecs_task_definition.credex_core_task[0].arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.credex_core.arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  depends_on = [aws_lb_listener.front_end, aws_iam_role_policy_attachment.ecs_execution_role_policy]

  tags = local.common_tags
}

# Outputs
output "api_url" {
  value       = "https://${aws_route53_record.api.name}"
  description = "The URL of the deployed API"
}

output "api_domain" {
  value       = aws_route53_record.api.name
  description = "The domain name of the API"
}

output "ecs_cluster_name" {
  value       = data.aws_ecs_cluster.credex_cluster.cluster_name
  description = "The name of the ECS cluster"
}

output "ecs_service_name" {
  value       = var.use_existing_resources ? data.aws_ecs_service.existing_service.service_name : aws_ecs_service.credex_core_service[0].name
  description = "The name of the ECS service"
}

output "ecr_repository_url" {
  value = data.aws_ecr_repository.credex_core.repository_url
}

output "vpc_id" {
  value       = data.aws_vpc.default.id
  description = "The ID of the VPC used for deployment"
}

output "environment" {
  value       = local.environment
  description = "The current deployment environment"
}

output "neo4j_ledger_bolt_url" {
  value       = data.aws_ssm_parameter.existing_params["neo4j_ledger_space_bolt_url"].value
  sensitive   = true
  description = "The Neo4j Ledger Space Bolt URL"
}

output "neo4j_search_bolt_url" {
  value       = data.aws_ssm_parameter.existing_params["neo4j_search_space_bolt_url"].value
  sensitive   = true
  description = "The Neo4j Search Space Bolt URL"
}

output "ecs_execution_role_arn" {
  value       = data.aws_iam_role.ecs_execution_role.arn
  description = "The ARN of the ECS execution role"
}

output "ecs_task_role_arn" {
  value       = data.aws_iam_role.ecs_task_role.arn
  description = "The ARN of the ECS task role"
}
