terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "openclaw-terraform-state-244116256157"  # ← your new bucket
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    use_lockfile   = true                                      # ← replaces dynamodb_table
    dynamodb_table = "openclaw-terraform-locks"               # ← keep for now, just ignore the warning
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
}

data "aws_availability_zones" "available" {}
data "aws_caller_identity" "current" {}