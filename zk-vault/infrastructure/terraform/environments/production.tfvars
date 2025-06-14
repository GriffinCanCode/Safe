# Production Environment Configuration
# Optimized for security, performance, and high availability

# Basic configuration
environment = "production"
region      = "us-central1"
zone        = "us-central1-a"

# Enable all production features
enable_cost_optimization = true
enable_workload_identity = true

# Firestore configuration for production
firestore_location = "nam5"

# Production-specific Firebase configuration
oauth_client_id     = "" # Set via environment variables
oauth_client_secret = "" # Set via environment variables

# Production resource limits
resource_limits = {
  max_instances = 100
  memory       = "512MB"
  timeout      = "540s"
}

# Maximum security for production
security_config = {
  enable_binary_authorization = true
  enable_audit_logs          = true
  enable_dlp                 = true
  enable_security_scanner    = true
  enable_vulnerability_scanning = true
  enable_web_security_scanner = true
}

# Production feature flags
feature_flags = {
  enable_emulators    = false
  enable_debug_mode   = false
  enable_hot_reload   = false
  enable_analytics    = true
  enable_monitoring   = true
  enable_performance_monitoring = true
  enable_crashlytics  = true
  enable_a_b_testing  = true
}

# Production domain configuration
domains = {
  primary_domain = "zk-vault.com"
  app_domain     = "app.zk-vault.com"
  api_domain     = "api.zk-vault.com"
}

# High availability configuration
ha_config = {
  enable_multi_region = true
  backup_regions     = ["us-east1", "europe-west1"]
  enable_failover    = true
}

# Production monitoring and alerting
monitoring_config = {
  enable_uptime_checks = true
  enable_sla_monitoring = true
  enable_error_reporting = true
  alert_notification_channels = [] # Add notification channels
} 