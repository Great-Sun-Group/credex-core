# Look for existing Neo4j Community Edition AMI
data "aws_ami" "neo4j" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["neo4j-community-${var.neo4j_version}-*"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Create a null_resource to manage Neo4j AMI creation and updates
resource "null_resource" "neo4j_ami_management" {
  triggers = {
    always_run = "${timestamp()}"
  }

  provisioner "local-exec" {
    command = <<-EOT
      #!/bin/bash
      set -e
      
      # Function to create a new Neo4j Community Edition AMI
      create_neo4j_ami() {
        local NEO4J_VERSION=$1
        local ENVIRONMENT=$2
        echo "Creating new Neo4j Community Edition AMI for version $NEO4J_VERSION in $ENVIRONMENT environment..."
        
        # Get the latest Amazon Linux 2 AMI
        BASE_AMI_ID=$(aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" --query "Images[0].ImageId" --output text)
        
        # Launch EC2 instance
        INSTANCE_ID=$(aws ec2 run-instances --image-id $BASE_AMI_ID --instance-type t3.micro --key-name ${aws_key_pair.neo4j_key_pair.key_name} --security-group-ids ${aws_security_group.neo4j.id} --subnet-id ${data.aws_subnets.available.ids[0]} --query 'Instances[0].InstanceId' --output text)
        
        # Wait for instance to be running
        aws ec2 wait instance-running --instance-ids $INSTANCE_ID
        
        # Install and configure Neo4j
        aws ec2 send-command --instance-ids $INSTANCE_ID --document-name "AWS-RunShellScript" --parameters commands=[
          "sudo yum update -y",
          "sudo amazon-linux-extras install java-openjdk11 -y",
          "wget https://neo4j.com/artifact.php?name=neo4j-community-$NEO4J_VERSION-unix.tar.gz",
          "tar -xf neo4j-community-$NEO4J_VERSION-unix.tar.gz",
          "sudo mv neo4j-community-$NEO4J_VERSION /opt/neo4j",
          "sudo chown -R ec2-user:ec2-user /opt/neo4j"
        ]
        
        # Create AMI
        AMI_ID=$(aws ec2 create-image --instance-id $INSTANCE_ID --name "neo4j-community-$NEO4J_VERSION-$ENVIRONMENT" --description "Neo4j Community $NEO4J_VERSION for $ENVIRONMENT" --query 'ImageId' --output text)
        
        # Tag AMI
        aws ec2 create-tags --resources $AMI_ID --tags Key=Version,Value=$NEO4J_VERSION Key=Environment,Value=$ENVIRONMENT
        
        # Terminate instance
        aws ec2 terminate-instances --instance-ids $INSTANCE_ID
        
        echo $AMI_ID
      }
      
      # Check if AMI exists
      AMI_ID=$(aws ec2 describe-images --owners self --filters "Name=name,Values=neo4j-community-${var.neo4j_version}-${local.effective_environment}" --query 'Images[0].ImageId' --output text)
      
      if [[ "$AMI_ID" == "None" || "$AMI_ID" == "" ]]; then
        NEW_AMI_ID=$(create_neo4j_ami ${var.neo4j_version} ${local.effective_environment})
        if [[ -z "$NEW_AMI_ID" ]]; then
          echo "Error: Failed to create Neo4j Community Edition AMI"
          exit 1
        fi
        echo "Created new AMI: $NEW_AMI_ID"
        echo "$NEW_AMI_ID" > ${path.module}/neo4j_ami_id.txt
      else
        echo "Neo4j Community Edition AMI already exists: $AMI_ID"
        echo "$AMI_ID" > ${path.module}/neo4j_ami_id.txt
      fi
    EOT
  }

  # Add this provisioner to ensure the file exists
  provisioner "local-exec" {
    command = "touch ${path.module}/neo4j_ami_id.txt"
  }
}

data "local_file" "neo4j_ami_id" {
  filename = "${path.module}/neo4j_ami_id.txt"
  depends_on = [null_resource.neo4j_ami_management]
}

resource "aws_key_pair" "neo4j_key_pair" {
  key_name   = "neo4j-key-pair-${local.effective_environment}"
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

resource "aws_instance" "neo4j_ledger" {
  ami           = coalesce(trimspace(data.local_file.neo4j_ami_id.content), data.aws_ami.neo4j.id)
  instance_type = local.effective_environment == "production" ? "m5.large" : "t3.medium"
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = data.aws_subnets.available.ids[0]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${local.effective_environment}-LedgerSpace"
    Role = "LedgerSpace"
  })

  user_data = <<-EOF
              #!/bin/bash
              echo "Configuring Neo4j Community Edition for LedgerSpace"
              NEO4J_PASSWORD=${var.neo4j_ledger_space_pass}
              NEO4J_USERNAME=${var.neo4j_ledger_space_user}
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /opt/neo4j/conf/neo4j.conf
              /opt/neo4j/bin/neo4j-admin set-initial-password $NEO4J_PASSWORD
              /opt/neo4j/bin/cypher-shell -u neo4j -p $NEO4J_PASSWORD "CREATE USER $NEO4J_USERNAME SET PASSWORD '$NEO4J_PASSWORD' CHANGE NOT REQUIRED"
              /opt/neo4j/bin/cypher-shell -u neo4j -p $NEO4J_PASSWORD "GRANT ROLE admin TO $NEO4J_USERNAME"
              systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  depends_on = [null_resource.neo4j_ami_management]

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

resource "aws_instance" "neo4j_search" {
  ami           = coalesce(trimspace(data.local_file.neo4j_ami_id.content), data.aws_ami.neo4j.id)
  instance_type = local.effective_environment == "production" ? "m5.large" : "t3.medium"
  key_name      = aws_key_pair.neo4j_key_pair.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = data.aws_subnets.available.ids[0]

  tags = merge(local.common_tags, {
    Name = "Neo4j-${local.effective_environment}-SearchSpace"
    Role = "SearchSpace"
  })

  user_data = <<-EOF
              #!/bin/bash
              echo "Configuring Neo4j Community Edition for SearchSpace"
              NEO4J_PASSWORD=${var.neo4j_search_space_pass}
              NEO4J_USERNAME=${var.neo4j_search_space_user}
              sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /opt/neo4j/conf/neo4j.conf
              /opt/neo4j/bin/neo4j-admin set-initial-password $NEO4J_PASSWORD
              /opt/neo4j/bin/cypher-shell -u neo4j -p $NEO4J_PASSWORD "CREATE USER $NEO4J_USERNAME SET PASSWORD '$NEO4J_PASSWORD' CHANGE NOT REQUIRED"
              /opt/neo4j/bin/cypher-shell -u neo4j -p $NEO4J_PASSWORD "GRANT ROLE admin TO $NEO4J_USERNAME"
              systemctl start neo4j
              EOF

  root_block_device {
    volume_type = "gp3"
    volume_size = 50
    encrypted   = true
  }

  depends_on = [null_resource.neo4j_ami_management]

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }
}

resource "aws_security_group" "neo4j" {
  name        = "neo4j-sg-${local.effective_environment}"
  description = "Security group for Neo4j ${local.effective_environment} instances"
  vpc_id      = local.vpc_id

  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}