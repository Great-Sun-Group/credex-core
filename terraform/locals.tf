locals {
  # Load environment configurations
  env_config = {
    production  = local.production
    development = local.development
    staging     = local.staging
    model_001   = local.model_001
  }

  # Get current environment config
  current_env = local.env_config[var.environment]

  # Common tags
  common_tags = {
    Environment = var.environment
    Project     = "Credex"
    ManagedBy   = "Terraform"
  }
}
