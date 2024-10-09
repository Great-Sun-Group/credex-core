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
  domain      = local.environment == "production" ? "api.mycredex.app" : "${local.environment}.api.mycredex.app"
  common_tags = {
    Environment = local.environment
    Project     = "CredEx"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecr_repository" "credex_core" {
  name                 = "credex-core-${local.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [image_tag_mutability, image_scanning_configuration, name]
  }
}

resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster-${local.environment}"
  tags = local.common_tags
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role-${local.environment}"

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

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [name]
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role-${local.environment}"

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

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [name]
  }
}

resource "aws_ecs_task_definition" "credex_core_task" {
  family                   = "credex-core-${local.environment}"
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
        { name = "NODE_ENV", value = local.environment },
        { name = "LOG_LEVEL", value = local.environment == "production" ? "info" : "debug" },
        { name = "AWS_REGION", value = var.aws_region }
      ]
      secrets = [
        for key in keys(aws_ssm_parameter.params) :
        { name = upper(replace(key, "_", "")), valueFrom = aws_ssm_parameter.params[key].arn }
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

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/credex-core-${local.environment}"
  retention_in_days = 30
  tags              = local.common_tags

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [name]
  }
}

resource "aws_ecs_service" "credex_core_service" {
  name            = "credex-core-service-${local.environment}"
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

resource "null_resource" "update_bolt_urls" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      LEDGER_IP=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=Neo4j-${local.environment}-LedgerSpace" --query "Reservations[0].Instances[0].PrivateIpAddress" --output text)
      SEARCH_IP=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=Neo4j-${local.environment}-SearchSpace" --query "Reservations[0].Instances[0].PrivateIpAddress" --output text)
      
      aws ssm put-parameter --name "/credex/${local.environment}/neo4j_ledger_space_bolt_url" --value "bolt://$LEDGER_IP:7687" --type SecureString --overwrite
      aws ssm put-parameter --name "/credex/${local.environment}/neo4j_search_space_bolt_url" --value "bolt://$SEARCH_IP:7687" --type SecureString --overwrite
    EOT
  }

  depends_on = [aws_instance.neo4j]
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
  value       = local.environment
  description = "The current deployment environment"
}

output "neo4j_ledger_bolt_url" {
  value       = aws_ssm_parameter.params["neo4j_ledger_space_bolt_url"].value
  sensitive   = true
  description = "The Neo4j Ledger Space Bolt URL"
}

output "neo4j_search_bolt_url" {
  value       = aws_ssm_parameter.params["neo4j_search_space_bolt_url"].value
  sensitive   = true
  description = "The Neo4j Search Space Bolt URL"
}
