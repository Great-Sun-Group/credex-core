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
  environment = var.environment
  domain      = local.environment == "production" ? "api.mycredex.app" : "${local.environment}.api.mycredex.app"
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

# Create CloudWatch log group only if it doesn't exist
resource "aws_cloudwatch_log_group" "ecs_logs" {
  count             = data.aws_cloudwatch_log_group.existing_ecs_logs.arn == null ? 1 : 0
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

resource "aws_ecs_task_definition" "credex_core_task" {
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
        { name = "LOG_LEVEL", value = local.environment == "production" ? "info" : "debug" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "NEO4J_LEDGER_SPACE_BOLT_URL", value = data.aws_ssm_parameter.existing_params["neo4j_ledger_space_bolt_url"].value },
        { name = "NEO4J_SEARCH_SPACE_BOLT_URL", value = data.aws_ssm_parameter.existing_params["neo4j_search_space_bolt_url"].value }
      ]
      secrets = [
        for key, param in data.aws_ssm_parameter.existing_params : {
          name      = upper(replace(key, "/credex/${var.environment}/", ""))
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

data "aws_ecs_service" "credex_core_service" {
  service_name = "credex-core-service-${local.environment}"
  cluster_arn  = data.aws_ecs_cluster.credex_cluster.arn
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
  value       = data.aws_ecs_service.credex_core_service.service_name
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
