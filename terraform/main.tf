provider "aws" {
  region = var.aws_region
}

data "aws_vpc" "selected" {
  id = var.vpc_id
}

resource "aws_ecr_repository" "credex_core" {
  name = "credex-core"
}

resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster"
}

resource "aws_ecs_task_definition" "credex_core_task" {
  family                   = "credex-core"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = templatefile("${path.module}/task-definition.json", {
    CONTAINER_IMAGE = "${aws_ecr_repository.credex_core.repository_url}:latest"
    NODE_ENV        = var.environment
    LOG_LEVEL       = "info"
    AWS_REGION      = var.aws_region
  })
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs_execution_role"

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
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "ecs_task_role"

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

  load_balancer {
    target_group_arn = aws_lb_target_group.credex_tg.arn
    container_name   = "credex-core"
    container_port   = 5000
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

resource "aws_lb" "credex_alb" {
  name               = "credex-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnet_ids
}

resource "aws_lb_target_group" "credex_tg" {
  name        = "credex-tg"
  port        = 5000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 30
    interval            = 60
  }
}

resource "aws_lb_listener" "credex_listener" {
  load_balancer_arn = aws_lb.credex_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.credex_tg.arn
  }
}

resource "aws_security_group" "alb" {
  name        = "credex-alb-security-group"
  description = "Controls access to the ALB"
  vpc_id      = var.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# AWS Secrets Manager for Neo4j Production Secrets
resource "aws_secretsmanager_secret" "neo4j_prod_secrets" {
  name = "neo4j_prod_secrets"
}

resource "aws_secretsmanager_secret_version" "neo4j_prod_secrets" {
  secret_id = aws_secretsmanager_secret.neo4j_prod_secrets.id
  secret_string = jsonencode({
    ledgerspacebolturl = "bolt://${aws_instance.neo4j_prod_ledger.private_ip}:7687"
    ledgerspaceuser    = "neo4j"
    ledgerspacepass    = var.prod_neo4j_ledger_space_pass
    searchspacebolturl = "bolt://${aws_instance.neo4j_prod_search.private_ip}:7687"
    searchspaceuser    = "neo4j"
    searchspacepass    = var.prod_neo4j_search_space_pass
  })
}

# AWS Secrets Manager for Neo4j Staging Secrets
resource "aws_secretsmanager_secret" "neo4j_stage_secrets" {
  name = "neo4j_stage_secrets"
}

resource "aws_secretsmanager_secret_version" "neo4j_stage_secrets" {
  secret_id = aws_secretsmanager_secret.neo4j_stage_secrets.id
  secret_string = jsonencode({
    ledgerspacebolturl = "bolt://${aws_instance.neo4j_stage_ledger.private_ip}:7687"
    ledgerspaceuser    = "neo4j"
    ledgerspacepass    = var.staging_neo4j_ledger_space_pass
    searchspacebolturl = "bolt://${aws_instance.neo4j_stage_search.private_ip}:7687"
    searchspaceuser    = "neo4j"
    searchspacepass    = var.staging_neo4j_search_space_pass
  })
}

# Neo4j Production LedgerSpace Instance (Community Edition)
resource "aws_instance" "neo4j_prod_ledger" {
  ami           = var.neo4j_community_ami
  instance_type = "t3.medium"
  key_name      = var.ec2_key_name

  vpc_security_group_ids = [aws_security_group.neo4j_prod.id]
  subnet_id              = var.subnet_ids[0]

  tags = {
    Name = "Neo4j-Production-LedgerSpace"
  }

  user_data = <<-EOF
              #!/bin/bash
              echo "Setting up Neo4j Community Edition for LedgerSpace"
              NEO4J_PASSWORD=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.neo4j_prod_secrets.id} --query SecretString --output text | jq -r .ledgerspacepass)
              # Install and configure Neo4j Community Edition
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
              neo4j-admin set-initial-password $NEO4J_PASSWORD
              systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

# Neo4j Production SearchSpace Instance (Community Edition)
resource "aws_instance" "neo4j_prod_search" {
  ami           = var.neo4j_community_ami
  instance_type = "t3.medium"
  key_name      = var.ec2_key_name

  vpc_security_group_ids = [aws_security_group.neo4j_prod.id]
  subnet_id              = var.subnet_ids[0]

  tags = {
    Name = "Neo4j-Production-SearchSpace"
  }

  user_data = <<-EOF
              #!/bin/bash
              echo "Setting up Neo4j Community Edition for SearchSpace"
              NEO4J_PASSWORD=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.neo4j_prod_secrets.id} --query SecretString --output text | jq -r .searchspacepass)
              # Install and configure Neo4j Community Edition
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
              neo4j-admin set-initial-password $NEO4J_PASSWORD
              systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

# Neo4j Staging LedgerSpace Instance (Community Edition)
resource "aws_instance" "neo4j_stage_ledger" {
  ami           = var.neo4j_community_ami
  instance_type = "t3.medium"
  key_name      = var.ec2_key_name

  vpc_security_group_ids = [aws_security_group.neo4j_stage.id]
  subnet_id              = var.subnet_ids[0]

  tags = {
    Name = "Neo4j-Staging-LedgerSpace"
  }

  user_data = <<-EOF
              #!/bin/bash
              echo "Setting up Neo4j Community Edition for LedgerSpace"
              NEO4J_PASSWORD=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.neo4j_stage_secrets.id} --query SecretString --output text | jq -r .ledgerspacepass)
              # Install and configure Neo4j Community Edition
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
              neo4j-admin set-initial-password $NEO4J_PASSWORD
              systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

# Neo4j Staging SearchSpace Instance (Community Edition)
resource "aws_instance" "neo4j_stage_search" {
  ami           = var.neo4j_community_ami
  instance_type = "t3.medium"
  key_name      = var.ec2_key_name

  vpc_security_group_ids = [aws_security_group.neo4j_stage.id]
  subnet_id              = var.subnet_ids[0]

  tags = {
    Name = "Neo4j-Staging-SearchSpace"
  }

  user_data = <<-EOF
              #!/bin/bash
              echo "Setting up Neo4j Community Edition for SearchSpace"
              NEO4J_PASSWORD=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.neo4j_stage_secrets.id} --query SecretString --output text | jq -r .searchspacepass)
              # Install and configure Neo4j Community Edition
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
              neo4j-admin set-initial-password $NEO4J_PASSWORD
              systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

# Security Group for Neo4j Production
resource "aws_security_group" "neo4j_prod" {
  name        = "neo4j-prod-sg"
  description = "Security group for Neo4j Production instances"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
  }

  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security Group for Neo4j Staging
resource "aws_security_group" "neo4j_stage" {
  name        = "neo4j-stage-sg"
  description = "Security group for Neo4j Staging instances"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
  }

  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "af-south-1"
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

variable "neo4j_community_ami" {
  description = "AMI ID for Neo4j Community Edition"
  type        = string
}

variable "ec2_key_name" {
  description = "Name of the EC2 key pair to use for the instances"
  type        = string
}

variable "prod_neo4j_ledger_space_pass" {
  description = "Password for Neo4j Production LedgerSpace instance"
  type        = string
  sensitive   = true
}

variable "prod_neo4j_search_space_pass" {
  description = "Password for Neo4j Production SearchSpace instance"
  type        = string
  sensitive   = true
}

variable "staging_neo4j_ledger_space_pass" {
  description = "Password for Neo4j Staging LedgerSpace instance"
  type        = string
  sensitive   = true
}

variable "staging_neo4j_search_space_pass" {
  description = "Password for Neo4j Staging SearchSpace instance"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "The domain name to use for the API"
  type        = string
}

variable "subdomain" {
  description = "The subdomain to use for the API"
  type        = string
}

data "aws_route53_zone" "selected" {
  name = "mycredex.app."
  private_zone = false
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = var.environment == "production" ? "api.mycredex.app" : "apistage.mycredex.app"
  type    = "A"

  alias {
    name                   = aws_lb.credex_alb.dns_name
    zone_id                = aws_lb.credex_alb.zone_id
    evaluate_target_health = true
  }
}

output "api_url" {
  value       = "http://${aws_lb.credex_alb.dns_name}"
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

output "neo4j_prod_ledger_private_ip" {
  value = aws_instance.neo4j_prod_ledger.private_ip
}

output "neo4j_prod_search_private_ip" {
  value = aws_instance.neo4j_prod_search.private_ip
}

output "neo4j_stage_ledger_private_ip" {
  value = aws_instance.neo4j_stage_ledger.private_ip
}

output "neo4j_stage_search_private_ip" {
  value = aws_instance.neo4j_stage_search.private_ip
}

output "neo4j_prod_secrets_arn" {
  value = aws_secretsmanager_secret.neo4j_prod_secrets.arn
}

output "neo4j_stage_secrets_arn" {
  value = aws_secretsmanager_secret.neo4j_stage_secrets.arn
}