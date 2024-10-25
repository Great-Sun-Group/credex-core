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
}
