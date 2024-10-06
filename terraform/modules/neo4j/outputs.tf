output "neo4j_ledger_private_ip" {
  description = "The private IP address of the Neo4j LedgerSpace instance"
  value       = aws_instance.neo4j_ledger.private_ip
}

output "neo4j_search_private_ip" {
  description = "The private IP address of the Neo4j SearchSpace instance"
  value       = aws_instance.neo4j_search.private_ip
}

output "neo4j_security_group_id" {
  description = "The ID of the security group for Neo4j instances"
  value       = aws_security_group.neo4j.id
}

output "neo4j_ledger_space_bolt_url_arn" {
  description = "The ARN of the SSM parameter storing the Neo4j LedgerSpace Bolt URL"
  value       = aws_ssm_parameter.neo4j_ledger_space_bolt_url.arn
}

output "neo4j_search_space_bolt_url_arn" {
  description = "The ARN of the SSM parameter storing the Neo4j SearchSpace Bolt URL"
  value       = aws_ssm_parameter.neo4j_search_space_bolt_url.arn
}

output "neo4j_ledger_space_user_arn" {
  description = "The ARN of the SSM parameter storing the Neo4j LedgerSpace username"
  value       = aws_ssm_parameter.neo4j_ledger_space_user.arn
}

output "neo4j_ledger_space_pass_arn" {
  description = "The ARN of the SSM parameter storing the Neo4j LedgerSpace password"
  value       = aws_ssm_parameter.neo4j_ledger_space_pass.arn
}

output "neo4j_search_space_user_arn" {
  description = "The ARN of the SSM parameter storing the Neo4j SearchSpace username"
  value       = aws_ssm_parameter.neo4j_search_space_user.arn
}

output "neo4j_search_space_pass_arn" {
  description = "The ARN of the SSM parameter storing the Neo4j SearchSpace password"
  value       = aws_ssm_parameter.neo4j_search_space_pass.arn
}