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

# AWS Systems Manager Parameter Store resources
# These resources are created with placeholder values and updated post-deployment
resource "aws_ssm_parameter" "neo4j_ledger_space_bolt_url" {
  name  = "/credex/${local.effective_environment}/neo4j_ledger_space_bolt_url"
  type  = "String"
  value = var.neo4j_ledger_space_bolt_url != "" ? var.neo4j_ledger_space_bolt_url : "placeholder"
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "neo4j_search_space_bolt_url" {
  name  = "/credex/${local.effective_environment}/neo4j_search_space_bolt_url"
  type  = "String"
  value = var.neo4j_search_space_bolt_url != "" ? var.neo4j_search_space_bolt_url : "placeholder"
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/credex/${local.effective_environment}/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "whatsapp_bot_api_key" {
  name  = "/credex/${local.effective_environment}/whatsapp_bot_api_key"
  type  = "SecureString"
  value = var.whatsapp_bot_api_key
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "open_exchange_rates_api" {
  name  = "/credex/${local.effective_environment}/open_exchange_rates_api"
  type  = "SecureString"
  value = var.open_exchange_rates_api
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "neo4j_ledger_space_user" {
  name  = "/credex/${local.effective_environment}/neo4j_ledger_space_user"
  type  = "String"
  value = var.neo4j_ledger_space_user
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "neo4j_ledger_space_pass" {
  name  = "/credex/${local.effective_environment}/neo4j_ledger_space_pass"
  type  = "SecureString"
  value = var.neo4j_ledger_space_pass
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "neo4j_search_space_user" {
  name  = "/credex/${local.effective_environment}/neo4j_search_space_user"
  type  = "String"
  value = var.neo4j_search_space_user
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "neo4j_search_space_pass" {
  name  = "/credex/${local.effective_environment}/neo4j_search_space_pass"
  type  = "SecureString"
  value = var.neo4j_search_space_pass
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ecr_repository" "credex_core" {
  name = "credex-core-${local.effective_environment}"
  tags = local.common_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster-${local.effective_environment}"
  tags = local.common_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_ecs_task_definition" "credex_core_task" {
  family                   = "credex-core-${local.effective_environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = templatefile("${path.module}/task-definition.json", {
    CONTAINER_IMAGE                = "${aws_ecr_repository.credex_core.repository_url}:latest"
    NODE_ENV                       = local.effective_environment
    LOG_LEVEL                      = local.effective_environment == "production" ? "info" : "debug"
    AWS_REGION                     = var.aws_region
    JWT_SECRET                     = aws_ssm_parameter.jwt_secret.arn
    WHATSAPP_BOT_API_KEY           = aws_ssm_parameter.whatsapp_bot_api_key.arn
    OPEN_EXCHANGE_RATES_API        = aws_ssm_parameter.open_exchange_rates_api.arn
    NEO_4J_LEDGER_SPACE_BOLT_URL   = aws_ssm_parameter.neo4j_ledger_space_bolt_url.arn
    NEO_4J_LEDGER_SPACE_USER       = aws_ssm_parameter.neo4j_ledger_space_user.arn
    NEO_4J_LEDGER_SPACE_PASS       = aws_ssm_parameter.neo4j_ledger_space_pass.arn
    NEO_4J_SEARCH_SPACE_BOLT_URL   = aws_ssm_parameter.neo4j_search_space_bolt_url.arn
    NEO_4J_SEARCH_SPACE_USER       = aws_ssm_parameter.neo4j_search_space_user.arn
    NEO_4J_SEARCH_SPACE_PASS       = aws_ssm_parameter.neo4j_search_space_pass.arn
  })

  tags = local.common_tags
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role-${local.effective_environment}"

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
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "parameter_store_access" {
  name = "parameter-store-access-policy"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          aws_ssm_parameter.jwt_secret.arn,
          aws_ssm_parameter.whatsapp_bot_api_key.arn,
          aws_ssm_parameter.open_exchange_rates_api.arn,
          aws_ssm_parameter.neo4j_ledger_space_bolt_url.arn,
          aws_ssm_parameter.neo4j_ledger_space_user.arn,
          aws_ssm_parameter.neo4j_ledger_space_pass.arn,
          aws_ssm_parameter.neo4j_search_space_bolt_url.arn,
          aws_ssm_parameter.neo4j_search_space_user.arn,
          aws_ssm_parameter.neo4j_search_space_pass.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role-${local.effective_environment}"

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
  }
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
    target_group_arn = aws_lb_target_group.credex_tg.arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  tags = local.common_tags

  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "ec2-role-${local.effective_environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-profile-${local.effective_environment}"
  role = aws_iam_role.ec2_role.name

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

# Add null_resource for post-deployment configuration
# This resource updates the SSM parameters with the actual Neo4j instance details after they are created
resource "null_resource" "post_deployment_config" {
  count = local.neo4j_instance_count[local.effective_environment]

  triggers = {
    neo4j_instance_id = aws_instance.neo4j[count.index].id
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws ssm put-parameter \
        --name "/credex/${local.effective_environment}/neo4j_${count.index == 0 ? "ledger" : "search"}_space_bolt_url" \
        --value "bolt://${aws_instance.neo4j[count.index].private_ip}:7687" \
        --type String \
        --overwrite
    EOT
  }
}

# Outputs
# These outputs use the 'try' function to handle cases where resources might not be available yet
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
  value       = try(aws_ssm_parameter.neo4j_ledger_space_bolt_url.value, "Not available yet")
  sensitive   = true
  description = "The Neo4j Ledger Space Bolt URL"
}

output "neo4j_search_bolt_url" {
  value       = try(aws_ssm_parameter.neo4j_search_space_bolt_url.value, "Not available yet")
  sensitive   = true
  description = "The Neo4j Search Space Bolt URL"
}
