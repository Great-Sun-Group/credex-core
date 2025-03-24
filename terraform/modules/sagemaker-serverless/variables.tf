variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the SageMaker endpoint"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs for the SageMaker endpoint"
  type        = list(string)
}

variable "memory_size_in_mb" {
  description = "The memory size for the serverless endpoint in MB (supported values: 1024, 2048, 3072, 4096, 5120, 6144)"
  type        = number
  default     = 6144  # 6GB (maximum supported value)
}

variable "max_concurrency" {
  description = "The maximum number of concurrent invocations"
  type        = number
  default     = 5
}

variable "container_image" {
  description = "The container image for the model"
  type        = string
}

variable "model_data_url" {
  description = "The S3 URL for the model data"
  type        = string
}

variable "model_name" {
  description = "The name of the model"
  type        = string
  default     = "deepseek-coder"
}
