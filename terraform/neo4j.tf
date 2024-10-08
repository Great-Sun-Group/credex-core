locals {
  neo4j_instance_count = {
    development = 2
    staging     = 1
    production  = 2
  }
  neo4j_instance_type = {
    development = "t3.medium"
    staging     = "t3.large"
    production  = "m5.large"
  }
  neo4j_ports = [7474, 7687]
  key_pair_name = "neo4j-key-pair-${local.effective_environment}"
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_key_pair" "neo4j_key_pair" {
  key_name   = local.key_pair_name
  public_key = tls_private_key.neo4j_private_key.public_key_openssh

  tags = local.common_tags

  lifecycle {
    ignore_changes = [public_key]
  }
}

resource "tls_private_key" "neo4j_private_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_instance" "neo4j" {
  count         = local.neo4j_instance_count[local.effective_environment]
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = local.neo4j_instance_type[local.effective_environment]
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j[local.effective_environment].id]
  subnet_id              = data.aws_subnets.available.ids[count.index % length(data.aws_subnets.available.ids)]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${local.effective_environment}-${count.index == 0 ? "LedgerSpace" : "SearchSpace"}"
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
              
              # Configure Neo4j
              NEO4J_PASSWORD=${count.index == 0 ? var.neo4j_ledger_space_pass : var.neo4j_search_space_pass}
              NEO4J_USERNAME=${count.index == 0 ? var.neo4j_ledger_space_user : var.neo4j_search_space_user}
              
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
}

resource "aws_security_group" "neo4j" {
  for_each    = toset(["development", "staging", "production"])
  name        = "neo4j-sg-${each.key}"
  description = "Security group for Neo4j ${each.key} instances"
  vpc_id      = local.vpc_id

  tags = merge(local.common_tags, {
    Environment = each.key
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "neo4j_ingress" {
  for_each          = { for pair in setproduct(["development", "staging", "production"], local.neo4j_ports) : "${pair[0]}-${pair[1]}" => { env = pair[0], port = pair[1] } }
  type              = "ingress"
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = "tcp"
  security_group_id = aws_security_group.neo4j[each.value.env].id

  cidr_blocks = each.value.env == "production" ? [data.aws_vpc.default.cidr_block] : ["10.0.0.0/8"]
}

resource "aws_security_group_rule" "neo4j_egress" {
  for_each          = toset(["development", "staging", "production"])
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.neo4j[each.key].id
  cidr_blocks       = ["0.0.0.0/0"]
}