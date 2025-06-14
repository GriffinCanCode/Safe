# Firebase Module Outputs
# Exposes Firebase service information for application configuration and deployment

# Firebase Project Information
output "project" {
  description = "Firebase project information"
  value = {
    project_id = google_firebase_project.default.project
    number     = data.google_project.default.number
    name       = data.google_project.default.name
  }
}

# Firebase Web App Configuration
output "web_app" {
  description = "Firebase web application configuration"
  value = {
    app_id       = google_firebase_web_app.default.app_id
    display_name = google_firebase_web_app.default.display_name
    api_key_id   = length(google_firebase_web_app.default.api_key_id) > 0 ? google_firebase_web_app.default.api_key_id : null
    
    # Domain names for hosting
    domain_names = var.firebase_config.hosting.enabled ? [
      for site_name, site_config in google_firebase_hosting_site.sites : 
      google_firebase_hosting_site.sites[site_name].default_url
    ] : []
    
    # App configuration for client SDKs
    config = {
      apiKey            = length(google_firebase_web_app.default.api_key_id) > 0 ? google_firebase_web_app.default.api_key_id : ""
      authDomain       = "${var.firebase_config.project_id}.firebaseapp.com"
      projectId        = var.firebase_config.project_id
      storageBucket    = var.firebase_config.storage.enabled ? google_firebase_storage_bucket.default[0].name : ""
      messagingSenderId = data.google_project.default.number
      appId            = google_firebase_web_app.default.app_id
    }
  }
  sensitive = true
}

# Firebase Authentication Configuration
output "authentication" {
  description = "Firebase Authentication configuration"
  value = var.firebase_config.authentication.enabled ? {
    enabled = true
    
    # Provider configurations
    providers = {
      email_password = var.firebase_config.authentication.providers.email_password.enabled
      google        = var.firebase_config.authentication.providers.google.enabled
      anonymous     = var.firebase_config.authentication.providers.anonymous.enabled
    }
    
    # Authentication settings
    settings = {
      authorized_domains = var.firebase_config.authentication.settings.authorized_domains
    }
    
    # Identity platform details
    sign_in = {
      anonymous = {
        enabled = var.firebase_config.authentication.providers.anonymous.enabled
      }
      email = {
        enabled           = var.firebase_config.authentication.providers.email_password.enabled
        password_required = true
      }
      phone = {
        enabled = false
      }
    }
  } : {
    enabled = false
  }
  sensitive = true
}

# Firestore Database Information
output "firestore" {
  description = "Firestore database configuration"
  value = var.firebase_config.firestore.enabled ? {
    name          = google_firestore_database.default[0].name
    location_id   = google_firestore_database.default[0].location_id
    type         = google_firestore_database.default[0].type
    concurrency_mode = google_firestore_database.default[0].concurrency_mode
    app_engine_integration_mode = google_firestore_database.default[0].app_engine_integration_mode
    point_in_time_recovery_enablement = google_firestore_database.default[0].point_in_time_recovery_enablement
    delete_protection_state = google_firestore_database.default[0].delete_protection_state
    
    # Database URL for SDK configuration
    database_url = "https://${var.firebase_config.project_id}-default-rtdb.firebaseio.com/"
  } : null
}

# Firebase Storage Information
output "storage" {
  description = "Firebase Storage configuration"
  value = var.firebase_config.storage.enabled ? {
    bucket_name = google_firebase_storage_bucket.default[0].bucket_id
    bucket_url  = "gs://${google_firebase_storage_bucket.default[0].bucket_id}"
    
    # CORS configuration
    cors_config = var.firebase_config.storage.cors
  } : null
}

# Firebase Hosting Information
output "hosting" {
  description = "Firebase Hosting configuration"
  value = var.firebase_config.hosting.enabled ? {
    sites = {
      for site_name, site in google_firebase_hosting_site.sites : site_name => {
        site_id     = site.site_id
        app_id      = site.app_id
        default_url = site.default_url
        
        # Custom domains (if configured)
        custom_domains = []  # Will be populated when custom domains are added
      }
    }
  } : null
}

# Firebase Functions Configuration
output "functions" {
  description = "Firebase Functions configuration"
  value = var.firebase_config.functions.enabled ? {
    region   = var.firebase_config.region
    runtime  = var.firebase_config.functions.runtime_config.runtime
    
    # Function runtime settings
    runtime_config = {
      memory        = var.firebase_config.functions.runtime_config.memory
      timeout       = var.firebase_config.functions.runtime_config.timeout
      min_instances = var.firebase_config.functions.runtime_config.min_instances
      max_instances = var.firebase_config.functions.runtime_config.max_instances
    }
    
    # Functions URL pattern
    functions_url = "https://${var.firebase_config.region}-${var.firebase_config.project_id}.cloudfunctions.net"
  } : null
}

# Firebase Functions Location
output "functions_location" {
  description = "Firebase Functions deployment location"
  value = var.firebase_config.functions.enabled ? var.firebase_config.region : null
}

# Firebase Functions Runtime
output "functions_runtime" {
  description = "Firebase Functions runtime configuration"
  value = var.firebase_config.functions.enabled ? var.firebase_config.functions.runtime_config.runtime : null
}

# Security Rules Information
output "security_rules" {
  description = "Firebase security rules configuration"
  value = {
    firestore_rules = var.firebase_config.firestore.enabled ? {
      rules_file = "firestore.rules"
      deployed   = true
    } : null
    
    storage_rules = var.firebase_config.storage.enabled ? {
      rules_file = "storage.rules"
      deployed   = true
    } : null
  }
}

# Environment-Specific Configuration
output "environment_config" {
  description = "Environment-specific Firebase configuration"
  value = {
    environment = var.environment
    project_id  = var.firebase_config.project_id
    region      = var.firebase_config.region
    
    # Feature flags per environment
    features = {
      analytics_enabled    = var.environment == "production"
      performance_enabled  = var.environment != "development"
      crashlytics_enabled  = var.environment != "development"
      
      # Development features
      emulators_enabled = var.environment == "development"
      debug_mode       = var.environment == "development"
    }
    
    # Resource configuration per environment
    resource_limits = {
      firestore_operations_per_day = var.environment == "production" ? 10000000 : var.environment == "staging" ? 1000000 : 100000
      storage_gb_limit = var.environment == "production" ? 1000 : var.environment == "staging" ? 100 : 50
      functions_invocations_per_day = var.environment == "production" ? 2000000 : var.environment == "staging" ? 200000 : 20000
    }
  }
}

# Deployment Information
output "deployment_info" {
  description = "Information needed for application deployment"
  value = {
    # Firebase CLI deployment targets
    deployment_targets = {
      hosting = var.firebase_config.hosting.enabled ? [
        for site_name, site_config in var.firebase_config.hosting.sites : site_config.site_id
      ] : []
      
      functions = var.firebase_config.functions.enabled ? ["functions"] : []
      firestore = var.firebase_config.firestore.enabled ? ["firestore"] : []
      storage   = var.firebase_config.storage.enabled ? ["storage"] : []
    }
    
    # Environment variables for deployment
    env_vars = {
      FIREBASE_PROJECT_ID = var.firebase_config.project_id
      FIREBASE_REGION     = var.firebase_config.region
      ENVIRONMENT         = var.environment
    }
    
    # Firebase configuration file content
    firebase_config_json = {
      projects = {
        default = var.firebase_config.project_id
        (var.environment) = var.firebase_config.project_id
      }
      
      targets = var.firebase_config.hosting.enabled ? {
        (var.firebase_config.project_id) = {
          hosting = {
            for site_name, site_config in var.firebase_config.hosting.sites : site_name => [site_config.site_id]
          }
        }
      } : {}
      
      emulators = var.environment == "development" ? {
        auth = {
          port = 9099
        }
        firestore = {
          port = 8080
        }
        functions = {
          port = 5001
        }
        hosting = {
          port = 5000
        }
        storage = {
          port = 9199
        }
        ui = {
          enabled = true
          port    = 4000
        }
      } : {}
    }
  }
}

# Cost Optimization Information
output "cost_optimization" {
  description = "Cost optimization features and recommendations"
  value = {
    # Current tier information
    current_tiers = {
      firebase_plan = "spark"  # Free tier, upgrade to blaze for production
      firestore_tier = var.environment == "production" ? "multi-region" : "regional"
      storage_tier = var.environment == "production" ? "standard" : "nearline"
    }
    
    # Cost optimization recommendations
    recommendations = {
      use_firestore_regional = var.environment != "production"
      enable_firestore_ttl = true
      optimize_storage_rules = true
      use_cdn_for_hosting = var.environment == "production"
      compress_functions = true
    }
    
    # Budget alerts configuration
    budget_alerts = {
      enabled = var.environment == "production"
      thresholds = [50, 80, 90]  # Percentage thresholds
    }
  }
}

# Monitoring and Analytics
output "monitoring" {
  description = "Firebase monitoring and analytics configuration"
  value = {
    # Performance monitoring
    performance_monitoring = {
      enabled = var.environment != "development"
      web_app_id = google_firebase_web_app.default.app_id
    }
    
    # Analytics configuration
    analytics = {
      enabled = var.environment == "production"
      measurement_id = null  # Will be set when Google Analytics is configured
    }
    
    # Error reporting
    crashlytics = {
      enabled = var.environment != "development"
      app_id = google_firebase_web_app.default.app_id
    }
  }
} 