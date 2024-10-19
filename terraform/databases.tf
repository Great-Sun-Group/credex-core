module "databases" {
  source = "./modules/databases"

  environment              = var.environment
  vpc_id                   = module.connectors.vpc_id
  subnet_ids               = module.connectors.private_subnet_ids
  neo4j_security_group_id  = module.connectors.neo4j_security_group_id
  key_pair_name            = module.connectors.key_pair_name
  neo4j_instance_type      = var.neo4j_instance_type[var.environment]
  neo4j_volume_size        = var.neo4j_volume_size[var.environment]
  neo4j_enterprise_license = var.neo4j_enterprise_license
  create_neo4j_instances   = var.create_neo4j_instances
  common_tags              = var.common_tags
  aws_region               = var.aws_region
}

output "neo4j_ledger_instance_id" {
  value       = module.databases.neo4j_ledger_instance_id
  description = "The ID of the Neo4j LedgerSpace instance"
}

output "neo4j_search_instance_id" {
  value       = module.databases.neo4j_search_instance_id
  description = "The ID of the Neo4j SearchSpace instance"
}

output "neo4j_ledger_private_ip" {
  value       = module.databases.neo4j_ledger_private_ip
  description = "The private IP address of the Neo4j LedgerSpace instance"
}

output "neo4j_search_private_ip" {
  value       = module.databases.neo4j_search_private_ip
  description = "The private IP address of the Neo4j SearchSpace instance"
}

output "neo4j_ledger_bolt_endpoint" {
  value       = module.databases.neo4j_ledger_bolt_endpoint
  description = "The Bolt endpoint for the Neo4j LedgerSpace instance"
}

output "neo4j_search_bolt_endpoint" {
  value       = module.databases.neo4j_search_bolt_endpoint
  description = "The Bolt endpoint for the Neo4j SearchSpace instance"
}
