# Outputs for the Neo4j Browser Proxy module

output "neo4j_ledger_browser_url" {
  description = "URL for accessing the Neo4j Ledger Browser"
  value       = "https://${var.domain}/neo4jbrowser-ledger-login"
}

output "neo4j_search_browser_url" {
  description = "URL for accessing the Neo4j Search Browser"
  value       = "https://${var.domain}/neo4jbrowser-search-login"
}

output "neo4j_browser_credentials" {
  description = "Credentials for accessing the Neo4j Browser (authentication temporarily disabled)"
  value       = {
    username = "admin"
    password = var.browser_auth_password
  }
  sensitive = true
}

output "nginx_proxy_target_group_arn" {
  description = "ARN of the Nginx proxy target group that handles both Neo4j instances"
  value       = aws_lb_target_group.nginx_proxy.arn
}

# Legacy outputs that reference resources with count=0
output "neo4j_ledger_target_group_arn" {
  description = "ARN of the Neo4j Ledger target group (legacy)"
  value       = length(aws_lb_target_group.neo4j_ledger) > 0 ? aws_lb_target_group.neo4j_ledger[0].arn : null
}

output "neo4j_search_target_group_arn" {
  description = "ARN of the Neo4j Search target group (legacy)"
  value       = length(aws_lb_target_group.neo4j_search) > 0 ? aws_lb_target_group.neo4j_search[0].arn : null
}

output "auth_lambda_arn" {
  description = "ARN of the Lambda function for authentication (legacy)"
  value       = length(aws_lambda_function.auth_lambda) > 0 ? aws_lambda_function.auth_lambda[0].arn : null
}

output "nginx_proxy_instance_id" {
  description = "ID of the Nginx proxy instance"
  value       = aws_instance.nginx_proxy.id
}

output "nginx_proxy_private_ip" {
  description = "Private IP address of the Nginx proxy instance"
  value       = aws_instance.nginx_proxy.private_ip
}
