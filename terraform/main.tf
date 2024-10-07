provider "aws" {
  region = var.aws_region
}

# Look for the default VPC
data "aws_vpc" "default" {
  default = true
}

# If default VPC doesn't exist, create a new one
resource "aws_vpc" "main" {
  count      = data.aws_vpc.default.id == "" ? 1 : 0
  cidr_block = "10.0.0.0/16"

  tags = merge(local.common_tags, {
    Name = "credex-vpc-${local.effective_environment}"
  })
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
resource "aws_ssm_parameter" "neo4j_ledger_space_bolt_url" {
  name  = "/credex/${local.effective_environment}/neo4j_ledger_space_bolt_url"
  type  = "String"
  value = var.neo4j_ledger_space_bolt_url
  tags  = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "neo4j_search_space_bolt_url" {
  name  = "/credex/${local.effective_environment}/neo4j_search_space_bolt_url"
  type  = "String"
  value = var.neo4j_search_space_bolt_url
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

# Look for existing Neo4j AMI
data "aws_ami" "neo4j" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["neo4j-${local.effective_environment}-*"]
  }

  filter {
    name   = "tag:Version"
    values = [var.neo4j_version]
  }
}

# Create a null_resource to manage Neo4j AMI creation and updates
resource "null_resource" "neo4j_ami_management" {
  triggers = {
    neo4j_version = var.neo4j_version
    environment   = local.effective_environment
  }

  provisioner "local-exec" {
    command = <<-EOT
      #!/bin/bash
      set -e
      
      # Function to create a new Neo4j AMI
      create_neo4j_ami() {
        local NEO4J_VERSION=$1
        local ENVIRONMENT=$2
        echo "Creating new Neo4j AMI for version $NEO4J_VERSION in $ENVIRONMENT environment..."
        
        # Launch EC2 instance
        INSTANCE_ID=$(aws ec2 run-instances --image-id ami-xxxxxxxx --instance-type t3.micro --key-name MyKeyPair --security-group-ids sg-xxxxxxxx --subnet-id subnet-xxxxxxxx --query 'Instances[0].InstanceId' --output text)
        
        # Wait for instance to be running
        aws ec2 wait instance-running --instance-ids $INSTANCE_ID
        
        # Install and configure Neo4j
        aws ec2 send-command --instance-ids $INSTANCE_ID --document-name "AWS-RunShellScript" --parameters commands=[
          "wget https://neo4j.com/artifact.php?name=neo4j-community-$NEO4J_VERSION-unix.tar.gz",
          "tar -xf neo4j-community-$NEO4J_VERSION-unix.tar.gz",
          "sudo mv neo4j-community-$NEO4J_VERSION /opt/neo4j",
          "sudo chown -R ec2-user:ec2-user /opt/neo4j"
        ]
        
        # Create AMI
        AMI_ID=$(aws ec2 create-image --instance-id $INSTANCE_ID --name "neo4j-$ENVIRONMENT-$NEO4J_VERSION" --description "Neo4j $NEO4J_VERSION for $ENVIRONMENT" --query 'ImageId' --output text)
        
        # Tag AMI
        aws ec2 create-tags --resources $AMI_ID --tags Key=Version,Value=$NEO4J_VERSION Key=Environment,Value=$ENVIRONMENT
        
        # Terminate instance
        aws ec2 terminate-instances --instance-ids $INSTANCE_ID
        
        echo $AMI_ID
      }
      
      # Check if AMI exists
      AMI_ID=$(aws ec2 describe-images --owners self --filters "Name=name,Values=neo4j-${local.effective_environment}-${var.neo4j_version}" --query 'Images[0].ImageId' --output text)
      
      if [[ "$AMI_ID" == "None" || "$AMI_ID" == "" ]]; then
        NEW_AMI_ID=$(create_neo4j_ami ${var.neo4j_version} ${local.effective_environment})
        if [[ -z "$NEW_AMI_ID" ]]; then
          echo "Error: Failed to create Neo4j AMI"
          exit 1
        fi
        echo "Created new AMI: $NEW_AMI_ID"
        echo "$NEW_AMI_ID" > ${path.module}/neo4j_ami_id.txt
      else
        echo "Neo4j AMI already exists: $AMI_ID"
        echo "$AMI_ID" > ${path.module}/neo4j_ami_id.txt
      fi
    EOT
  }
}

data "local_file" "neo4j_ami_id" {
  filename = "${path.module}/neo4j_ami_id.txt"
  depends_on = [null_resource.neo4j_ami_management]
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

data "aws_subnets" "available" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
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

resource "aws_security_group" "ecs_tasks" {
  name        = "credex-core-ecs-tasks-sg-${local.effective_environment}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = local.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 5000
    to_port         = 5000
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb" "credex_alb" {
  name               = "credex-alb-${local.effective_environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.available.ids

  tags = local.common_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_lb_target_group" "credex_tg" {
  name        = "credex-tg-${local.effective_environment}"
  port        = 5000
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 30
    interval            = 60
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate" "credex_cert" {
  domain_name       = local.domain
  validation_method = "DNS"

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.credex_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.selected.zone_id
}

resource "aws_acm_certificate_validation" "cert_validation" {
  certificate_arn         = aws_acm_certificate.credex_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

resource "aws_lb_listener" "credex_listener" {
  load_balancer_arn = aws_lb.credex_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.credex_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.credex_tg.arn
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "redirect_http_to_https" {
  load_balancer_arn = aws_lb.credex_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = local.common_tags
}

resource "aws_security_group" "alb" {
  name        = "credex-alb-sg-${local.effective_environment}"
  description = "Controls access to the ALB"
  vpc_id      = local.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_key_pair" "neo4j_key_pair" {
  key_name   = "neo4j-key-pair-${local.effective_environment}"
  public_key = tls_private_key.neo4j_private_key.public_key_openssh

  tags = local.common_tags

  lifecycle {
    ignore_changes = [public_key]
  }
}

resource "tls_private_key" "neo4j_private_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_instance" "neo4j_ledger" {
  ami           = trimspace(data.local_file.neo4j_ami_id.content)
  instance_type = local.effective_environment == "production" ? "m5.large" : "t3.medium"
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = data.aws_subnets.available.ids[0]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${local.effective_environment}-LedgerSpace"
    Role = "LedgerSpace"
  })

  user_data = <<-EOF
              #!/bin/bash
              echo "Configuring Neo4j Community Edition for LedgerSpace"
              NEO4J_PASSWORD=${var.neo4j_ledger_space_pass}
              NEO4J_USERNAME=${var.neo4j_ledger_space_user}
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /opt/neo4j/conf/neo4j.conf
              /opt/neo4j/bin/neo4j-admin set-initial-password $NEO4J_PASSWORD
              /opt/neo4j/bin/cypher-shell -u neo4j -p $NEO4J_PASSWORD "CREATE USER $NEO4J_USERNAME SET PASSWORD '$NEO4J_PASSWORD' CHANGE NOT REQUIRED"
              /opt/neo4j/bin/cypher-shell -u neo4j -p $NEO4J_PASSWORD "GRANT ROLE admin TO $NEO4J_USERNAME"
              systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  depends_on = [null_resource.neo4j_ami_management]

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

resource "aws_instance" "neo4j_search" {
  ami           = trimspace(data.local_file.neo4j_ami_id.content)
  instance_type = local.effective_environment == "production" ? "m5.large" : "t3.medium"
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = data.aws_subnets.available.ids[0]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${local.effective_environment}-SearchSpace"
    Role = "SearchSpace"
  })

  user_data = <<-EOF
              #!/bin/bash
              echo "Configuring Neo4j Community Edition for SearchSpace"
              NEO4J_PASSWORD=${var.neo4j_search_space_pass}
              NEO4J_USERNAME=${var.neo4j_search_space_user}
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /opt/neo4j/conf/neo4j.conf
              /opt/neo4j/bin/neo4j-admin set-initial-password $NEO4J_PASSWORD
              /opt/neo4j/bin/cypher-shell -u neo4j -p $NEO4J_PASSWORD "CREATE USER $NEO4J_USERNAME SET PASSWORD '$NEO4J_PASSWORD' CHANGE NOT REQUIRED"
              /opt/neo4j/bin/cypher-shell -u neo4j -p $NEO4J_PASSWORD "GRANT ROLE admin TO $NEO4J_USERNAME"
              systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  depends_on = [null_resource.neo4j_ami_management]

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

resource "aws_security_group" "neo4j" {
  name        = "neo4j-sg-${local.effective_environment}"
  description = "Security group for Neo4j ${local.effective_environment} instances"
  vpc_id      = local.vpc_id

  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
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

variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "af-south-1"
}

variable "environment" {
  description = "The deployment environment (production, staging, or development)"
  type        = string
  default     = null # This allows us to use terraform.workspace as a fallback
}

variable "neo4j_version" {
  description = "Version of Neo4j to install"
  type        = string
  default     = "4.4.0"  # Set your desired default version
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
}

variable "whatsapp_bot_api_key" {
  description = "API key for WhatsApp bot"
  type        = string
}

variable "open_exchange_rates_api" {
  description = "API key for Open Exchange Rates"
  type        = string
}

variable "neo4j_ledger_space_bolt_url" {
  description = "Neo4j LedgerSpace Bolt URL"
  type        = string
}

variable "neo4j_ledger_space_user" {
  description = "Neo4j LedgerSpace username"
  type        = string
}

variable "neo4j_ledger_space_pass" {
  description = "Neo4j LedgerSpace password"
  type        = string
}

variable "neo4j_search_space_bolt_url" {
  description = "Neo4j SearchSpace Bolt URL"
  type        = string
}

variable "neo4j_search_space_user" {
  description = "Neo4j SearchSpace username"
  type        = string
}

variable "neo4j_search_space_pass" {
  description = "Neo4j SearchSpace password"
  type        = string
}

data "aws_route53_zone" "selected" {
  name         = "mycredex.app."
  private_zone = false
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = local.domain
  type    = "A"

  alias {
    name                   = aws_lb.credex_alb.dns_name
    zone_id                = aws_lb.credex_alb.zone_id
    evaluate_target_health = true
  }
}

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
  value = aws_instance.neo4j_ledger.private_ip
}

output "neo4j_search_private_ip" {
  value = aws_instance.neo4j_search.private_ip
}

output "neo4j_ami_id" {
  value       = trimspace(data.local_file.neo4j_ami_id.content)
  description = "The ID of the Neo4j AMI used for EC2 instances"
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