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
}

# Look for existing Neo4j AMI
data "aws_ami" "neo4j" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["neo4j-*"]
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
  }

  provisioner "local-exec" {
    command = <<-EOT
      #!/bin/bash
      set -e
      
      # Function to create a new Neo4j AMI
      create_neo4j_ami() {
        local NEO4J_VERSION=$1
        echo "Creating new Neo4j AMI for version $NEO4J_VERSION..."
        
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
        AMI_ID=$(aws ec2 create-image --instance-id $INSTANCE_ID --name "neo4j-$NEO4J_VERSION" --description "Neo4j $NEO4J_VERSION" --query 'ImageId' --output text)
        
        # Tag AMI
        aws ec2 create-tags --resources $AMI_ID --tags Key=Version,Value=$NEO4J_VERSION
        
        # Terminate instance
        aws ec2 terminate-instances --instance-ids $INSTANCE_ID
        
        echo $AMI_ID
      }
      
      # Function to get the latest Neo4j version
      get_latest_neo4j_version() {
        curl -s https://neo4j.com/download-center/ | grep -oP 'Neo4j Community Edition \K[0-9.]+' | head -n 1
      }
      
      # Check if AMI exists
      if [[ "${data.aws_ami.neo4j.id}" == "" ]]; then
        NEW_AMI_ID=$(create_neo4j_ami ${var.neo4j_version})
        echo "Created new AMI: $NEW_AMI_ID"
      else
        echo "Neo4j AMI already exists. Checking for updates..."
        CURRENT_VERSION=$(aws ec2 describe-images --image-ids ${data.aws_ami.neo4j.id} --query 'Images[0].Tags[?Key==`Version`].Value' --output text)
        LATEST_VERSION=$(get_latest_neo4j_version)
        
        if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
          echo "Update available. Creating new AMI with Neo4j $LATEST_VERSION"
          NEW_AMI_ID=$(create_neo4j_ami $LATEST_VERSION)
          echo "Created new AMI: $NEW_AMI_ID"
          
          # Update Terraform state
          echo "neo4j_version = \"$LATEST_VERSION\"" >> ${path.module}/terraform.tfvars
        else
          echo "Neo4j is up to date."
        fi
      fi
    EOT
  }
}

resource "aws_ecr_repository" "credex_core" {
  name = "credex-core-${local.effective_environment}"

  tags = local.common_tags
}

resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster-${local.effective_environment}"

  tags = local.common_tags
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
    CONTAINER_IMAGE = "${aws_ecr_repository.credex_core.repository_url}:latest"
    NODE_ENV        = local.effective_environment
    LOG_LEVEL       = "info"
    AWS_REGION      = var.aws_region
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
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
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
}

# Data source to fetch subnet IDs
data "aws_subnets" "available" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }
}

# Store subnet IDs in AWS Secrets Manager
resource "aws_secretsmanager_secret" "subnet_ids" {
  name = "subnet-ids-${local.effective_environment}"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "subnet_ids" {
  secret_id     = aws_secretsmanager_secret.subnet_ids.id
  secret_string = jsonencode(data.aws_subnets.available.ids)
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
}

resource "aws_lb" "credex_alb" {
  name               = "credex-alb-${local.effective_environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.available.ids

  tags = local.common_tags
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
}

# Create ACM certificate
resource "aws_acm_certificate" "credex_cert" {
  domain_name       = local.domain
  validation_method = "DNS"

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

# Create Route53 record for ACM certificate validation
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

# Validate the certificate
resource "aws_acm_certificate_validation" "cert_validation" {
  certificate_arn         = aws_acm_certificate.credex_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Store certificate ARN in Secrets Manager
resource "aws_secretsmanager_secret" "acm_cert_arn" {
  name = "acm-cert-arn-${local.effective_environment}"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "acm_cert_arn" {
  secret_id     = aws_secretsmanager_secret.acm_cert_arn.id
  secret_string = aws_acm_certificate.credex_cert.arn
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
}

# Generate EC2 Key Pair
resource "aws_key_pair" "neo4j_key_pair" {
  key_name   = "neo4j-key-pair-${local.effective_environment}"
  public_key = tls_private_key.neo4j_private_key.public_key_openssh

  tags = local.common_tags
}

# Generate private key
resource "tls_private_key" "neo4j_private_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Store private key in AWS Secrets Manager
resource "aws_secretsmanager_secret" "neo4j_private_key" {
  name = "neo4j-private-key-${local.effective_environment}"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "neo4j_private_key" {
  secret_id     = aws_secretsmanager_secret.neo4j_private_key.id
  secret_string = tls_private_key.neo4j_private_key.private_key_pem
}

# Generate random passwords
resource "random_password" "neo4j_ledger_password" {
  length  = 16
  special = true
}

resource "random_password" "neo4j_search_password" {
  length  = 16
  special = true
}

# Generate unique neo4j username
resource "random_string" "neo4j_username_suffix" {
  length  = 4
  special = false
  upper   = false
}

locals {
  neo4j_username = "neo4j${random_string.neo4j_username_suffix.result}"
  effective_environment = coalesce(var.environment, terraform.workspace == "default" ? "production" : terraform.workspace)
  domain = local.effective_environment == "production" ? "api.mycredex.app" : "apistaging.mycredex.app"
  common_tags = {
    Environment = local.effective_environment
    Project     = "CredEx"
    ManagedBy   = "Terraform"
  }
}

# AWS Secrets Manager for Neo4j Secrets
resource "aws_secretsmanager_secret" "neo4j_secrets" {
  name = "neo4j-secrets-${local.effective_environment}"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "neo4j_secrets" {
  secret_id = aws_secretsmanager_secret.neo4j_secrets.id
  secret_string = jsonencode({
    ledgerspacebolturl = "bolt://${aws_instance.neo4j_ledger.private_ip}:7687"
    ledgerspaceuser    = local.neo4j_username
    ledgerspacepass    = random_password.neo4j_ledger_password.result
    searchspacebolturl = "bolt://${aws_instance.neo4j_search.private_ip}:7687"
    searchspaceuser    = local.neo4j_username
    searchspacepass    = random_password.neo4j_search_password.result
  })
}

# Neo4j LedgerSpace Instance
resource "aws_instance" "neo4j_ledger" {
  ami           = data.aws_ami.neo4j.id
  instance_type = "t3.medium"
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
              NEO4J_PASSWORD=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.neo4j_secrets.id} --query SecretString --output text | jq -r .ledgerspacepass)
              NEO4J_USERNAME=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.neo4j_secrets.id} --query SecretString --output text | jq -r .ledgerspaceuser)
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

# Neo4j SearchSpace Instance
resource "aws_instance" "neo4j_search" {
  ami           = data.aws_ami.neo4j.id
  instance_type = "t3.medium"
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
              NEO4J_PASSWORD=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.neo4j_secrets.id} --query SecretString --output text | jq -r .searchspacepass)
              NEO4J_USERNAME=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.neo4j_secrets.id} --query SecretString --output text | jq -r .searchspaceuser)
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

# Security Group for Neo4j
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
}

# IAM policy for EC2 instances to access Secrets Manager
resource "aws_iam_role_policy" "ec2_secrets_access" {
  name = "ec2-secrets-access-${local.effective_environment}"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = [
          aws_secretsmanager_secret.neo4j_secrets.arn,
          aws_secretsmanager_secret.neo4j_private_key.arn
        ]
      },
    ]
  })
}

# IAM role for EC2 instances
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
}

# Attach the IAM role to an instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-profile-${local.effective_environment}"
  role = aws_iam_role.ec2_role.name

  tags = local.common_tags
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "af-south-1"
}

variable "environment" {
  description = "The deployment environment (production or staging)"
  type        = string
  default     = null # This allows us to use NODE_ENV as a fallback
}

variable "neo4j_version" {
  description = "Version of Neo4j to install"
  type        = string
  default     = "4.4.0"  # Set your desired default version
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

output "neo4j_secrets_arn" {
  value = aws_secretsmanager_secret.neo4j_secrets.arn
}

output "neo4j_private_key_secret_arn" {
  value       = aws_secretsmanager_secret.neo4j_private_key.arn
  description = "ARN of the secret containing the Neo4j EC2 instance private key"
}

output "neo4j_ami_id" {
  value       = data.aws_ami.neo4j.id
  description = "The ID of the Neo4j AMI used for EC2 instances"
}

output "subnet_ids_secret_arn" {
  value       = aws_secretsmanager_secret.subnet_ids.arn
  description = "ARN of the secret containing the subnet IDs"
}

output "acm_certificate_arn" {
  value       = aws_acm_certificate.credex_cert.arn
  description = "ARN of the ACM certificate created for HTTPS"
}

output "acm_certificate_arn_secret" {
  value       = aws_secretsmanager_secret.acm_cert_arn.arn
  description = "ARN of the secret containing the ACM certificate ARN"
}

output "vpc_id" {
  value       = local.vpc_id
  description = "The ID of the VPC used for deployment"
}