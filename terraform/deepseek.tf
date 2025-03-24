# DeepSeek SageMaker Serverless Module
module "deepseek_serverless" {
  source = "./modules/sagemaker-serverless"
  
  environment        = var.environment
  vpc_id             = module.connectors.vpc_id
  subnet_ids         = module.connectors.private_subnet_ids
  security_group_ids = [module.connectors.ecs_tasks_security_group_id]
  
  # Serverless configuration
  memory_size_in_mb  = 6144  # 6GB (maximum supported value)
  max_concurrency    = 5
  
  # Container configuration - these values need to be provided during deployment
  # Using a regional ECR image from us-east-1 (N. Virginia) which is a primary region
  # with better accessibility for SageMaker
  container_image    = "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-inference:1.13.1-transformers4.26.0-cpu-py39-ubuntu20.04"
  model_data_url     = "s3://deepseek-model-${var.environment}/deepseek-coder-6.7b/model.tar.gz"
}

# Output the endpoint name for reference
output "deepseek_endpoint_name" {
  description = "The name of the DeepSeek SageMaker endpoint"
  value       = module.deepseek_serverless.endpoint_name
}

output "deepseek_endpoint_arn" {
  description = "The ARN of the DeepSeek SageMaker endpoint"
  value       = module.deepseek_serverless.endpoint_arn
}
