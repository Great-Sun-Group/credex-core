terraform {
  backend "s3" {
    bucket         = "credex-terraform-state"
    key            = "env://${terraform.workspace}/terraform.tfstate"
    region         = "af-south-1"
    dynamodb_table = "credex-terraform-lock"
    encrypt        = true
  }
}
