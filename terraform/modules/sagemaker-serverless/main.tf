# SageMaker execution role
resource "aws_iam_role" "sagemaker_execution_role" {
  name = "sagemaker-execution-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })
}

# Attach necessary policies to the role
resource "aws_iam_role_policy_attachment" "sagemaker_full_access" {
  role       = aws_iam_role.sagemaker_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.sagemaker_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

# SageMaker model
resource "aws_sagemaker_model" "deepseek_model" {
  name               = "deepseek-model-${var.environment}"
  execution_role_arn = aws_iam_role.sagemaker_execution_role.arn
  
  primary_container {
    image          = var.container_image
    model_data_url = var.model_data_url
    environment = {
      SAGEMAKER_PROGRAM      = "inference.py"
      SAGEMAKER_SUBMIT_DIRECTORY = "/opt/ml/model/code"
      MODEL_CACHE_ROOT       = "/opt/ml/model"
      SAGEMAKER_CONTAINER_LOG_LEVEL = "20"
    }
  }

  vpc_config {
    subnets            = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Name        = "deepseek-model-${var.environment}"
  }
}

# SageMaker serverless endpoint config
resource "aws_sagemaker_endpoint_configuration" "deepseek_endpoint_config" {
  name = "deepseek-endpoint-config-${var.environment}"
  
  production_variants {
    variant_name           = "default"
    model_name             = aws_sagemaker_model.deepseek_model.name
    serverless_config {
      max_concurrency      = var.max_concurrency
      memory_size_in_mb    = var.memory_size_in_mb
    }
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Name        = "deepseek-endpoint-config-${var.environment}"
  }
}

# SageMaker endpoint
resource "aws_sagemaker_endpoint" "deepseek_endpoint" {
  name                 = "deepseek-serverless-${var.environment}"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.deepseek_endpoint_config.name

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Name        = "deepseek-endpoint-${var.environment}"
  }
}
