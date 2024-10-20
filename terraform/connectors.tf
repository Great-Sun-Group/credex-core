module "connectors" {
  source = "./modules/connectors"

  environment            = terraform.workspace
  aws_region             = var.aws_region
  vpc_cidr               = var.vpc_cidr
  create_vpc             = var.create_vpc
  create_subnets         = var.create_subnets
  create_igw             = var.create_igw
  create_nat             = var.create_nat
  create_routes          = var.create_routes
  create_sg              = var.create_sg
  create_ecr             = var.create_ecr
  create_ecs             = var.create_ecs
  create_logs            = var.create_logs
  create_iam             = var.create_iam
  create_key_pair        = var.create_key_pair
  create_load_balancer   = var.create_load_balancer
  create_target_group    = var.create_target_group
  create_security_groups = var.create_security_groups
  create_neo4j           = var.create_neo4j
  create_acm             = var.create_acm
  common_tags            = local.common_tags
  domain_base            = var.domain_base
  subdomain_prefix       = var.subdomain_prefix
  public_key             = tls_private_key.ssh.public_key_openssh
}

# Generate SSH key
resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Outputs
output "vpc_id" {
  value = module.connectors.vpc_id
}

output "subnet_ids" {
  value = module.connectors.subnet_ids
}

output "neo4j_security_group_id" {
  value = module.connectors.neo4j_security_group_id
}

output "key_pair_name" {
  value = module.connectors.key_pair_name
}

output "alb_security_group_id" {
  value = module.connectors.alb_security_group_id
}

output "ecs_tasks_security_group_id" {
  value = module.connectors.ecs_tasks_security_group_id
}

output "alb_dns_name" {
  value = module.connectors.alb_dns_name
}

output "target_group_arn" {
  value = module.connectors.target_group_arn
}

output "alb_listener" {
  value = module.connectors.alb_listener
}

output "ssh_private_key" {
  value     = tls_private_key.ssh.private_key_pem
  sensitive = true
}
