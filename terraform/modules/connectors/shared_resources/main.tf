# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.common_tags, {
    Name = "credex-vpc-${var.environment}"
  })
}

# Fetch AZs in the current region
data "aws_availability_zones" "available" {}

# Create private subnets, each in a different AZ
resource "aws_subnet" "private" {
  count             = var.az_count
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  vpc_id            = aws_vpc.main.id

  tags = merge(var.common_tags, {
    Name = "credex-private-subnet-${var.environment}-${count.index + 1}"
  })
}

# Create public subnets, each in a different AZ
resource "aws_subnet" "public" {
  count                   = var.az_count
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, var.az_count + count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = true

  tags = merge(var.common_tags, {
    Name = "credex-public-subnet-${var.environment}-${count.index + 1}"
  })
}

# Internet Gateway for the public subnet
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.common_tags, {
    Name = "credex-igw-${var.environment}"
  })
}

# Route the public subnet traffic through the IGW
resource "aws_route" "internet_access" {
  route_table_id         = aws_vpc.main.main_route_table_id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

# Create a NAT gateway with an Elastic IP for each private subnet to get internet connectivity
resource "aws_eip" "nat" {
  count      = var.az_count
  vpc        = true
  depends_on = [aws_internet_gateway.main]

  tags = merge(var.common_tags, {
    Name = "credex-eip-${var.environment}-${count.index + 1}"
  })
}

resource "aws_nat_gateway" "main" {
  count         = var.az_count
  subnet_id     = element(aws_subnet.public[*].id, count.index)
  allocation_id = element(aws_eip.nat[*].id, count.index)

  tags = merge(var.common_tags, {
    Name = "credex-nat-${var.environment}-${count.index + 1}"
  })
}

# Create a new route table for the private subnets
resource "aws_route_table" "private" {
  count  = var.az_count
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = element(aws_nat_gateway.main[*].id, count.index)
  }

  tags = merge(var.common_tags, {
    Name = "credex-private-route-table-${var.environment}-${count.index + 1}"
  })
}

# Associate the private subnets with the appropriate route tables
resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = element(aws_subnet.private[*].id, count.index)
  route_table_id = element(aws_route_table.private[*].id, count.index)
}

# Key Pair
resource "aws_key_pair" "credex_key_pair" {
  key_name   = "credex-key-pair-${var.environment}"
  public_key = var.public_key
}

# ALB security group
resource "aws_security_group" "alb" {
  name        = "credex-alb-sg-${var.environment}"
  description = "Controls access to the ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP inbound traffic"
  }

  ingress {
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS inbound traffic"
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "credex-alb-sg-${var.environment}"
  })
}

# ECS tasks security group
resource "aws_security_group" "ecs_tasks" {
  name        = "credex-core-ecs-tasks-sg-${var.environment}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    protocol        = "tcp"
    from_port       = 3000
    to_port         = 3000
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "credex-core-ecs-tasks-sg-${var.environment}"
  })
}

# Neo4j security group
resource "aws_security_group" "neo4j" {
  name        = "credex-neo4j-sg-${var.environment}"
  description = "Security group for Neo4j instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    protocol    = "tcp"
    from_port   = 7474
    to_port     = 7474
    cidr_blocks = [var.vpc_cidr]
    description = "Allow Neo4j HTTP"
  }

  ingress {
    protocol    = "tcp"
    from_port   = 7687
    to_port     = 7687
    cidr_blocks = [var.vpc_cidr]
    description = "Allow Neo4j Bolt"
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "credex-neo4j-sg-${var.environment}"
  })
}

# Application Load Balancer (ALB)
resource "aws_lb" "credex_alb" {
  name               = "credex-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = var.common_tags
}

# Target Group
resource "aws_lb_target_group" "credex_core" {
  name        = "credex-tg-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    healthy_threshold   = "3"
    interval            = "30"
    protocol            = "HTTP"
    matcher             = "200"
    timeout             = "3"
    path                = "/health"
    unhealthy_threshold = "2"
  }

  tags = var.common_tags
}

# ACM Certificate
resource "aws_acm_certificate" "credex_cert" {
  domain_name       = var.domain
  validation_method = "DNS"

  tags = merge(var.common_tags, {
    Name = "credex-cert-${var.environment}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Get the hosted zone for the domain
data "aws_route53_zone" "domain" {
  name = var.domain_base
}

# Create DNS records for certificate validation
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
  zone_id         = data.aws_route53_zone.domain.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "credex_cert" {
  certificate_arn         = aws_acm_certificate.credex_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Create Route53 record for the ALB
resource "aws_route53_record" "alb" {
  zone_id = data.aws_route53_zone.domain.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_lb.credex_alb.dns_name
    zone_id                = aws_lb.credex_alb.zone_id
    evaluate_target_health = true
  }
}

# ALB Listener
resource "aws_lb_listener" "credex_listener" {
  load_balancer_arn = aws_lb.credex_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate_validation.credex_cert.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.credex_core.arn
  }
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
}

# ECR Repository
resource "aws_ecr_repository" "credex_core" {
  name = "credex-core-${var.environment}"
  
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.common_tags, {
    Name = "credex-core-ecr-${var.environment}"
  })
}

# ECS execution role
resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role-${var.environment}"

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

  tags = merge(var.common_tags, {
    Name = "ecs-execution-role-${var.environment}"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS task role
resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role-${var.environment}"

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

  tags = merge(var.common_tags, {
    Name = "ecs-task-role-${var.environment}"
  })
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/credex-core-${var.environment}"
  retention_in_days = 30

  tags = merge(var.common_tags, {
    Name = "/ecs/credex-core-${var.environment}"
  })
}

# Outputs
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "neo4j_security_group_id" {
  value = aws_security_group.neo4j.id
}

output "key_pair_name" {
  value = aws_key_pair.credex_key_pair.key_name
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "ecs_tasks_security_group_id" {
  value = aws_security_group.ecs_tasks.id
}

output "alb_dns_name" {
  value = aws_lb.credex_alb.dns_name
}

output "target_group_arn" {
  value = aws_lb_target_group.credex_core.arn
}

output "alb_listener" {
  value = aws_lb_listener.credex_listener.arn
}

output "ecr_repository_url" {
  value = aws_ecr_repository.credex_core.repository_url
}

output "ecs_execution_role_arn" {
  value = aws_iam_role.ecs_execution_role.arn
}

output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task_role.arn
}

output "cloudwatch_log_group_name" {
  value = aws_cloudwatch_log_group.ecs_logs.name
}
