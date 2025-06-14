# Security Module - Main Configuration
# Implements comprehensive security infrastructure following 2025 best practices

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

# Local values for computed configurations
locals {
  # Merge labels with environment-specific ones
  merged_labels = merge(var.labels, {
    environment = var.environment
    project     = var.project_id
    timestamp   = formatdate("YYYY-MM-DD", timestamp())
  })
  
  # Service account emails for reference
  service_account_emails = {
    for name, sa in google_service_account.service_accounts : name => sa.email
  }
}

# Service Accounts
resource "google_service_account" "service_accounts" {
  for_each = var.iam_config.service_accounts
  
  account_id   = "${var.environment}-${each.value.account_id}"
  display_name = "${var.environment} ${each.value.display_name}"
  description  = each.value.description
  project      = var.project_id
}

# IAM bindings for service accounts
resource "google_project_iam_member" "service_account_roles" {
  for_each = {
    for pair in flatten([
      for sa_name, sa_config in var.iam_config.service_accounts : [
        for role in sa_config.project_roles : {
          sa_name = sa_name
          role    = role
          key     = "${sa_name}-${role}"
        }
      ]
    ]) : pair.key => pair
  }
  
  project = var.project_id
  role    = each.value.role
  member  = "serviceAccount:${google_service_account.service_accounts[each.value.sa_name].email}"
}

# Custom IAM roles
resource "google_project_iam_custom_role" "custom_roles" {
  for_each = var.iam_config.custom_roles
  
  role_id     = "${var.environment}_${each.key}"
  title       = each.value.title
  description = each.value.description
  permissions = each.value.permissions
  stage       = each.value.stage
  project     = var.project_id
}

# IAM conditional bindings
resource "google_project_iam_binding" "conditional_bindings" {
  for_each = var.iam_config.conditional_bindings
  
  project = var.project_id
  role    = each.value.role
  members = each.value.members
  
  condition {
    title       = each.value.condition.title
    description = each.value.condition.description
    expression  = each.value.condition.expression
  }
}

# Workload Identity bindings (for GKE)
resource "google_service_account_iam_binding" "workload_identity" {
  for_each = {
    for sa_name, sa_config in var.iam_config.service_accounts : sa_name => sa_config
    if sa_config.workload_identity != null && sa_config.workload_identity.enabled
  }
  
  service_account_id = google_service_account.service_accounts[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  
  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[${each.value.workload_identity.kubernetes_namespace}/${each.value.workload_identity.kubernetes_service_account}]"
  ]
}

# KMS Key Rings
resource "google_kms_key_ring" "key_rings" {
  for_each = var.kms_config.enable_kms ? var.kms_config.key_rings : {}
  
  name     = "${var.environment}-${each.value.name}"
  location = each.value.location
  project  = var.project_id
}

# KMS Crypto Keys
resource "google_kms_crypto_key" "crypto_keys" {
  for_each = var.kms_config.enable_kms ? {
    for key_pair in flatten([
      for ring_name, ring_config in var.kms_config.key_rings : [
        for key_name, key_config in ring_config.crypto_keys : {
          ring_name = ring_name
          key_name  = key_name
          config    = key_config
          full_name = "${ring_name}-${key_name}"
        }
      ]
    ]) : key_pair.full_name => key_pair
  } : {}
  
  name            = "${var.environment}-${each.value.config.name}"
  key_ring        = google_kms_key_ring.key_rings[each.value.ring_name].id
  purpose         = each.value.config.purpose
  rotation_period = each.value.config.rotation_period
  
  version_template {
    algorithm        = each.value.config.version_template.algorithm
    protection_level = each.value.config.version_template.protection_level
  }
  
  lifecycle {
    prevent_destroy = true
  }
}

# KMS key IAM bindings
resource "google_kms_crypto_key_iam_binding" "key_bindings" {
  for_each = var.kms_config.enable_kms ? {
    for binding in flatten([
      for key_pair in flatten([
        for ring_name, ring_config in var.kms_config.key_rings : [
          for key_name, key_config in ring_config.crypto_keys : [
            for binding in key_config.iam_bindings : {
              ring_name = ring_name
              key_name  = key_name
              role      = binding.role
              members   = binding.members
              full_name = "${ring_name}-${key_name}-${binding.role}"
            }
          ]
        ]
      ])
    ]) : binding.full_name => binding
  } : {}
  
  crypto_key_id = google_kms_crypto_key.crypto_keys["${each.value.ring_name}-${each.value.key_name}"].id
  role          = each.value.role
  members       = each.value.members
}

# Secret Manager Secrets
resource "google_secret_manager_secret" "application_secrets" {
  for_each = var.secrets_config.enable_secret_manager ? var.secrets_config.application_secrets : {}
  
  secret_id = "${var.environment}-${each.value.secret_id}"
  project   = var.project_id
  
  labels = local.merged_labels
  
  replication {
    dynamic "auto" {
      for_each = each.value.replication.automatic ? [1] : []
      content {}
    }
    
    dynamic "user_managed" {
      for_each = !each.value.replication.automatic && each.value.replication.user_managed != null ? [each.value.replication.user_managed] : []
      content {
        dynamic "replicas" {
          for_each = user_managed.value.replicas
          content {
            location = replicas.value.location
            
            dynamic "customer_managed_encryption" {
              for_each = replicas.value.customer_managed_encryption != null ? [replicas.value.customer_managed_encryption] : []
              content {
                kms_key_name = customer_managed_encryption.value.kms_key_name
              }
            }
          }
        }
      }
    }
  }
  
  # Version management
  dynamic "topics" {
    for_each = each.value.version_management.enabled ? [1] : []
    content {
      name = "projects/${var.project_id}/topics/secret-manager-notifications"
    }
  }
}

# Secret Manager IAM
resource "google_secret_manager_secret_iam_binding" "secret_access" {
  for_each = {
    for secret_name, secret_config in var.secrets_config.application_secrets : secret_name => secret_config
    if secret_config.access_control != null
  }
  
  project   = var.project_id
  secret_id = google_secret_manager_secret.application_secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  members   = each.value.access_control.members
}

# Binary Authorization Policy
resource "google_binary_authorization_policy" "policy" {
  count = var.binary_authorization.enabled ? 1 : 0
  
  project = var.project_id
  
  global_policy_evaluation_mode = var.binary_authorization.policy.global_policy_evaluation_mode
  
  default_admission_rule {
    evaluation_mode  = var.binary_authorization.policy.default_admission_rule.evaluation_mode
    enforcement_mode = var.binary_authorization.policy.default_admission_rule.enforcement_mode
    
    require_attestations_by = [
      for attestor_name in var.binary_authorization.policy.default_admission_rule.require_attestations_by :
      google_binary_authorization_attestor.attestors[attestor_name].name
    ]
  }
  
  # Cluster-specific admission rules
  dynamic "cluster_admission_rules" {
    for_each = var.binary_authorization.policy.cluster_admission_rules
    content {
      cluster          = cluster_admission_rules.value.cluster
      evaluation_mode  = cluster_admission_rules.value.evaluation_mode
      enforcement_mode = cluster_admission_rules.value.enforcement_mode
      
      require_attestations_by = [
        for attestor_name in cluster_admission_rules.value.require_attestations_by :
        google_binary_authorization_attestor.attestors[attestor_name].name
      ]
    }
  }
}

# Binary Authorization Attestors
resource "google_binary_authorization_attestor" "attestors" {
  for_each = var.binary_authorization.enabled ? var.binary_authorization.attestors : {}
  
  name        = "${var.environment}-${each.value.name}"
  description = each.value.description
  project     = var.project_id
  
  attestation_authority_note {
    note_reference = replace(each.value.note_reference, "PROJECT_ID", var.project_id)
    
    dynamic "public_keys" {
      for_each = each.value.public_keys
      content {
        ascii_armored_pgp_public_key = public_keys.value.ascii_armored_pgp_public_key
        comment                      = public_keys.value.comment
        
        dynamic "pkcs1_public_key" {
          for_each = public_keys.value.pkcs1_public_key != null ? [public_keys.value.pkcs1_public_key] : []
          content {
            public_key_pem = pkcs1_public_key.value.public_key_pem
          }
        }
      }
    }
  }
}

# Container Analysis Notes
resource "google_container_analysis_note" "attestor_notes" {
  for_each = var.binary_authorization.enabled ? var.binary_authorization.attestors : {}
  
  name    = "${var.environment}-${each.key}-note"
  project = var.project_id
  
  attestation_authority {
    hint {
      human_readable_name = "Attestor for ${each.value.name}"
    }
  }
}

# Organization Policies (if organization_id is provided)
resource "google_org_policy_policy" "org_policies" {
  for_each = var.organization_id != null ? var.security_policies.org_policies : {}
  
  name   = "organizations/${var.organization_id}/policies/${each.value.constraint}"
  parent = "organizations/${var.organization_id}"
  
  spec {
    inherit_from_parent = each.value.inherit_from_parent
    reset              = each.value.reset
    
    dynamic "rules" {
      for_each = each.value.policy_type == "boolean" ? [1] : []
      content {
        enforce = each.value.enforce ? "TRUE" : "FALSE"
      }
    }
    
    dynamic "rules" {
      for_each = each.value.policy_type == "list" && each.value.allow_list_policy != null ? [1] : []
      content {
        values {
          allowed_values = each.value.allow_list_policy.allowed_values
          all_values     = each.value.allow_list_policy.all_values
        }
      }
    }
    
    dynamic "rules" {
      for_each = each.value.policy_type == "list" && each.value.deny_list_policy != null ? [1] : []
      content {
        values {
          denied_values = each.value.deny_list_policy.denied_values
          all_values    = each.value.deny_list_policy.all_values
        }
      }
    }
  }
}

# Project-level IAM Audit Config
resource "google_project_iam_audit_config" "audit_logs" {
  for_each = var.audit_config.audit_logs.enabled ? var.audit_config.audit_logs.audit_log_configs : {}
  
  project = var.project_id
  service = each.value.service
  
  dynamic "audit_log_config" {
    for_each = each.value.audit_log_configs
    content {
      log_type         = audit_log_config.value.log_type
      exempted_members = audit_log_config.value.exempted_members
    }
  }
}

# Logging sinks for audit logs
resource "google_logging_project_sink" "audit_sinks" {
  for_each = var.audit_config.audit_logs.enabled ? var.audit_config.audit_logs.log_sinks : {}
  
  name        = "${var.environment}-${each.value.name}"
  destination = each.value.destination
  filter      = each.value.filter
  project     = var.project_id
  
  unique_writer_identity = true
  
  dynamic "bigquery_options" {
    for_each = each.value.bigquery_options != null ? [each.value.bigquery_options] : []
    content {
      use_partitioned_tables = bigquery_options.value.use_partitioned_tables
    }
  }
  
  dynamic "exclusions" {
    for_each = each.value.exclusions
    content {
      name        = exclusions.value.name
      description = exclusions.value.description
      filter      = exclusions.value.filter
      disabled    = exclusions.value.disabled
    }
  }
}

# Security Command Center (if available)
resource "google_scc_source" "zk_vault_source" {
  count = var.organization_id != null ? 1 : 0
  
  display_name = "${var.environment}-zk-vault-security-source"
  description  = "Security findings source for ZK-Vault application"
  organization = var.organization_id
}

# Web Security Scanner configs
resource "google_security_scanner_scan_config" "web_scan_configs" {
  for_each = var.security_policies.security_scanner.enabled && var.security_policies.security_scanner.web_security_scanner.enabled ? var.security_policies.security_scanner.web_security_scanner.scan_configs : {}
  
  display_name   = "${var.environment}-${each.value.display_name}"
  starting_urls  = each.value.starting_urls
  scan_run_type  = each.value.scan_run_type
  managed_scan   = each.value.managed_scan
  project        = var.project_id
  
  dynamic "authentication" {
    for_each = each.value.authentication != null ? [each.value.authentication] : []
    content {
      dynamic "google_account" {
        for_each = authentication.value.google_account != null ? [authentication.value.google_account] : []
        content {
          username = google_account.value.username
          password = google_account.value.password
        }
      }
      
      dynamic "custom_account" {
        for_each = authentication.value.custom_account != null ? [authentication.value.custom_account] : []
        content {
          username  = custom_account.value.username
          password  = custom_account.value.password
          login_url = custom_account.value.login_url
        }
      }
    }
  }
  
  dynamic "schedule" {
    for_each = each.value.schedule != null ? [each.value.schedule] : []
    content {
      schedule_time           = schedule.value.schedule_time
      interval_duration_days  = schedule.value.interval_duration_days
    }
  }
}

# DLP Inspect Templates
resource "google_data_loss_prevention_inspect_template" "dlp_templates" {
  for_each = var.audit_config.dlp_config.enabled ? var.audit_config.dlp_config.inspect_jobs : {}
  
  parent       = "projects/${var.project_id}"
  description  = each.value.description
  display_name = "${var.environment}-${each.value.display_name}"
  
  inspect_config {
    dynamic "info_types" {
      for_each = each.value.inspect_config.info_types
      content {
        name = info_types.value.name
      }
    }
    
    dynamic "limits" {
      for_each = each.value.inspect_config.limits != null ? [each.value.inspect_config.limits] : []
      content {
        max_findings_per_item    = limits.value.max_findings_per_item
        max_findings_per_request = limits.value.max_findings_per_request
        
        dynamic "max_findings_per_info_type" {
          for_each = limits.value.max_findings_per_info_type
          content {
            info_type {
              name = max_findings_per_info_type.value.info_type.name
            }
            max_findings = max_findings_per_info_type.value.max_findings
          }
        }
      }
    }
    
    include_quote = each.value.inspect_config.include_quote
  }
}

# Security monitoring alerts
resource "google_monitoring_alert_policy" "security_alerts" {
  for_each = {
    unauthorized_access = {
      display_name = "Unauthorized API Access Attempts"
      filter      = "resource.type=\"gce_instance\" AND jsonPayload.severity=\"ERROR\" AND jsonPayload.message=~\"unauthorized\""
    }
    
    failed_authentication = {
      display_name = "Failed Authentication Attempts"
      filter      = "resource.type=\"firebase_namespace\" AND jsonPayload.eventType=\"providers/firebase.auth/eventTypes/user.create\""
    }
    
    suspicious_activity = {
      display_name = "Suspicious Network Activity"
      filter      = "resource.type=\"gce_subnetwork\" AND jsonPayload.connection.dest_port=(22 OR 3389 OR 1433 OR 3306)"
    }
  }
  
  display_name = "${var.environment}-${each.value.display_name}"
  combiner     = "OR"
  project      = var.project_id
  
  conditions {
    display_name = "Security event detected"
    
    condition_threshold {
      filter          = each.value.filter
      duration        = "300s"
      comparison      = "COMPARISON_GREATER_THAN"
      threshold_value = 5
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  alert_strategy {
    auto_close = "1800s"
  }
  
  notification_channels = []  # Add notification channels as needed
} 