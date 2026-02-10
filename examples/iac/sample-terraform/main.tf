terraform {
  required_version = ">= 1.3.0"
}

provider "null" {}

resource "null_resource" "example" {
  triggers = {
    always = timestamp()
  }
}
