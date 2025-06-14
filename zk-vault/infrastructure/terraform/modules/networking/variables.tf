# Networking Module Variables
# Implements secure networking infrastructure with 2025 best practices

variable "project_id" {
  description = "The GCP project ID for networking resources"
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
  description = "The GCP region for networking resources"
  type        = string
  default     = "us-central1"
}

variable "network_config" {
  description = "VPC network configuration for ZK-Vault"
  type = object({
    name                            = string
    description                     = optional(string, "ZK-Vault secure network")
    auto_create_subnetworks        = optional(bool, false)
    routing_mode                   = optional(string, "REGIONAL")
    delete_default_routes_on_create = optional(bool, true)
    enable_ula_internal_ipv6       = optional(bool, false)
    internal_ipv6_range            = optional(string)
  })
  default = {
    name = "zk-vault-vpc"
  }
}

variable "subnets" {
  description = "Subnet configurations for different tiers"
  type = map(object({
    ip_cidr_range                    = string
    region                          = string
    description                     = optional(string)
    private_ip_google_access        = optional(bool, true)
    private_ipv6_google_access      = optional(string, "DISABLE_GOOGLE_ACCESS")
    purpose                         = optional(string, "PRIVATE")
    role                           = optional(string)
    stack_type                     = optional(string, "IPV4_ONLY")
    ipv6_access_type               = optional(string)
    
    # Secondary IP ranges for GKE or other services
    secondary_ip_ranges = optional(list(object({
      range_name    = string
      ip_cidr_range = string
    })), [])
    
    # Logging configuration
    log_config = optional(object({
      aggregation_interval = optional(string, "INTERVAL_5_SEC")
      flow_sampling       = optional(number, 0.5)
      metadata           = optional(string, "INCLUDE_ALL_METADATA")
      metadata_fields    = optional(list(string), [])
      filter_expr        = optional(string)
    }))
  }))
  
  default = {
    web = {
      ip_cidr_range = "10.0.1.0/24"
      region       = "us-central1"
      description  = "Web application tier subnet"
    }
    
    app = {
      ip_cidr_range = "10.0.2.0/24"
      region       = "us-central1"
      description  = "Application tier subnet"
    }
    
    data = {
      ip_cidr_range = "10.0.3.0/24"
      region       = "us-central1"
      description  = "Data tier subnet"
    }
    
    management = {
      ip_cidr_range = "10.0.10.0/24"
      region       = "us-central1"
      description  = "Management and monitoring subnet"
    }
  }
}

variable "firewall_rules" {
  description = "Firewall rules for network security"
  type = map(object({
    description               = string
    direction                = string
    disabled                 = optional(bool, false)
    priority                 = optional(number, 1000)
    source_ranges           = optional(list(string), [])
    source_tags             = optional(list(string), [])
    source_service_accounts = optional(list(string), [])
    target_tags             = optional(list(string), [])
    target_service_accounts = optional(list(string), [])
    
    allow = optional(list(object({
      protocol = string
      ports    = optional(list(string), [])
    })), [])
    
    deny = optional(list(object({
      protocol = string
      ports    = optional(list(string), [])
    })), [])
    
    log_config = optional(object({
      metadata = string
    }))
  }))
  
  default = {
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
      description   = "Allow SSH from authorized IP ranges"
      direction     = "INGRESS"
      source_ranges = ["0.0.0.0/0"]  # Restrict this in production
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

variable "nat_config" {
  description = "NAT gateway configuration for private instances"
  type = object({
    create_nat = bool
    name       = optional(string, "zk-vault-nat")
    
    nat_ips = optional(list(object({
      name         = string
      description  = optional(string)
      address_type = optional(string, "EXTERNAL")
      network_tier = optional(string, "PREMIUM")
    })), [])
    
    source_subnetwork_ip_ranges_to_nat = optional(string, "ALL_SUBNETWORKS_ALL_IP_RANGES")
    min_ports_per_vm                   = optional(number, 64)
    max_ports_per_vm                   = optional(number, 65536)
    enable_endpoint_independent_mapping = optional(bool, false)
    
    log_config = optional(object({
      enable = bool
      filter = optional(string, "ERRORS_ONLY")
    }), {
      enable = true
      filter = "ERRORS_ONLY"
    })
  })
  
  default = {
    create_nat = true
  }
}

variable "routes" {
  description = "Custom routes for the VPC"
  type = map(object({
    description        = string
    destination_range  = string
    next_hop_gateway   = optional(string)
    next_hop_instance  = optional(string)
    next_hop_ip        = optional(string)
    next_hop_vpn_tunnel = optional(string)
    priority          = optional(number, 1000)
    tags              = optional(list(string), [])
  }))
  default = {}
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs for security monitoring"
  type        = bool
  default     = true
}

variable "dns_config" {
  description = "Private DNS configuration"
  type = object({
    create_dns_zones = bool
    zones = optional(map(object({
      dns_name    = string
      description = optional(string)
      visibility  = optional(string, "private")
      
      private_visibility_config = optional(object({
        networks = list(object({
          network_url = string
        }))
      }))
      
      forwarding_config = optional(object({
        target_name_servers = list(object({
          ipv4_address    = string
          forwarding_path = optional(string, "default")
        }))
      }))
    })), {})
  })
  
  default = {
    create_dns_zones = false
  }
}

variable "network_security" {
  description = "Advanced network security configurations"
  type = object({
    enable_private_google_access = optional(bool, true)
    enable_network_security_policy = optional(bool, true)
    
    # DDoS protection
    ddos_protection_config = optional(object({
      ddos_protection_type = optional(string, "STANDARD")
    }))
    
    # Network endpoint groups
    enable_neg = optional(bool, false)
    neg_config = optional(map(object({
      description = string
      network_endpoint_type = optional(string, "GCE_VM_IP_PORT")
      default_port = optional(number)
      zone = optional(string)
    })), {})
  })
  
  default = {
    enable_private_google_access = true
    enable_network_security_policy = true
  }
}

variable "labels" {
  description = "Labels to apply to networking resources"
  type        = map(string)
  default = {
    component = "networking"
    managed-by = "terraform"
  }
}

variable "enable_cost_optimization" {
  description = "Enable cost optimization features"
  type        = bool
  default     = true
}

variable "monitoring_config" {
  description = "Network monitoring and observability configuration"
  type = object({
    enable_monitoring = optional(bool, true)
    
    alert_policies = optional(map(object({
      display_name = string
      conditions = list(object({
        display_name = string
        filter      = string
        comparison  = string
        threshold_duration = string
        threshold_value = number
      }))
      notification_channels = optional(list(string), [])
    })), {})
  })
  
  default = {
    enable_monitoring = true
  }
} 