# Data source for existing SSM parameters
data "aws_ssm_parameter" "existing_params" {
  for_each = lookup(var.use_existing_resources, "ssm_parameters", false) ? {
    jwt_secret                  = "/credex/${local.environment}/jwt_secret"
    whatsapp_bot_api_key        = "/credex/${local.environment}/whatsapp_bot_api_key"
    open_exchange_rates_api     = "/credex/${local.environment}/open_exchange_rates_api"
    neo4j_ledger_space_user     = "/credex/${local.environment}/neo4j_ledger_space_user"
    neo4j_ledger_space_pass     = "/credex/${local.environment}/neo4j_ledger_space_pass"
    neo4j_search_space_user     = "/credex/${local.environment}/neo4j_search_space_user"
    neo4j_search_space_pass     = "/credex/${local.environment}/neo4j_search_space_pass"
    neo4j_ledger_space_bolt_url = "/credex/${local.environment}/neo4j_ledger_space_bolt_url"
    neo4j_search_space_bolt_url = "/credex/${local.environment}/neo4j_search_space_bolt_url"
  } : {}

  name = each.value
}

# Create SSM parameters
resource "aws_ssm_parameter" "params" {
  for_each = var.create_resources && !lookup(var.use_existing_resources, "ssm_parameters", false) ? {
    jwt_secret                  = var.jwt_secret
    whatsapp_bot_api_key        = var.whatsapp_bot_api_key
    open_exchange_rates_api     = var.open_exchange_rates_api
    neo4j_ledger_space_user     = var.neo4j_ledger_space_user
    neo4j_ledger_space_pass     = var.neo4j_ledger_space_pass
    neo4j_search_space_user     = var.neo4j_search_space_user
    neo4j_search_space_pass     = var.neo4j_search_space_pass
    neo4j_ledger_space_bolt_url = var.neo4j_ledger_space_bolt_url
    neo4j_search_space_bolt_url = var.neo4j_search_space_bolt_url
  } : {}

  name  = "/credex/${local.environment}/${each.key}"
  type  = "SecureString"
  value = each.value

  tags = local.common_tags
}

# Null resource to update SSM parameters
resource "null_resource" "update_ssm_params" {
  count = var.create_resources && !lookup(var.use_existing_resources, "ssm_parameters", false) ? 1 : 0

  triggers = {
    jwt_secret              = var.jwt_secret
    whatsapp_bot_api_key    = var.whatsapp_bot_api_key
    open_exchange_rates_api = var.open_exchange_rates_api
  }

  provisioner "local-exec" {
    command = <<EOT
      aws ssm put-parameter --name "/credex/${local.environment}/jwt_secret" --value "${var.jwt_secret}" --type SecureString --overwrite
      aws ssm put-parameter --name "/credex/${local.environment}/whatsapp_bot_api_key" --value "${var.whatsapp_bot_api_key}" --type SecureString --overwrite
      aws ssm put-parameter --name "/credex/${local.environment}/open_exchange_rates_api" --value "${var.open_exchange_rates_api}" --type SecureString --overwrite
    EOT
  }
}

# Output SSM parameter ARNs
output "ssm_parameter_arns" {
  value = var.create_resources ? (
    lookup(var.use_existing_resources, "ssm_parameters", false) ? 
    values(data.aws_ssm_parameter.existing_params)[*].arn : 
    values(aws_ssm_parameter.params)[*].arn
  ) : []
  description = "ARNs of the SSM parameters"
}
