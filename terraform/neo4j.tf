locals {
  neo4j_ports = [7474, 7687]
  key_pair_name = "neo4j-key-pair-${local.environment}"
  
  max_production_instances = 3
  
  compliant_instance_types = {
    development = "t3.xlarge"
    staging     = "r5.2xlarge"
    production  = "r5.12xlarge"
  }
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

data "aws_key_pair" "neo4j_key_pair" {
  key_name = local.key_pair_name
}

data "aws_instances" "neo4j" {
  instance_tags = {
    Project     = "CredEx"
    Environment = local.environment
  }

  filter {
    name   = "tag:Name"
    values = ["Neo4j-${local.environment}-*"]
  }
}

resource "aws_instance" "neo4j" {
  count         = var.create_resources && !lookup(var.use_existing_resources, "neo4j_instances", false) ? min(local.neo4j_instance_count[local.environment], local.max_production_instances) : 0
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = local.compliant_instance_types[local.environment]
  key_name      = data.aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [lookup(var.use_existing_resources, "security_groups", false) ? data.aws_security_group.existing_neo4j[0].id : aws_security_group.neo4j[0].id]
  subnet_id              = data.aws_subnets.available.ids[count.index % length(data.aws_subnets.available.ids)]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${local.environment}-${count.index == 0 ? "LedgerSpace" : "SearchSpace"}"
    Role = count.index == 0 ? "LedgerSpace" : "SearchSpace"
  })

  user_data = <<-EOF
              #!/bin/bash
              # ... (keep the existing user_data script)
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [ami, user_data]
  }

  depends_on = [null_resource.update_ssm_params]
}

resource "aws_ssm_parameter" "neo4j_bolt_url" {
  count = var.create_resources && !lookup(var.use_existing_resources, "neo4j_instances", false) ? min(local.neo4j_instance_count[local.environment], local.max_production_instances) : 0
  name  = "/credex/${local.environment}/neo4j_${count.index == 0 ? "ledger" : "search"}_space_bolt_url"
  type  = "String"
  value = "bolt://${aws_instance.neo4j[count.index].private_ip}:7687"

  overwrite = true
}

output "neo4j_instance_ips" {
  value = var.create_resources ? (
    lookup(var.use_existing_resources, "neo4j_instances", false) ? data.aws_instances.neo4j.private_ips : aws_instance.neo4j[*].private_ip
  ) : []
  description = "Private IPs of Neo4j instances"
}

output "neo4j_bolt_urls" {
  value = var.create_resources ? (
    lookup(var.use_existing_resources, "neo4j_instances", false) ? [
      data.aws_ssm_parameter.existing_params["neo4j_ledger_space_bolt_url"].value,
      data.aws_ssm_parameter.existing_params["neo4j_search_space_bolt_url"].value
    ] : aws_ssm_parameter.neo4j_bolt_url[*].value
  ) : []
  description = "Neo4j Bolt URLs"
  sensitive   = true
}

# Note: The security group for Neo4j is defined in networking.tf
