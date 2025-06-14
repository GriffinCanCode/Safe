# Platform Engineering Module - Main Configuration
# Implements 2025 best practices for modular, scalable infrastructure

# Local values for computed configurations
locals {
  # Merge user labels with platform defaults
  merged_labels = merge(var.labels, {
    environment = var.platform_config.environment
    region      = var.platform_config.region
    created-by  = "platform-module"
    timestamp   = formatdate("YYYY-MM-DD", timestamp())
  })
  
  # Compute required APIs based on enabled features
  required_apis = toset(concat(
    # Core APIs always enabled
    [
      "cloudresourcemanager.googleapis.com",
      "serviceusage.googleapis.com",
      "cloudbilling.googleapis.com",
      "iam.googleapis.com",
    ],
    # Firebase APIs
    var.platform_config.enable_apis ? [
      "firebase.googleapis.com",
      "firestore.googleapis.com",
      "firebasestorage.googleapis.com",
      "identitytoolkit.googleapis.com",
    ] : [],
    # Monitoring APIs
    var.platform_config.enable_monitoring ? [
      "monitoring.googleapis.com",
      "logging.googleapis.com",
      "cloudtrace.googleapis.com",
    ] : [],
    # AI/ML APIs for intelligent operations
    var.ai_ops_config.enable_predictive_scaling || var.ai_ops_config.enable_anomaly_detection ? [
      "aiplatform.googleapis.com",
      "ml.googleapis.com",
    ] : [],
    # Security APIs
    var.security_config.enable_secret_management ? [
      "secretmanager.googleapis.com",
      "cloudkms.googleapis.com",
    ] : []
  ))
  
  # Environment-specific configurations
  environment_configs = {
    development = {
      min_instances = 1
      max_instances = 5
      cpu_threshold = 80
      memory_threshold = 85
    }
    staging = {
      min_instances = 2
      max_instances = 10
      cpu_threshold = 70
      memory_threshold = 80
    }
    production = {
      min_instances = 3
      max_instances = 50
      cpu_threshold = 60
      memory_threshold = 75
    }
  }
  
  current_env_config = local.environment_configs[var.platform_config.environment]
}

# Google Cloud Project
resource "google_project" "platform" {
  count           = var.platform_config.org_id != null ? 1 : 0
  name            = "${var.platform_config.name}-${var.platform_config.environment}"
  project_id      = "${var.platform_config.name}-${var.platform_config.environment}-${random_string.project_suffix.result}"
  org_id          = var.platform_config.org_id
  folder_id       = var.platform_config.folder_id
  billing_account = var.platform_config.billing_account
  
  labels = local.merged_labels
  
  lifecycle {
    prevent_destroy = true
  }
}

# Random suffix for project uniqueness
resource "random_string" "project_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Enable required APIs
resource "google_project_service" "platform_apis" {
  for_each = local.required_apis
  
  project                    = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy        = false
  
  timeouts {
    create = "10m"
    update = "10m"
  }
}

# Platform monitoring and observability
resource "google_monitoring_workspace" "platform" {
  count = var.platform_config.enable_monitoring ? 1 : 0
  
  project       = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  display_name  = "${var.platform_config.name}-${var.platform_config.environment}-monitoring"
  
  depends_on = [google_project_service.platform_apis]
}

# AI-powered monitoring alerts (following 2025 trends)
resource "google_monitoring_alert_policy" "ai_powered_alerts" {
  count = var.ai_ops_config.enable_anomaly_detection ? 1 : 0
  
  project      = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  display_name = "AI-Powered Anomaly Detection"
  description  = "Machine learning-based anomaly detection for platform metrics"
  
  conditions {
    display_name = "AI Anomaly Detection"
    
    condition_threshold {
      filter          = "resource.type=\"gce_instance\""
      duration        = "300s"
      comparison      = "COMPARISON_GREATER_THAN"
      threshold_value = local.current_env_config.cpu_threshold
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  alert_strategy {
    auto_close = "1800s"
    
    notification_rate_limit {
      period = "300s"
    }
  }
  
  depends_on = [google_monitoring_workspace.platform]
}

# Cost optimization using AI (2025 trend)
resource "google_monitoring_dashboard" "cost_optimization" {
  count = var.ai_ops_config.enable_cost_optimization ? 1 : 0
  
  project        = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  dashboard_json = jsonencode({
    displayName = "AI-Powered Cost Optimization Dashboard"
    mosaicLayout = {
      tiles = [
        {
          width = 6
          height = 4
          widget = {
            title = "Resource Utilization Trends"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"gce_instance\""
                    aggregation = {
                      alignmentPeriod = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
  
  depends_on = [google_monitoring_workspace.platform]
}

# Security: IAM bindings for platform access
resource "google_project_iam_binding" "platform_admins" {
  count   = var.security_config.enable_workload_identity ? 1 : 0
  project = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  role    = "roles/owner"
  
  members = [
    "serviceAccount:${google_service_account.platform_sa[0].email}",
  ]
  
  condition {
    title      = "Platform Admin Access"
    description = "Conditional access for platform administration"
    expression = "request.time < timestamp(\"2026-01-01T00:00:00Z\")"
  }
}

# Platform service account for automation
resource "google_service_account" "platform_sa" {
  count = var.security_config.enable_workload_identity ? 1 : 0
  
  project      = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  account_id   = "${var.platform_config.name}-platform-sa"
  display_name = "ZK-Vault Platform Service Account"
  description  = "Service account for platform automation and GitOps"
}

# Workload Identity for GitOps
resource "google_service_account_iam_binding" "workload_identity" {
  count = var.feature_flags.enable_gitops_cd ? 1 : 0
  
  service_account_id = google_service_account.platform_sa[0].name
  role               = "roles/iam.workloadIdentityUser"
  
  members = [
    "serviceAccount:${var.platform_config.name}-gitops@${var.platform_config.name}.iam.gserviceaccount.com",
  ]
}

# Logging configuration for audit and compliance
resource "google_logging_project_bucket_config" "platform_logs" {
  count = var.platform_config.enable_logging ? 1 : 0
  
  project        = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  location       = var.platform_config.region
  bucket_id      = "${var.platform_config.name}-platform-logs"
  retention_days = var.observability_config.retention_days
  description    = "Platform audit and operational logs"
}

# Security scanning configuration
resource "google_binary_authorization_policy" "platform_security" {
  count = var.security_config.enable_security_scanning ? 1 : 0
  
  project = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  
  default_admission_rule {
    evaluation_mode  = "REQUIRE_ATTESTATION"
    enforcement_mode = var.security_config.security_policy_level == "strict" ? "ENFORCED_BLOCK_AND_AUDIT_LOG" : "DRYRUN_AUDIT_LOG_ONLY"
    
    require_attestations_by = [
      google_binary_authorization_attestor.platform_attestor[0].name
    ]
  }
  
  admission_whitelist_patterns {
    name_pattern = "gcr.io/${var.platform_config.name}/*"
  }
}

resource "google_binary_authorization_attestor" "platform_attestor" {
  count = var.security_config.enable_security_scanning ? 1 : 0
  
  project = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  name    = "${var.platform_config.name}-security-attestor"
  
  attestation_authority_note {
    note_reference = google_container_analysis_note.platform_note[0].name
  }
}

resource "google_container_analysis_note" "platform_note" {
  count = var.security_config.enable_security_scanning ? 1 : 0
  
  project = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
  name    = "${var.platform_config.name}-security-note"
  
  attestation_authority {
    hint {
      human_readable_name = "ZK-Vault Security Attestor"
    }
  }
} 