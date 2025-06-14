# ZK-Vault Infrastructure Main Configuration
# Orchestrates all infrastructure modules following 2025 best practices

# Local values for consistent configuration
locals {
  # Common configuration
  common_config = {
    project_id    = var.project_id
    environment   = var.environment
    region        = var.region
    zone          = var.zone
  }
  
  # Common labels applied to all resources
  common_labels = {
    project     = "zk-vault"
    environment = var.environment
    region      = var.region
    managed-by  = "terraform"
    team        = "platform"
    cost-center = "engineering"
    timestamp   = formatdate("YYYY-MM-DD", timestamp())
  }
  
  # Network configuration based on environment
  network_config = {
    development = {
      subnets = {
        web = {
          ip_cidr_range = "10.0.1.0/24"
          region       = var.region
          description  = "Development web tier subnet"
        }
        app = {
          ip_cidr_range = "10.0.2.0/24"
          region       = var.region
          description  = "Development application tier subnet"
        }
        data = {
          ip_cidr_range = "10.0.3.0/24"
          region       = var.region
          description  = "Development data tier subnet"
        }
      }
      
      firewall_rules = {
        allow-internal = {
          description   = "Allow internal communication within VPC"
          direction     = "INGRESS"
          source_ranges = ["10.0.0.0/8"]
          allow = [{
            protocol = "tcp"
            ports    = ["1-65535"]
          }, {
            protocol = "udp"
            ports    = ["1-65535"]
          }, {
            protocol = "icmp"
          }]
        }
        
        allow-ssh = {
          description   = "Allow SSH for development"
          direction     = "INGRESS"
          source_ranges = ["0.0.0.0/0"]
          target_tags   = ["ssh-allowed"]
          allow = [{
            protocol = "tcp"
            ports    = ["22"]
          }]
        }
        
        allow-https = {
          description   = "Allow HTTPS traffic"
          direction     = "INGRESS"
          source_ranges = ["0.0.0.0/0"]
          target_tags   = ["https-server"]
          allow = [{
            protocol = "tcp"
            ports    = ["443"]
          }]
        }
        
        allow-http = {
          description   = "Allow HTTP traffic (redirect to HTTPS)"
          direction     = "INGRESS"
          source_ranges = ["0.0.0.0/0"]
          target_tags   = ["http-server"]
          allow = [{
            protocol = "tcp"
            ports    = ["80"]
          }]
        }
      }
    }
    
    staging = {
      subnets = {
        web = {
          ip_cidr_range = "10.1.1.0/24"
          region       = var.region
          description  = "Staging web tier subnet"
        }
        app = {
          ip_cidr_range = "10.1.2.0/24"
          region       = var.region
          description  = "Staging application tier subnet"
        }
        data = {
          ip_cidr_range = "10.1.3.0/24"
          region       = var.region
          description  = "Staging data tier subnet"
        }
      }
      
      firewall_rules = {
        allow-internal = {
          description   = "Allow internal communication within VPC"
          direction     = "INGRESS"
          source_ranges = ["10.1.0.0/16"]
          allow = [{
            protocol = "tcp"
            ports    = ["1-65535"]
          }, {
            protocol = "udp"
            ports    = ["1-65535"]
          }, {
            protocol = "icmp"
          }]
        }
        
        allow-https = {
          description   = "Allow HTTPS traffic"
          direction     = "INGRESS"
          source_ranges = ["0.0.0.0/0"]
          target_tags   = ["https-server"]
          allow = [{
            protocol = "tcp"
            ports    = ["443"]
          }]
        }
        
        allow-http = {
          description   = "Allow HTTP traffic (redirect to HTTPS)"
          direction     = "INGRESS"
          source_ranges = ["0.0.0.0/0"]
          target_tags   = ["http-server"]
          allow = [{
            protocol = "tcp"
            ports    = ["80"]
          }]
        }
      }
    }
    
    production = {
      subnets = {
        web = {
          ip_cidr_range = "10.2.1.0/24"
          region       = var.region
          description  = "Production web tier subnet"
        }
        app = {
          ip_cidr_range = "10.2.2.0/24"
          region       = var.region
          description  = "Production application tier subnet"
        }
        data = {
          ip_cidr_range = "10.2.3.0/24"
          region       = var.region
          description  = "Production data tier subnet"
        }
        management = {
          ip_cidr_range = "10.2.10.0/24"
          region       = var.region
          description  = "Production management subnet"
        }
      }
      
      firewall_rules = {
        allow-internal = {
          description   = "Allow internal communication within VPC"
          direction     = "INGRESS"
          source_ranges = ["10.2.0.0/16"]
          allow = [{
            protocol = "tcp"
            ports    = ["1-65535"]
          }, {
            protocol = "udp"
            ports    = ["1-65535"]
          }, {
            protocol = "icmp"
          }]
        }
        
        allow-https = {
          description   = "Allow HTTPS traffic"
          direction     = "INGRESS"
          source_ranges = ["0.0.0.0/0"]
          target_tags   = ["https-server"]
          allow = [{
            protocol = "tcp"
            ports    = ["443"]
          }]
        }
        
        deny-all-ingress = {
          description = "Deny all other ingress traffic"
          direction   = "INGRESS"
          priority    = 65534
          source_ranges = ["0.0.0.0/0"]
          deny = [{
            protocol = "all"
          }]
        }
      }
    }
  }
}

# Platform Foundation Module
module "platform" {
  source = "./modules/platform"
  
  platform_config = {
    name            = "zk-vault-${var.environment}"
    environment     = var.environment
    region          = var.region
    zone            = var.zone
    billing_account = var.billing_account
    org_id         = var.organization_id
    folder_id      = var.folder_id
    enable_apis    = true
    enable_monitoring = true
    enable_logging   = true
  }
  
  enable_workload_identity = var.enable_workload_identity
  enable_cost_optimization = var.enable_cost_optimization
  
  labels = local.common_labels
}

# Networking Module
module "networking" {
  source = "./modules/networking"
  
  depends_on = [module.platform]
  
  project_id  = local.common_config.project_id
  environment = local.common_config.environment
  region      = local.common_config.region
  
  network_config = {
    name                            = "zk-vault-vpc"
    description                     = "ZK-Vault ${var.environment} VPC network"
    auto_create_subnetworks        = false
    routing_mode                   = "REGIONAL"
    delete_default_routes_on_create = true
  }
  
  subnets        = local.network_config[var.environment].subnets
  firewall_rules = local.network_config[var.environment].firewall_rules
  
  nat_config = {
    create_nat = true
    name       = "zk-vault-nat"
    nat_ips = var.environment == "production" ? [
      {
        name         = "nat-ip-1"
        description  = "NAT IP for production"
        address_type = "EXTERNAL"
        network_tier = "PREMIUM"
      }
    ] : []
  }
  
  enable_flow_logs = var.environment != "development"
  
  dns_config = {
    create_dns_zones = true
    zones = {
      internal = {
        dns_name    = "${var.environment}.zk-vault.internal."
        description = "Internal DNS zone for ZK-Vault ${var.environment}"
        visibility  = "private"
        
        private_visibility_config = {
          networks = [{
            network_url = module.networking.vpc.self_link
          }]
        }
      }
    }
  }
  
  labels = local.common_labels
}

# Security Module
module "security" {
  source = "./modules/security"
  
  depends_on = [module.platform, module.networking]
  
  project_id      = local.common_config.project_id
  environment     = local.common_config.environment
  region          = local.common_config.region
  organization_id = var.organization_id
  
  iam_config = {
    service_accounts = {
      app-engine = {
        account_id   = "zk-vault-app-engine"
        display_name = "ZK-Vault Application Engine"
        description  = "Service account for ZK-Vault application runtime"
        project_roles = [
          "roles/cloudsql.client",
          "roles/storage.objectViewer",
          "roles/secretmanager.secretAccessor",
          "roles/firebase.developAdmin"
        ]
      }
      
      ci-cd = {
        account_id   = "zk-vault-cicd"
        display_name = "ZK-Vault CI/CD Pipeline"
        description  = "Service account for CI/CD operations"
        project_roles = [
          "roles/cloudbuild.builds.builder",
          "roles/storage.admin",
          "roles/firebase.admin",
          "roles/container.developer"
        ]
      }
      
      monitoring = {
        account_id   = "zk-vault-monitoring"
        display_name = "ZK-Vault Monitoring"
        description  = "Service account for monitoring and observability"
        project_roles = [
          "roles/monitoring.metricWriter",
          "roles/logging.logWriter",
          "roles/trace.agent",
          "roles/cloudsql.viewer"
        ]
      }
      
      web-app = {
        account_id   = "zk-vault-web-app"
        display_name = "ZK-Vault Web Application"
        description  = "Service account for the web application runtime"
        project_roles = [
          "roles/firebase.developAdmin",
          "roles/secretmanager.secretAccessor"
        ]
      }
    }
    
    custom_roles = {
      zk_vault_operator = {
        title       = "ZK-Vault Operator"
        description = "Custom role for ZK-Vault operation tasks"
        permissions = [
          "firebase.projects.get",
          "firebase.projects.update",
          "secretmanager.secrets.get",
          "secretmanager.versions.access",
          "storage.objects.get",
          "storage.objects.create"
        ]
      }
    }
  }
  
  secrets_config = {
    enable_secret_manager = true
    application_secrets = {
      firebase-config = {
        secret_id   = "firebase-config"
        description = "Firebase configuration for ZK-Vault"
      }
      
      encryption-keys = {
        secret_id   = "encryption-keys"
        description = "Application-level encryption keys"
      }
      
      oauth-credentials = {
        secret_id   = "oauth-credentials"
        description = "OAuth provider credentials"
      }
      
      database-credentials = {
        secret_id   = "database-credentials"
        description = "Database connection credentials"
      }
    }
  }
  
  kms_config = {
    enable_kms = true
    key_rings = {
      application = {
        name     = "zk-vault-app-keys"
        location = var.region
        crypto_keys = {
          database = {
            name    = "database-encryption"
            purpose = "ENCRYPT_DECRYPT"
          }
          
          storage = {
            name    = "storage-encryption"
            purpose = "ENCRYPT_DECRYPT"
          }
          
          backup = {
            name    = "backup-encryption"
            purpose = "ENCRYPT_DECRYPT"
          }
          
          application = {
            name    = "application-encryption"
            purpose = "ENCRYPT_DECRYPT"
          }
        }
      }
    }
  }
  
  binary_authorization = {
    enabled = var.environment == "production"
  }
  
  security_policies = {
    org_policies = var.organization_id != null ? {
      compute-vmExternalIpAccess = {
        constraint   = "constraints/compute.vmExternalIpAccess"
        policy_type  = "list"
        deny_list_policy = {
          all_values = "DENY"
        }
      }
      
      compute-requireOsLogin = {
        constraint   = "constraints/compute.requireOsLogin"
        policy_type  = "boolean"
        enforce      = true
      }
      
      sql-restrictPublicIp = {
        constraint   = "constraints/sql.restrictPublicIp"
        policy_type  = "boolean"
        enforce      = true
      }
    } : {}
    
    security_scanner = {
      enabled = var.environment != "development"
      
      web_security_scanner = {
        enabled = var.environment != "development"
      }
      
      container_analysis = {
        enabled = true
        vulnerability_scanning = {
          enabled = true
        }
      }
    }
  }
  
  audit_config = {
    audit_logs = {
      enabled = true
      
      audit_log_configs = {
        allServices = {
          service = "allServices"
          audit_log_configs = [
            {
              log_type = "ADMIN_READ"
            },
            {
              log_type = "DATA_WRITE"
            },
            {
              log_type = "DATA_READ"
            }
          ]
        }
      }
    }
    
    dlp_config = {
      enabled = var.environment == "production"
    }
  }
  
  labels = local.common_labels
}

# Firebase Module
module "firebase" {
  source = "./modules/firebase"
  
  depends_on = [module.platform, module.networking, module.security]
  
  firebase_config = {
    project_id = local.common_config.project_id
    region     = local.common_config.region
    
    web_app = {
      display_name = "ZK-Vault Web App (${var.environment})"
    }
    
    authentication = {
      enabled = true
      
      providers = {
        email_password = {
          enabled = true
        }
        
        google = {
          enabled    = true
          client_id  = var.oauth_client_id
          client_secret = var.oauth_client_secret
        }
        
        anonymous = {
          enabled = var.environment != "production"
        }
      }
      
      settings = {
        authorized_domains = var.environment == "production" ? [
          "zk-vault.com",
          "app.zk-vault.com"
        ] : [
          "${var.environment}.zk-vault.com",
          "localhost"
        ]
      }
    }
    
    firestore = {
      enabled            = true
      location_id        = var.firestore_location
      type              = "FIRESTORE_NATIVE"
      concurrency_mode  = "OPTIMISTIC"
      app_engine_integration_mode = "DISABLED"
      
      # Point-in-time recovery for production
      point_in_time_recovery_enablement = var.environment == "production" ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"
      
      # Delete protection for production
      delete_protection_state = var.environment == "production" ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"
    }
    
    storage = {
      enabled = true
      bucket  = "${var.project_id}-${var.environment}-storage"
      
      cors = [{
        origin          = var.environment == "production" ? ["https://zk-vault.com"] : ["http://localhost:*", "https://*.zk-vault.com"]
        method          = ["GET", "POST", "PUT", "DELETE"]
        response_header = ["*"]
        max_age_seconds = 3600
      }]
    }
    
    hosting = {
      enabled = true
      sites = {
        main = {
          site_id      = "${var.project_id}-${var.environment}"
          app_id       = module.firebase.web_app.app_id
        }
      }
    }
    
    functions = {
      enabled = true
      
      # Runtime configurations per environment
      runtime_config = var.environment == "production" ? {
        memory    = "512MB"
        timeout   = "540s"
        runtime   = "nodejs18"
        min_instances = 1
        max_instances = 100
      } : {
        memory    = "256MB"
        timeout   = "60s"
        runtime   = "nodejs18"
        min_instances = 0
        max_instances = 10
      }
    }
  }
  
  environment = var.environment
  
  labels = local.common_labels
}

# Cost optimization and monitoring
resource "google_billing_budget" "zk_vault_budget" {
  count = var.enable_cost_optimization && var.billing_account != null ? 1 : 0
  
  billing_account = var.billing_account
  display_name    = "ZK-Vault ${var.environment} Budget"
  
  budget_filter {
    projects = ["projects/${var.project_id}"]
    
    # Filter by labels
    labels = local.common_labels
  }
  
  amount {
    specified_amount {
      currency_code = "USD"
      units         = var.environment == "production" ? "500" : var.environment == "staging" ? "100" : "50"
    }
  }
  
  threshold_rules {
    threshold_percent = 0.8
    spend_basis      = "CURRENT_SPEND"
  }
  
  threshold_rules {
    threshold_percent = 1.0
    spend_basis      = "CURRENT_SPEND"
  }
  
  all_updates_rule {
    monitoring_notification_channels = []  # Add notification channels
    disable_default_iam_recipients   = false
  }
} 