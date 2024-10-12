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
  api_domain  = var.domain[local.environment]
  log_level   = var.log_level[local.environment]
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

data "aws_cloudwatch_log_group" "existing_ecs_logs" {
  name = "/ecs/credex-core-${local.environment}"
}

resource "aws_cloudwatch_log_group" "ecs_logs" {
  count             = var.operation_type != "delete" ? 1 : 0
  name              = "/ecs/credex-core-${local.environment}"
  retention_in_days = 30

  tags = local.common_tags

  lifecycle {
    prevent_destroy       = false
    create_before_destroy = true
    ignore_changes        = [tags]
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  count      = var.operation_type != "delete" ? 1 : 0
  role       = data.aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "credex_core_task" {
  count                    = var.operation_type != "delete" ? 1 : 0
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
        { name = "LOG_LEVEL", value = local.log_level },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "DOMAIN_NAME", value = local.api_domain },
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "OPEN_EXCHANGE_RATES_API", value = var.open_exchange_rates_api },
        { name = "NEO4J_LEDGER_SPACE_USER", value = var.neo4j_ledger_space_user },
        { name = "NEO4J_LEDGER_SPACE_PASS", value = var.neo4j_ledger_space_pass },
        { name = "NEO4J_SEARCH_SPACE_USER", value = var.neo4j_search_space_user },
        { name = "NEO4J_SEARCH_SPACE_PASS", value = var.neo4j_search_space_pass },
        { name = "NEO4J_LEDGER_SPACE_BOLT_URL", value = var.neo4j_ledger_space_bolt_url },
        { name = "NEO4J_SEARCH_SPACE_BOLT_URL", value = var.neo4j_search_space_bolt_url },
        { name = "NEO4J_ENTERPRISE_LICENSE", value = var.neo4j_enterprise_license }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs_logs[0].name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags

  depends_on = [aws_iam_role_policy_attachment.ecs_execution_role_policy]
}

resource "aws_ecs_service" "credex_core_service" {
  count           = var.operation_type != "delete" ? 1 : 0
  name            = "credex-core-service-${local.environment}"
  cluster         = data.aws_ecs_cluster.credex_cluster.id
  task_definition = aws_ecs_task_definition.credex_core_task[0].arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = data.aws_subnets.available.ids
    security_groups  = [aws_security_group.ecs_tasks[0].id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.credex_core[0].arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_execution_role_policy]

  tags = local.common_tags
}

# Output the task definition ARN
output "task_definition_arn" {
  value = var.operation_type != "delete" ? aws_ecs_task_definition.credex_core_task[0].arn : null
}

# Output the ECS service name
output "ecs_service_name" {
  value = var.operation_type != "delete" ? aws_ecs_service.credex_core_service[0].name : null
}
