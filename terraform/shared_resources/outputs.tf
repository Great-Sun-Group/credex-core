output "vpc_id" {
  description = "The ID of the VPC"
  value       = local.vpc_id
}

output "subnet_ids" {
  description = "The IDs of the subnets"
  value       = local.subnet_ids
}

output "alb_security_group_id" {
  description = "The ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_tasks_security_group_id" {
  description = "The ID of the ECS tasks security group"
  value       = aws_security_group.ecs_tasks.id
}

output "neo4j_security_group_id" {
  description = "The ID of the Neo4j security group"
  value       = aws_security_group.neo4j.id
}

output "alb_arn" {
  description = "The ARN of the Application Load Balancer"
  value       = aws_lb.credex_alb.arn
}

output "target_group_arn" {
  description = "The ARN of the target group"
  value       = aws_lb_target_group.credex_core.arn
}

output "alb_listener" {
  description = "The ALB listener"
  value       = aws_lb_listener.credex_listener
}

output "acm_certificate_arn" {
  description = "The ARN of the ACM certificate"
  value       = aws_acm_certificate.credex_cert.arn
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.credex_alb.dns_name
}
