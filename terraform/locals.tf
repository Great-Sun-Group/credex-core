locals {
  effective_environment = coalesce(var.environment, terraform.workspace == "default" ? "production" : terraform.workspace)
  
  domain = local.effective_environment == "production" ? "api.mycredex.app" : (
           local.effective_environment == "staging" ? "apistaging.mycredex.app" : 
           "apidev.mycredex.app")
  
  common_tags = {
    Environment = local.effective_environment
    Project     = "CredEx"
    ManagedBy   = "Terraform"
  }
}