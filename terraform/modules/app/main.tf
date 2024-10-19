# Updated app module configuration

# Provider configuration
provider "aws" {
  region = var.aws_region
}

# Data sources to fetch shared resources and database information
data "terraform_remote_state" "connectors" {
  backend = "s3"
  config = {
    bucket = var.terraform_state_bucket
    key    = "${var.environment}/connectors.tfstate"
    region = var.aws_region
  }
}

data "terraform_remote_state" "databases" {
  backend = "s3"
  config = {
    bucket = var.terraform_state_bucket
    key    = "${var.environment}/databases.tfstate"
    region = var.aws_region
  }
}

# ECR repository
resource "aws_ecr_repository" "credex_core" {
  count                = var.create_ecr ? 1 : 0
  name                 = "credex-core-${var.environment}"
  image_tag_mutability = "MUTABLE"
  
  tags = merge(var.common_tags, {
    Name = "credex-core-${var.environment}"
  })
}

# ECS cluster
resource "aws_ecs_cluster" "credex_cluster" {
  count = var.create_ecs_cluster ? 1 : 0
  name  = "credex-cluster-${var.environment}"
  
  tags = merge(var.common_tags, {
    Name = "credex-cluster-${var.environment}"
  })
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs_logs" {
  count             = var.create_log_group ? 1 : 0
  name              = "/ecs/credex-core-${var.environment}"
  retention_in_days = 30
  
  tags = merge(var.common_tags, {
    Name = "/ecs/credex-core-${var.environment}"
  })
}

# ECS task definition
resource "aws_ecs_task_definition" "credex_core" {
  family                   = "credex-core-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = var.create_iam_roles ? aws_iam_role.ecs_execution_role[0].arn : null
  task_role_arn            = var.create_iam_roles ? aws_iam_role.ecs_task_role[0].arn : null

  container_definitions = jsonencode(
    [
      {
        name  = "credex-core"
        image = var.create_ecr ? "${aws_ecr_repository.credex_core[0].repository_url}:latest" : "placeholder-image:latest"
        portMappings = [
          {
            containerPort = 5000
            hostPort      = 5000
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
            awslogs-group         = var.create_log_group ? aws_cloudwatch_log_group.ecs_logs[0].name : "placeholder-log-group"
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
  count           = var.create_ecs_cluster ? 1 : 0
  name            = "credex-core-service-${var.environment}"
  cluster         = aws_ecs_cluster.credex_cluster[0].id
  task_definition = aws_ecs_task_definition.credex_core.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.ecs_tasks_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  tags = merge(var.common_tags, {
    Name = "credex-core-service-${var.environment}"
  })
}

# IAM roles
resource "aws_iam_role" "ecs_execution_role" {
  count = var.create_iam_roles ? 1 : 0
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

  tags = merge(var.common_tags, {
    Name = "ecs-execution-role-${var.environment}"
  })
}

resource "aws_iam_role" "ecs_task_role" {
  count = var.create_iam_roles ? 1 : 0
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

  tags = merge(var.common_tags, {
    Name = "ecs-task-role-${var.environment}"
  })
}

# Attach necessary policies to the roles
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  count      = var.create_iam_roles ? 1 : 0
  role       = aws_iam_role.ecs_execution_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "cloudwatch_logs_access" {
  count = var.create_iam_roles ? 1 : 0
  name  = "cloudwatch-logs-access"
  role  = aws_iam_role.ecs_task_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = var.create_log_group ? ["${aws_cloudwatch_log_group.ecs_logs[0].arn}:*"] : []
      }
    ]
  })
}

# Outputs
output "ecr_repository_url" {
  value       = var.create_ecr ? aws_ecr_repository.credex_core[0].repository_url : null
  description = "The URL of the ECR repository"
}

output "ecs_cluster_arn" {
  value       = var.create_ecs_cluster ? aws_ecs_cluster.credex_cluster[0].arn : null
  description = "The ARN of the ECS cluster"
}

output "ecs_task_definition_arn" {
  value       = aws_ecs_task_definition.credex_core.arn
  description = "The ARN of the ECS task definition"
}

output "ecs_service_name" {
  value       = var.create_ecs_cluster ? aws_ecs_service.credex_core[0].name : null
  description = "The name of the ECS service"
}

output "ecs_service_id" {
  value       = var.create_ecs_cluster ? aws_ecs_service.credex_core[0].id : null
  description = "The ID of the ECS service"
}
