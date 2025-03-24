output "endpoint_name" {
  description = "The name of the SageMaker endpoint"
  value       = aws_sagemaker_endpoint.deepseek_endpoint.name
}

output "endpoint_arn" {
  description = "The ARN of the SageMaker endpoint"
  value       = aws_sagemaker_endpoint.deepseek_endpoint.arn
}

output "model_name" {
  description = "The name of the SageMaker model"
  value       = aws_sagemaker_model.deepseek_model.name
}

output "execution_role_arn" {
  description = "The ARN of the SageMaker execution role"
  value       = aws_iam_role.sagemaker_execution_role.arn
}
