# Validate configurations
resource "null_resource" "validations" {
  lifecycle {
    precondition {
      condition     = length(var.subnet_ids) >= 2
      error_message = "At least 2 subnets are required for Neo4j deployment"
    }
    
    precondition {
      condition     = can(regex("^[tr][3-6][.][\\w]+$", var.neo4j_instance_type))
      error_message = "Invalid Neo4j instance type. Must be a valid AWS instance type (e.g., t3.medium, r5.xlarge)"
    }
    
    precondition {
      condition     = var.neo4j_volume_size >= 20 && var.neo4j_volume_size <= 16384
      error_message = "Neo4j volume size must be between 20 and 16384 GB"
    }
  }
}

# Use the data source to access VPC and subnet information
resource "aws_db_subnet_group" "neo4j" {
  name       = "neo4j-subnet-group-${var.environment}"
  subnet_ids = var.subnet_ids

  tags = merge(var.common_tags, {
    Name = "Neo4j DB subnet group"
  })
}

# Latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# VPC Endpoint for CloudWatch Logs
resource "aws_vpc_endpoint" "logs" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.subnet_ids
  security_group_ids = [aws_security_group.neo4j_internal.id]
  private_dns_enabled = true

  tags = merge(var.common_tags, {
    Name = "CloudWatch-Logs-${var.environment}"
  })
}

# Security group for Neo4j internal communication
resource "aws_security_group" "neo4j_internal" {
  name        = "neo4j-internal-${var.environment}"
  description = "Security group for internal Neo4j communication"
  vpc_id      = var.vpc_id

  ingress {
    description = "Neo4j Bolt Internal"
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description     = "Neo4j Bolt from App"
    from_port       = 7687
    to_port         = 7687
    protocol        = "tcp"
    security_groups = [var.ecs_tasks_security_group_id]  # Allow Bolt from ECS tasks
  }

  ingress {
    description = "Neo4j Bolt Cross-Subnet"
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]  # Allow Bolt traffic within the VPC
  }

  ingress {
    description = "Neo4j HTTP"
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "Neo4j HTTPS"
    from_port   = 7473
    to_port     = 7473
    protocol    = "tcp"
    self        = true
  }

  # Allow HTTPS for AWS services (CloudWatch, SSM)
  ingress {
    description     = "HTTPS from ECS tasks"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.ecs_tasks_security_group_id]
  }

  ingress {
    description = "HTTPS for VPC Endpoints"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "Neo4j Internal Communication - ${var.environment}"
  })
}

# CloudWatch Log Group for Neo4j logs
resource "aws_cloudwatch_log_group" "neo4j_logs" {
  name              = "/aws/ec2/neo4j/${var.environment}"
  retention_in_days = 14

  tags = var.common_tags
}

# Create IAM role for CloudWatch access
resource "aws_iam_role" "neo4j_role" {
  name = "neo4j-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Add required AWS service permissions
resource "aws_iam_role_policy_attachment" "neo4j_cloudwatch_policy" {
  role       = aws_iam_role.neo4j_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "neo4j_ssm_policy" {
  role       = aws_iam_role.neo4j_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "neo4j_ssm_policy_full" {
  role       = aws_iam_role.neo4j_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMFullAccess"
}

# Add S3 access policy for Neo4j instances to access installation script
resource "aws_iam_role_policy" "neo4j_s3_access" {
  name = "neo4j-s3-access-${var.environment}"
  role = aws_iam_role.neo4j_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::credexbuckets3-scripts-${var.environment}",
          "arn:aws:s3:::credexbuckets3-scripts-${var.environment}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "neo4j_instance_profile" {
  name = "neo4j-instance-profile-${var.environment}"
  role = aws_iam_role.neo4j_role.name
}

# Upload Neo4j installation script to S3
resource "aws_s3_object" "neo4j_install_script" {
  bucket = "credexbuckets3-scripts-${var.environment}"
  key    = "neo4j_install.sh"
  source = "${path.module}/../../files/neo4j_install.sh"
  etag   = filemd5("${path.module}/../../files/neo4j_install.sh")

  tags = merge(var.common_tags, {
    Name = "neo4j-install-script-${var.environment}"
    Purpose = "Neo4j Installation"
  })
}

# Helper to create user data script
locals {
  neo4j_install_script = <<EOF
#!/bin/bash
set -e

# Setup logging
exec > /var/log/neo4j-setup.log 2>&1

# Set environment variables
export ENVIRONMENT="${var.environment}"
export AWS_REGION="${var.aws_region}"
export NEO4J_LICENSE="${var.neo4j_enterprise_license}"

# Function to send installation status to CloudWatch
send_status_to_cloudwatch() {
    local status=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create a temporary JSON file
    cat > /tmp/cloudwatch-event.json << EOL
{
  "environment": "${var.environment}",
  "instance_id": "$$(curl -s http://169.254.169.254/latest/meta-data/instance-id)",
  "status": "$status",
  "message": "$message",
  "timestamp": "$timestamp"
}
EOL
    
    # Try to send the event to CloudWatch
    aws cloudwatch put-metric-data \
      --namespace "Neo4j/Installation" \
      --metric-name "InstallationStatus" \
      --dimensions Environment=${var.environment},InstanceId=$$(curl -s http://169.254.169.254/latest/meta-data/instance-id) \
      --value $$([ "$status" == "SUCCESS" ] && echo 1 || echo 0) \
      --region ${var.aws_region} || true
      
    # Also log to the instance's console output (retrievable via AWS API)
    echo "NEO4J_INSTALL_STATUS: $status - $message" > /dev/console
}

# System setup
echo "=== System Initialization ==="
echo "Waiting for initial system updates to complete..."
until ! pgrep -f "yum" > /dev/null; do
    echo "System is updating, waiting 30 seconds..."
    sleep 30
done

# Install AWS CLI and CloudWatch agent early for logging
echo "=== Installing AWS CLI and CloudWatch Agent ==="
yum install -y aws-cli amazon-cloudwatch-agent || {
    echo "Failed to install AWS CLI or CloudWatch agent"
    send_status_to_cloudwatch "FAILED" "Failed to install AWS CLI or CloudWatch agent"
    exit 1
}

# Download and execute the Neo4j installation script from S3
echo "=== Downloading Neo4j installation script from S3 ==="
aws s3 cp s3://credexbuckets3-scripts-${var.environment}/neo4j_install.sh /tmp/neo4j_install.sh || {
    echo "Failed to download Neo4j installation script from S3"
    send_status_to_cloudwatch "FAILED" "Failed to download Neo4j installation script from S3"
    exit 1
}

# Make the script executable
chmod +x /tmp/neo4j_install.sh

# Execute the script
echo "=== Executing Neo4j installation script ==="
/tmp/neo4j_install.sh
EOF
}

# Neo4j instance for ledgerSpace
resource "aws_instance" "neo4j_ledger" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id, aws_security_group.neo4j_internal.id]
  subnet_id              = var.subnet_ids[0]
  monitoring             = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.neo4j_volume_size
    iops        = 3000
    throughput  = 125
    encrypted   = true

    tags = merge(var.common_tags, {
      Name = "Neo4j-LedgerSpace-Volume-${var.environment}"
    })
  }

  user_data = local.neo4j_install_script

  tags = merge(var.common_tags, {
    Name = "Neo4j-LedgerSpace-${var.environment}"
  })

  iam_instance_profile = aws_iam_instance_profile.neo4j_instance_profile.name

  lifecycle {
    create_before_destroy = false
  }
}

# Neo4j instance for searchSpace
resource "aws_instance" "neo4j_search" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.neo4j_instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [var.neo4j_security_group_id, aws_security_group.neo4j_internal.id]
  subnet_id              = var.subnet_ids[1]
  monitoring             = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.neo4j_volume_size
    iops        = 3000
    throughput  = 125
    encrypted   = true

    tags = merge(var.common_tags, {
      Name = "Neo4j-SearchSpace-Volume-${var.environment}"
    })
  }

  user_data = local.neo4j_install_script

  tags = merge(var.common_tags, {
    Name = "Neo4j-SearchSpace-${var.environment}"
  })

  iam_instance_profile = aws_iam_instance_profile.neo4j_instance_profile.name

  lifecycle {
    create_before_destroy = false
  }
}

# Outputs
output "neo4j_ledger_instance_id" {
  description = "The ID of the Neo4j LedgerSpace instance"
  value       = aws_instance.neo4j_ledger.id
}

output "neo4j_search_instance_id" {
  description = "The ID of the Neo4j SearchSpace instance"
  value       = aws_instance.neo4j_search.id
}

output "neo4j_ledger_private_ip" {
  description = "The private IP of the Neo4j LedgerSpace instance"
  value       = aws_instance.neo4j_ledger.private_ip
}

output "neo4j_search_private_ip" {
  description = "The private IP of the Neo4j SearchSpace instance"
  value       = aws_instance.neo4j_search.private_ip
}

output "neo4j_ledger_bolt_endpoint" {
  description = "The Bolt endpoint for the Neo4j LedgerSpace instance"
  value       = "bolt://${aws_instance.neo4j_ledger.private_ip}:7687"
}

output "neo4j_search_bolt_endpoint" {
  description = "The Bolt endpoint for the Neo4j SearchSpace instance"
  value       = "bolt://${aws_instance.neo4j_search.private_ip}:7687"
}
