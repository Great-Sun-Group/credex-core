# Local variables
locals {
  common_tags = {
    Environment = var.environment
    Project     = "Credex"
    ManagedBy   = "Terraform"
  }
  
  # Domain logic
  full_domain = var.subdomain != null ? "${var.subdomain}.${var.domain}" : var.domain
}

# Validate configurations
resource "null_resource" "validations" {
  lifecycle {
    precondition {
      condition     = can(cidrhost(var.vpc_cidr, 0))
      error_message = "Invalid VPC CIDR format: ${var.vpc_cidr}"
    }
  }
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
  domain_base          = var.domain
  public_key           = tls_private_key.credex_key.public_key_openssh
  vpc_cidr             = var.vpc_cidr
}
