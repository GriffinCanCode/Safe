# Development Environment Configuration
# Optimized for developer productivity and cost efficiency

# Basic configuration
environment = "development"
region      = "us-central1"
zone        = "us-central1-a"

# Enable cost optimization features
enable_cost_optimization = true
enable_workload_identity = true

# Firestore configuration for development
firestore_location = "nam5"

# Development-specific Firebase configuration
oauth_client_id     = "" # Set via environment variables
oauth_client_secret = "" # Set via environment variables

# Development resource limits
resource_limits = {
  max_instances = 5
  memory       = "128MB"
  timeout      = "60s"
}

# Simplified security for development
security_config = {
  enable_binary_authorization = false
  enable_audit_logs          = false
  enable_dlp                 = false
  enable_security_scanner    = false
}

# Development feature flags
feature_flags = {
  enable_emulators    = true
  enable_debug_mode   = true
  enable_hot_reload   = true
  enable_analytics    = false
  enable_monitoring   = false
} 