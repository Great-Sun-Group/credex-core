# AWS Systems Manager Parameter Store resources

# Grant the EC2 instances permission to access SSM parameters
resource "aws_iam_role_policy" "neo4j_ssm_access" {
  name = "neo4j-ssm-access-policy-${local.effective_environment}"
  role = data.aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/credex/${local.effective_environment}/*"
      }
    ]
  })
}

# Use data source for the existing EC2 instance profile
data "aws_iam_instance_profile" "neo4j_profile" {
  name = "neo4j-instance-profile-${local.effective_environment}"
}

# Data sources for current AWS region and account ID
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Note: The attachment of the instance profile to the Neo4j instances remains in the neo4j.tf file