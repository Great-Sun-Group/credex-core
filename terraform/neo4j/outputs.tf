output "neo4j_instance_ips" {
  value       = aws_instance.neo4j[*].private_ip
  description = "Private IPs of Neo4j instances"
}

output "neo4j_bolt_urls" {
  value = [
    for i, instance in aws_instance.neo4j : 
    "bolt://${instance.private_ip}:7687"
  ]
  description = "Neo4j Bolt URLs"
  sensitive   = true
}

output "neo4j_ledger_space_bolt_url" {
  value       = "bolt://${aws_instance.neo4j[0].private_ip}:7687"
  description = "Neo4j Bolt URL for LedgerSpace"
  sensitive   = true
}

output "neo4j_search_space_bolt_url" {
  value       = "bolt://${aws_instance.neo4j[1].private_ip}:7687"
  description = "Neo4j Bolt URL for SearchSpace"
  sensitive   = true
}

output "neo4j_ledger_space_username" {
  value       = "neo4j${random_string.neo4j_username_suffix[0].result}"
  description = "Neo4j username for LedgerSpace"
  sensitive   = true
}

output "neo4j_search_space_username" {
  value       = "neo4j${random_string.neo4j_username_suffix[1].result}"
  description = "Neo4j username for SearchSpace"
  sensitive   = true
}

output "neo4j_ledger_space_password" {
  value       = random_string.neo4j_password[0].result
  description = "Neo4j password for LedgerSpace"
  sensitive   = true
}

output "neo4j_search_space_password" {
  value       = random_string.neo4j_password[1].result
  description = "Neo4j password for SearchSpace"
  sensitive   = true
}
