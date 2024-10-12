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

# New variable to control resource creation/deletion
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

# Check if CloudWatch log group already exists
data "aws_cloudwatch_log_group" "existing_ecs_logs" {
  name = "/ecs/credex-core-${local.environment}"
}

# Create CloudWatch log group only if it doesn't exist, use_existing_resources is false, and create_resources is true
resource "aws_cloudwatch_log_group" "ecs_logs" {
  count             = (var.create_resources && !lookup(var.use_existing_resources, "ecs_cluster", false) && data.aws_cloudwatch_log_group.existing_ecs_logs.arn == null) ? 1 : 0
  name              = "/ecs/credex-core-${local.environment}"
  retention_in_days = 30

  tags = local.common_tags

  lifecycle {
    prevent_destroy       = false
    create_before_destroy = true
    ignore_changes        = [tags]
  }
}

# Ensure ECS execution role has necessary permissions for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  count      = var.create_resources ? 1 : 0
  role       = data.aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Data source for existing ECS task definition
data "aws_ecs_task_definition" "existing_task_definition" {
  count           = lookup(var.use_existing_resources, "ecs_task_definition", false) ? 1 : 0
  task_definition = "credex-core-${local.environment}"
}

resource "aws_ecs_task_definition" "credex_core_task" {
  count                    = var.create_resources && !lookup(var.use_existing_resources, "ecs_task_definition", false) ? 1 : 0
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
        { name = "AWS_REGION", value = var.aws_region }
      ]
      secrets = var.create_resources ? [
        for key, param in aws_ssm_parameter.params : {
          name      = upper(replace(key, "/credex/${local.environment}/", ""))
          valueFrom = param.arn
        }
      ] : []
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

# Data source for existing ECS service
data "aws_ecs_service" "existing_service" {
  count        = lookup(var.use_existing_resources, "ecs_service", false) ? 1 : 0
  service_name = "credex-core-service-${local.environment}"
  cluster_arn  = data.aws_ecs_cluster.credex_cluster.arn
}

# Create or update ECS service based on use_existing_resources and create_resources
resource "aws_ecs_service" "credex_core_service" {
  count           = var.create_resources && !lookup(var.use_existing_resources, "ecs_service", false) ? 1 : 0
  name            = "credex-core-service-${local.environment}"
  cluster         = data.aws_ecs_cluster.credex_cluster.id
  task_definition = lookup(var.use_existing_resources, "ecs_task_definition", false) ? data.aws_ecs_task_definition.existing_task_definition[0].arn : aws_ecs_task_definition.credex_core_task[0].arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = data.aws_subnets.available.ids
    security_groups  = [lookup(var.use_existing_resources, "security_groups", false) ? data.aws_security_group.existing_ecs_tasks[0].id : aws_security_group.ecs_tasks[0].id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = lookup(var.use_existing_resources, "alb", false) ? data.aws_lb_target_group.existing_tg[0].arn : aws_lb_target_group.credex_core[0].arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_execution_role_policy]

  tags = local.common_tags
}
