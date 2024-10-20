# VPC
resource "aws_vpc" "main" {
  count                = var.create_vpc ? 1 : 0
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.common_tags, {
    Name = "credex-vpc-${var.environment}"
  })
}

# Fetch AZs in the current region
data "aws_availability_zones" "available" {}

# Create var.az_count private subnets, each in a different AZ
resource "aws_subnet" "private" {
  count             = var.create_subnets ? var.az_count : 0
  cidr_block        = cidrsubnet(aws_vpc.main[0].cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  vpc_id            = aws_vpc.main[0].id

  tags = merge(var.common_tags, {
    Name = "credex-private-subnet-${var.environment}-${count.index + 1}"
  })
}

# Create var.az_count public subnets, each in a different AZ
resource "aws_subnet" "public" {
  count                   = var.create_subnets ? var.az_count : 0
  cidr_block              = cidrsubnet(aws_vpc.main[0].cidr_block, 8, var.az_count + count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  vpc_id                  = aws_vpc.main[0].id
  map_public_ip_on_launch = true

  tags = merge(var.common_tags, {
    Name = "credex-public-subnet-${var.environment}-${count.index + 1}"
  })
}

# Internet Gateway for the public subnet
resource "aws_internet_gateway" "main" {
  count  = var.create_igw ? 1 : 0
  vpc_id = aws_vpc.main[0].id

  tags = merge(var.common_tags, {
    Name = "credex-igw-${var.environment}"
  })
}

# Route the public subnet traffic through the IGW
resource "aws_route" "internet_access" {
  count                  = var.create_routes ? 1 : 0
  route_table_id         = aws_vpc.main[0].main_route_table_id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main[0].id
}

# Create a NAT gateway with an Elastic IP for each private subnet to get internet connectivity
resource "aws_eip" "nat" {
  count      = var.create_nat ? var.az_count : 0
  vpc        = true
  depends_on = [aws_internet_gateway.main]

  tags = merge(var.common_tags, {
    Name = "credex-eip-${var.environment}-${count.index + 1}"
  })
}

resource "aws_nat_gateway" "main" {
  count         = var.create_nat ? var.az_count : 0
  subnet_id     = element(aws_subnet.public[*].id, count.index)
  allocation_id = element(aws_eip.nat[*].id, count.index)

  tags = merge(var.common_tags, {
    Name = "credex-nat-${var.environment}-${count.index + 1}"
  })
}

# Create a new route table for the private subnets
resource "aws_route_table" "private" {
  count  = var.create_routes ? var.az_count : 0
  vpc_id = aws_vpc.main[0].id

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
  count          = var.create_routes ? var.az_count : 0
  subnet_id      = element(aws_subnet.private[*].id, count.index)
  route_table_id = element(aws_route_table.private[*].id, count.index)
}

# Key Pair
resource "aws_key_pair" "credex_key_pair" {
  count      = var.create_key_pair ? 1 : 0
  key_name   = "credex-key-pair-${var.environment}"
  public_key = var.public_key
}

# ALB security group
resource "aws_security_group" "alb" {
  count       = var.create_sg ? 1 : 0
  name        = "credex-alb-sg-${var.environment}"
  description = "Controls access to the ALB"
  vpc_id      = aws_vpc.main[0].id

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
  count       = var.create_sg ? 1 : 0
  name        = "credex-core-ecs-tasks-sg-${var.environment}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = aws_vpc.main[0].id

  ingress {
    protocol        = "tcp"
    from_port       = 5000
    to_port         = 5000
    security_groups = [aws_security_group.alb[0].id]
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
  count       = var.create_sg ? 1 : 0
  name        = "credex-neo4j-sg-${var.environment}"
  description = "Security group for Neo4j instances"
  vpc_id      = aws_vpc.main[0].id

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
  count              = var.create_load_balancer ? 1 : 0
  name               = "credex-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb[0].id]
  subnets            = aws_subnet.public[*].id

  tags = var.common_tags
}

# Target Group
resource "aws_lb_target_group" "credex_core" {
  count       = var.create_target_group ? 1 : 0
  name        = "credex-tg-${var.environment}"
  port        = 5000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main[0].id
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
  count             = var.create_acm ? 1 : 0
  domain_name       = var.domain
  validation_method = "DNS"

  tags = merge(var.common_tags, {
    Name = "credex-cert-${var.environment}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ALB Listener
resource "aws_lb_listener" "credex_listener" {
  count             = var.create_load_balancer && var.create_target_group ? 1 : 0
  load_balancer_arn = aws_lb.credex_alb[0].arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.credex_cert[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.credex_core[0].arn
  }
}

resource "aws_lb_listener" "redirect_http_to_https" {
  count             = var.create_load_balancer ? 1 : 0
  load_balancer_arn = aws_lb.credex_alb[0].arn
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

# Outputs
output "vpc_id" {
  value = var.create_vpc ? aws_vpc.main[0].id : null
}

output "private_subnet_ids" {
  value = var.create_subnets ? aws_subnet.private[*].id : null
}

output "public_subnet_ids" {
  value = var.create_subnets ? aws_subnet.public[*].id : null
}

output "neo4j_security_group_id" {
  value = var.create_sg ? aws_security_group.neo4j[0].id : null
}

output "key_pair_name" {
  value = var.create_key_pair ? aws_key_pair.credex_key_pair[0].key_name : null
}

output "alb_security_group_id" {
  value = var.create_sg ? aws_security_group.alb[0].id : null
}

output "ecs_tasks_security_group_id" {
  value = var.create_sg ? aws_security_group.ecs_tasks[0].id : null
}

output "alb_dns_name" {
  value = var.create_load_balancer ? aws_lb.credex_alb[0].dns_name : null
}

output "target_group_arn" {
  value = var.create_target_group ? aws_lb_target_group.credex_core[0].arn : null
}

output "alb_listener" {
  value = var.create_load_balancer && var.create_target_group ? aws_lb_listener.credex_listener[0].arn : null
}
