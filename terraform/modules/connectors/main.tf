# Local variables
locals {
  common_tags = {
    Environment = var.environment
    Project     = "Credex"
    ManagedBy   = "Terraform"
  }
  full_domain = "${lookup(var.subdomain_prefix, var.environment, var.subdomain_prefix["development"])}.${var.domain_base}"
}

# Generate key pair
resource "tls_private_key" "credex_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Shared Resources Module
module "shared_resources" {
  source               = "./shared_resources"
  environment          = var.environment
  common_tags          = local.common_tags
  domain               = local.full_domain
  public_key           = tls_private_key.credex_key.public_key_openssh
  vpc_cidr             = lookup(var.vpc_cidr, var.environment, var.vpc_cidr["development"])
  create_vpc           = var.create_vpc
  create_subnets       = var.create_subnets
  create_igw           = var.create_igw
  create_nat           = var.create_nat
  create_routes        = var.create_routes
  create_sg            = var.create_sg
  create_ecr           = var.create_ecr
  create_ecs           = var.create_ecs
  create_logs          = var.create_logs
  create_iam           = var.create_iam
  create_key_pair      = var.create_key_pair
  create_load_balancer = var.create_load_balancer
  create_target_group  = var.create_target_group
  create_neo4j_security_group = var.create_neo4j_security_group
  create_acm           = var.create_acm
}

resource "aws_route53_zone" "main" {
  count = var.create_route53_zone ? 1 : 0
  name  = local.full_domain
  
  tags = merge(var.common_tags, {
    Name = "credex-zone-${var.environment}"
  })
}

resource "aws_route53_record" "api" {
  count   = var.create_route53_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = local.full_domain
  type    = "A"

  alias {
    name                   = module.shared_resources.alb_dns_name
    zone_id                = module.shared_resources.alb_zone_id
    evaluate_target_health = true
  }
}
