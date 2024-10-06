output "vpc_id" {
  description = "The ID of the VPC"
  value       = local.vpc_id
}

output "subnet_ids" {
  description = "The IDs of the subnets in the VPC"
  value       = data.aws_subnets.available.ids
}

output "alb_security_group_id" {
  description = "The ID of the security group attached to the ALB"
  value       = aws_security_group.alb.id
}

output "alb_arn" {
  description = "The ARN of the application load balancer"
  value       = aws_lb.credex_alb.arn
}

output "alb_dns_name" {
  description = "The DNS name of the application load balancer"
  value       = aws_lb.credex_alb.dns_name
}

output "alb_zone_id" {
  description = "The canonical hosted zone ID of the application load balancer"
  value       = aws_lb.credex_alb.zone_id
}

output "target_group_arn" {
  description = "The ARN of the target group"
  value       = aws_lb_target_group.credex_tg.arn
}