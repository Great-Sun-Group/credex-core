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

output "neo4j_ledger_target_group_arn" {
  description = "ARN of the Neo4j Ledger target group"
  value       = aws_lb_target_group.neo4j_ledger.arn
}

output "neo4j_search_target_group_arn" {
  description = "ARN of the Neo4j Search target group"
  value       = aws_lb_target_group.neo4j_search.arn
}

output "auth_lambda_arn" {
  description = "ARN of the Lambda function for authentication (authentication temporarily disabled)"
  value       = aws_lambda_function.auth_lambda.arn
}
