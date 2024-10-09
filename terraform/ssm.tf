locals {
  ssm_parameters = {
    neo4j_ledger_space_bolt_url = { value = "placeholder", type = "SecureString" }
    neo4j_search_space_bolt_url = { value = "placeholder", type = "SecureString" }
    jwt_secret                  = { value = var.jwt_secret, type = "SecureString" }
    whatsapp_bot_api_key        = { value = var.whatsapp_bot_api_key, type = "SecureString" }
    open_exchange_rates_api     = { value = var.open_exchange_rates_api, type = "SecureString" }
    neo4j_ledger_space_user     = { value = var.neo4j_ledger_space_user, type = "SecureString" }
    neo4j_ledger_space_pass     = { value = var.neo4j_ledger_space_pass, type = "SecureString" }
    neo4j_search_space_user     = { value = var.neo4j_search_space_user, type = "SecureString" }
    neo4j_search_space_pass     = { value = var.neo4j_search_space_pass, type = "SecureString" }
    neo4j_public_key            = { value = var.neo4j_public_key, type = "SecureString" }
  }
}

resource "aws_ssm_parameter" "params" {
  for_each = local.ssm_parameters

  name  = "/credex/${var.environment}/${each.key}"
  type  = each.value.type
  value = each.value.value

  # This will create the parameter if it doesn't exist, or update it if it does
  lifecycle {
    ignore_changes = [value]
  }
}

# Use null_resource to ensure the parameters are always up to date
resource "null_resource" "update_ssm_params" {
  for_each = local.ssm_parameters

  triggers = {
    value = each.value.value
  }

  provisioner "local-exec" {
    command = <<EOT
      aws ssm put-parameter \
        --name "/credex/${var.environment}/${each.key}" \
        --type "${each.value.type}" \
        --value "${each.value.value}" \
        --overwrite
    EOT
  }

  depends_on = [aws_ssm_parameter.params]
}