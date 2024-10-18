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
}

# Generate key pair
resource "tls_private_key" "credex_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Shared Resources Module
module "shared_resources" {
  source      = "./shared_resources"
  environment = var.environment
  common_tags = local.common_tags
  domain      = local.full_domain
  public_key  = tls_private_key.credex_key.public_key_openssh
}

# Neo4j Module
module "neo4j" {
  source                   = "./neo4j"
  environment              = var.environment
  common_tags              = local.common_tags
  subnet_ids               = module.shared_resources.subnet_ids
  neo4j_enterprise_license = var.neo4j_enterprise_license
  neo4j_instance_type      = local.neo4j_instance_type
  neo4j_instance_size      = local.neo4j_instance_size
  key_name                 = module.shared_resources.key_pair_name
}

# ECR repository
resource "aws_ecr_repository" "credex_core" {
  count                = var.create_ecr ? 1 : 0
  name                 = "credex-core-${var.environment}"
  image_tag_mutability = "MUTABLE"
  tags                 = local.common_tags
}

data "aws_ecr_repository" "credex_core" {
  count = var.create_ecr ? 0 : 1
  name  = "credex-core-${var.environment}"
}

# ECS cluster
resource "aws_ecs_cluster" "credex_cluster" {
  count = var.create_ecs_cluster ? 1 : 0
  name  = "credex-cluster-${var.environment}"
  tags  = local.common_tags
}

data "aws_ecs_cluster" "credex_cluster" {
  count        = var.create_ecs_cluster ? 0 : 1
  cluster_name = "credex-cluster-${var.environment}"
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs_logs" {
  count = var.create_log_group ? 1 : 0
  name  = "/ecs/credex-core-${var.environment}"
  tags  = local.common_tags
}

data "aws_cloudwatch_log_group" "ecs_logs" {
  count = var.create_log_group ? 0 : 1
  name  = "/ecs/credex-core-${var.environment}"
}

# ECS task definition
resource "aws_ecs_task_definition" "credex_core" {
  count                    = var.create_ecs_cluster ? 1 : 0
  family                   = "credex-core-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.create_iam_roles ? aws_iam_role.ecs_execution_role[0].arn : data.aws_iam_role.ecs_execution_role[0].arn
  task_role_arn            = var.create_iam_roles ? aws_iam_role.ecs_task_role[0].arn : data.aws_iam_role.ecs_task_role[0].arn

  container_definitions = jsonencode([
    {
      name  = "credex-core"
      image = "${var.create_ecr ? aws_ecr_repository.credex_core[0].repository_url : data.aws_ecr_repository.credex_core[0].repository_url}:latest"
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "NEO_4J_LEDGER_SPACE_BOLT_URL", value = module.neo4j.neo4j_ledger_space_bolt_url },
        { name = "NEO_4J_SEARCH_SPACE_BOLT_URL", value = module.neo4j.neo4j_search_space_bolt_url },
        { name = "NEO_4J_LEDGER_SPACE_USER", value = module.neo4j.neo4j_ledger_space_username },
        { name = "NEO_4J_LEDGER_SPACE_PASS", value = module.neo4j.neo4j_ledger_space_password },
        { name = "NEO_4J_SEARCH_SPACE_USER", value = module.neo4j.neo4j_search_space_username },
        { name = "NEO_4J_SEARCH_SPACE_PASS", value = module.neo4j.neo4j_search_space_password },
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "OPEN_EXCHANGE_RATES_API", value = var.open_exchange_rates_api }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = var.create_log_group ? aws_cloudwatch_log_group.ecs_logs[0].name : data.aws_cloudwatch_log_group.ecs_logs[0].name
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
  count           = var.create_ecs_cluster ? 1 : 0
  name            = "credex-core-service-${var.environment}"
  cluster         = var.create_ecs_cluster ? aws_ecs_cluster.credex_cluster[0].id : data.aws_ecs_cluster.credex_cluster[0].id
  task_definition = aws_ecs_task_definition.credex_core[0].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.shared_resources.subnet_ids
    security_groups  = [module.shared_resources.ecs_tasks_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = module.shared_resources.target_group_arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  depends_on = [module.shared_resources.alb_listener]

  tags = local.common_tags
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

  tags = local.common_tags
}

data "aws_iam_role" "ecs_execution_role" {
  count = var.create_iam_roles ? 0 : 1
  name  = "ecs-execution-role-${var.environment}"
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

  tags = local.common_tags
}

data "aws_iam_role" "ecs_task_role" {
  count = var.create_iam_roles ? 0 : 1
  name  = "ecs-task-role-${var.environment}"
}

# Attach necessary policies to the roles
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  count      = var.create_iam_roles ? 1 : 0
  role       = aws_iam_role.ecs_execution_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_policy" {
  count      = var.create_iam_roles ? 1 : 0
  role       = aws_iam_role.ecs_task_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

# Add ECR pull permissions to the ECS execution role
resource "aws_iam_role_policy" "ecs_ecr_policy" {
  count = var.create_iam_roles ? 1 : 0
  name  = "ecs-ecr-policy-${var.environment}"
  role  = aws_iam_role.ecs_execution_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Add explicit CloudWatch Logs permissions to the ECS execution role
resource "aws_iam_role_policy" "ecs_cloudwatch_logs_policy" {
  count = var.create_iam_roles ? 1 : 0
  name  = "ecs-cloudwatch-logs-policy-${var.environment}"
  role  = aws_iam_role.ecs_execution_role[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${var.create_log_group ? aws_cloudwatch_log_group.ecs_logs[0].arn : data.aws_cloudwatch_log_group.ecs_logs[0].arn}:*"
      }
    ]
  })
}

# Outputs
output "ecr_repository_url" {
  value       = var.create_ecr ? aws_ecr_repository.credex_core[0].repository_url : data.aws_ecr_repository.credex_core[0].repository_url
  description = "The URL of the ECR repository"
}

output "ecs_cluster_arn" {
  value       = var.create_ecs_cluster ? aws_ecs_cluster.credex_cluster[0].arn : data.aws_ecs_cluster.credex_cluster[0].arn
  description = "The ARN of the ECS cluster"
}

output "ecs_task_definition_arn" {
  value       = var.create_ecs_cluster ? aws_ecs_task_definition.credex_core[0].arn : null
  description = "The ARN of the ECS task definition"
}

output "neo4j_instance_ips" {
  value       = module.neo4j.neo4j_instance_ips
  description = "Private IPs of Neo4j instances"
}

output "neo4j_bolt_urls" {
  value       = module.neo4j.neo4j_bolt_urls
  description = "Neo4j Bolt URLs"
  sensitive   = true
}

output "alb_dns_name" {
  value       = module.shared_resources.alb_dns_name
  description = "The DNS name of the Application Load Balancer"
}
