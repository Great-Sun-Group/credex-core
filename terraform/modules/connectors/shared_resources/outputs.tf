output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "The IDs of the public subnets"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "The IDs of the private subnets"
}

output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "The ID of the ALB security group"
}

output "ecs_tasks_security_group_id" {
  value       = aws_security_group.ecs_tasks.id
  description = "The ID of the ECS tasks security group"
}

output "neo4j_security_group_id" {
  value       = aws_security_group.neo4j.id
  description = "The ID of the Neo4j security group"
}

output "alb_dns_name" {
  value       = aws_lb.credex_alb.dns_name
  description = "The DNS name of the Application Load Balancer"
}

output "target_group_arn" {
  value       = aws_lb_target_group.credex_core.arn
  description = "The ARN of the target group"
}

output "alb_listener" {
  value       = aws_lb_listener.credex_listener.arn
  description = "The ARN of the ALB listener"
}

output "key_pair_name" {
  value       = aws_key_pair.credex_key_pair.key_name
  description = "The name of the created key pair"
}
