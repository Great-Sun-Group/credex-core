locals {
  development = {
    environment     = "development"
    subdomain      = "dev"
    dev_domain_base = "mycredex.dev"
    aws_region     = "af-south-1"
    app_port       = 3000
    
    vpc_cidr       = "10.1.0.0/16"
    
    ecs_task = {
      cpu    = "256"
      memory = "512"
    }
    
    neo4j = {
      instance_type = "t3.medium"
      volume_size  = 50
    }
  }
}
