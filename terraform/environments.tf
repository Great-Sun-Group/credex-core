# Load environment configurations
locals {
  # Load environment files
  production  = local.production
  development = local.development
  staging     = local.staging
  model_001   = local.model_001
}
