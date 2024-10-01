provider "aws" {
  region = var.aws_region
}

resource "aws_ecr_repository" "credex_core" {
  name = "credex-core"
}

resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster"
}

resource "aws_ecs_task_definition" "credex_core_task" {
  family                   = "credex-core-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

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
        { name = "NODE_ENV", value = var.environment }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/credex-core"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "credex_core_service" {
  name            = "credex-core-service"
  cluster         = aws_ecs_cluster.credex_cluster.id
  task_definition = aws_ecs_task_definition.credex_core_task.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = var.subnet_ids
    assign_public_ip = true
    security_groups  = [aws_security_group.ecs_tasks.id]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "credex-core-ecs-tasks-security-group"
  description = "Allow inbound access from the ALB only"
  vpc_id      = var.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 5000
    to_port         = 5000
    cidr_blocks     = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "us-east-1"
}

variable "environment" {
  description = "The deployment environment (e.g., production, staging)"
}

variable "vpc_id" {
  description = "The ID of the VPC to deploy the ECS tasks in"
}

variable "subnet_ids" {
  description = "The subnet IDs to deploy the ECS tasks in"
  type        = list(string)
}

output "ecr_repository_url" {
  value = aws_ecr_repository.credex_core.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.credex_cluster.name
}

output "ecs_service_name" {
  value = aws_ecs_service.credex_core_service.name
}