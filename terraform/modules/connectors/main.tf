# Local variables
locals {
  common_tags = {
    Environment = var.environment
    Project     = "Credex"
    ManagedBy   = "Terraform"
  }
  
  # Domain logic with validation
  is_production = var.environment == "production"
  
  # Validate domain configuration and construct domain
  domain = local.is_production ? var.production_domain : (
    contains(keys(var.environment_subdomains), var.environment) ? 
    "${var.environment_subdomains[var.environment]}.${var.dev_domain_base}" :
    null # Will be caught by validation below
  )

  # Validate VPC CIDR
  selected_vpc_cidr = lookup(var.vpc_cidr, var.environment, null)
}

# Validate configurations
resource "null_resource" "validations" {
  lifecycle {
    precondition {
      condition     = local.domain != null
      error_message = "Missing subdomain configuration for environment: ${var.environment}"
    }
    
    precondition {
      condition     = local.selected_vpc_cidr != null
      error_message = "Missing VPC CIDR configuration for environment: ${var.environment}"
    }
    
    precondition {
      condition     = can(cidrhost(local.selected_vpc_cidr, 0))
      error_message = "Invalid VPC CIDR format: ${local.selected_vpc_cidr}"
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
  domain               = local.domain
  domain_base          = local.is_production ? var.production_domain : var.dev_domain_base
  public_key           = tls_private_key.credex_key.public_key_openssh
  vpc_cidr             = local.selected_vpc_cidr
}
