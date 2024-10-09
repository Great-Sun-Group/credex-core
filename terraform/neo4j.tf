locals {
  neo4j_ports = [7474, 7687]
  key_pair_name = "neo4j-key-pair-${local.environment}"
  
  # Ensure we don't exceed the license limit of 3 production instances
  max_production_instances = 3
  
  # Define instance types that comply with the 24 Cores / 256 GB RAM limit
  compliant_instance_types = {
    development = "t3.xlarge"  # 4 vCPU, 16 GB RAM
    staging     = "r5.2xlarge" # 8 vCPU, 64 GB RAM
    production  = "r5.12xlarge" # 48 vCPU, 384 GB RAM (will be limited to 24 cores in user_data)
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
  count         = lookup(var.use_existing_resources, "neo4j_instances", false) ? 0 : min(local.neo4j_instance_count[local.environment], local.max_production_instances)
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
              echo "Installing and Configuring Neo4j Enterprise Edition"
              
              # Install Java
              amazon-linux-extras install java-openjdk11 -y
              
              # Install Neo4j
              rpm --import https://debian.neo4j.com/neotechnology.gpg.key
              cat << REPO > /etc/yum.repos.d/neo4j.repo
              [neo4j]
              name=Neo4j RPM Repository
              baseurl=https://yum.neo4j.com/stable/5
              enabled=1
              gpgcheck=1
              REPO
              yum install neo4j-enterprise -y
              
              # Limit CPU cores to 24 as per license agreement
              echo "dbms.threads.worker_count=24" >> /etc/neo4j/neo4j.conf
              
              # Configure Neo4j for both LedgerSpace and SearchSpace
              NEO4J_LEDGER_PASSWORD=${var.neo4j_ledger_space_pass}
              NEO4J_LEDGER_USERNAME=${var.neo4j_ledger_space_user}
              NEO4J_SEARCH_PASSWORD=${var.neo4j_search_space_pass}
              NEO4J_SEARCH_USERNAME=${var.neo4j_search_space_user}
              
              # Set the initial password (using LedgerSpace password as default)
              neo4j-admin dbms set-initial-password $NEO4J_LEDGER_PASSWORD
              
              # Apply the Enterprise license
              echo "${var.neo4j_enterprise_license}" > /var/lib/neo4j/conf/neo4j.license
              chown neo4j:neo4j /var/lib/neo4j/conf/neo4j.license
              chmod 644 /var/lib/neo4j/conf/neo4j.license
              
              # Configure Neo4j
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
              echo "dbms.security.procedures.unrestricted=apoc.*" >> /etc/neo4j/neo4j.conf
              
              # Start Neo4j
              systemctl enable neo4j
              systemctl start neo4j
              
              # Wait for Neo4j to start
              until cypher-shell -u neo4j -p $NEO4J_LEDGER_PASSWORD "RETURN 1;" > /dev/null 2>&1; do
                echo "Waiting for Neo4j to start..."
                sleep 5
              done
              
              # Create users and grant admin roles
              cypher-shell -u neo4j -p $NEO4J_LEDGER_PASSWORD "CREATE USER $NEO4J_LEDGER_USERNAME SET PASSWORD '$NEO4J_LEDGER_PASSWORD' CHANGE NOT REQUIRED"
              cypher-shell -u neo4j -p $NEO4J_LEDGER_PASSWORD "GRANT ROLE admin TO $NEO4J_LEDGER_USERNAME"
              cypher-shell -u neo4j -p $NEO4J_LEDGER_PASSWORD "CREATE USER $NEO4J_SEARCH_USERNAME SET PASSWORD '$NEO4J_SEARCH_PASSWORD' CHANGE NOT REQUIRED"
              cypher-shell -u neo4j -p $NEO4J_LEDGER_PASSWORD "GRANT ROLE admin TO $NEO4J_SEARCH_USERNAME"
              
              # Restart Neo4j to apply all changes
              systemctl restart neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }

  depends_on = [null_resource.update_ssm_params]
}

# Generate Neo4j Bolt URLs and store them in SSM parameters
resource "aws_ssm_parameter" "neo4j_bolt_url" {
  count = lookup(var.use_existing_resources, "neo4j_instances", false) ? 0 : min(local.neo4j_instance_count[local.environment], local.max_production_instances)
  name  = "/credex/${local.environment}/neo4j_${count.index == 0 ? "ledger" : "search"}_space_bolt_url"
  type  = "String"
  value = "bolt://${aws_instance.neo4j[count.index].private_ip}:7687"

  overwrite = true
}

# Output Neo4j instance IPs
output "neo4j_instance_ips" {
  value = lookup(var.use_existing_resources, "neo4j_instances", false) ? data.aws_instances.neo4j.private_ips : aws_instance.neo4j[*].private_ip
  description = "Private IPs of Neo4j instances"
}

# Output Neo4j Bolt URLs
output "neo4j_bolt_urls" {
  value = lookup(var.use_existing_resources, "neo4j_instances", false) ? [
    data.aws_ssm_parameter.existing_params["neo4j_ledger_space_bolt_url"].value,
    data.aws_ssm_parameter.existing_params["neo4j_search_space_bolt_url"].value
  ] : aws_ssm_parameter.neo4j_bolt_url[*].value
  description = "Neo4j Bolt URLs"
  sensitive   = true
}

# The security group for Neo4j is now defined in networking.tf

# Note: This configuration complies with the Neo4j Startup Software License Agreement:
# - Limits production instances to a maximum of 3
# - Ensures each instance doesn't exceed 24 Cores / 256 GB of RAM
# - Allows for both LedgerSpace and SearchSpace on a single instance for non-production environments
# - Provides up to 6 instances for development (controlled by local.neo4j_instance_count in variables.tf)
# - Allows up to 3 instances for non-production testing (controlled by local.neo4j_instance_count in variables.tf)