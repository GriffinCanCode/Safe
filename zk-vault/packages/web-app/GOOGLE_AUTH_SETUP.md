# Google Authentication Setup Guide

This guide explains how to configure Google authentication for ZK-Vault.

## Prerequisites

1. **Firebase Project**: You need a Firebase project with Authentication enabled
2. **Google OAuth Consent Screen**: Must be configured in Google Cloud Console
3. **Environment Variables**: Firebase configuration must be set in your environment

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** provider
5. Configure OAuth consent screen

### 2. Get Firebase Configuration

1. Go to **Project Settings** → **General**
2. Scroll down to **Your apps**
3. Click **Web app** config icon
4. Copy the configuration values

### 3. Environment Variables

Create a `.env.local` file in `/packages/web-app/` with:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
VITE_FIREBASE_MEASUREMENT_ID=G-ABCDEFGHIJ
```

## Google Cloud Console Setup

### 1. OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Configure the consent screen:
   - **Application name**: ZK-Vault
   - **User support email**: Your email
   - **Authorized domains**: Add your domain
   - **Developer contact**: Your email

### 2. OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Your Firebase app should automatically create OAuth credentials
3. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `https://your-domain.com` (for production)
4. Add authorized redirect URIs:
   - `http://localhost:5173/__/auth/handler` (for development)
   - `https://your-domain.com/__/auth/handler` (for production)

## Features

### Popup vs Redirect Flow

- **Popup Flow** (default): Better UX for desktop users
- **Redirect Flow**: Better for mobile devices and restricted environments

```typescript
// Popup flow (default)
await authStore.loginWithGoogle();

// Redirect flow (for mobile)
await authStore.loginWithGoogle(true);
```

### User Experience Flow

1. **New Google Users**:
   - Sign in with Google
   - Account automatically created
   - Optional biometric setup (if available)
   - Redirect to dashboard

2. **Existing Google Users**:
   - Sign in with Google
   - Direct access to dashboard

3. **Account Linking**:
   - Link Google account to existing email/password account
   - Single sign-on experience

## Security Features

### Zero-Knowledge Architecture

- Biometric data never leaves the device
- Google authentication creates temporary encryption keys
- No passwords stored or transmitted
- Full client-side encryption

### Authentication Flow Security

1. **OAuth 2.0 + OpenID Connect**: Industry standard authentication
2. **PKCE (Proof Key for Code Exchange)**: Enhanced security for public clients
3. **Domain Validation**: Ensures requests come from authorized domains
4. **Token Validation**: Firebase handles token verification

## Error Handling

The system handles various Google authentication errors:

- **Popup blocked**: Suggests allowing popups
- **Network errors**: Retry mechanism
- **Cancelled sign-in**: Graceful fallback
- **Domain restrictions**: Clear error messages

## Development Testing

### Local Development

1. Ensure Firebase emulators are running (optional)
2. Set environment variables in `.env.local`
3. Start development server: `npm run dev`
4. Test Google authentication flow

### Production Deployment

1. Configure production Firebase project
2. Update authorized domains in Google Cloud Console
3. Set production environment variables
4. Deploy and test authentication flow

## TypeScript Integration

The Google authentication is fully typed with TypeScript:

```typescript
interface GoogleAuthResult {
  user: ZKUser;
  profile: UserProfile;
  isNewUser: boolean;
  masterKeyStructure: MasterKeyStructure;
  credential?: any;
}

// Usage in components
const result: GoogleAuthResult = await authStore.loginWithGoogle();
```

## Troubleshooting

### Common Issues

1. **"Firebase not initialized"**
   - Check environment variables
   - Verify Firebase configuration

2. **"Popup blocked"**
   - Allow popups in browser settings
   - Use redirect flow instead

3. **"Unauthorized domain"**
   - Add domain to Google Cloud Console
   - Check authorized JavaScript origins

4. **"Access denied"**
   - Verify OAuth consent screen configuration
   - Check user permissions

### Debug Logging

Enable debug logging in development:

```env
VITE_ENABLE_DEBUG_LOGS=true
```

## Security Considerations

### Data Protection

- Google profile data is stored locally only
- No sensitive data sent to external servers
- Encryption keys generated client-side only

### Privacy

- Minimal data collection from Google
- User controls data sharing preferences
- Transparent privacy policy required

### Compliance

- GDPR compliant (with proper privacy policy)
- CCPA compliant
- SOC 2 compatible architecture

## Support

For issues with Google authentication:

1. Check Firebase Console logs
2. Verify Google Cloud Console configuration
3. Review browser console errors
4. Contact support with specific error messages 