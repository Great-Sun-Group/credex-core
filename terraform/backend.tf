terraform {
  backend "s3" {
    bucket         = "TERRAFORM_STATE_BUCKET_PLACEHOLDER"
    key            = "TERRAFORM_STATE_KEY_PLACEHOLDER"
    region         = "af-south-1"
    dynamodb_table = "TERRAFORM_LOCK_TABLE_PLACEHOLDER"
    encrypt        = true
  }
}
