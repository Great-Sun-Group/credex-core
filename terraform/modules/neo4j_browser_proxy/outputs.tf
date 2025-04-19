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

# Legacy outputs have been removed for a clean deployment

output "nginx_proxy_instance_id" {
  description = "ID of the Nginx proxy instance"
  value       = aws_instance.nginx_proxy.id
}

output "nginx_proxy_private_ip" {
  description = "Private IP address of the Nginx proxy instance"
  value       = aws_instance.nginx_proxy.private_ip
}
