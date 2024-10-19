locals {
  environment = terraform.workspace

  # Common locals
  common_tags = {
    Environment = local.environment
    Project     = "Credex"
    ManagedBy   = "Terraform"
  }

  # Connectors locals
  vpc_name = "credex-vpc-${local.environment}"
  
  # Databases locals
  neo4j_instance_count = 2  # Compliant with the Startup Software License Agreement
  
  # App locals
  ecs_cluster_name = "credex-cluster-${local.environment}"
  ecr_repository_name = "credex-core-${local.environment}"

  # Computed values based on environment
  vpc_cidr = var.vpc_cidr[local.environment]
  ecs_task_cpu = var.ecs_task_cpu[local.environment]
  ecs_task_memory = var.ecs_task_memory[local.environment]
  neo4j_instance_type = var.neo4j_instance_type[local.environment]
  neo4j_volume_size = var.neo4j_volume_size[local.environment]
}
