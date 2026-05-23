# Todo App Infrastructure — AWS
# Provider-agnostic stub for OMA tf-infra agent testing

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "ap-northeast-2"
}

variable "environment" {
  type    = string
  default = "dev"
}

resource "aws_instance" "todo_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Missing tags — intentional for testing
}

resource "aws_s3_bucket" "todo_assets" {
  bucket = "todo-app-assets-${var.environment}"
  # Missing versioning, encryption — intentional
}

output "server_ip" {
  value = aws_instance.todo_server.public_ip
}
