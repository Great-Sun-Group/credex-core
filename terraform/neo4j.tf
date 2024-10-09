locals {
  neo4j_instance_count = {
    development = 1
    staging     = 1
    production  = 2
  }
  neo4j_instance_type = {
    development = "t3.micro"
    staging     = "t3.medium"
    production  = "t3.medium"
  }
  neo4j_ports = [7474, 7687]
  key_pair_name = "neo4j-key-pair-${var.environment}"
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
    Environment = var.environment
  }

  filter {
    name   = "tag:Name"
    values = ["Neo4j-${var.environment}-*"]
  }
}

data "aws_security_group" "neo4j" {
  name = "credex-neo4j-sg-${var.environment}"
}

resource "aws_instance" "neo4j" {
  count         = max(0, local.neo4j_instance_count[var.environment] - length(data.aws_instances.neo4j.ids))
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = local.neo4j_instance_type[var.environment]
  key_name      = data.aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [data.aws_security_group.neo4j.id]
  subnet_id              = data.aws_subnets.available.ids[count.index % length(data.aws_subnets.available.ids)]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${var.environment}-${length(data.aws_instances.neo4j.ids) + count.index == 0 ? "LedgerSpace" : "SearchSpace"}"
    Role = length(data.aws_instances.neo4j.ids) + count.index == 0 ? "LedgerSpace" : "SearchSpace"
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
              
              # Configure Neo4j
              NEO4J_PASSWORD=${length(data.aws_instances.neo4j.ids) + count.index == 0 ? var.neo4j_ledger_space_pass : var.neo4j_search_space_pass}
              NEO4J_USERNAME=${length(data.aws_instances.neo4j.ids) + count.index == 0 ? var.neo4j_ledger_space_user : var.neo4j_search_space_user}
              
              # Set the initial password
              neo4j-admin dbms set-initial-password $NEO4J_PASSWORD
              
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
              until cypher-shell -u neo4j -p $NEO4J_PASSWORD "RETURN 1;" > /dev/null 2>&1; do
                echo "Waiting for Neo4j to start..."
                sleep 5
              done
              
              # Create user and grant admin role
              cypher-shell -u neo4j -p $NEO4J_PASSWORD "CREATE USER $NEO4J_USERNAME SET PASSWORD '$NEO4J_PASSWORD' CHANGE NOT REQUIRED"
              cypher-shell -u neo4j -p $NEO4J_PASSWORD "GRANT ROLE admin TO $NEO4J_USERNAME"
              
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

# The security group for Neo4j is now defined in networking.tf