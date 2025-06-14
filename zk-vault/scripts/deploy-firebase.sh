#!/bin/bash

# ZK-Vault Firebase Deployment Script
# Comprehensive deployment automation following 2025 best practices

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
ZK-Vault Firebase Deployment Script

Usage: $0 [OPTIONS] ENVIRONMENT

ARGUMENTS:
    ENVIRONMENT    Target environment (development|staging|production)

OPTIONS:
    -h, --help              Show this help message
    -p, --plan-only         Run terraform plan only (no apply)
    -d, --destroy           Destroy infrastructure
    -f, --force             Skip confirmation prompts
    -v, --verbose           Enable verbose output
    --skip-validation       Skip pre-deployment validation
    --terraform-only        Run only Terraform (skip Firebase CLI operations)
    --firebase-only         Run only Firebase CLI operations (skip Terraform)

EXAMPLES:
    $0 development                    # Deploy to development
    $0 --plan-only staging           # Plan staging deployment
    $0 --destroy production --force  # Destroy production (force)

ENVIRONMENT VARIABLES:
    PROJECT_ID              GCP Project ID (required)
    BILLING_ACCOUNT         GCP Billing Account ID
    ORGANIZATION_ID         GCP Organization ID
    TF_STATE_BUCKET         Terraform state bucket name
    OAUTH_CLIENT_ID         Google OAuth Client ID
    OAUTH_CLIENT_SECRET     Google OAuth Client Secret

EOF
}

# Parse command line arguments
ENVIRONMENT=""
PLAN_ONLY=false
DESTROY=false
FORCE=false
VERBOSE=false
SKIP_VALIDATION=false
TERRAFORM_ONLY=false
FIREBASE_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--plan-only)
            PLAN_ONLY=true
            shift
            ;;
        -d|--destroy)
            DESTROY=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --terraform-only)
            TERRAFORM_ONLY=true
            shift
            ;;
        --firebase-only)
            FIREBASE_ONLY=true
            shift
            ;;
        development|staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment argument
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment argument is required"
    show_help
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    log_error "Must be one of: development, staging, production"
    exit 1
fi

# Enable verbose output if requested
if [[ "$VERBOSE" == "true" ]]; then
    set -x
fi

log_info "Starting ZK-Vault Firebase deployment for environment: $ENVIRONMENT"

# Check required environment variables
check_required_env_vars() {
    local required_vars=("PROJECT_ID")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi
}

# Check required tools
check_required_tools() {
    local required_tools=("terraform" "gcloud")
    local missing_tools=()
    
    # Add firebase to required tools if not terraform-only
    if [[ "$TERRAFORM_ONLY" != "true" ]]; then
        required_tools+=("firebase")
    fi
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            log_error "  - $tool"
        done
        exit 1
    fi
}

# Validate GCP authentication
validate_gcp_auth() {
    log_info "Validating GCP authentication..."
    
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" | grep -q .; then
        log_error "No active GCP authentication found"
        log_info "Please run: gcloud auth login"
        exit 1
    fi
    
    local current_project
    current_project=$(gcloud config get-value project 2>/dev/null || echo "")
    
    if [[ "$current_project" != "$PROJECT_ID" ]]; then
        log_info "Setting GCP project to: $PROJECT_ID"
        gcloud config set project "$PROJECT_ID"
    fi
    
    log_success "GCP authentication validated"
}

# Validate Firebase authentication
validate_firebase_auth() {
    if [[ "$TERRAFORM_ONLY" == "true" ]]; then
        return 0
    fi
    
    log_info "Validating Firebase authentication..."
    
    if ! firebase projects:list &> /dev/null; then
        log_error "Firebase authentication failed"
        log_info "Please run: firebase login"
        exit 1
    fi
    
    log_success "Firebase authentication validated"
}

# Setup Terraform backend
setup_terraform_backend() {
    log_info "Setting up Terraform backend..."
    
    local state_bucket="${TF_STATE_BUCKET:-${PROJECT_ID}-terraform-state}"
    
    # Create state bucket if it doesn't exist
    if ! gsutil ls "gs://$state_bucket" &> /dev/null; then
        log_info "Creating Terraform state bucket: $state_bucket"
        gsutil mb -p "$PROJECT_ID" "gs://$state_bucket"
        gsutil versioning set on "gs://$state_bucket"
    fi
    
    # Initialize Terraform with backend configuration
    cd "$TERRAFORM_DIR"
    
    terraform init \
        -backend-config="bucket=$state_bucket" \
        -backend-config="prefix=environments/$ENVIRONMENT" \
        -upgrade
    
    log_success "Terraform backend setup complete"
}

# Run Terraform operations
run_terraform() {
    if [[ "$FIREBASE_ONLY" == "true" ]]; then
        return 0
    fi
    
    log_info "Running Terraform operations..."
    
    cd "$TERRAFORM_DIR"
    
    # Create variables file
    cat > "terraform.tfvars" << EOF
project_id = "$PROJECT_ID"
environment = "$ENVIRONMENT"
region = "${REGION:-us-central1}"
zone = "${ZONE:-us-central1-a}"
organization_id = "${ORGANIZATION_ID:-}"
billing_account = "${BILLING_ACCOUNT:-}"
enable_cost_optimization = true
enable_workload_identity = true
oauth_client_id = "${OAUTH_CLIENT_ID:-}"
oauth_client_secret = "${OAUTH_CLIENT_SECRET:-}"
firestore_location = "${FIRESTORE_LOCATION:-nam5}"
EOF
    
    # Run Terraform plan
    log_info "Running Terraform plan..."
    terraform plan \
        -var-file="terraform.tfvars" \
        -var-file="environments/$ENVIRONMENT.tfvars" \
        -out="tfplan"
    
    if [[ "$PLAN_ONLY" == "true" ]]; then
        log_success "Terraform plan completed (plan-only mode)"
        return 0
    fi
    
    # Confirm apply unless force flag is set
    if [[ "$FORCE" != "true" && "$DESTROY" != "true" ]]; then
        echo
        read -p "Do you want to apply these changes? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Terraform apply cancelled by user"
            return 0
        fi
    fi
    
    # Run Terraform apply or destroy
    if [[ "$DESTROY" == "true" ]]; then
        log_warning "DESTROYING infrastructure for environment: $ENVIRONMENT"
        if [[ "$FORCE" != "true" ]]; then
            echo
            read -p "Are you ABSOLUTELY sure you want to DESTROY $ENVIRONMENT? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Terraform destroy cancelled by user"
                return 0
            fi
        fi
        
        terraform destroy \
            -var-file="terraform.tfvars" \
            -var-file="environments/$ENVIRONMENT.tfvars" \
            -auto-approve
        
        log_success "Terraform destroy completed"
    else
        log_info "Applying Terraform changes..."
        terraform apply "tfplan"
        log_success "Terraform apply completed"
    fi
}

# Deploy Firebase configuration
deploy_firebase() {
    if [[ "$TERRAFORM_ONLY" == "true" || "$DESTROY" == "true" ]]; then
        return 0
    fi
    
    log_info "Deploying Firebase configuration..."
    
    cd "$PROJECT_ROOT"
    
    # Use specific Firebase project
    firebase use "$PROJECT_ID" --token "$FIREBASE_TOKEN" 2>/dev/null || firebase use "$PROJECT_ID"
    
    # Deploy Firebase security rules
    log_info "Deploying Firestore security rules..."
    firebase deploy --only firestore:rules --project "$PROJECT_ID"
    
    log_info "Deploying Storage security rules..."
    firebase deploy --only storage:rules --project "$PROJECT_ID"
    
    # Deploy hosting if web app is built
    if [[ -d "packages/web-app/dist" ]]; then
        log_info "Deploying Firebase hosting..."
        firebase deploy --only hosting --project "$PROJECT_ID"
    else
        log_warning "Web app not built, skipping hosting deployment"
        log_info "To build the web app, run: npm run build"
    fi
    
    log_success "Firebase deployment completed"
}

# Post-deployment validation
post_deployment_validation() {
    if [[ "$DESTROY" == "true" ]]; then
        return 0
    fi
    
    log_info "Running post-deployment validation..."
    
    # Check if Firebase project is accessible
    if firebase projects:list | grep -q "$PROJECT_ID"; then
        log_success "Firebase project is accessible"
    else
        log_error "Firebase project validation failed"
        return 1
    fi
    
    # Check if Firestore is operational
    if gcloud firestore databases list --project="$PROJECT_ID" --format="value(name)" | grep -q "default"; then
        log_success "Firestore database is operational"
    else
        log_error "Firestore database validation failed"
        return 1
    fi
    
    # Get deployment URLs
    local hosting_url
    hosting_url=$(terraform output -json application_config 2>/dev/null | jq -r '.value.urls.hosting_url // "Not available"')
    
    if [[ "$hosting_url" != "Not available" ]]; then
        log_success "Deployment completed successfully!"
        log_info "Application URL: $hosting_url"
    fi
}

# Main deployment function
main() {
    log_info "ZK-Vault Firebase Deployment Starting..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Project ID: $PROJECT_ID"
    
    if [[ "$SKIP_VALIDATION" != "true" ]]; then
        check_required_env_vars
        check_required_tools
        validate_gcp_auth
        validate_firebase_auth
    fi
    
    if [[ "$FIREBASE_ONLY" != "true" ]]; then
        setup_terraform_backend
        run_terraform
    fi
    
    deploy_firebase
    post_deployment_validation
    
    log_success "ZK-Vault Firebase deployment completed successfully!"
}

# Trap errors and cleanup
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code: $exit_code"
    fi
    
    # Cleanup temporary files
    cd "$TERRAFORM_DIR" 2>/dev/null || true
    rm -f terraform.tfvars tfplan 2>/dev/null || true
    
    exit $exit_code
}

trap cleanup EXIT

# Run main function
main "$@" 