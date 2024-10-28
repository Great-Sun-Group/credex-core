locals {
  model_001 = {
    environment     = "model_001"
    subdomain      = "model_001"
    dev_domain_base = "mycredex.dev"
    aws_region     = "af-south-1"
    app_port       = 3000
    
    vpc_cidr       = "10.3.0.0/16"
    
    ecs_task = {
      cpu    = "1024"
      memory = "2048"
    }
    
    neo4j = {
      instance_type = "r5.2xlarge"
      volume_size  = 100
    }
  }
}
