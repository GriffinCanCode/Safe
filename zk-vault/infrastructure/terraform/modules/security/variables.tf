# Security Module Variables
# Implements comprehensive security infrastructure following 2025 best practices

variable "project_id" {
  description = "The GCP project ID for security resources"
  type        = string
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "region" {
  description = "The GCP region for security resources"
  type        = string
  default     = "us-central1"
}

variable "organization_id" {
  description = "GCP Organization ID for organization-level security policies"
  type        = string
  default     = null
}

variable "iam_config" {
  description = "IAM configuration for ZK-Vault security"
  type = object({
    # Service accounts for different components
    service_accounts = map(object({
      account_id   = string
      display_name = string
      description  = string
      
      # IAM roles to assign to this service account
      project_roles = optional(list(string), [])
      
      # Custom IAM policy bindings
      custom_roles = optional(list(object({
        role    = string
        members = list(string)
      })), [])
      
      # Workload Identity configuration for GKE
      workload_identity = optional(object({
        enabled           = bool
        kubernetes_namespace = string
        kubernetes_service_account = string
      }))
      
      # Service account key management
      key_management = optional(object({
        create_keys        = bool
        key_algorithm     = string
        private_key_type  = string
        key_rotation_days = number
      }), {
        create_keys        = false
        key_algorithm     = "KEY_ALG_RSA_2048"
        private_key_type  = "TYPE_GOOGLE_CREDENTIALS_FILE"
        key_rotation_days = 90
      })
    }))
    
    # Custom IAM roles for fine-grained access control
    custom_roles = optional(map(object({
      title       = string
      description = string
      permissions = list(string)
      stage       = optional(string, "GA")
    })), {})
    
    # IAM conditions for advanced access control
    conditional_bindings = optional(map(object({
      role    = string
      members = list(string)
      condition = object({
        title       = string
        description = string
        expression  = string
      })
    })), {})
  })
  
  default = {
    service_accounts = {
      app-engine = {
        account_id   = "zk-vault-app-engine"
        display_name = "ZK-Vault Application Engine"
        description  = "Service account for ZK-Vault application runtime"
        project_roles = [
          "roles/cloudsql.client",
          "roles/storage.objectViewer",
          "roles/secretmanager.secretAccessor"
        ]
      }
      
      ci-cd = {
        account_id   = "zk-vault-cicd"
        display_name = "ZK-Vault CI/CD Pipeline"
        description  = "Service account for CI/CD operations"
        project_roles = [
          "roles/cloudbuild.builds.builder",
          "roles/storage.admin",
          "roles/firebase.admin"
        ]
      }
      
      monitoring = {
        account_id   = "zk-vault-monitoring"
        display_name = "ZK-Vault Monitoring"
        description  = "Service account for monitoring and observability"
        project_roles = [
          "roles/monitoring.metricWriter",
          "roles/logging.logWriter",
          "roles/trace.agent"
        ]
      }
    }
  }
}

variable "secrets_config" {
  description = "Secrets management configuration using Google Secret Manager"
  type = object({
    # Enable comprehensive secrets management
    enable_secret_manager = optional(bool, true)
    
    # Application secrets
    application_secrets = optional(map(object({
      secret_id    = string
      description  = optional(string)
      
      # Replication configuration
      replication = optional(object({
        automatic = optional(bool, true)
        user_managed = optional(object({
          replicas = list(object({
            location                = string
            kms_key_name           = optional(string)
            customer_managed_encryption = optional(object({
              kms_key_name = string
            }))
          }))
        }))
      }), {
        automatic = true
      })
      
      # Version management
      version_management = optional(object({
        enabled                = bool
        minimum_version_count  = number
        maximum_version_count  = number
        version_destroy_ttl    = string
      }), {
        enabled                = true
        minimum_version_count  = 1
        maximum_version_count  = 10
        version_destroy_ttl    = "2592000s"  # 30 days
      })
      
      # Access control
      access_control = optional(object({
        members = list(string)
        roles   = list(string)
      }))
    })), {})
    
    # Database credentials
    database_secrets = optional(map(object({
      secret_id        = string
      username_secret  = string
      password_secret  = string
      connection_string = string
    })), {})
    
    # API keys and tokens
    api_secrets = optional(map(object({
      secret_id   = string
      description = string
      
      # Rotation policy
      rotation = optional(object({
        enabled           = bool
        rotation_period   = string
        next_rotation_time = string
      }))
    })), {})
  })
  
  default = {
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
    }
  }
}

variable "kms_config" {
  description = "Key Management Service configuration for encryption at rest"
  type = object({
    # Enable KMS for encryption
    enable_kms = optional(bool, true)
    
    # Key rings for different purposes
    key_rings = optional(map(object({
      name     = string
      location = string
      
      # Crypto keys within this key ring
      crypto_keys = map(object({
        name            = string
        purpose         = optional(string, "ENCRYPT_DECRYPT")
        rotation_period = optional(string, "7776000s")  # 90 days
        
        # Version template
        version_template = optional(object({
          algorithm        = string
          protection_level = optional(string, "SOFTWARE")
        }), {
          algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
        })
        
        # IAM bindings for the key
        iam_bindings = optional(list(object({
          role    = string
          members = list(string)
        })), [])
      }))
    })), {})
    
    # Default key ring for application
    default_key_ring = optional(object({
      name     = string
      location = string
    }), {
      name     = "zk-vault-keyring"
      location = "us-central1"
    })
  })
  
  default = {
    enable_kms = true
    key_rings = {
      application = {
        name     = "zk-vault-app-keys"
        location = "us-central1"
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
        }
      }
    }
  }
}

variable "binary_authorization" {
  description = "Binary Authorization configuration for container security"
  type = object({
    enabled = optional(bool, true)
    
    # Attestors for code signing
    attestors = optional(map(object({
      name        = string
      description = string
      
      # PKIX public key for verification
      public_keys = list(object({
        ascii_armored_pgp_public_key = optional(string)
        comment                      = optional(string)
        
        # Or use PKCS1 key
        pkcs1_public_key = optional(object({
          public_key_pem = string
        }))
      }))
      
      # Note for container analysis
      note_reference = string
    })), {})
    
    # Policy configuration
    policy = optional(object({
      global_policy_evaluation_mode = optional(string, "ENABLE")
      
      # Default admission rule
      default_admission_rule = object({
        evaluation_mode  = string
        enforcement_mode = string
        
        # Require attestations
        require_attestations_by = optional(list(string), [])
      })
      
      # Cluster-specific admission rules
      cluster_admission_rules = optional(map(object({
        cluster          = string
        evaluation_mode  = string
        enforcement_mode = string
        require_attestations_by = optional(list(string), [])
      })), {})
    }))
  })
  
  default = {
    enabled = true
    
    attestors = {
      prod-attestor = {
        name        = "production-attestor"
        description = "Attestor for production deployments"
        public_keys = []
        note_reference = "projects/PROJECT_ID/notes/prod-note"
      }
    }
    
    policy = {
      default_admission_rule = {
        evaluation_mode  = "REQUIRE_ATTESTATION"
        enforcement_mode = "ENFORCED_BLOCK_AND_AUDIT_LOG"
      }
    }
  }
}

variable "security_policies" {
  description = "Organization and project-level security policies"
  type = object({
    # Organization policies
    org_policies = optional(map(object({
      constraint = string
      policy_type = string  # "boolean" or "list"
      
      # For boolean policies
      enforce = optional(bool)
      
      # For list policies
      allow_list_policy = optional(object({
        allowed_values = list(string)
        all_values     = optional(string)
      }))
      
      deny_list_policy = optional(object({
        denied_values = list(string)
        all_values    = optional(string)
      }))
      
      # Inheritance control
      inherit_from_parent = optional(bool, false)
      reset              = optional(bool, false)
    })), {})
    
    # Security scanner configuration
    security_scanner = optional(object({
      enabled = bool
      
      # Web Security Scanner
      web_security_scanner = optional(object({
        enabled = bool
        scan_configs = optional(map(object({
          display_name = string
          starting_urls = list(string)
          scan_run_type = optional(string, "ON_DEMAND")
          managed_scan = optional(bool, true)
          
          # Authentication
          authentication = optional(object({
            google_account = optional(object({
              username = string
              password = string
            }))
            
            custom_account = optional(object({
              username = string
              password = string
              login_url = string
            }))
          }))
          
          # Scan schedule
          schedule = optional(object({
            schedule_time = string
            interval_duration_days = number
          }))
        })), {})
      }))
      
      # Container Analysis
      container_analysis = optional(object({
        enabled = bool
        
        # Vulnerability scanning
        vulnerability_scanning = optional(object({
          enabled = bool
          
          # Scan on push
          scan_on_push = optional(bool, true)
          
          # Vulnerability types to scan for
          vulnerability_types = optional(list(string), [
            "VULNERABILITY",
            "PACKAGE",
            "IMAGE",
            "BUILD"
          ])
        }))
      }))
    }))
  })
  
  default = {
    org_policies = {
      # Restrict VM external IPs
      compute-vmExternalIpAccess = {
        constraint   = "constraints/compute.vmExternalIpAccess"
        policy_type  = "list"
        deny_list_policy = {
          all_values = "DENY"
        }
      }
      
      # Require OS Login
      compute-requireOsLogin = {
        constraint   = "constraints/compute.requireOsLogin"
        policy_type  = "boolean"
        enforce      = true
      }
      
      # Restrict public IP access to Cloud SQL
      sql-restrictPublicIp = {
        constraint   = "constraints/sql.restrictPublicIp"
        policy_type  = "boolean"
        enforce      = true
      }
    }
    
    security_scanner = {
      enabled = true
      
      web_security_scanner = {
        enabled = true
      }
      
      container_analysis = {
        enabled = true
        vulnerability_scanning = {
          enabled = true
        }
      }
    }
  }
}

variable "audit_config" {
  description = "Audit logging and compliance configuration"
  type = object({
    # Cloud Audit Logs
    audit_logs = optional(object({
      enabled = bool
      
      # Audit log configs per service
      audit_log_configs = optional(map(object({
        service = string
        
        # Log types to enable
        audit_log_configs = list(object({
          log_type         = string  # ADMIN_READ, DATA_READ, DATA_WRITE
          exempted_members = optional(list(string), [])
        }))
      })), {})
      
      # Log sink configuration
      log_sinks = optional(map(object({
        name        = string
        destination = string
        filter      = string
        
        # BigQuery options
        bigquery_options = optional(object({
          use_partitioned_tables = bool
        }))
        
        # Exclusions
        exclusions = optional(list(object({
          name        = string
          description = string
          filter      = string
          disabled    = optional(bool, false)
        })), [])
      })), {})
    }))
    
    # Data Loss Prevention
    dlp_config = optional(object({
      enabled = bool
      
      # DLP jobs
      inspect_jobs = optional(map(object({
        display_name = string
        description  = string
        
        # Storage config
        storage_config = object({
          cloud_storage_options = optional(object({
            file_set = object({
              url = string
            })
            bytes_limit_per_file = optional(number)
            file_types          = optional(list(string))
          }))
          
          big_query_options = optional(object({
            table_reference = object({
              project_id = string
              dataset_id = string
              table_id   = string
            })
            rows_limit = optional(number)
          }))
        }
        
        # Inspect config
        inspect_config = object({
          info_types = list(object({
            name = string
          }))
          
          limits = optional(object({
            max_findings_per_item    = optional(number, 100)
            max_findings_per_request = optional(number, 1000)
            max_findings_per_info_type = optional(list(object({
              info_type = object({
                name = string
              })
              max_findings = number
            })), [])
          }))
          
          include_quote = optional(bool, true)
        }
        
        # Actions
        actions = list(object({
          # Save to another location
          save_findings = optional(object({
            output_config = object({
              table = object({
                project_id = string
                dataset_id = string
                table_id   = string
              })
            }
          }))
          
          # Publish to Pub/Sub
          pub_sub = optional(object({
            topic = string
          }))
        }))
      })), {})
    }))
  })
  
  default = {
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
      enabled = false  # Enable based on compliance requirements
    }
  }
}

variable "labels" {
  description = "Labels to apply to security resources"
  type        = map(string)
  default = {
    component  = "security"
    managed-by = "terraform"
  }
}

variable "enable_cost_optimization" {
  description = "Enable cost optimization for security features"
  type        = bool
  default     = true
} 