locals {
  ssm_parameters = {
    neo4j_ledger_space_bolt_url = { value = var.neo4j_ledger_space_bolt_url, type = "String" }
    neo4j_search_space_bolt_url = { value = var.neo4j_search_space_bolt_url, type = "String" }
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

data "aws_ssm_parameter" "existing_params" {
  for_each = local.ssm_parameters
  name     = "/credex/${var.environment}/${each.key}"
}

resource "null_resource" "update_ssm_params" {
  for_each = local.ssm_parameters

  triggers = {
    value = each.value.value
  }

  provisioner "local-exec" {
    command = <<EOT
      EXISTING_VALUE=$(aws ssm get-parameter --name "/credex/${var.environment}/${each.key}" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
      if [ "$EXISTING_VALUE" != "${each.value.value}" ]; then
        aws ssm put-parameter \
          --name "/credex/${var.environment}/${each.key}" \
          --type "${each.value.type}" \
          --value "${each.value.value}" \
          --overwrite
        echo "Updated SSM parameter: ${each.key}"
      else
        echo "No update needed for SSM parameter: ${each.key}"
      fi
    EOT
  }
}

# Output all SSM parameters
output "ssm_parameters" {
  value = { for k, v in local.ssm_parameters : k => v.value }
  description = "All SSM parameters"
  sensitive = true
}

# Output the names of all SSM parameters
output "ssm_parameter_names" {
  value = [for k, v in local.ssm_parameters : "/credex/${var.environment}/${k}"]
  description = "List of all SSM parameter names"
}