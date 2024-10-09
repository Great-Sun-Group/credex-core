resource "aws_ssm_parameter" "neo4j_ledger_space_bolt_url" {
  name  = "/credex/${local.environment}/neo4j_ledger_space_bolt_url"
  type  = "SecureString"
  value = var.neo4j_ledger_space_bolt_url
}

resource "aws_ssm_parameter" "neo4j_search_space_bolt_url" {
  name  = "/credex/${local.environment}/neo4j_search_space_bolt_url"
  type  = "SecureString"
  value = var.neo4j_search_space_bolt_url
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/credex/${local.environment}/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
}

resource "aws_ssm_parameter" "whatsapp_bot_api_key" {
  name  = "/credex/${local.environment}/whatsapp_bot_api_key"
  type  = "SecureString"
  value = var.whatsapp_bot_api_key
}

resource "aws_ssm_parameter" "open_exchange_rates_api" {
  name  = "/credex/${local.environment}/open_exchange_rates_api"
  type  = "SecureString"
  value = var.open_exchange_rates_api
}

resource "aws_ssm_parameter" "neo4j_ledger_space_user" {
  name  = "/credex/${local.environment}/neo4j_ledger_space_user"
  type  = "SecureString"
  value = var.neo4j_ledger_space_user
}

resource "aws_ssm_parameter" "neo4j_ledger_space_pass" {
  name  = "/credex/${local.environment}/neo4j_ledger_space_pass"
  type  = "SecureString"
  value = var.neo4j_ledger_space_pass
}

resource "aws_ssm_parameter" "neo4j_search_space_user" {
  name  = "/credex/${local.environment}/neo4j_search_space_user"
  type  = "SecureString"
  value = var.neo4j_search_space_user
}

resource "aws_ssm_parameter" "neo4j_search_space_pass" {
  name  = "/credex/${local.environment}/neo4j_search_space_pass"
  type  = "SecureString"
  value = var.neo4j_search_space_pass
}

resource "aws_ssm_parameter" "neo4j_public_key" {
  name  = "/credex/${local.environment}/neo4j_public_key"
  type  = "SecureString"
  value = var.neo4j_public_key
}