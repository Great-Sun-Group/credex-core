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
  tags                 = var.common_tags
}

# ECS cluster
resource "aws_ecs_cluster" "credex_cluster" {
  for_each = var.create_ecs_cluster ? toset(["credex-cluster"]) : []
  name     = "credex-cluster-${var.environment}"
  tags     = var.common_tags
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs_logs" {
  count = var.create_log_group ? 1 : 0
  name  = "/ecs/credex-core-${var.environment}"
  tags  = var.common_tags
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

  container_definitions = jsonencode([
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
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "OPEN_EXCHANGE_RATES_API", value = var.open_exchange_rates_api }
      ]
      secrets = [
        { name = "NEO_4J_LEDGER_SPACE_PASSWORD", valueFrom = var.neo_4j_ledger_space_password },
        { name = "NEO_4J_SEARCH_SPACE_PASSWORD", valueFrom = var.neo_4j_search_space_password }
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
  ])

  tags = var.common_tags
}

# ECS service
resource "aws_ecs_service" "credex_core" {
  count           = var.create_ecs_cluster ? 1 : 0
  name            = "credex-core-service-${var.environment}"
  cluster         = aws_ecs_cluster.credex_cluster["credex-cluster"].id
  task_definition = aws_ecs_task_definition.credex_core.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.ecs_tasks_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  tags = var.common_tags
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

  tags = var.common_tags
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

  tags = var.common_tags
}

# Attach necessary policies to the roles
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  count      = var.create_iam_roles ? 1 : 0
  role       = var.create_iam_roles ? aws_iam_role.ecs_execution_role[0].name : null
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_policy" {
  count      = var.create_iam_roles ? 1 : 0
  role       = var.create_iam_roles ? aws_iam_role.ecs_task_role[0].name : null
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}
