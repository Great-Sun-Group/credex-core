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

variable "create_resources" {
  description = "Whether to create (true) or destroy (false) resources"
  type        = bool
  default     = true
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
  count             = var.create_resources && data.aws_cloudwatch_log_group.existing_ecs_logs.arn == null ? 1 : 0
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
  count      = var.create_resources ? 1 : 0
  role       = data.aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_ecs_task_definition" "existing_task_definition" {
  count           = var.create_resources ? 0 : 1
  task_definition = "credex-core-${local.environment}"
}

resource "aws_ecs_task_definition" "credex_core_task" {
  count                    = var.create_resources ? 1 : 0
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
        { name = "DOMAIN_NAME", value = local.api_domain }
      ]
      secrets = [
        { name = "JWT_SECRET", valueFrom = var.jwt_secret_arn },
        { name = "OPEN_EXCHANGE_RATES_API", valueFrom = var.open_exchange_rates_api_arn },
        { name = "NEO4J_LEDGER_SPACE_USER", valueFrom = var.neo4j_ledger_space_user_arn },
        { name = "NEO4J_LEDGER_SPACE_PASS", valueFrom = var.neo4j_ledger_space_pass_arn },
        { name = "NEO4J_SEARCH_SPACE_USER", valueFrom = var.neo4j_search_space_user_arn },
        { name = "NEO4J_SEARCH_SPACE_PASS", valueFrom = var.neo4j_search_space_pass_arn },
        { name = "NEO4J_LEDGER_SPACE_BOLT_URL", valueFrom = var.neo4j_ledger_space_bolt_url_arn },
        { name = "NEO4J_SEARCH_SPACE_BOLT_URL", valueFrom = var.neo4j_search_space_bolt_url_arn },
        { name = "NEO4J_ENTERPRISE_LICENSE", valueFrom = var.neo4j_enterprise_license_arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = var.create_resources ? aws_cloudwatch_log_group.ecs_logs[0].name : data.aws_cloudwatch_log_group.existing_ecs_logs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags

  depends_on = [aws_iam_role_policy_attachment.ecs_execution_role_policy]
}

data "aws_ecs_service" "existing_service" {
  count        = var.create_resources ? 0 : 1
  service_name = "credex-core-service-${local.environment}"
  cluster_arn  = data.aws_ecs_cluster.credex_cluster.arn
}

resource "aws_ecs_service" "credex_core_service" {
  count           = var.create_resources ? 1 : 0
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
  value = var.create_resources ? aws_ecs_task_definition.credex_core_task[0].arn : data.aws_ecs_task_definition.existing_task_definition[0].arn
}

# Variables for secret ARNs
variable "jwt_secret_arn" {
  description = "ARN of the JWT secret in Secrets Manager"
  type        = string
}

variable "open_exchange_rates_api_arn" {
  description = "ARN of the Open Exchange Rates API key in Secrets Manager"
  type        = string
}

variable "neo4j_ledger_space_user_arn" {
  description = "ARN of the Neo4j Ledger Space user in Secrets Manager"
  type        = string
}

variable "neo4j_ledger_space_pass_arn" {
  description = "ARN of the Neo4j Ledger Space password in Secrets Manager"
  type        = string
}

variable "neo4j_search_space_user_arn" {
  description = "ARN of the Neo4j Search Space user in Secrets Manager"
  type        = string
}

variable "neo4j_search_space_pass_arn" {
  description = "ARN of the Neo4j Search Space password in Secrets Manager"
  type        = string
}

variable "neo4j_ledger_space_bolt_url_arn" {
  description = "ARN of the Neo4j Ledger Space Bolt URL in Secrets Manager"
  type        = string
}

variable "neo4j_search_space_bolt_url_arn" {
  description = "ARN of the Neo4j Search Space Bolt URL in Secrets Manager"
  type        = string
}

variable "neo4j_enterprise_license_arn" {
  description = "ARN of the Neo4j Enterprise License in Secrets Manager"
  type        = string
}
