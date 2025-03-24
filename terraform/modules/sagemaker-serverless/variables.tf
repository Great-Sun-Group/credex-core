variable "environment" {
  description = "The deployment environment (development, staging, or production)"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC (optional for non-VPC deployments)"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "List of subnet IDs for the SageMaker endpoint (optional for non-VPC deployments)"
  type        = list(string)
  default     = []
}

variable "security_group_ids" {
  description = "List of security group IDs for the SageMaker endpoint (optional for non-VPC deployments)"
  type        = list(string)
  default     = []
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

variable "huggingface_model_id" {
  description = "The Hugging Face model ID to use (e.g., deepseek-ai/deepseek-coder-6.7b)"
  type        = string
  default     = "deepseek-ai/deepseek-coder-6.7b"
}

variable "model_name" {
  description = "The name of the model"
  type        = string
  default     = "deepseek-coder"
}
