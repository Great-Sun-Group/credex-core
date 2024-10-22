# Provider configuration
provider "aws" {
  region = var.aws_region
}

# Data sources to fetch shared resources and database information
data "terraform_remote_state" "foundations" {
  backend = "s3"
  config = {
    bucket = var.terraform_state_bucket
    key    = "foundations/terraform.tfstate"
    region = var.aws_region
  }
}

data "terraform_remote_state" "databases" {
  backend = "s3"
  config = {
    bucket = var.terraform_state_bucket
    key    = "databases/terraform.tfstate"
    region = var.aws_region
  }
}

# ECR repository
resource "aws_ecr_repository" "credex_core" {
  name                 = "credex-core-${var.environment}"
  image_tag_mutability = "MUTABLE"
  tags                 = var.common_tags
}

# ECS cluster
resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster-${var.environment}"
  tags = var.common_tags
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name = "/ecs/credex-core-${var.environment}"
  tags = var.common_tags
}

# ECS task definition
resource "aws_ecs_task_definition" "credex_core" {
  family                   = "credex-core-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "credex-core"
      image = "${aws_ecr_repository.credex_core.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "NEO_4J_LEDGER_SPACE_BOLT_URL", value = data.terraform_remote_state.databases.outputs.neo4j_bolt_urls[0] },
        { name = "NEO_4J_SEARCH_SPACE_BOLT_URL", value = data.terraform_remote_state.databases.outputs.neo4j_bolt_urls[1] },
        { name = "NEO_4J_LEDGER_SPACE_USER", value = "neo4j" },
        { name = "NEO_4J_SEARCH_SPACE_USER", value = "neo4j" },
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "OPEN_EXCHANGE_RATES_API", value = var.open_exchange_rates_api }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs_logs.name
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
  name            = "credex-core-service-${var.environment}"
  cluster         = aws_ecs_cluster.credex_cluster.id
  task_definition = aws_ecs_task_definition.credex_core.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.terraform_remote_state.foundations.outputs.subnet_ids
    security_groups  = [data.terraform_remote_state.foundations.outputs.ecs_tasks_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = data.terraform_remote_state.foundations.outputs.target_group_arn
    container_name   = "credex-core"
    container_port   = 3000
  }

  depends_on = [data.terraform_remote_state.foundations.outputs.alb_listener]

  tags = var.common_tags
}

# IAM roles
resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role-${var.environment}"

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
  name = "ecs-task-role-${var.environment}"

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
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

# Variables
variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}

variable "terraform_state_bucket" {
  description = "The S3 bucket name for Terraform state"
  type        = string
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}

variable "jwt_secret" {
  description = "Secret for JWT token generation"
  type        = string
}

variable "open_exchange_rates_api" {
  description = "API key for Open Exchange Rates"
  type        = string
}

# Outputs
output "ecr_repository_url" {
  value       = aws_ecr_repository.credex_core.repository_url
  description = "The URL of the ECR repository"
}

output "ecs_cluster_arn" {
  value       = aws_ecs_cluster.credex_cluster.arn
  description = "The ARN of the ECS cluster"
}

output "ecs_task_definition_arn" {
  value       = aws_ecs_task_definition.credex_core.arn
  description = "The ARN of the ECS task definition"
}
