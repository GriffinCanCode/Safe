# Terraform configuration for ZK-Vault infrastructure
terraform {
  required_version = "~> 1.6"
  
  required_providers {
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.12"
    }
  }

  # Backend configuration for state management
  backend "gcs" {
    # Configured via backend config files per environment
    # See: infrastructure/terraform/environments/*/backend.tf
  }
}

# Primary provider for production use with quota checks
provider "google-beta" {
  user_project_override = true
  billing_project       = var.project_id
  default_labels = {
    project     = "zk-vault"
    environment = var.environment
    managed-by  = "terraform"
  }
}

# Provider without quota checks for project creation and service enablement
provider "google-beta" {
  alias                 = "no_user_project_override"
  user_project_override = false
  default_labels = {
    project     = "zk-vault"
    environment = var.environment
    managed-by  = "terraform"
  }
}

# Standard Google provider for resources not requiring beta features
provider "google" {
  user_project_override = true
  billing_project       = var.project_id
  default_labels = {
    project     = "zk-vault"
    environment = var.environment
    managed-by  = "terraform"
  }
} 