# Provider configuration
provider "aws" {
  region = var.aws_region
}

# ECS cluster
resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster-${var.environment}"
  
  tags = merge(var.common_tags, {
    Name = "credex-cluster-${var.environment}"
  })
}

# Validate configurations
resource "null_resource" "validations" {
  lifecycle {
    precondition {
      condition     = var.ecs_task_cpu != null && tonumber(var.ecs_task_cpu) > 0
      error_message = "Invalid ECS task CPU configuration"
    }
    
    precondition {
      condition     = var.ecs_task_memory != null && tonumber(var.ecs_task_memory) > 0
      error_message = "Invalid ECS task memory configuration"
    }
    
    precondition {
      condition     = var.app_port > 0 && var.app_port < 65536
      error_message = "Invalid application port. Must be between 1 and 65535"
    }
  }
}

# ECS task definition
resource "aws_ecs_task_definition" "credex_core" {
  family                   = "credex-core-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "credex-core"
      image = "${var.ecr_repository_url}:latest"
      portMappings = [
        {
          containerPort = var.app_port
          hostPort     = var.app_port
          protocol     = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = tostring(var.app_port) }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.app_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = var.cloudwatch_log_group_name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
      essential = true
    }
  ])

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
    container_port   = var.app_port
  }

  health_check_grace_period_seconds = 120

  enable_execute_command = true

  tags = merge(var.common_tags, {
    Name = "credex-core-service-${var.environment}"
  })
}
