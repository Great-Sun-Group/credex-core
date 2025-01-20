# VPC outputs
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

output "docs_bucket_name" {
  value = aws_s3_bucket.docs.id
}

output "docs_bucket_website_endpoint" {
  value = aws_s3_bucket_website_configuration.docs.website_endpoint
}

output "docs_cloudfront_domain_name" {
  value = aws_cloudfront_distribution.docs.domain_name
}
