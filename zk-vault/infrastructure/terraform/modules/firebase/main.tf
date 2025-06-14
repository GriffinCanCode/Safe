# Firebase Module - Main Configuration
# Implementing Firebase Terraform support (beta) with 2025 best practices

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
}

# Data sources for project information
data "google_project" "default" {
  project_id = var.firebase_config.project_id
}

# Local values for computed configurations
locals {
  # Merge labels with Firebase-specific ones
  firebase_labels = merge(var.labels, {
    environment = var.environment
    firebase    = "enabled"
    timestamp   = formatdate("YYYY-MM-DD", timestamp())
  })
  
  # Required Firebase APIs
  firebase_apis = toset([
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "firebasestorage.googleapis.com",
    "firebaseappcheck.googleapis.com",
    "firebaseremoteconfig.googleapis.com",
    "firebaseml.googleapis.com",
    # For GCIP authentication
    var.firebase_config.authentication.enable_gcip ? "identitytoolkit.googleapis.com" : null,
    # For Realtime Database
    var.firebase_config.realtime_database != null && var.firebase_config.realtime_database.enable_rtdb ? "firebasedatabase.googleapis.com" : null,
  ])
  
  # Filter out null values
  enabled_apis = toset([for api in local.firebase_apis : api if api != null])
  
  # Default authorized domains
  default_domains = [
    "${var.firebase_config.project_id}.firebaseapp.com",
    "${var.firebase_config.project_id}.web.app",
    "localhost",
  ]
  
  authorized_domains = concat(
    local.default_domains,
    var.firebase_config.authentication.authorized_domains
  )
}

# Enable Firebase APIs
resource "google_project_service" "firebase_apis" {
  for_each = local.enabled_apis
  
  project                    = var.firebase_config.project_id
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy        = false
  
  timeouts {
    create = "10m"
    update = "10m"
  }
}

# Enable Firebase services for the project (using beta provider)
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.firebase_config.project_id
  
  depends_on = [google_project_service.firebase_apis]
  
  lifecycle {
    prevent_destroy = true
  }
}

# Firebase Web App
resource "google_firebase_web_app" "default" {
  provider = google-beta
  
  project          = google_firebase_project.default.project
  display_name     = var.firebase_config.web_app.display_name
  deletion_policy  = var.firebase_config.web_app.deletion_policy
  
  depends_on = [google_firebase_project.default]
}

# Firebase Android App (if configured)
resource "google_firebase_android_app" "default" {
  count    = var.firebase_config.android_app != null ? 1 : 0
  provider = google-beta
  
  project        = google_firebase_project.default.project
  display_name   = var.firebase_config.android_app.display_name
  package_name   = var.firebase_config.android_app.package_name
  sha256_hashes  = var.firebase_config.android_app.sha256_hashes
  sha1_hashes    = var.firebase_config.android_app.sha1_hashes
  
  depends_on = [google_firebase_project.default]
}

# Firebase iOS App (if configured)
resource "google_firebase_apple_app" "default" {
  count    = var.firebase_config.ios_app != null ? 1 : 0
  provider = google-beta
  
  project        = google_firebase_project.default.project
  display_name   = var.firebase_config.ios_app.display_name
  bundle_id      = var.firebase_config.ios_app.bundle_id
  app_store_id   = var.firebase_config.ios_app.app_store_id
  team_id        = var.firebase_config.ios_app.team_id
  
  depends_on = [google_firebase_project.default]
}

# Firestore Database
resource "google_firestore_database" "default" {
  provider = google-beta
  
  project                             = google_firebase_project.default.project
  name                               = var.firebase_config.firestore.database_id
  location_id                        = var.firebase_config.firestore.location_id
  type                               = var.firebase_config.firestore.type
  concurrency_mode                   = var.firebase_config.firestore.concurrency_mode
  app_engine_integration_mode        = var.firebase_config.firestore.app_engine_integration_mode
  point_in_time_recovery_enablement  = var.firebase_config.firestore.point_in_time_recovery_enablement
  delete_protection_state            = var.firebase_config.firestore.delete_protection_state
  
  depends_on = [google_project_service.firebase_apis]
  
  lifecycle {
    prevent_destroy = true
  }
}

# Firebase Storage - Default Bucket
resource "google_firebase_storage_bucket" "default" {
  count    = var.firebase_config.storage.enable_default_bucket ? 1 : 0
  provider = google-beta
  
  project   = google_firebase_project.default.project
  bucket_id = "${var.firebase_config.project_id}.appspot.com"
  
  depends_on = [google_firestore_database.default]
}

# Firebase Storage - Custom Buckets
resource "google_storage_bucket" "custom_buckets" {
  for_each = {
    for bucket in var.firebase_config.storage.custom_buckets : bucket.name => bucket
  }
  
  provider = google-beta
  
  project       = google_firebase_project.default.project
  name          = each.value.name
  location      = each.value.location
  storage_class = each.value.storage_class
  
  versioning {
    enabled = each.value.versioning
  }
  
  labels = local.firebase_labels
  
  lifecycle {
    prevent_destroy = true
  }
}

resource "google_firebase_storage_bucket" "custom_firebase_buckets" {
  for_each = {
    for bucket in var.firebase_config.storage.custom_buckets : bucket.name => bucket
  }
  
  provider = google-beta
  
  project   = google_firebase_project.default.project
  bucket_id = google_storage_bucket.custom_buckets[each.key].name
  
  depends_on = [google_storage_bucket.custom_buckets]
}

# Firebase Authentication using GCIP (beta support)
resource "google_identity_platform_config" "auth" {
  count    = var.firebase_config.authentication.enable_gcip ? 1 : 0
  provider = google-beta
  
  project = google_firebase_project.default.project
  
  # Auto-delete anonymous users
  autodelete_anonymous_users = true
  
  # Sign-in configuration
  sign_in {
    allow_duplicate_emails = false
    
    dynamic "anonymous" {
      for_each = var.firebase_config.authentication.enable_anonymous ? [1] : []
      content {
        enabled = true
      }
    }
    
    dynamic "email" {
      for_each = var.firebase_config.authentication.enable_email_password ? [1] : []
      content {
        enabled           = true
        password_required = true
      }
    }
    
    dynamic "phone_number" {
      for_each = var.firebase_config.authentication.enable_phone_auth ? [1] : []
      content {
        enabled = true
        test_phone_numbers = {}
      }
    }
  }
  
  # Multi-factor authentication
  dynamic "mfa" {
    for_each = var.firebase_config.authentication.enable_mfa ? [1] : []
    content {
      state = "ENABLED"
      enabled_providers = ["PHONE_SMS"]
    }
  }
  
  # Authorized domains
  authorized_domains = local.authorized_domains
  
  depends_on = [google_project_service.firebase_apis]
}

# Google OAuth Provider (if configured)
resource "google_identity_platform_default_supported_idp_config" "google" {
  count    = var.firebase_config.authentication.enable_google_auth && var.oauth_config.google_client_id != null ? 1 : 0
  provider = google-beta
  
  project       = google_firebase_project.default.project
  idp_id        = "google.com"
  client_id     = var.oauth_config.google_client_id
  client_secret = var.oauth_config.google_client_secret
  enabled       = true
  
  depends_on = [google_identity_platform_config.auth]
}

# Microsoft OAuth Provider (if configured)
resource "google_identity_platform_oauth_idp_config" "microsoft" {
  count    = var.firebase_config.authentication.enable_microsoft_auth && var.oauth_config.microsoft_client_id != null ? 1 : 0
  provider = google-beta
  
  project       = google_firebase_project.default.project
  name          = "microsoft.com"
  display_name  = "Microsoft"
  client_id     = var.oauth_config.microsoft_client_id
  client_secret = var.oauth_config.microsoft_client_secret
  enabled       = true
  
  depends_on = [google_identity_platform_config.auth]
}

# Firebase App Check Configuration
resource "google_firebase_app_check_service_config" "default" {
  count    = var.firebase_config.app_check.enable_app_check ? 1 : 0
  provider = google-beta
  
  project                = google_firebase_project.default.project
  service_id            = "firestore.googleapis.com"
  enforcement_mode      = var.environment == "production" ? "ENFORCED" : "UNENFORCED"
  
  depends_on = [google_firestore_database.default]
}

# App Check reCAPTCHA v3 (Web)
resource "google_firebase_app_check_recaptcha_v3_config" "web" {
  count    = var.firebase_config.app_check.enable_app_check && var.firebase_config.app_check.web_recaptcha_v3_site_key != null ? 1 : 0
  provider = google-beta
  
  project   = google_firebase_project.default.project
  app_id    = google_firebase_web_app.default.app_id
  site_key  = var.firebase_config.app_check.web_recaptcha_v3_site_key
  token_ttl = "7200s"
  
  depends_on = [google_firebase_web_app.default]
}

# App Check Play Integrity (Android)
resource "google_firebase_app_check_play_integrity_config" "android" {
  count    = var.firebase_config.app_check.enable_app_check && var.firebase_config.app_check.android_play_integrity && var.firebase_config.android_app != null ? 1 : 0
  provider = google-beta
  
  project   = google_firebase_project.default.project
  app_id    = google_firebase_android_app.default[0].app_id
  token_ttl = "7200s"
  
  depends_on = [google_firebase_android_app.default]
}

# App Check App Attest (iOS)
resource "google_firebase_app_check_app_attest_config" "ios" {
  count    = var.firebase_config.app_check.enable_app_check && var.firebase_config.app_check.ios_app_attest && var.firebase_config.ios_app != null ? 1 : 0
  provider = google-beta
  
  project   = google_firebase_project.default.project
  app_id    = google_firebase_apple_app.default[0].app_id
  token_ttl = "7200s"
  
  depends_on = [google_firebase_apple_app.default]
}

# Firestore Security Rules
resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  
  project = google_firebase_project.default.project
  
  source {
    files {
      name    = "firestore.rules"
      content = file("${path.cwd}/${var.firebase_config.security_rules.firestore_rules_file}")
    }
  }
  
  depends_on = [google_firestore_database.default]
  
  lifecycle {
    create_before_destroy = true
  }
}

resource "google_firebaserules_release" "firestore" {
  provider = google-beta
  
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
  project      = google_firebase_project.default.project
  
  lifecycle {
    replace_triggered_by = [google_firebaserules_ruleset.firestore]
  }
}

# Storage Security Rules (for default bucket)
resource "google_firebaserules_ruleset" "storage" {
  count    = var.firebase_config.storage.enable_default_bucket ? 1 : 0
  provider = google-beta
  
  project = google_firebase_project.default.project
  
  source {
    files {
      name    = "storage.rules"
      content = file("${path.cwd}/${var.firebase_config.security_rules.storage_rules_file}")
    }
  }
  
  depends_on = [google_firebase_storage_bucket.default]
  
  lifecycle {
    create_before_destroy = true
  }
}

resource "google_firebaserules_release" "storage" {
  count    = var.firebase_config.storage.enable_default_bucket ? 1 : 0
  provider = google-beta
  
  name         = "firebase.storage/${google_firebase_storage_bucket.default[0].bucket_id}"
  ruleset_name = google_firebaserules_ruleset.storage[0].name
  project      = google_firebase_project.default.project
  
  lifecycle {
    replace_triggered_by = [google_firebaserules_ruleset.storage]
  }
}

# Realtime Database (if enabled)
resource "google_firebase_database_instance" "default" {
  count    = var.firebase_config.realtime_database != null && var.firebase_config.realtime_database.enable_rtdb ? 1 : 0
  provider = google-beta
  
  project     = google_firebase_project.default.project
  region      = var.firebase_config.realtime_database.region
  instance_id = var.firebase_config.realtime_database.instance_id != null ? var.firebase_config.realtime_database.instance_id : "${var.firebase_config.project_id}-default-rtdb"
  type        = var.firebase_config.realtime_database.type
  
  depends_on = [google_project_service.firebase_apis]
  
  lifecycle {
    prevent_destroy = true
  }
}

# Firebase Hosting Sites
resource "google_firebase_hosting_site" "sites" {
  for_each = var.firebase_config.hosting.enabled ? var.firebase_config.hosting.sites : {}
  provider = google-beta
  
  project = google_firebase_project.default.project
  site_id = each.value.site_id
  app_id  = each.value.app_id != null ? each.value.app_id : google_firebase_web_app.default.app_id
  
  depends_on = [google_firebase_project.default]
}

# Firebase Project Location (required for some services)
resource "google_firebase_project_location" "default" {
  provider = google-beta
  
  project     = google_firebase_project.default.project
  location_id = var.firebase_config.region
}

# Monitoring and alerting for Firebase services
resource "google_monitoring_alert_policy" "firebase_alerts" {
  for_each = var.firebase_config.monitoring != null && var.firebase_config.monitoring.enable_alerts ? {
    firestore_errors = {
      display_name = "Firestore Error Rate"
      filter       = "resource.type=\"firestore_database\" AND metric.type=\"firestore.googleapis.com/api/request_count\""
      comparison   = "COMPARISON_GREATER_THAN"
      threshold    = 10
    }
    
    storage_errors = {
      display_name = "Storage Error Rate"  
      filter       = "resource.type=\"gcs_bucket\" AND metric.type=\"storage.googleapis.com/api/request_count\""
      comparison   = "COMPARISON_GREATER_THAN"
      threshold    = 5
    }
    
    auth_failures = {
      display_name = "Authentication Failures"
      filter       = "resource.type=\"identity_provider\" AND metric.type=\"firebase.googleapis.com/auth/sign_in_count\""
      comparison   = "COMPARISON_GREATER_THAN"
      threshold    = 20
    }
  } : {}
  
  display_name = "${var.environment}-firebase-${each.value.display_name}"
  combiner     = "OR"
  project      = var.firebase_config.project_id
  
  conditions {
    display_name = each.value.display_name
    
    condition_threshold {
      filter          = each.value.filter
      duration        = "300s"
      comparison      = each.value.comparison
      threshold_value = each.value.threshold
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  alert_strategy {
    auto_close = "1800s"
  }
} 