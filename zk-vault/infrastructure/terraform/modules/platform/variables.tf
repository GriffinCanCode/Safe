# Platform Engineering Module Variables
# This module creates the foundation for the ZK-Vault platform following 2025 best practices

variable "platform_config" {
  description = "Platform-wide configuration for ZK-Vault"
  type = object({
    name             = string
    environment      = string
    region           = string
    zone             = optional(string)
    billing_account  = optional(string)
    org_id          = optional(string)
    folder_id       = optional(string)
    enable_apis     = optional(bool, true)
    enable_monitoring = optional(bool, true)
    enable_logging   = optional(bool, true)
  })
  
  validation {
    condition     = contains(["development", "staging", "production"], var.platform_config.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "labels" {
  description = "Platform-wide labels following 2025 best practices"
  type        = map(string)
  default = {
    managed-by = "terraform"
    platform   = "zk-vault"
    iac-tool   = "terraform"
  }
}

variable "feature_flags" {
  description = "Platform feature flags for progressive delivery"
  type = object({
    enable_ai_monitoring     = optional(bool, false)
    enable_cost_optimization = optional(bool, true)
    enable_auto_scaling     = optional(bool, true)
    enable_gitops_cd        = optional(bool, true)
    enable_chaos_engineering = optional(bool, false)
    enable_canary_deployments = optional(bool, false)
  })
  default = {}
}

variable "security_config" {
  description = "Platform security configuration following zero-trust principles"
  type = object({
    enable_audit_logs           = optional(bool, true)
    enable_security_scanning    = optional(bool, true)
    enable_policy_enforcement   = optional(bool, true)
    enable_secret_management    = optional(bool, true)
    enable_workload_identity    = optional(bool, true)
    security_policy_level       = optional(string, "strict")
  })
  default = {}
}

variable "observability_config" {
  description = "Platform observability configuration for 2025 standards"
  type = object({
    enable_distributed_tracing  = optional(bool, true)
    enable_metrics_collection   = optional(bool, true)
    enable_log_aggregation     = optional(bool, true)
    enable_alerting            = optional(bool, true)
    enable_slo_monitoring      = optional(bool, true)
    retention_days             = optional(number, 30)
  })
  default = {}
}

variable "gitops_config" {
  description = "GitOps configuration for deployment automation"
  type = object({
    git_repository          = string
    git_branch             = optional(string, "main")
    sync_interval          = optional(string, "30s")
    auto_sync_enabled      = optional(bool, true)
    prune_enabled          = optional(bool, true)
    self_heal_enabled      = optional(bool, true)
  })
  default = {
    git_repository = "https://github.com/your-org/zk-vault"
  }
}

variable "ai_ops_config" {
  description = "AI/ML operations configuration for intelligent platform management"
  type = object({
    enable_predictive_scaling  = optional(bool, false)
    enable_anomaly_detection   = optional(bool, false)
    enable_auto_remediation    = optional(bool, false)
    enable_cost_optimization   = optional(bool, true)
    ml_model_region           = optional(string, "us-central1")
  })
  default = {}
} 