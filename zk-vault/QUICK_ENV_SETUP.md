# 🚀 Quick Environment Variables Setup

## Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
cd zk-vault
./setup-firebase.sh
```

This will:
- ✅ Install Firebase CLI if needed
- ✅ Help you login to Firebase
- ✅ Create your `.env.local` file
- ✅ Initialize Firebase in your project

## Option 2: Manual Setup (5 minutes)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project"
3. Enter project name (e.g., "zk-vault-dev")
4. Enable Google Analytics (optional)

### Step 2: Enable Required Services
In your Firebase project, enable:
1. **Authentication** → Sign-in method → Email/Password
2. **Firestore Database** → Create database
3. **Storage** → Get started
4. **Hosting** (optional for now)

### Step 3: Get Your Config
1. Go to Project Settings (⚙️ icon)
2. Scroll to "Your apps" section  
3. Click "Add app" → Web app (</>) 
4. Enter app nickname: "ZK-Vault Web"
5. **Copy the config object** - you'll need these values!

### Step 4: Create Environment File

Create `zk-vault/packages/web-app/.env.local`:

```bash
# Core Settings
NODE_ENV=development
DEBUG=true

# Firebase Config (replace with your actual values)
VITE_FIREBASE_API_KEY=AIzaSyC...your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijk

# Backend
FIREBASE_PROJECT_ID=your-project-id

# Development
VITE_USE_EMULATORS=true
VITE_ENABLE_DEBUG_LOGS=true
```

## 🔥 Most Critical Variables

**You MUST have these to run the app:**

| Variable | Get From | Example |
|----------|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → Web App Config | `AIzaSyC4K8...` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID | `zk-vault-dev` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auto-generated | `your-project-id.firebaseapp.com` |

## ✅ Test Your Setup

```bash
cd zk-vault/packages/web-app
npm install
npm run dev
```

If you see the app load without Firebase errors, you're good to go!

## 🆘 Need Help?

**Common Issues:**

1. **"Firebase project not found"** 
   - Check your `VITE_FIREBASE_PROJECT_ID` matches exactly

2. **"API key invalid"**
   - Double-check your `VITE_FIREBASE_API_KEY`

3. **"Auth domain error"**
   - Make sure format is: `your-project-id.firebaseapp.com`

**Get Support:**
- Firebase Console: https://console.firebase.google.com
- Firebase Documentation: https://firebase.google.com/docs

## 🔧 Advanced Setup (Later)

For deployment and production, you'll also need:
- Google Cloud Platform credentials
- Terraform variables (for infrastructure)
- CI/CD secrets (for deployment)

But for now, the basic Firebase config above is all you need to get started! 