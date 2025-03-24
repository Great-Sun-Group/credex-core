# IAM policy for invoking SageMaker endpoints
resource "aws_iam_policy" "sagemaker_invoke" {
  name        = "sagemaker-invoke-policy-${var.environment}"
  description = "Policy to allow invoking SageMaker endpoints"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "sagemaker:InvokeEndpoint",
          "sagemaker:DescribeEndpoint"
        ],
        Resource = [
          module.deepseek_serverless.endpoint_arn
        ]
      }
    ]
  })
}

# Attach the policy to the ECS task role
resource "aws_iam_role_policy_attachment" "sagemaker_invoke" {
  role       = module.connectors.ecs_task_role_arn
  policy_arn = aws_iam_policy.sagemaker_invoke.arn
}
