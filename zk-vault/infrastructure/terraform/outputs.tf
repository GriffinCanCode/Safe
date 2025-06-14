# ZK-Vault Infrastructure Outputs
# Aggregates outputs from all modules for deployment pipelines and applications

# Environment Information
output "environment_info" {
  description = "Environment-specific configuration information"
  value = {
    project_id  = var.project_id
    environment = var.environment
    region      = var.region
    zone        = var.zone
    timestamp   = timestamp()
  }
}

# Platform Information
output "platform" {
  description = "Platform foundation information"
  value = {
    project     = module.platform.project
    apis        = module.platform.enabled_apis
    service_accounts = module.platform.platform_service_accounts
    workload_identity = module.platform.workload_identity
  }
  sensitive = false
}

# Networking Information
output "networking" {
  description = "Network infrastructure information"
  value = {
    vpc                = module.networking.vpc
    subnets           = module.networking.subnets
    subnet_ids        = module.networking.subnet_ids
    subnet_self_links = module.networking.subnet_self_links
    nat               = module.networking.nat
    dns_zones         = module.networking.dns_zones
    security_policy   = module.networking.security_policy
    environment_info  = module.networking.environment_info
    connection_info   = module.networking.connection_info
  }
  sensitive = false
}

# Security Information
output "security" {
  description = "Security infrastructure information"
  value = {
    service_accounts = {
      for name, sa in module.security.service_accounts : name => {
        email      = sa.email
        name       = sa.name
        unique_id  = sa.unique_id
      }
    }
    
    custom_roles = module.security.custom_roles
    
    kms = {
      key_rings   = module.security.kms_key_rings
      crypto_keys = module.security.crypto_keys
    }
    
    secrets = {
      for name, secret in module.security.secrets : name => {
        secret_id = secret.secret_id
        name      = secret.name
      }
    }
    
    binary_authorization = module.security.binary_authorization
    audit_config        = module.security.audit_config
  }
  sensitive = true
}

# Firebase Information
output "firebase" {
  description = "Firebase services information"
  value = {
    project = {
      project_id = module.firebase.project.project_id
      number     = module.firebase.project.number
    }
    
    web_app = {
      app_id       = module.firebase.web_app.app_id
      api_key_id   = module.firebase.web_app.api_key_id
      domain_names = module.firebase.web_app.domain_names
    }
    
    authentication = module.firebase.authentication
    
    firestore = {
      name          = module.firebase.firestore.name
      location_id   = module.firebase.firestore.location_id
      type         = module.firebase.firestore.type
      app_engine_integration_mode = module.firebase.firestore.app_engine_integration_mode
    }
    
    storage = {
      bucket_name = module.firebase.storage.bucket_name
      bucket_url  = module.firebase.storage.bucket_url
    }
    
    hosting = module.firebase.hosting
    
    functions = {
      location = module.firebase.functions_location
      runtime  = module.firebase.functions_runtime
    }
  }
  sensitive = true
}

# Deployment Configuration for CI/CD
output "deployment_config" {
  description = "Configuration needed for deployment pipelines"
  value = {
    # Service account for CI/CD
    cicd_service_account = {
      email = module.security.service_accounts["ci-cd"].email
      name  = module.security.service_accounts["ci-cd"].name
    }
    
    # Application service account
    app_service_account = {
      email = module.security.service_accounts["web-app"].email
      name  = module.security.service_accounts["web-app"].name
    }
    
    # Firebase configuration
    firebase_config = {
      project_id    = module.firebase.project.project_id
      web_app_id    = module.firebase.web_app.app_id
      api_key_id    = module.firebase.web_app.api_key_id
      auth_domain   = "${module.firebase.project.project_id}.firebaseapp.com"
      storage_bucket = module.firebase.storage.bucket_name
      hosting_site  = module.firebase.hosting.sites.main.site_id
    }
    
    # Network configuration
    network_config = {
      vpc_name           = module.networking.vpc.name
      subnet_ids         = module.networking.subnet_ids
      security_policy_id = module.networking.security_policy != null ? module.networking.security_policy.id : null
    }
    
    # Security configuration
    security_config = {
      kms_key_ring       = module.security.kms_key_rings.application.name
      secrets_project_id = var.project_id
      binary_auth_enabled = module.security.binary_authorization.enabled
    }
    
    # Environment-specific settings
    environment_settings = {
      is_production = var.environment == "production"
      is_staging   = var.environment == "staging"
      is_development = var.environment == "development"
      
      # Resource scaling
      scaling = var.environment == "production" ? {
        min_instances = 1
        max_instances = 100
        memory       = "512MB"
        timeout      = "540s"
      } : var.environment == "staging" ? {
        min_instances = 0
        max_instances = 10
        memory       = "256MB"
        timeout      = "120s"
      } : {
        min_instances = 0
        max_instances = 5
        memory       = "128MB"
        timeout      = "60s"
      }
      
      # Security settings
      security = {
        enable_audit_logs     = var.environment != "development"
        enable_binary_auth    = var.environment == "production"
        enable_vulnerability_scanning = true
        enable_web_security_scanner = var.environment != "development"
      }
      
      # Cost optimization
      cost_optimization = {
        enable_preemptible = var.environment != "production"
        enable_autoscaling = true
        enable_budget_alerts = var.enable_cost_optimization
      }
    }
  }
  sensitive = true
}

# Application Configuration (for application deployment)
output "application_config" {
  description = "Configuration for application runtime"
  value = {
    # Firebase configuration for the web app
    firebase = {
      apiKey            = module.firebase.web_app.api_key_id
      authDomain       = "${module.firebase.project.project_id}.firebaseapp.com"
      projectId        = module.firebase.project.project_id
      storageBucket    = module.firebase.storage.bucket_name
      messagingSenderId = module.firebase.project.number
      appId            = module.firebase.web_app.app_id
    }
    
    # Environment-specific URLs
    urls = {
      api_base_url    = var.environment == "production" ? "https://api.zk-vault.com" : "https://api-${var.environment}.zk-vault.com"
      web_app_url     = var.environment == "production" ? "https://app.zk-vault.com" : "https://app-${var.environment}.zk-vault.com"
      hosting_url     = module.firebase.hosting.sites.main.default_url
      firebase_functions_url = "https://${var.region}-${module.firebase.project.project_id}.cloudfunctions.net"
    }
    
    # Security configuration
    security = {
      allowed_origins = var.environment == "production" ? [
        "https://zk-vault.com",
        "https://app.zk-vault.com"
      ] : [
        "https://${var.environment}.zk-vault.com",
        "https://app-${var.environment}.zk-vault.com",
        "http://localhost:3000",
        "http://localhost:5173"
      ]
      
      oauth_redirect_uris = var.environment == "production" ? [
        "https://app.zk-vault.com/auth/callback"
      ] : [
        "https://app-${var.environment}.zk-vault.com/auth/callback",
        "http://localhost:3000/auth/callback",
        "http://localhost:5173/auth/callback"
      ]
    }
    
    # Feature flags per environment
    features = {
      enable_analytics        = var.environment == "production"
      enable_debug_mode      = var.environment == "development"
      enable_performance_monitoring = var.environment != "development"
      enable_crash_reporting = var.environment != "development"
      enable_a_b_testing     = var.environment == "production"
    }
  }
  sensitive = true
}

# Monitoring and Observability
output "monitoring" {
  description = "Monitoring and observability configuration"
  value = {
    # Monitoring service account
    monitoring_service_account = {
      email = module.security.service_accounts["monitoring"].email
      name  = module.security.service_accounts["monitoring"].name
    }
    
    # Alert policies
    security_alerts = module.security.security_alert_policies
    network_alerts  = module.networking.monitoring_alert_policies
    
    # Log sinks
    audit_log_sinks = module.security.audit_log_sinks
    
    # Metrics and dashboards
    metrics_config = {
      project_id = var.project_id
      region     = var.region
      
      # Custom metrics
      custom_metrics = [
        "zk_vault/user_registrations",
        "zk_vault/password_operations",
        "zk_vault/authentication_attempts",
        "zk_vault/encryption_operations"
      ]
      
      # Dashboard configuration
      dashboards = {
        security_dashboard = {
          title = "ZK-Vault Security Dashboard"
          widgets = [
            "failed_auth_attempts",
            "suspicious_activity",
            "security_alerts"
          ]
        }
        
        performance_dashboard = {
          title = "ZK-Vault Performance Dashboard"
          widgets = [
            "response_times",
            "error_rates",
            "resource_utilization"
          ]
        }
        
        business_dashboard = {
          title = "ZK-Vault Business Metrics"
          widgets = [
            "active_users",
            "password_operations",
            "feature_usage"
          ]
        }
      }
    }
  }
  sensitive = false
}

# Cost Management
output "cost_management" {
  description = "Cost management and optimization information"
  value = {
    budget_name = var.enable_cost_optimization && var.billing_account != null ? google_billing_budget.zk_vault_budget[0].display_name : null
    
    cost_optimization = {
      networking = module.networking.cost_optimization
      platform   = module.platform.cost_optimization
      
      # Recommendations
      recommendations = {
        use_preemptible_instances = var.environment != "production"
        enable_committed_use_discounts = var.environment == "production"
        optimize_storage_classes = true
        use_regional_persistent_disks = var.environment != "production"
      }
    }
    
    # Resource quotas and limits
    resource_limits = {
      max_firebase_functions = var.environment == "production" ? 100 : var.environment == "staging" ? 20 : 10
      max_storage_gb = var.environment == "production" ? 1000 : var.environment == "staging" ? 100 : 50
      max_firestore_operations_per_day = var.environment == "production" ? 10000000 : var.environment == "staging" ? 1000000 : 100000
    }
  }
  sensitive = false
}

# Disaster Recovery
output "disaster_recovery" {
  description = "Disaster recovery and backup configuration"
  value = {
    # Backup configuration
    backup_config = {
      firestore_backup_enabled = var.environment == "production"
      storage_backup_enabled   = var.environment != "development"
      
      # Backup schedules
      backup_schedules = var.environment == "production" ? {
        firestore_daily  = "0 2 * * *"  # 2 AM daily
        firestore_weekly = "0 3 * * 0"  # 3 AM Sunday
        storage_daily    = "0 4 * * *"  # 4 AM daily
      } : {
        firestore_weekly = "0 3 * * 0"  # 3 AM Sunday only
        storage_weekly   = "0 4 * * 0"  # 4 AM Sunday only
      }
      
      # Retention policies
      retention_policies = {
        daily_backups  = "30d"
        weekly_backups = "12w"
        monthly_backups = "12m"
      }
    }
    
    # Multi-region configuration
    multi_region = {
      enabled = var.environment == "production"
      primary_region = var.region
      secondary_regions = var.environment == "production" ? ["us-east1", "europe-west1"] : []
    }
    
    # Recovery objectives
    recovery_objectives = {
      rto = var.environment == "production" ? "4h" : "24h"  # Recovery Time Objective
      rpo = var.environment == "production" ? "1h" : "24h"  # Recovery Point Objective
    }
  }
  sensitive = false
} 