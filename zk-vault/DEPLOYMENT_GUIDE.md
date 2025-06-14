# ZK-Vault Deployment Guide

This guide covers multiple deployment strategies for ZK-Vault, including Firebase cloud deployment and local deployment options for maximum privacy control.

## 🏗️ Deployment Architecture Options

### Option 1: Firebase Cloud Deployment (Recommended for most users)
- **Frontend**: Firebase Hosting
- **Backend**: Firebase Functions
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication

### Option 2: Local Deployment (Maximum Privacy)
- **Frontend**: Docker + Nginx
- **Backend**: Local Firebase Emulators or Custom Server
- **Database**: Local Firestore Emulator or PostgreSQL
- **Storage**: Local storage or MinIO
- **Auth**: Local Firebase Auth Emulator

### Option 3: Hybrid Deployment
- **Frontend**: Firebase Hosting
- **Backend**: Self-hosted on your infrastructure
- **Database**: Your choice (Firestore or PostgreSQL)

## 🚀 Quick Start - Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Firebase emulators
npm run dev:emulators

# 3. Start web application (in another terminal)
cd packages/web-app
npm run dev

# 4. Access the application
# Web App: http://localhost:3000
# Firebase Emulator UI: http://localhost:4000
```

## ☁️ Firebase Cloud Deployment

### Prerequisites
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Create a Firebase project at https://console.firebase.google.com
3. Enable Authentication, Firestore, Functions, and Hosting

### Setup Firebase Project

```bash
# 1. Login to Firebase
firebase login

# 2. Initialize Firebase project
firebase init

# Select the following services:
# ✅ Firestore
# ✅ Functions
# ✅ Hosting
# ✅ Storage

# 3. Configure environment variables
cp packages/web-app/.env.example packages/web-app/.env.local
```

### Environment Configuration

Create `packages/web-app/.env.local`:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Build and Deploy

```bash
# 1. Build all packages
npm run build

# 2. Build web application for production
cd packages/web-app
npm run build:production

# 3. Deploy to Firebase
firebase deploy
```

### GitHub Actions Deployment

The project includes automated deployment workflows:

- **Staging**: `.github/workflows/deploy-staging.yml` (deploys on push to `develop`)
- **Production**: `.github/workflows/deploy-production.yml` (deploys on push to `main`)

Set up GitHub secrets:
```
FIREBASE_TOKEN_STAGING=your_staging_token
FIREBASE_TOKEN_PROD=your_production_token
```

## 🐳 Local Docker Deployment

### Full Local Stack with Docker Compose

```bash
# 1. Navigate to Docker directory
cd infrastructure/docker

# 2. Create environment file
cp .env.example .env

# 3. Generate SSL certificates (optional)
./generate-ssl.sh

# 4. Start all services
docker-compose up -d

# 5. Access services
# Web App: http://localhost:80
# Firebase Emulator UI: http://localhost:4000
# MinIO Console: http://localhost:9001
# PostgreSQL: localhost:5432
```

### Environment Configuration for Docker

Create `infrastructure/docker/.env`:
```bash
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

# Security
SSL_ENABLED=false
```

### Docker Services

The Docker Compose setup includes:

1. **Web Application** (Port 3000)
2. **Firebase Emulators** (Ports 4000, 5001, 8080, 9099, 9199)
3. **Nginx Reverse Proxy** (Ports 80, 443)
4. **PostgreSQL Database** (Port 5432)
5. **MinIO Storage** (Ports 9000, 9001)
6. **Redis Cache** (Port 6379)
7. **Backup Service** (Automated backups)

## 🔒 Security Configuration

### Firebase Security Rules

Update `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Encrypted vault items
    match /users/{userId}/vault/{itemId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Update `storage.rules`:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### SSL/TLS Configuration

For production deployment, enable HTTPS:

```bash
# Generate SSL certificates
cd infrastructure/docker
./generate-ssl.sh

# Or use Let's Encrypt
certbot certonly --nginx -d your-domain.com
```

## 📊 Monitoring and Logging

### Firebase Analytics

Enable in `packages/web-app/src/plugins/firebase.ts`:
```typescript
// Add measurement ID to environment variables
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

// Analytics will be initialized automatically in production
```

### Local Monitoring

```bash
# View logs
docker-compose logs -f web-app
docker-compose logs -f firebase-emulators

# Monitor performance
docker stats

# Health checks
curl http://localhost/health
```

## 🔄 Backup and Recovery

### Firebase Backup

```bash
# Export Firestore data
firebase firestore:delete --all-collections
gcloud firestore export gs://your-bucket/backup-$(date +%Y%m%d)

# Backup Firebase Auth users
firebase auth:export users.json --format=json
```

### Local Backup

The Docker setup includes automated daily backups:

```bash
# Manual backup
docker exec zk-vault-backup /backup/backup.sh

# Restore from backup
docker exec zk-vault-postgres pg_restore -U zkvault -d zkvault /backup/output/postgres_backup.sql
```

## 🌐 Domain and DNS Configuration

### Firebase Hosting Custom Domain

```bash
# Add custom domain
firebase hosting:channel:deploy staging --only hosting

# Set up custom domain in Firebase Console
# Add DNS records:
# A record: @ -> Firebase IP
# CNAME record: www -> your-project.web.app
```

### Self-hosted Domain

```bash
# Update nginx configuration
server_name your-domain.com www.your-domain.com;

# SSL with Let's Encrypt
certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 🧪 Testing Deployments

### Local Testing

```bash
# Test all services
npm run test
npm run test:integration

# Test Docker deployment
docker-compose exec web-app npm run test
```

### Production Testing

```bash
# Test Firebase deployment
firebase hosting:channel:deploy preview

# Load testing
npm install -g artillery
artillery run load-test.yml
```

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Emulator Connection Issues**
   ```bash
   # Clear emulator data
   firebase emulators:start --clear-data
   ```

2. **Docker Permission Issues**
   ```bash
   # Fix Docker permissions
   sudo chown -R $USER:$USER ./infrastructure/docker
   ```

3. **Build Errors**
   ```bash
   # Clean and rebuild
   npm run clean
   npm install
   npm run build
   ```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=zk-vault:*

# Docker debug
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up
```

## 📈 Performance Optimization

### Web Application

```bash
# Analyze bundle size
cd packages/web-app
npm run build:analyze

# Optimize images
npm install -g imagemin-cli
imagemin public/images/* --out-dir=public/images/optimized
```

### Firebase Functions

```bash
# Optimize functions
cd functions
npm run build:optimize

# Monitor function performance
firebase functions:log
```

## 🛡️ Security Checklist

- [ ] Enable Firebase App Check
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Regular security audits
- [ ] Update dependencies regularly
- [ ] Monitor for vulnerabilities

## 🔧 Environment Management

### Development
```bash
NODE_ENV=development
VITE_USE_EMULATORS=true
DEBUG=true
```

### Staging
```bash
NODE_ENV=staging
FIREBASE_PROJECT_ID=zk-vault-staging
```

### Production
```bash
NODE_ENV=production
FIREBASE_PROJECT_ID=zk-vault-prod
VITE_ANALYTICS_ENABLED=true
```

## 📞 Support

For deployment issues:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Firebase Console logs
3. Check Docker container logs
4. Open an issue on GitHub

---

## 🎯 Recommended Deployment Strategy

For **ZK-Vault**, we recommend:

1. **Development**: Local Docker setup with Firebase emulators
2. **Staging**: Firebase Hosting with staging project
3. **Production**: Firebase Hosting for public users
4. **Self-hosted**: Docker setup for privacy-conscious users

This provides the best balance of convenience, scalability, and privacy options for your zero-knowledge password manager. 