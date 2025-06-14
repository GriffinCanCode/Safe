# Security Module Outputs
# Exposes security infrastructure information for use by other modules and applications

# Service Accounts Information
output "service_accounts" {
  description = "Service accounts created by the security module"
  value = {
    for name, sa in google_service_account.service_accounts : name => {
      email      = sa.email
      name       = sa.name
      unique_id  = sa.unique_id
      account_id = sa.account_id
    }
  }
  sensitive = false
}

# Custom IAM Roles
output "custom_roles" {
  description = "Custom IAM roles created by the security module"
  value = {
    for name, role in google_project_iam_custom_role.custom_roles : name => {
      id          = role.id
      name        = role.name
      title       = role.title
      description = role.description
      permissions = role.permissions
    }
  }
  sensitive = false
}

# KMS Key Rings Information
output "kms_key_rings" {
  description = "KMS key rings information"
  value = var.kms_config.enable_kms ? {
    for name, ring in google_kms_key_ring.key_rings : name => {
      id       = ring.id
      name     = ring.name
      location = ring.location
    }
  } : {}
  sensitive = false
}

# KMS Crypto Keys Information
output "crypto_keys" {
  description = "KMS crypto keys information"
  value = var.kms_config.enable_kms ? {
    for key_name, key in google_kms_crypto_key.crypto_keys : key_name => {
      id              = key.id
      name            = key.name
      purpose         = key.purpose
      rotation_period = key.rotation_period
      key_ring        = key.key_ring
    }
  } : {}
  sensitive = false
}

# Secret Manager Secrets
output "secrets" {
  description = "Secret Manager secrets information"
  value = var.secrets_config.enable_secret_manager ? {
    for name, secret in google_secret_manager_secret.application_secrets : name => {
      id        = secret.id
      name      = secret.name
      secret_id = secret.secret_id
    }
  } : {}
  sensitive = true
}

# Binary Authorization Configuration
output "binary_authorization" {
  description = "Binary Authorization configuration"
  value = {
    enabled = var.binary_authorization.enabled
    policy  = var.binary_authorization.enabled ? {
      id   = google_binary_authorization_policy.policy[0].id
      name = google_binary_authorization_policy.policy[0].name
    } : null
    attestors = var.binary_authorization.enabled ? {
      for name, attestor in google_binary_authorization_attestor.attestors : name => {
        id   = attestor.id
        name = attestor.name
      }
    } : {}
  }
  sensitive = false
}

# Audit Configuration
output "audit_config" {
  description = "Audit logging configuration"
  value = {
    audit_logs_enabled = var.audit_config.audit_logs.enabled
    log_sinks = var.audit_config.audit_logs.enabled ? {
      for name, sink in google_logging_project_sink.audit_sinks : name => {
        id          = sink.id
        name        = sink.name
        destination = sink.destination
      }
    } : {}
    dlp_enabled = var.audit_config.dlp_config.enabled
  }
  sensitive = false
}

# Security Alert Policies
output "security_alert_policies" {
  description = "Security monitoring alert policies"
  value = {
    for name, policy in google_monitoring_alert_policy.security_alerts : name => {
      id           = policy.id
      name         = policy.name
      display_name = policy.display_name
    }
  }
  sensitive = false
}

# Audit Log Sinks
output "audit_log_sinks" {
  description = "Audit log sinks information"
  value = var.audit_config.audit_logs.enabled ? {
    for name, sink in google_logging_project_sink.audit_sinks : name => {
      id               = sink.id
      name             = sink.name
      destination      = sink.destination
      filter           = sink.filter
      writer_identity  = sink.writer_identity
    }
  } : {}
  sensitive = false
}

# Security Scanner Configuration
output "security_scanner" {
  description = "Security scanner configuration"
  value = {
    web_security_scanner_enabled = var.security_policies.security_scanner.enabled && var.security_policies.security_scanner.web_security_scanner.enabled
    container_analysis_enabled   = var.security_policies.security_scanner.enabled && var.security_policies.security_scanner.container_analysis.enabled
    
    scan_configs = var.security_policies.security_scanner.enabled && var.security_policies.security_scanner.web_security_scanner.enabled ? {
      for name, config in google_security_scanner_scan_config.web_scan_configs : name => {
        id            = config.id
        name          = config.name
        display_name  = config.display_name
        starting_urls = config.starting_urls
      }
    } : {}
  }
  sensitive = false
}

# DLP Configuration
output "dlp_config" {
  description = "Data Loss Prevention configuration"
  value = {
    enabled = var.audit_config.dlp_config.enabled
    inspect_templates = var.audit_config.dlp_config.enabled ? {
      for name, template in google_data_loss_prevention_inspect_template.dlp_templates : name => {
        id           = template.id
        name         = template.name
        display_name = template.display_name
      }
    } : {}
  }
  sensitive = false
}

# Security Command Center Source
output "security_command_center" {
  description = "Security Command Center source information"
  value = var.organization_id != null ? {
    source_id = google_scc_source.zk_vault_source[0].id
    name      = google_scc_source.zk_vault_source[0].name
  } : null
  sensitive = false
}

# IAM Workload Identity Information
output "workload_identity" {
  description = "Workload Identity configuration for service accounts"
  value = {
    for sa_name, sa_config in var.iam_config.service_accounts : sa_name => {
      enabled = sa_config.workload_identity != null ? sa_config.workload_identity.enabled : false
      kubernetes_namespace = sa_config.workload_identity != null ? sa_config.workload_identity.kubernetes_namespace : null
      kubernetes_service_account = sa_config.workload_identity != null ? sa_config.workload_identity.kubernetes_service_account : null
    }
    if sa_config.workload_identity != null && sa_config.workload_identity.enabled
  }
  sensitive = false
}

# Security Summary
output "security_summary" {
  description = "Summary of security features enabled"
  value = {
    environment = var.environment
    
    # IAM Security
    iam = {
      service_accounts_count = length(google_service_account.service_accounts)
      custom_roles_count     = length(google_project_iam_custom_role.custom_roles)
      workload_identity_enabled = length([
        for sa_name, sa_config in var.iam_config.service_accounts : sa_name
        if sa_config.workload_identity != null && sa_config.workload_identity.enabled
      ]) > 0
    }
    
    # Encryption
    encryption = {
      kms_enabled = var.kms_config.enable_kms
      key_rings_count = var.kms_config.enable_kms ? length(google_kms_key_ring.key_rings) : 0
      crypto_keys_count = var.kms_config.enable_kms ? length(google_kms_crypto_key.crypto_keys) : 0
    }
    
    # Secrets Management
    secrets = {
      secret_manager_enabled = var.secrets_config.enable_secret_manager
      secrets_count = var.secrets_config.enable_secret_manager ? length(google_secret_manager_secret.application_secrets) : 0
    }
    
    # Container Security
    container_security = {
      binary_authorization_enabled = var.binary_authorization.enabled
      attestors_count = var.binary_authorization.enabled ? length(google_binary_authorization_attestor.attestors) : 0
    }
    
    # Compliance and Auditing
    compliance = {
      audit_logs_enabled = var.audit_config.audit_logs.enabled
      dlp_enabled = var.audit_config.dlp_config.enabled
      log_sinks_count = var.audit_config.audit_logs.enabled ? length(google_logging_project_sink.audit_sinks) : 0
    }
    
    # Security Monitoring
    monitoring = {
      security_alerts_count = length(google_monitoring_alert_policy.security_alerts)
      security_scanner_enabled = var.security_policies.security_scanner.enabled
      scc_enabled = var.organization_id != null
    }
    
    # Organization Policies
    organization_policies = {
      policies_count = var.organization_id != null ? length(google_org_policy_policy.org_policies) : 0
      org_level_security = var.organization_id != null
    }
  }
  sensitive = false
}

# Security Recommendations
output "security_recommendations" {
  description = "Security recommendations based on current configuration"
  value = {
    high_priority = compact([
      var.environment == "production" && !var.binary_authorization.enabled ? "Enable Binary Authorization for production" : null,
      var.environment == "production" && !var.audit_config.dlp_config.enabled ? "Enable DLP for production compliance" : null,
      var.organization_id == null ? "Configure organization-level policies for enhanced security" : null,
    ])
    
    medium_priority = compact([
      var.environment != "development" && !var.audit_config.audit_logs.enabled ? "Enable comprehensive audit logging" : null,
      length(var.secrets_config.application_secrets) == 0 ? "Configure Secret Manager for sensitive data" : null,
    ])
    
    low_priority = compact([
      !var.kms_config.enable_kms ? "Consider enabling KMS for encryption at rest" : null,
      var.environment != "production" && var.binary_authorization.enabled ? "Binary Authorization may be overkill for non-production" : null,
    ])
  }
  sensitive = false
}

# Cost Optimization Information
output "cost_optimization" {
  description = "Security-related cost optimization information"
  value = {
    # KMS costs
    kms_costs = var.kms_config.enable_kms ? {
      key_rings = length(google_kms_key_ring.key_rings)
      crypto_keys = length(google_kms_crypto_key.crypto_keys)
      estimated_monthly_cost = length(google_kms_crypto_key.crypto_keys) * 0.06  # Rough estimate
    } : null
    
    # Secret Manager costs
    secret_manager_costs = var.secrets_config.enable_secret_manager ? {
      secrets_count = length(google_secret_manager_secret.application_secrets)
      estimated_monthly_cost = length(google_secret_manager_secret.application_secrets) * 0.06  # Rough estimate
    } : null
    
    # Recommendations
    cost_recommendations = compact([
      var.environment == "development" && var.binary_authorization.enabled ? "Consider disabling Binary Authorization in development to reduce costs" : null,
      var.environment == "development" && var.audit_config.dlp_config.enabled ? "DLP can be expensive in development environments" : null,
      length(google_kms_crypto_key.crypto_keys) > 10 ? "Consider consolidating KMS keys to reduce costs" : null,
    ])
  }
  sensitive = false
} 