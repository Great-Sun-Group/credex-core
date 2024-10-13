# Provider configuration
provider "aws" {
  region = var.aws_region
}

# Local variables
locals {
  common_tags = {
    Environment = var.environment
    Project     = "CredEx"
    ManagedBy   = "Terraform"
  }
  create_resources = var.operation_type == "create" || var.operation_type == "redeploy"
}

# Data source for existing ECR repository (used in wipe and redeploy)
data "aws_ecr_repository" "credex_core" {
  count = var.operation_type != "create" ? 1 : 0
  name  = "credex-core-${var.environment}"
}

# Create ECR repository if it doesn't exist (used in create and redeploy)
resource "aws_ecr_repository" "credex_core" {
  count = local.create_resources ? 1 : 0
  name  = "credex-core-${var.environment}"
  tags  = local.common_tags
}

# Data source for existing ECS cluster (used in wipe and redeploy)
data "aws_ecs_cluster" "credex_cluster" {
  count        = var.operation_type != "create" ? 1 : 0
  cluster_name = "credex-cluster-${var.environment}"
}

# Create ECS cluster if it doesn't exist (used in create and redeploy)
resource "aws_ecs_cluster" "credex_cluster" {
  count = local.create_resources ? 1 : 0
  name  = "credex-cluster-${var.environment}"
  tags  = local.common_tags
}

# ECS task definition
resource "aws_ecs_task_definition" "credex_core" {
  count                    = local.create_resources ? 1 : 0
  family                   = "credex-core-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role[0].arn
  task_role_arn            = aws_iam_role.ecs_task_role[0].arn

  container_definitions = jsonencode([
    {
      name  = "credex-core"
      image = "${try(aws_ecr_repository.credex_core[0].repository_url, data.aws_ecr_repository.credex_core[0].repository_url)}:latest"
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
        }
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
}

# ECS service
resource "aws_ecs_service" "credex_core" {
  count           = local.create_resources ? 1 : 0
  name            = "credex-core-service-${var.environment}"
  cluster         = try(aws_ecs_cluster.credex_cluster[0].id, data.aws_ecs_cluster.credex_cluster[0].arn)
  task_definition = aws_ecs_task_definition.credex_core[0].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.credex_subnets[*].id
    security_groups  = [aws_security_group.ecs_tasks[0].id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.credex_core[0].arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  depends_on = [aws_lb_listener.credex_listener]

  tags = local.common_tags
}

# IAM roles
resource "aws_iam_role" "ecs_execution_role" {
  count = local.create_resources ? 1 : 0
  name  = "ecs-execution-role-${var.environment}"

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

resource "aws_iam_role" "ecs_task_role" {
  count = local.create_resources ? 1 : 0
  name  = "ecs-task-role-${var.environment}"

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

# Attach necessary policies to the roles
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  count      = local.create_resources ? 1 : 0
  role       = aws_iam_role.ecs_execution_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs_logs" {
  count = local.create_resources ? 1 : 0
  name  = "/ecs/credex-core-${var.environment}"
  tags  = local.common_tags
}

# Outputs for debugging
output "ecr_repository_url" {
  value       = try(aws_ecr_repository.credex_core[0].repository_url, data.aws_ecr_repository.credex_core[0].repository_url, "N/A")
  description = "The URL of the ECR repository"
}

output "ecs_cluster_arn" {
  value       = try(aws_ecs_cluster.credex_cluster[0].arn, data.aws_ecs_cluster.credex_cluster[0].arn, "N/A")
  description = "The ARN of the ECS cluster"
}

output "ecs_task_definition_arn" {
  value       = try(aws_ecs_task_definition.credex_core[0].arn, "N/A")
  description = "The ARN of the ECS task definition"
}

# Add other necessary resources and configurations here
