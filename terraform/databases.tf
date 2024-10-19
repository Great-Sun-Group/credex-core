module "databases" {
  source = "./modules/databases"

  environment              = var.environment
  vpc_id                   = module.connectors.vpc_id
  subnet_ids               = module.connectors.subnet_ids
  neo4j_security_group_id  = module.connectors.neo4j_security_group_id
  key_pair_name            = module.connectors.key_pair_name
  neo4j_instance_type      = var.neo4j_instance_type[var.environment]
  neo4j_instance_size      = var.neo4j_volume_size[var.environment]
  neo4j_enterprise_license = var.neo4j_enterprise_license
  create_neo4j_instances   = var.create_neo4j_instances
  common_tags              = var.common_tags
}
