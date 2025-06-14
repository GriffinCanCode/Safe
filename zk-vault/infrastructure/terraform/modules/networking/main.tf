# Networking Module - Main Configuration
# Implements secure, scalable networking infrastructure following 2025 best practices

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
  
  # Compute subnet names with environment prefix
  subnet_names = {
    for name, config in var.subnets : name => "${var.environment}-${name}"
  }
  
  # Generate firewall rule names with environment prefix
  firewall_names = {
    for name, rule in var.firewall_rules : name => "${var.environment}-${name}"
  }
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                            = "${var.environment}-${var.network_config.name}"
  description                     = var.network_config.description
  auto_create_subnetworks        = var.network_config.auto_create_subnetworks
  routing_mode                   = var.network_config.routing_mode
  delete_default_routes_on_create = var.network_config.delete_default_routes_on_create
  enable_ula_internal_ipv6       = var.network_config.enable_ula_internal_ipv6
  internal_ipv6_range            = var.network_config.internal_ipv6_range
  
  project = var.project_id
  
  timeouts {
    create = "20m"
    update = "20m"
    delete = "20m"
  }
}

# Subnets
resource "google_compute_subnetwork" "subnets" {
  for_each = var.subnets
  
  name                     = local.subnet_names[each.key]
  ip_cidr_range           = each.value.ip_cidr_range
  region                  = each.value.region
  network                 = google_compute_network.vpc.id
  description             = each.value.description
  private_ip_google_access = each.value.private_ip_google_access
  private_ipv6_google_access = each.value.private_ipv6_google_access
  purpose                 = each.value.purpose
  role                   = each.value.role
  stack_type             = each.value.stack_type
  ipv6_access_type       = each.value.ipv6_access_type
  
  project = var.project_id
  
  # Secondary IP ranges for GKE pods and services
  dynamic "secondary_ip_range" {
    for_each = each.value.secondary_ip_ranges
    content {
      range_name    = secondary_ip_range.value.range_name
      ip_cidr_range = secondary_ip_range.value.ip_cidr_range
    }
  }
  
  # VPC flow logs for security monitoring
  dynamic "log_config" {
    for_each = var.enable_flow_logs && each.value.log_config != null ? [each.value.log_config] : []
    content {
      aggregation_interval = log_config.value.aggregation_interval
      flow_sampling       = log_config.value.flow_sampling
      metadata           = log_config.value.metadata
      metadata_fields    = log_config.value.metadata_fields
      filter_expr        = log_config.value.filter_expr
    }
  }
  
  depends_on = [google_compute_network.vpc]
}

# Firewall Rules
resource "google_compute_firewall" "rules" {
  for_each = var.firewall_rules
  
  name        = local.firewall_names[each.key]
  network     = google_compute_network.vpc.name
  description = each.value.description
  direction   = each.value.direction
  disabled    = each.value.disabled
  priority    = each.value.priority
  
  source_ranges           = each.value.source_ranges
  source_tags             = each.value.source_tags
  source_service_accounts = each.value.source_service_accounts
  target_tags             = each.value.target_tags
  target_service_accounts = each.value.target_service_accounts
  
  project = var.project_id
  
  dynamic "allow" {
    for_each = each.value.allow
    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }
  
  dynamic "deny" {
    for_each = each.value.deny
    content {
      protocol = deny.value.protocol
      ports    = deny.value.ports
    }
  }
  
  dynamic "log_config" {
    for_each = each.value.log_config != null ? [each.value.log_config] : []
    content {
      metadata = log_config.value.metadata
    }
  }
  
  depends_on = [google_compute_network.vpc]
}

# Cloud Router for NAT
resource "google_compute_router" "router" {
  count = var.nat_config.create_nat ? 1 : 0
  
  name    = "${var.environment}-${var.nat_config.name}-router"
  region  = var.region
  network = google_compute_network.vpc.id
  project = var.project_id
  
  bgp {
    asn = 64514
  }
}

# External IP addresses for NAT
resource "google_compute_address" "nat_ips" {
  for_each = var.nat_config.create_nat ? {
    for ip in var.nat_config.nat_ips : ip.name => ip
  } : {}
  
  name         = "${var.environment}-${each.value.name}"
  description  = each.value.description
  address_type = each.value.address_type
  network_tier = each.value.network_tier
  region       = var.region
  project      = var.project_id
}

# Cloud NAT
resource "google_compute_router_nat" "nat" {
  count = var.nat_config.create_nat ? 1 : 0
  
  name   = "${var.environment}-${var.nat_config.name}"
  router = google_compute_router.router[0].name
  region = var.region
  project = var.project_id
  
  source_subnetwork_ip_ranges_to_nat = var.nat_config.source_subnetwork_ip_ranges_to_nat
  nat_ip_allocate_option            = length(var.nat_config.nat_ips) > 0 ? "MANUAL_ONLY" : "AUTO_ONLY"
  
  # Use static IPs if provided
  nat_ips = length(var.nat_config.nat_ips) > 0 ? [
    for ip in google_compute_address.nat_ips : ip.self_link
  ] : null
  
  min_ports_per_vm                   = var.nat_config.min_ports_per_vm
  max_ports_per_vm                   = var.nat_config.max_ports_per_vm
  enable_endpoint_independent_mapping = var.nat_config.enable_endpoint_independent_mapping
  
  log_config {
    enable = var.nat_config.log_config.enable
    filter = var.nat_config.log_config.filter
  }
  
  depends_on = [google_compute_router.router]
}

# Custom Routes
resource "google_compute_route" "routes" {
  for_each = var.routes
  
  name             = "${var.environment}-${each.key}"
  dest_range       = each.value.destination_range
  network          = google_compute_network.vpc.name
  description      = each.value.description
  priority         = each.value.priority
  tags             = each.value.tags
  project          = var.project_id
  
  next_hop_gateway    = each.value.next_hop_gateway
  next_hop_instance   = each.value.next_hop_instance
  next_hop_ip         = each.value.next_hop_ip
  next_hop_vpn_tunnel = each.value.next_hop_vpn_tunnel
  
  depends_on = [google_compute_network.vpc]
}

# Private DNS Zones
resource "google_dns_managed_zone" "private_zones" {
  for_each = var.dns_config.create_dns_zones ? var.dns_config.zones : {}
  
  name        = "${var.environment}-${each.key}"
  dns_name    = each.value.dns_name
  description = each.value.description
  visibility  = each.value.visibility
  project     = var.project_id
  
  labels = local.merged_labels
  
  dynamic "private_visibility_config" {
    for_each = each.value.private_visibility_config != null ? [each.value.private_visibility_config] : []
    content {
      dynamic "networks" {
        for_each = private_visibility_config.value.networks
        content {
          network_url = networks.value.network_url
        }
      }
    }
  }
  
  dynamic "forwarding_config" {
    for_each = each.value.forwarding_config != null ? [each.value.forwarding_config] : []
    content {
      dynamic "target_name_servers" {
        for_each = forwarding_config.value.target_name_servers
        content {
          ipv4_address    = target_name_servers.value.ipv4_address
          forwarding_path = target_name_servers.value.forwarding_path
        }
      }
    }
  }
  
  depends_on = [google_compute_network.vpc]
}

# Network Endpoint Groups (if enabled)
resource "google_compute_network_endpoint_group" "neg" {
  for_each = var.network_security.enable_neg ? var.network_security.neg_config : {}
  
  name                  = "${var.environment}-${each.key}"
  description           = each.value.description
  network_endpoint_type = each.value.network_endpoint_type
  network               = google_compute_network.vpc.id
  default_port          = each.value.default_port
  zone                  = each.value.zone
  project               = var.project_id
  
  depends_on = [google_compute_network.vpc]
}

# Security Policy (DDoS Protection)
resource "google_compute_security_policy" "security_policy" {
  count = var.network_security.enable_network_security_policy ? 1 : 0
  
  name        = "${var.environment}-zk-vault-security-policy"
  description = "Security policy for ZK-Vault network protection"
  project     = var.project_id
  
  # Default rule to allow traffic
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }
  
  # Rate limiting rule
  rule {
    action   = "rate_based_ban"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Rate limit rule"
    
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      
      ban_duration_sec = 600
    }
  }
  
  # Block known bad IPs
  rule {
    action   = "deny(403)"
    priority = "500"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = [
          "192.168.100.0/24",  # Example bad range
        ]
      }
    }
    description = "Block known malicious IPs"
  }
  
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }
}

# Monitoring for network resources
resource "google_monitoring_alert_policy" "network_alerts" {
  for_each = var.monitoring_config.enable_monitoring ? var.monitoring_config.alert_policies : {}
  
  display_name = "${var.environment}-${each.value.display_name}"
  combiner     = "OR"
  project      = var.project_id
  
  dynamic "conditions" {
    for_each = each.value.conditions
    content {
      display_name = conditions.value.display_name
      
      condition_threshold {
        filter          = conditions.value.filter
        duration        = conditions.value.threshold_duration
        comparison      = conditions.value.comparison
        threshold_value = conditions.value.threshold_value
        
        aggregations {
          alignment_period   = "60s"
          per_series_aligner = "ALIGN_RATE"
        }
      }
    }
  }
  
  notification_channels = each.value.notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
} 