# Networking Module Outputs
# Exposes key networking information for use by other modules

# VPC Network Information
output "vpc" {
  description = "VPC network information"
  value = {
    id                    = google_compute_network.vpc.id
    name                  = google_compute_network.vpc.name
    self_link            = google_compute_network.vpc.self_link
    gateway_ipv4         = google_compute_network.vpc.gateway_ipv4
    routing_mode         = google_compute_network.vpc.routing_mode
    mtu                  = google_compute_network.vpc.mtu
  }
}

# Subnet Information
output "subnets" {
  description = "Map of subnet information by tier"
  value = {
    for name, subnet in google_compute_subnetwork.subnets : name => {
      id                   = subnet.id
      name                 = subnet.name
      self_link           = subnet.self_link
      ip_cidr_range       = subnet.ip_cidr_range
      region              = subnet.region
      gateway_address     = subnet.gateway_address
      network             = subnet.network
      private_ip_google_access = subnet.private_ip_google_access
      secondary_ip_ranges = subnet.secondary_ip_range
    }
  }
}

# Subnet IDs (for easier reference)
output "subnet_ids" {
  description = "Map of subnet IDs by tier name"
  value = {
    for name, subnet in google_compute_subnetwork.subnets : name => subnet.id
  }
}

# Subnet Self Links (for other GCP resources)
output "subnet_self_links" {
  description = "Map of subnet self links by tier name"
  value = {
    for name, subnet in google_compute_subnetwork.subnets : name => subnet.self_link
  }
}

# Firewall Rules Information
output "firewall_rules" {
  description = "Map of firewall rule information"
  value = {
    for name, rule in google_compute_firewall.rules : name => {
      id        = rule.id
      name      = rule.name
      self_link = rule.self_link
      direction = rule.direction
      priority  = rule.priority
    }
  }
}

# NAT Information
output "nat" {
  description = "NAT gateway information"
  value = var.nat_config.create_nat ? {
    router = {
      id        = google_compute_router.router[0].id
      name      = google_compute_router.router[0].name
      self_link = google_compute_router.router[0].self_link
    }
    nat = {
      id        = google_compute_router_nat.nat[0].id
      name      = google_compute_router_nat.nat[0].name
    }
    external_ips = {
      for name, ip in google_compute_address.nat_ips : name => {
        id      = ip.id
        name    = ip.name
        address = ip.address
      }
    }
  } : null
}

# DNS Zones Information
output "dns_zones" {
  description = "Private DNS zones information"
  value = var.dns_config.create_dns_zones ? {
    for name, zone in google_dns_managed_zone.private_zones : name => {
      id           = zone.id
      name         = zone.name
      dns_name     = zone.dns_name
      name_servers = zone.name_servers
    }
  } : {}
}

# Network Security Policy
output "security_policy" {
  description = "Network security policy information"
  value = var.network_security.enable_network_security_policy ? {
    id        = google_compute_security_policy.security_policy[0].id
    name      = google_compute_security_policy.security_policy[0].name
    self_link = google_compute_security_policy.security_policy[0].self_link
  } : null
}

# Network Endpoint Groups
output "network_endpoint_groups" {
  description = "Network endpoint groups information"
  value = var.network_security.enable_neg ? {
    for name, neg in google_compute_network_endpoint_group.neg : name => {
      id        = neg.id
      name      = neg.name
      self_link = neg.self_link
      size      = neg.size
    }
  } : {}
}

# Routes Information
output "routes" {
  description = "Custom routes information"
  value = {
    for name, route in google_compute_route.routes : name => {
      id             = route.id
      name           = route.name
      dest_range     = route.dest_range
      priority       = route.priority
      next_hop_ip    = route.next_hop_ip
    }
  }
}

# Monitoring Alert Policies
output "monitoring_alert_policies" {
  description = "Network monitoring alert policies"
  value = var.monitoring_config.enable_monitoring ? {
    for name, policy in google_monitoring_alert_policy.network_alerts : name => {
      id           = policy.id
      name         = policy.name
      display_name = policy.display_name
    }
  } : {}
}

# Environment-specific outputs for easy reference
output "environment_info" {
  description = "Environment-specific networking information"
  value = {
    environment = var.environment
    project_id  = var.project_id
    region      = var.region
    vpc_name    = google_compute_network.vpc.name
    vpc_id      = google_compute_network.vpc.id
  }
}

# Network CIDR ranges for reference
output "network_cidrs" {
  description = "Network CIDR ranges for reference"
  value = {
    for name, subnet in var.subnets : name => subnet.ip_cidr_range
  }
}

# Connection information for applications
output "connection_info" {
  description = "Connection information for applications"
  value = {
    # VPC connection details
    vpc_connector_eligible_subnets = [
      for name, subnet in google_compute_subnetwork.subnets : subnet.name
      if subnet.purpose == "PRIVATE"
    ]
    
    # Private service connect endpoints
    private_service_connect_attachments = {
      for name, subnet in google_compute_subnetwork.subnets : name => {
        subnet_name = subnet.name
        subnet_id   = subnet.id
      }
      if subnet.purpose == "PRIVATE_SERVICE_CONNECT"
    }
    
    # Load balancer eligible subnets
    load_balancer_subnets = {
      for name, subnet in google_compute_subnetwork.subnets : name => {
        subnet_name = subnet.name
        subnet_id   = subnet.id
      }
      if can(regex("web|app", name))
    }
  }
}

# Security information
output "security_info" {
  description = "Network security configuration details"
  value = {
    firewall_enabled_tags = distinct(flatten([
      for rule_name, rule in var.firewall_rules : rule.target_tags
      if rule.target_tags != null
    ]))
    
    security_policy_enabled = var.network_security.enable_network_security_policy
    private_google_access   = var.network_security.enable_private_google_access
    flow_logs_enabled      = var.enable_flow_logs
    
    nat_configuration = var.nat_config.create_nat ? {
      enabled           = true
      min_ports_per_vm = var.nat_config.min_ports_per_vm
      max_ports_per_vm = var.nat_config.max_ports_per_vm
    } : {
      enabled = false
    }
  }
}

# Cost optimization information
output "cost_optimization" {
  description = "Cost optimization features and recommendations"
  value = {
    preemptible_instance_subnets = [
      for name, subnet in google_compute_subnetwork.subnets : subnet.name
      if can(regex("dev|staging", var.environment))
    ]
    
    nat_cost_optimization = var.nat_config.create_nat ? {
      static_ips_count     = length(var.nat_config.nat_ips)
      port_allocation_mode = length(var.nat_config.nat_ips) > 0 ? "manual" : "auto"
    } : null
    
    network_tier_premium = var.nat_config.create_nat ? all([
      for ip in var.nat_config.nat_ips : ip.network_tier == "PREMIUM"
    ]) : false
  }
} 