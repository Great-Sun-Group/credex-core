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
  vpc_id = data.aws_vpc.default.id != "" ? data.aws_vpc.default.id : aws_vpc.main[0].id
  effective_environment = coalesce(var.environment, terraform.workspace == "default" ? "production" : terraform.workspace)
  domain = local.effective_environment == "production" ? "api.mycredex.app" : local.effective_environment == "staging" ? "apistaging.mycredex.app" : "apidev.mycredex.app"
  common_tags = {
    Environment = local.effective_environment
    Project     = "CredEx"
    ManagedBy   = "Terraform"
  }
}

# Use data sources for existing SSM parameters
data "aws_ssm_parameter" "params" {
  for_each = toset([
    "neo4j_ledger_space_bolt_url",
    "neo4j_search_space_bolt_url",
    "jwt_secret",
    "whatsapp_bot_api_key",
    "open_exchange_rates_api",
    "neo4j_ledger_space_user",
    "neo4j_ledger_space_pass",
    "neo4j_search_space_user",
    "neo4j_search_space_pass"
  ])

  name = "/credex/${local.effective_environment}/${each.key}"
}

data "aws_ecr_repository" "credex_core" {
  name = "credex-core-${local.effective_environment}"
}

resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster-${local.effective_environment}"
  tags = local.common_tags
}

data "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role-${local.effective_environment}"
}

data "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role-${local.effective_environment}"
}

resource "aws_ecs_task_definition" "credex_core_task" {
  family                   = "credex-core-${local.effective_environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.aws_iam_role.ecs_execution_role.arn
  task_role_arn            = data.aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode(
    jsondecode(
      templatefile("${path.module}/task-definition.json", {
        CONTAINER_IMAGE                = "${data.aws_ecr_repository.credex_core.repository_url}:latest"
        NODE_ENV                       = local.effective_environment
        LOG_LEVEL                      = local.effective_environment == "production" ? "info" : "debug"
        AWS_REGION                     = var.aws_region
        JWT_SECRET                     = data.aws_ssm_parameter.params["jwt_secret"].arn
        WHATSAPP_BOT_API_KEY           = data.aws_ssm_parameter.params["whatsapp_bot_api_key"].arn
        OPEN_EXCHANGE_RATES_API        = data.aws_ssm_parameter.params["open_exchange_rates_api"].arn
        NEO_4J_LEDGER_SPACE_BOLT_URL   = data.aws_ssm_parameter.params["neo4j_ledger_space_bolt_url"].arn
        NEO_4J_LEDGER_SPACE_USER       = data.aws_ssm_parameter.params["neo4j_ledger_space_user"].arn
        NEO_4J_LEDGER_SPACE_PASS       = data.aws_ssm_parameter.params["neo4j_ledger_space_pass"].arn
        NEO_4J_SEARCH_SPACE_BOLT_URL   = data.aws_ssm_parameter.params["neo4j_search_space_bolt_url"].arn
        NEO_4J_SEARCH_SPACE_USER       = data.aws_ssm_parameter.params["neo4j_search_space_user"].arn
        NEO_4J_SEARCH_SPACE_PASS       = data.aws_ssm_parameter.params["neo4j_search_space_pass"].arn
      })
    ).containerDefinitions
  )

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = data.aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "parameter_store_access" {
  name = "parameter-store-access-policy-${local.effective_environment}"
  role = data.aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [for param in data.aws_ssm_parameter.params : param.arn]
      }
    ]
  })
}

resource "aws_ecs_service" "credex_core_service" {
  name            = "credex-core-service-${local.effective_environment}"
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
    target_group_arn = data.aws_lb_target_group.credex_tg.arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [task_definition, desired_count, load_balancer]
  }
}

data "aws_iam_role" "ec2_role" {
  name = "ec2-role-${local.effective_environment}"
}

data "aws_iam_instance_profile" "neo4j_profile" {
  name = "ec2-profile-${local.effective_environment}"
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
  value = data.aws_ecr_repository.credex_core.repository_url
}

output "neo4j_ledger_private_ip" {
  value = try(aws_instance.neo4j[0].private_ip, "Not available yet")
}

output "neo4j_search_private_ip" {
  value = try(aws_instance.neo4j[1].private_ip, "Not available yet")
}

output "neo4j_ami_id" {
  value       = try(data.aws_ami.amazon_linux_2.id, "Not available yet")
  description = "The ID of the Amazon Linux 2 AMI used for Neo4j EC2 instances"
}

output "acm_certificate_arn" {
  value       = aws_acm_certificate.credex_cert.arn
  description = "ARN of the ACM certificate created for HTTPS"
}

output "vpc_id" {
  value       = local.vpc_id
  description = "The ID of the VPC used for deployment"
}

output "environment" {
  value       = local.effective_environment
  description = "The current deployment environment"
}

output "neo4j_ledger_bolt_url" {
  value       = data.aws_ssm_parameter.params["neo4j_ledger_space_bolt_url"].value
  sensitive   = true
  description = "The Neo4j Ledger Space Bolt URL"
}

output "neo4j_search_bolt_url" {
  value       = data.aws_ssm_parameter.params["neo4j_search_space_bolt_url"].value
  sensitive   = true
  description = "The Neo4j Search Space Bolt URL"
}
