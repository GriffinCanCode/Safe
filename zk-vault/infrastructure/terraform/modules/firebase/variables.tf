# Firebase Module Variables
# Implementing Firebase Terraform support (beta) with 2025 best practices

variable "firebase_config" {
  description = "Firebase configuration for ZK-Vault"
  type = object({
    project_id                = string
    region                   = string
    
    # Web App Configuration
    web_app = optional(object({
      display_name             = string
      deletion_policy         = optional(string, "DELETE")
      sha256_hashes           = optional(list(string), [])
      sha1_hashes            = optional(list(string), [])
    }), {
      display_name = "ZK-Vault Web App"
    })
    
    # Android App Configuration
    android_app = optional(object({
      display_name             = string
      package_name            = string
      sha256_hashes           = optional(list(string), [])
      sha1_hashes            = optional(list(string), [])
    }))
    
    # iOS App Configuration  
    ios_app = optional(object({
      display_name             = string
      bundle_id               = string
      app_store_id           = optional(string)
      team_id                = optional(string)
    }))
    
    # Firestore Configuration
    firestore = optional(object({
      location_id                         = string
      type                               = optional(string, "FIRESTORE_NATIVE")
      concurrency_mode                   = optional(string, "OPTIMISTIC")
      app_engine_integration_mode        = optional(string, "DISABLED")
      point_in_time_recovery_enablement  = optional(string, "POINT_IN_TIME_RECOVERY_ENABLED")
      delete_protection_state            = optional(string, "DELETE_PROTECTION_ENABLED")
      database_id                        = optional(string, "(default)")
    }), {
      location_id = "us-central1"
    })
    
    # Firebase Storage Configuration
    storage = optional(object({
      enable_default_bucket = optional(bool, true)
      custom_buckets = optional(list(object({
        name          = string
        location      = string
        storage_class = optional(string, "STANDARD")
        versioning   = optional(bool, true)
      })), [])
    }), {})
    
    # Authentication Configuration using GCIP (beta)
    authentication = optional(object({
      enable_gcip                = optional(bool, true)
      enable_anonymous          = optional(bool, true)
      enable_email_password     = optional(bool, true)
      enable_phone_auth         = optional(bool, false)
      enable_google_auth        = optional(bool, true)
      enable_microsoft_auth     = optional(bool, false)
      enable_apple_auth         = optional(bool, false)
      enable_mfa               = optional(bool, true)
      session_timeout_minutes  = optional(number, 60)
      authorized_domains       = optional(list(string), [])
    }), {})
    
    # App Check Configuration
    app_check = optional(object({
      enable_app_check         = optional(bool, true)
      web_recaptcha_v3_site_key = optional(string)
      android_play_integrity   = optional(bool, true)
      ios_app_attest          = optional(bool, true)
      ios_device_check        = optional(bool, false)
      debug_tokens            = optional(list(string), [])
    }), {})
    
    # Remote Config
    remote_config = optional(object({
      enable_remote_config = optional(bool, true)
      template_name       = optional(string, "zk-vault-config")
    }), {})
    
    # Analytics
    analytics = optional(object({
      enable_analytics = optional(bool, true)
      data_retention_ttl = optional(string, "MONTHS_14")
      reset_user_data_on_new_activity = optional(bool, false)
    }), {})
    
    # Performance Monitoring
    performance = optional(object({
      enable_performance = optional(bool, true)
    }), {})
    
    # Crashlytics
    crashlytics = optional(object({
      enable_crashlytics = optional(bool, true)
    }), {})
    
    # Realtime Database (if needed)
    realtime_database = optional(object({
      enable_rtdb        = optional(bool, false)
      instance_id       = optional(string)
      region            = optional(string, "us-central1")
      type              = optional(string, "DEFAULT_DATABASE")
    }))
    
    # Firebase Hosting Configuration
    hosting = optional(object({
      enabled = optional(bool, true)
      sites = optional(map(object({
        site_id = string
        app_id  = optional(string)
      })), {
        main = {
          site_id = "zk-vault-main"
        }
      })
    }), {
      enabled = true
      sites = {
        main = {
          site_id = "zk-vault-main"
        }
      }
    })
    
    # Firebase Functions Configuration
    functions = optional(object({
      enabled = optional(bool, true)
      runtime_config = optional(object({
        memory        = optional(string, "256MB")
        timeout       = optional(string, "60s")
        runtime       = optional(string, "nodejs18")
        min_instances = optional(number, 0)
        max_instances = optional(number, 10)
      }), {})
    }), {
      enabled = true
      runtime_config = {
        memory        = "256MB"
        timeout       = "60s"
        runtime       = "nodejs18"
        min_instances = 0
        max_instances = 10
      }
    })
    
    # Monitoring Configuration
    monitoring = optional(object({
      enable_alerts = optional(bool, true)
    }), {
      enable_alerts = true
    })
    
    # Extensions Configuration
    extensions = optional(map(object({
      extension_ref = string
      version      = string
      params       = optional(map(string), {})
    })), {})
    
    # Security Rules
    security_rules = optional(object({
      firestore_rules_file = optional(string, "firestore.rules")
      storage_rules_file   = optional(string, "storage.rules")
      rtdb_rules_file     = optional(string, "database.rules")
    }), {
      firestore_rules_file = "firestore.rules"
      storage_rules_file   = "storage.rules"
    })
  })
}

variable "billing_account" {
  description = "Billing account ID (required for GCIP authentication)"
  type        = string
  default     = null
}

variable "enable_billing" {
  description = "Whether to enable billing for features requiring Blaze plan"
  type        = bool
  default     = true
}

variable "labels" {
  description = "Labels to apply to Firebase resources"
  type        = map(string)
  default = {
    service    = "firebase"
    managed-by = "terraform"
  }
}

variable "oauth_config" {
  description = "OAuth configuration for Firebase Authentication providers"
  type = object({
    google_client_id     = optional(string)
    google_client_secret = optional(string)
    microsoft_client_id  = optional(string)
    microsoft_client_secret = optional(string)
    apple_client_id     = optional(string)
    apple_private_key   = optional(string)
    apple_key_id       = optional(string)
    apple_team_id      = optional(string)
  })
  default   = {}
  sensitive = true
}

variable "environment" {
  description = "Environment name for resource naming"
  type        = string
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
} 