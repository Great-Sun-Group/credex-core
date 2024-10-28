# Environment configurations are loaded from terraform/environments/*.tf files
# Each environment file (development.tf, production.tf, etc.) defines its own local configuration

locals {
  # Create a map of all environment configurations
  env_config = {
    production  = local.production
    development = local.development
    staging     = local.staging
    model_001   = local.model_001
  }

  # Get current environment config
  current_env = local.env_config[var.environment]

  # Common tags for all resources
  common_tags = {
    Environment = var.environment
    ManagedBy  = "terraform"
    Project    = "credex-core"
  }
}
