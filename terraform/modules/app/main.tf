# Updated app module configuration

# Provider configuration
provider "aws" {
  region = var.aws_region
}

# ECS cluster
resource "aws_ecs_cluster" "credex_cluster" {
  name  = "credex-cluster-${var.environment}"
  
  tags = merge(var.common_tags, {
    Name = "credex-cluster-${var.environment}"
  })
}

# ECS task definition
resource "aws_ecs_task_definition" "credex_core" {
  family                   = "credex-core-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode(
    [
      {
        name  = "credex-core"
        image = "${var.ecr_repository_url}:latest"
        portMappings = [
          {
            containerPort = 3000
            hostPort      = 3000
          }
        ]
        environment = [
          { name = "NODE_ENV", value = var.environment },
          { name = "NEO_4J_LEDGER_SPACE_BOLT_URL", value = var.neo_4j_ledger_space_bolt_url },
          { name = "NEO_4J_SEARCH_SPACE_BOLT_URL", value = var.neo_4j_search_space_bolt_url },
          { name = "NEO_4J_LEDGER_SPACE_USER", value = var.neo_4j_ledger_space_user },
          { name = "NEO_4J_SEARCH_SPACE_USER", value = var.neo_4j_search_space_user },
          { name = "NEO_4J_LEDGER_SPACE_PASSWORD", value = var.neo_4j_ledger_space_password },
          { name = "NEO_4J_SEARCH_SPACE_PASSWORD", value = var.neo_4j_search_space_password },
          { name = "JWT_SECRET", value = var.jwt_secret },
          { name = "OPEN_EXCHANGE_RATES_API", value = var.open_exchange_rates_api }
        ]
        logConfiguration = {
          logDriver = "awslogs"
          options = {
            awslogs-group         = var.cloudwatch_log_group_name
            awslogs-region        = var.aws_region
            awslogs-stream-prefix = "ecs"
          }
        }
      }
    ]
  )

  tags = merge(var.common_tags, {
    Name = "credex-core-task-definition-${var.environment}"
  })
}

# ECS service
resource "aws_ecs_service" "credex_core" {
  name            = "credex-core-service-${var.environment}"
  cluster         = aws_ecs_cluster.credex_cluster.id
  task_definition = aws_ecs_task_definition.credex_core.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_tasks_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "credex-core"
    container_port   = 3000
  }

  tags = merge(var.common_tags, {
    Name = "credex-core-service-${var.environment}"
  })
}
