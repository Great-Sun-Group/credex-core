output "neo4j_instance_ips" {
  value       = aws_instance.neo4j[*].private_ip
  description = "Private IPs of Neo4j instances"
}

output "neo4j_bolt_urls" {
  value = [for instance in aws_instance.neo4j : "bolt://${instance.private_ip}:7687"]
  description = "Neo4j Bolt URLs"
  sensitive   = true
}

output "neo4j_ledger_space_bolt_url" {
  value       = "bolt://${aws_instance.neo4j[0].private_ip}:7687"
  description = "Neo4j Ledger Space Bolt URL"
  sensitive   = true
}

output "neo4j_search_space_bolt_url" {
  value       = "bolt://${aws_instance.neo4j[1].private_ip}:7687"
  description = "Neo4j Search Space Bolt URL"
  sensitive   = true
}

output "neo4j_private_key" {
  value       = var.create_key_pair ? tls_private_key.neo4j_key[0].private_key_pem : "Key pair not created in this run"
  description = "Private key for Neo4j instances"
  sensitive   = true
}

output "neo4j_ledger_space_username" {
  value       = "neo4j${random_string.neo4j_username_suffix[0].result}"
  description = "Neo4j Ledger Space username"
  sensitive   = true
}

output "neo4j_search_space_username" {
  value       = "neo4j${random_string.neo4j_username_suffix[1].result}"
  description = "Neo4j Search Space username"
  sensitive   = true
}

output "neo4j_ledger_space_password" {
  value       = random_string.neo4j_password[0].result
  description = "Neo4j Ledger Space password"
  sensitive   = true
}

output "neo4j_search_space_password" {
  value       = random_string.neo4j_password[1].result
  description = "Neo4j Search Space password"
  sensitive   = true
}
