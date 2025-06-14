# Platform Module Outputs
# Following 2025 best practices for exposing platform capabilities

# Project Information
output "project" {
  description = "Platform project information"
  value = {
    id              = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
    name            = var.platform_config.org_id != null ? google_project.platform[0].name : var.platform_config.name
    number          = var.platform_config.org_id != null ? google_project.platform[0].number : null
    environment     = var.platform_config.environment
    region          = var.platform_config.region
    labels          = local.merged_labels
  }
  sensitive = false
}

# Service Account Information for GitOps and Automation
output "platform_service_account" {
  description = "Platform service account for automation and GitOps"
  value = var.security_config.enable_workload_identity ? {
    email      = google_service_account.platform_sa[0].email
    unique_id  = google_service_account.platform_sa[0].unique_id
    name       = google_service_account.platform_sa[0].name
  } : null
  sensitive = false
}

# Monitoring and Observability Outputs
output "monitoring" {
  description = "Platform monitoring and observability configuration"
  value = var.platform_config.enable_monitoring ? {
    workspace_name = google_monitoring_workspace.platform[0].name
    workspace_id   = google_monitoring_workspace.platform[0].name
    project_id     = var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name
    dashboards = {
      cost_optimization = var.ai_ops_config.enable_cost_optimization ? google_monitoring_dashboard.cost_optimization[0].id : null
    }
    alerts = {
      ai_powered_alerts = var.ai_ops_config.enable_anomaly_detection ? google_monitoring_alert_policy.ai_powered_alerts[0].name : null
    }
  } : null
  sensitive = false
}

# Security Configuration Outputs
output "security" {
  description = "Platform security configuration and resources"
  value = {
    binary_authorization_policy = var.security_config.enable_security_scanning ? google_binary_authorization_policy.platform_security[0].name : null
    attestor_name = var.security_config.enable_security_scanning ? google_binary_authorization_attestor.platform_attestor[0].name : null
    workload_identity_enabled = var.security_config.enable_workload_identity
    audit_logging_enabled = var.security_config.enable_audit_logs
    security_policy_level = var.security_config.security_policy_level
  }
  sensitive = false
}

# Logging Configuration
output "logging" {
  description = "Platform logging configuration"
  value = var.platform_config.enable_logging ? {
    bucket_id       = google_logging_project_bucket_config.platform_logs[0].bucket_id
    location        = google_logging_project_bucket_config.platform_logs[0].location
    retention_days  = google_logging_project_bucket_config.platform_logs[0].retention_days
  } : null
  sensitive = false
}

# AI/ML Operations Configuration
output "ai_ops" {
  description = "AI/ML operations configuration and capabilities"
  value = {
    predictive_scaling_enabled = var.ai_ops_config.enable_predictive_scaling
    anomaly_detection_enabled = var.ai_ops_config.enable_anomaly_detection
    auto_remediation_enabled = var.ai_ops_config.enable_auto_remediation
    cost_optimization_enabled = var.ai_ops_config.enable_cost_optimization
    ml_model_region = var.ai_ops_config.ml_model_region
  }
  sensitive = false
}

# GitOps Configuration
output "gitops" {
  description = "GitOps configuration for continuous deployment"
  value = {
    enabled             = var.feature_flags.enable_gitops_cd
    git_repository      = var.gitops_config.git_repository
    git_branch         = var.gitops_config.git_branch
    sync_interval      = var.gitops_config.sync_interval
    auto_sync_enabled  = var.gitops_config.auto_sync_enabled
    prune_enabled      = var.gitops_config.prune_enabled
    self_heal_enabled  = var.gitops_config.self_heal_enabled
  }
  sensitive = false
}

# Environment Configuration
output "environment" {
  description = "Environment-specific configuration and thresholds"
  value = {
    name = var.platform_config.environment
    config = local.current_env_config
    scaling = {
      min_instances = local.current_env_config.min_instances
      max_instances = local.current_env_config.max_instances
      cpu_threshold = local.current_env_config.cpu_threshold
      memory_threshold = local.current_env_config.memory_threshold
    }
  }
  sensitive = false
}

# Feature Flags
output "feature_flags" {
  description = "Platform feature flags status"
  value = var.feature_flags
  sensitive = false
}

# Platform URLs and Endpoints
output "endpoints" {
  description = "Platform endpoints and URLs"
  value = {
    console_url = "https://console.cloud.google.com/welcome?project=${var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name}"
    monitoring_url = var.platform_config.enable_monitoring ? "https://console.cloud.google.com/monitoring?project=${var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name}" : null
    logging_url = var.platform_config.enable_logging ? "https://console.cloud.google.com/logs/query?project=${var.platform_config.org_id != null ? google_project.platform[0].project_id : var.platform_config.name}" : null
  }
  sensitive = false
}

# Resource Summary for Platform Teams
output "platform_summary" {
  description = "High-level platform summary for platform teams"
  value = {
    platform_name = var.platform_config.name
    environment = var.platform_config.environment
    region = var.platform_config.region
    total_apis_enabled = length(local.required_apis)
    security_level = var.security_config.security_policy_level
    ai_features_enabled = [
      for feature, enabled in var.ai_ops_config : feature if enabled
    ]
    platform_features_enabled = [
      for feature, enabled in var.feature_flags : feature if enabled
    ]
    created_at = formatdate("YYYY-MM-DD'T'hh:mm:ssZ", timestamp())
  }
  sensitive = false
}

# API Configuration
output "enabled_apis" {
  description = "List of enabled APIs for this platform"
  value = local.required_apis
  sensitive = false
} 