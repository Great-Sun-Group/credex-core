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
  effective_environment = coalesce(var.environment, terraform.workspace == "default" ? "production" : terraform.workspace)
  domain = local.effective_environment == "production" ? "api.mycredex.app" : local.effective_environment == "staging" ? "apistaging.mycredex.app" : "apidev.mycredex.app"
  common_tags = {
    Environment = local.effective_environment
    Project     = "CredEx"
    ManagedBy   = "Terraform"
  }
}

# Use data sources for existing SSM parameters
data "aws_ssm_parameter" "params" {
  for_each = toset([
    "neo4j_ledger_space_bolt_url",
    "neo4j_search_space_bolt_url",
    "jwt_secret",
    "whatsapp_bot_api_key",
    "open_exchange_rates_api",
    "neo4j_ledger_space_user",
    "neo4j_ledger_space_pass",
    "neo4j_search_space_user",
    "neo4j_search_space_pass"
  ])

  name = "/credex/${local.effective_environment}/${each.key}"
}

resource "aws_ecr_repository" "credex_core" {
  name = "credex-core-${local.effective_environment}"
  tags = local.common_tags
}

resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster-${local.effective_environment}"
  tags = local.common_tags
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role-${local.effective_environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role-${local.effective_environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_ecs_task_definition" "credex_core_task" {
  family                   = "credex-core-${local.effective_environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "credex-core"
      image = "${aws_ecr_repository.credex_core.repository_url}:latest"
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
        }
      ]
      environment = [
        { name = "NODE_ENV", value = local.effective_environment },
        { name = "LOG_LEVEL", value = local.effective_environment == "production" ? "info" : "debug" },
        { name = "AWS_REGION", value = var.aws_region }
      ]
      secrets = [
        { name = "JWT_SECRET", valueFrom = data.aws_ssm_parameter.params["jwt_secret"].arn },
        { name = "WHATSAPP_BOT_API_KEY", valueFrom = data.aws_ssm_parameter.params["whatsapp_bot_api_key"].arn },
        { name = "OPEN_EXCHANGE_RATES_API", valueFrom = data.aws_ssm_parameter.params["open_exchange_rates_api"].arn },
        { name = "NEO_4J_LEDGER_SPACE_BOLT_URL", valueFrom = data.aws_ssm_parameter.params["neo4j_ledger_space_bolt_url"].arn },
        { name = "NEO_4J_LEDGER_SPACE_USER", valueFrom = data.aws_ssm_parameter.params["neo4j_ledger_space_user"].arn },
        { name = "NEO_4J_LEDGER_SPACE_PASS", valueFrom = data.aws_ssm_parameter.params["neo4j_ledger_space_pass"].arn },
        { name = "NEO_4J_SEARCH_SPACE_BOLT_URL", valueFrom = data.aws_ssm_parameter.params["neo4j_search_space_bolt_url"].arn },
        { name = "NEO_4J_SEARCH_SPACE_USER", valueFrom = data.aws_ssm_parameter.params["neo4j_search_space_user"].arn },
        { name = "NEO_4J_SEARCH_SPACE_PASS", valueFrom = data.aws_ssm_parameter.params["neo4j_search_space_pass"].arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/credex-core-${local.effective_environment}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/credex-core-${local.effective_environment}"
  retention_in_days = 30
  tags              = local.common_tags
}

resource "aws_ecs_service" "credex_core_service" {
  name            = "credex-core-service-${local.effective_environment}"
  cluster         = aws_ecs_cluster.credex_cluster.id
  task_definition = aws_ecs_task_definition.credex_core_task.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = data.aws_subnets.available.ids
    assign_public_ip = true
    security_groups  = [aws_security_group.ecs_tasks.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.credex_tg.arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  depends_on = [aws_lb_listener.credex_listener]

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
  value       = aws_ecs_cluster.credex_cluster.name
  description = "The name of the ECS cluster"
}

output "ecs_service_name" {
  value       = aws_ecs_service.credex_core_service.name
  description = "The name of the ECS service"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.credex_core.repository_url
}

output "vpc_id" {
  value       = data.aws_vpc.default.id
  description = "The ID of the VPC used for deployment"
}

output "environment" {
  value       = local.effective_environment
  description = "The current deployment environment"
}

output "neo4j_ledger_bolt_url" {
  value       = data.aws_ssm_parameter.params["neo4j_ledger_space_bolt_url"].value
  sensitive   = true
  description = "The Neo4j Ledger Space Bolt URL"
}

output "neo4j_search_bolt_url" {
  value       = data.aws_ssm_parameter.params["neo4j_search_space_bolt_url"].value
  sensitive   = true
  description = "The Neo4j Search Space Bolt URL"
}
