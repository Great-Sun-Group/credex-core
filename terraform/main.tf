provider "aws" {
  region = var.aws_region
}

data "aws_ami" "neo4j" {
  most_recent = true
  owners      = ["aws-marketplace"]

  filter {
    name   = "name"
    values = ["neo4j-enterprise-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  neo4j_ami_id = var.update_neo4j_ami ? data.aws_ami.neo4j.id : var.current_neo4j_ami_id
}

module "networking" {
  source = "./modules/networking"

  environment         = local.effective_environment
  common_tags         = local.common_tags
  create_vpc          = var.create_vpc
  vpc_cidr            = var.vpc_cidr
  acm_certificate_arn = module.security.acm_certificate_arn
}

module "ecs" {
  source = "./modules/ecs"

  environment                     = local.effective_environment
  common_tags                     = local.common_tags
  aws_region                      = var.aws_region
  vpc_id                          = module.networking.vpc_id
  subnet_ids                      = module.networking.subnet_ids
  alb_security_group_id           = module.networking.alb_security_group_id
  target_group_arn                = module.networking.target_group_arn
  task_cpu                        = var.task_cpu
  task_memory                     = var.task_memory
  service_desired_count           = var.service_desired_count
  jwt_secret_arn                  = module.security.jwt_secret_arn
  whatsapp_bot_api_key_arn        = module.security.whatsapp_bot_api_key_arn
  open_exchange_rates_api_arn     = module.security.open_exchange_rates_api_arn
  neo4j_ledger_space_bolt_url_arn = module.neo4j.neo4j_ledger_space_bolt_url_arn
  neo4j_ledger_space_user_arn     = module.neo4j.neo4j_ledger_space_user_arn
  neo4j_ledger_space_pass_arn     = module.neo4j.neo4j_ledger_space_pass_arn
  neo4j_search_space_bolt_url_arn = module.neo4j.neo4j_search_space_bolt_url_arn
  neo4j_search_space_user_arn     = module.neo4j.neo4j_search_space_user_arn
  neo4j_search_space_pass_arn     = module.neo4j.neo4j_search_space_pass_arn
}

module "neo4j" {
  source = "./modules/neo4j"

  environment                 = local.effective_environment
  common_tags                 = local.common_tags
  neo4j_ami_id                = local.neo4j_ami_id
  vpc_id                      = module.networking.vpc_id
  vpc_cidr                    = var.vpc_cidr
  subnet_id                   = module.networking.subnet_ids[0]
  neo4j_ledger_space_user     = var.neo4j_ledger_space_user
  neo4j_ledger_space_pass     = var.neo4j_ledger_space_pass
  neo4j_search_space_user     = var.neo4j_search_space_user
  neo4j_search_space_pass     = var.neo4j_search_space_pass
  neo4j_ledger_space_bolt_url = var.neo4j_ledger_space_bolt_url
  neo4j_search_space_bolt_url = var.neo4j_search_space_bolt_url
}

module "security" {
  source = "./modules/security"

  domain                 = local.domain
  common_tags            = local.common_tags
  route53_zone_name      = var.route53_zone_name
  alb_dns_name           = module.networking.alb_dns_name
  alb_zone_id            = module.networking.alb_zone_id
  environment            = local.effective_environment
  jwt_secret             = var.jwt_secret
  whatsapp_bot_api_key   = var.whatsapp_bot_api_key
  open_exchange_rates_api = var.open_exchange_rates_api
}