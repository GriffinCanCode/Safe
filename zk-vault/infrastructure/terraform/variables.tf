# Core Infrastructure Variables
variable "project_id" {
  description = "The GCP project ID where resources will be created"
  type        = string
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "region" {
  description = "The default GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The default GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "billing_account" {
  description = "The billing account ID to associate with the project"
  type        = string
  default     = null
}

# Project Configuration
variable "project_name" {
  description = "Human-readable name for the project"
  type        = string
  default     = "ZK-Vault"
}

variable "org_id" {
  description = "The organization ID (required for new project creation)"
  type        = string
  default     = null
}

variable "folder_id" {
  description = "The folder ID to create the project in"
  type        = string
  default     = null
}

# Firebase Configuration
variable "firebase_config" {
  description = "Firebase-specific configuration"
  type = object({
    web_app_display_name      = string
    android_app_display_name  = optional(string, "ZK-Vault Android")
    ios_app_display_name      = optional(string, "ZK-Vault iOS")
    enable_analytics          = optional(bool, true)
    enable_app_check          = optional(bool, true)
    enable_performance        = optional(bool, true)
    enable_crashlytics        = optional(bool, true)
  })
  default = {
    web_app_display_name = "ZK-Vault Web App"
  }
}

# Authentication Configuration
variable "auth_config" {
  description = "Authentication configuration"
  type = object({
    enable_anonymous          = optional(bool, true)
    enable_email_password     = optional(bool, true)
    enable_phone_auth         = optional(bool, false)
    enable_google_auth        = optional(bool, true)
    enable_microsoft_auth     = optional(bool, false)
    enable_apple_auth         = optional(bool, false)
    password_policy_enabled   = optional(bool, true)
    mfa_enabled              = optional(bool, true)
    session_timeout_minutes  = optional(number, 60)
  })
  default = {}
}

# Database Configuration
variable "firestore_config" {
  description = "Firestore database configuration"
  type = object({
    location_id                = optional(string, "us-central1")
    type                      = optional(string, "FIRESTORE_NATIVE")
    concurrency_mode          = optional(string, "OPTIMISTIC")
    app_engine_integration_mode = optional(string, "DISABLED")
    point_in_time_recovery_enablement = optional(string, "POINT_IN_TIME_RECOVERY_ENABLED")
    delete_protection_state   = optional(string, "DELETE_PROTECTION_ENABLED")
  })
  default = {}
}

# Storage Configuration
variable "storage_config" {
  description = "Cloud Storage configuration"
  type = object({
    location      = optional(string, "US")
    storage_class = optional(string, "STANDARD")
    versioning   = optional(bool, true)
    lifecycle_rules = optional(list(object({
      action    = string
      condition = map(any)
    })), [])
  })
  default = {}
}

# Security Configuration
variable "security_config" {
  description = "Security-related configuration"
  type = object({
    enable_audit_logs        = optional(bool, true)
    enable_data_loss_prevention = optional(bool, true)
    enable_secret_manager    = optional(bool, true)
    enable_kms              = optional(bool, true)
    key_rotation_period     = optional(string, "7776000s") # 90 days
    backup_retention_days   = optional(number, 30)
  })
  default = {}
}

# Monitoring Configuration
variable "monitoring_config" {
  description = "Monitoring and alerting configuration"
  type = object({
    enable_logging          = optional(bool, true)
    enable_monitoring       = optional(bool, true)
    enable_alerting         = optional(bool, true)
    log_retention_days      = optional(number, 30)
    enable_uptime_checks    = optional(bool, true)
    notification_channels   = optional(list(string), [])
  })
  default = {}
}

# Network Configuration
variable "network_config" {
  description = "Network configuration"
  type = object({
    create_vpc             = optional(bool, false)
    vpc_name              = optional(string, "zk-vault-vpc")
    subnet_cidr           = optional(string, "10.0.0.0/24")
    enable_private_google_access = optional(bool, true)
    enable_flow_logs      = optional(bool, true)
  })
  default = {}
}

# Cost Management
variable "cost_config" {
  description = "Cost management configuration"
  type = object({
    budget_amount          = optional(number, 100)
    budget_alert_threshold = optional(list(number), [0.5, 0.9, 1.0])
    enable_cost_alerts     = optional(bool, true)
  })
  default = {}
}

# Backup Configuration
variable "backup_config" {
  description = "Backup and disaster recovery configuration"
  type = object({
    enable_scheduled_backups = optional(bool, true)
    backup_schedule         = optional(string, "0 2 * * *") # Daily at 2 AM
    backup_retention_days   = optional(number, 30)
    cross_region_backup     = optional(bool, false)
    backup_location         = optional(string, "us-central1")
  })
  default = {}
}

# Feature Flags
variable "feature_flags" {
  description = "Feature flags for enabling/disabling specific features"
  type = object({
    enable_cdn              = optional(bool, true)
    enable_load_balancer    = optional(bool, false)
    enable_custom_domain    = optional(bool, false)
    enable_ssl_certificates = optional(bool, true)
    enable_rate_limiting    = optional(bool, true)
    enable_ddos_protection  = optional(bool, true)
  })
  default = {}
}

# Tags and Labels
variable "labels" {
  description = "Additional labels to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Additional tags to apply to resources that support them"
  type        = map(string)
  default     = {}
}
