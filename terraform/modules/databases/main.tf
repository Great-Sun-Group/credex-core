# Data source to access connectors outputs
data "terraform_remote_state" "connectors" {
  backend = "s3"
  config = {
    bucket = "credex-terraform-state"
    key    = "${var.environment}/connectors.tfstate"
    region = var.aws_region
  }
}

# Use the data source to access VPC and subnet information
resource "aws_db_subnet_group" "neo4j" {
  name       = "neo4j-subnet-group-${var.environment}"
  subnet_ids = data.terraform_remote_state.connectors.outputs.private_subnet_ids

  tags = {
    Name = "Neo4j DB subnet group"
  }
}

# Rest of the databases module configuration...
