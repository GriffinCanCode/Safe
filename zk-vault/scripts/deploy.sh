#!/bin/bash

# ZK-Vault Deployment Script
# Supports Firebase cloud deployment and local Docker deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Default values
DEPLOYMENT_TYPE=""
ENVIRONMENT="development"
SKIP_TESTS=false
SKIP_BUILD=false
FORCE_DEPLOY=false
BACKUP_BEFORE_DEPLOY=false

# Usage function
usage() {
    cat << EOF
ZK-Vault Deployment Script

Usage: $0 [OPTIONS] DEPLOYMENT_TYPE

DEPLOYMENT_TYPE:
    firebase        Deploy to Firebase (cloud)
    local          Deploy using Docker (local)
    emulators      Start Firebase emulators only
    build          Build packages only

OPTIONS:
    -e, --env ENVIRONMENT      Deployment environment (development, staging, production)
    -s, --skip-tests          Skip running tests
    -b, --skip-build          Skip building packages
    -f, --force               Force deployment without confirmation
    --backup                  Create backup before deployment
    -h, --help                Show this help message

EXAMPLES:
    # Deploy to Firebase production
    $0 firebase --env production

    # Local development deployment
    $0 local --env development

    # Start emulators for development
    $0 emulators

    # Build and test only
    $0 build --env production

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        --backup)
            BACKUP_BEFORE_DEPLOY=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        firebase|local|emulators|build)
            DEPLOYMENT_TYPE="$1"
            shift
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate deployment type
if [[ -z "$DEPLOYMENT_TYPE" ]]; then
    error "Deployment type is required. Use --help for usage information."
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    error "Invalid environment. Must be: development, staging, or production"
fi

info "Starting ZK-Vault deployment..."
info "Deployment Type: $DEPLOYMENT_TYPE"
info "Environment: $ENVIRONMENT"

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18 or higher."
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$NODE_VERSION" -lt 18 ]]; then
        error "Node.js version 18 or higher is required. Current version: $(node -v)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed."
    fi
    
    # Check for Firebase deployment
    if [[ "$DEPLOYMENT_TYPE" == "firebase" ]]; then
        if ! command -v firebase &> /dev/null; then
            warning "Firebase CLI not found. Installing..."
            npm install -g firebase-tools
        fi
    fi
    
    # Check for Docker deployment
    if [[ "$DEPLOYMENT_TYPE" == "local" ]]; then
        if ! command -v docker &> /dev/null; then
            error "Docker is not installed. Please install Docker to use local deployment."
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            error "Docker Compose is not installed. Please install Docker Compose."
        fi
    fi
    
    success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    if [[ "$SKIP_BUILD" == true ]]; then
        info "Skipping dependency installation"
        return
    fi
    
    info "Installing dependencies..."
    npm ci
    success "Dependencies installed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        info "Skipping tests"
        return
    fi
    
    info "Running tests..."
    npm run lint
    npm run type-check
    npm run test
    success "All tests passed"
}

# Build packages
build_packages() {
    if [[ "$SKIP_BUILD" == true ]]; then
        info "Skipping build"
        return
    fi
    
    info "Building packages..."
    npm run build
    
    # Build web app for specific environment
    cd packages/web-app
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm run build:production
    else
        npm run build
    fi
    cd ../..
    
    success "Build completed"
}

# Create backup
create_backup() {
    if [[ "$BACKUP_BEFORE_DEPLOY" == false ]]; then
        return
    fi
    
    info "Creating backup..."
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [[ "$DEPLOYMENT_TYPE" == "firebase" ]]; then
        # Firebase backup
        if [[ "$ENVIRONMENT" == "production" ]]; then
            firebase auth:export "$BACKUP_DIR/auth_users.json" --format=json
            info "Firebase backup created at $BACKUP_DIR"
        fi
    elif [[ "$DEPLOYMENT_TYPE" == "local" ]]; then
        # Docker backup
        if docker ps -q -f name=zk-vault-postgres > /dev/null 2>&1; then
            docker exec zk-vault-postgres pg_dump -U zkvault zkvault > "$BACKUP_DIR/postgres_backup.sql"
            info "Local database backup created at $BACKUP_DIR"
        fi
    fi
    
    success "Backup completed"
}

# Deploy to Firebase
deploy_firebase() {
    info "Deploying to Firebase ($ENVIRONMENT)..."
    
    # Set Firebase project based on environment
    case $ENVIRONMENT in
        development)
            FIREBASE_PROJECT="zk-vault-dev"
            ;;
        staging)
            FIREBASE_PROJECT="zk-vault-staging"
            ;;
        production)
            FIREBASE_PROJECT="zk-vault-prod"
            ;;
    esac
    
    # Login check
    if ! firebase login --list | grep -q "Logged in as"; then
        info "Please login to Firebase..."
        firebase login
    fi
    
    # Use project
    firebase use "$FIREBASE_PROJECT"
    
    # Deploy based on environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ "$FORCE_DEPLOY" == false ]]; then
            warning "You are deploying to PRODUCTION. This action cannot be undone."
            read -p "Are you sure you want to continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                info "Deployment cancelled"
                exit 0
            fi
        fi
    fi
    
    # Deploy all services
    firebase deploy --only hosting,functions,firestore:rules,storage:rules
    
    success "Firebase deployment completed!"
    
    # Show deployment URLs
    info "Deployment URLs:"
    echo "  🌐 Web App: https://$FIREBASE_PROJECT.web.app"
    echo "  🔧 Firebase Console: https://console.firebase.google.com/project/$FIREBASE_PROJECT"
}

# Deploy locally with Docker
deploy_local() {
    info "Deploying locally with Docker ($ENVIRONMENT)..."
    
    cd infrastructure/docker
    
    # Create environment file if it doesn't exist
    if [[ ! -f .env ]]; then
        info "Creating .env file..."
        cat > .env << EOF
# Firebase Configuration
FIREBASE_PROJECT_ID=zk-vault-local
VITE_FIREBASE_API_KEY=fake-api-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_STORAGE_BUCKET=zk-vault-local.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:local

# Database Configuration
POSTGRES_DB=zkvault
POSTGRES_USER=zkvault
POSTGRES_PASSWORD=zkvault_local_password

# MinIO Configuration
MINIO_ROOT_USER=zkvault
MINIO_ROOT_PASSWORD=zkvault_local_password

# Environment
NODE_ENV=$ENVIRONMENT
SSL_ENABLED=false
EOF
    fi
    
    # Stop existing containers
    docker-compose down
    
    # Build and start containers
    docker-compose up -d --build
    
    # Wait for services to be ready
    info "Waiting for services to start..."
    sleep 10
    
    # Health checks
    check_service_health() {
        local service_name=$1
        local url=$2
        local max_attempts=30
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f -s "$url" > /dev/null 2>&1; then
                success "$service_name is ready"
                return 0
            fi
            
            info "Waiting for $service_name... (attempt $attempt/$max_attempts)"
            sleep 2
            ((attempt++))
        done
        
        warning "$service_name health check failed"
        return 1
    }
    
    check_service_health "Web Application" "http://localhost:3000"
    check_service_health "Firebase Emulators" "http://localhost:4000"
    check_service_health "Nginx Proxy" "http://localhost/health"
    
    cd ../..
    
    success "Local deployment completed!"
    
    # Show service URLs
    info "Local Services:"
    echo "  🌐 Web Application: http://localhost"
    echo "  🔥 Firebase Emulator UI: http://localhost:4000"
    echo "  💾 MinIO Console: http://localhost:9001"
    echo "  📊 Database: localhost:5432"
}

# Start emulators only
start_emulators() {
    info "Starting Firebase emulators..."
    
    # Check if firebase.json exists
    if [[ ! -f firebase.json ]]; then
        error "firebase.json not found. Please run from the project root directory."
    fi
    
    # Start emulators
    firebase emulators:start --only auth,firestore,functions,hosting,storage,pubsub
}

# Build only
build_only() {
    info "Building packages for $ENVIRONMENT..."
    install_dependencies
    run_tests
    build_packages
    success "Build completed successfully!"
}

# Main deployment logic
main() {
    check_prerequisites
    
    case $DEPLOYMENT_TYPE in
        firebase)
            install_dependencies
            run_tests
            build_packages
            create_backup
            deploy_firebase
            ;;
        local)
            install_dependencies
            run_tests
            build_packages
            create_backup
            deploy_local
            ;;
        emulators)
            start_emulators
            ;;
        build)
            build_only
            ;;
        *)
            error "Invalid deployment type: $DEPLOYMENT_TYPE"
            ;;
    esac
}

# Run main function
main

success "Deployment script completed!" 