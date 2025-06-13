/**
 * @fileoverview Authentication Types
 * @responsibility Defines all authentication-related type interfaces
 * @principle Single Responsibility - Only authentication type definitions
 * @security Zero-knowledge authentication using SRP protocol
 */

/**
 * User authentication credentials
 * @responsibility Basic user credential structure
 */
export interface UserCredentials {
  /** User email address */
  email: string;
  /** User password (never stored or transmitted in plain text) */
  password: string;
}

/**
 * User registration data
 * @responsibility Information needed for user account creation
 */
export interface UserRegistration extends UserCredentials {
  /** Display name */
  displayName?: string;
  /** Email verification required */
  requireEmailVerification: boolean;
  /** Terms of service acceptance */
  acceptedTerms: boolean;
  /** Privacy policy acceptance */
  acceptedPrivacy: boolean;
  /** Registration timestamp */
  registeredAt: Date;
}

/**
 * SRP authentication session
 * @responsibility Manages SRP authentication state
 */
export interface SRPAuthSession {
  /** Session identifier */
  sessionId: string;
  /** User email */
  email: string;
  /** Server's public ephemeral value */
  serverPublic: string;
  /** Salt for password verification */
  salt: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Current authentication step */
  step: 'initiated' | 'challenge-sent' | 'proof-verified' | 'completed';
}

/**
 * SRP client proof
 * @responsibility Client's proof of password knowledge
 */
export interface SRPClientProof {
  /** Client's public ephemeral value */
  clientPublic: string;
  /** Client's proof of password knowledge */
  clientProof: string;
  /** Session identifier */
  sessionId: string;
}

/**
 * SRP server verification
 * @responsibility Server's verification of client proof
 */
export interface SRPServerVerification {
  /** Server's proof of session key knowledge */
  serverProof: string;
  /** Authentication success status */
  verified: boolean;
  /** Custom Firebase token for authentication */
  customToken?: string;
  /** Session key for further operations */
  sessionKey?: string;
}

/**
 * Authentication result
 * @responsibility Result of authentication attempt
 */
export interface AuthenticationResult {
  /** Authentication success status */
  success: boolean;
  /** User information if successful */
  user?: AuthenticatedUser;
  /** Error message if failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: AuthErrorCode;
  /** Requires additional verification */
  requiresMFA?: boolean;
  /** MFA challenge if required */
  mfaChallenge?: MFAChallenge;
}

/**
 * Authenticated user information
 * @responsibility Information about authenticated user
 */
export interface AuthenticatedUser {
  /** User unique identifier */
  uid: string;
  /** User email address */
  email: string;
  /** Display name */
  displayName?: string;
  /** Email verification status */
  emailVerified: boolean;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last sign-in timestamp */
  lastSignIn: Date;
  /** User preferences */
  preferences: UserPreferences;
  /** Security settings */
  security: SecuritySettings;
}

/**
 * User preferences
 * @responsibility User's application preferences
 */
export interface UserPreferences {
  /** Preferred language */
  language: string;
  /** Preferred timezone */
  timezone: string;
  /** Theme preference */
  theme: 'light' | 'dark' | 'auto';
  /** Auto-lock timeout in minutes */
  autoLockTimeout: number;
  /** Clipboard clear timeout in seconds */
  clipboardClearTimeout: number;
  /** Show password strength indicators */
  showPasswordStrength: boolean;
  /** Enable breach monitoring */
  enableBreachMonitoring: boolean;
}

/**
 * Security settings
 * @responsibility User's security configuration
 */
export interface SecuritySettings {
  /** Two-factor authentication enabled */
  mfaEnabled: boolean;
  /** Available MFA methods */
  mfaMethods: MFAMethod[];
  /** Biometric authentication enabled */
  biometricEnabled: boolean;
  /** Require master password for sensitive operations */
  requireMasterPassword: boolean;
  /** Failed login attempt count */
  failedLoginAttempts: number;
  /** Account locked until timestamp */
  lockedUntil?: Date;
  /** Last password change */
  lastPasswordChange: Date;
  /** Password change required */
  passwordChangeRequired: boolean;
}

/**
 * Multi-factor authentication method
 * @responsibility MFA method configuration
 */
export interface MFAMethod {
  /** Method identifier */
  id: string;
  /** Method type */
  type: 'totp' | 'sms' | 'email' | 'webauthn' | 'backup-codes';
  /** Method name/label */
  name: string;
  /** Method enabled status */
  enabled: boolean;
  /** Method verified status */
  verified: boolean;
  /** Setup timestamp */
  setupAt: Date;
  /** Last used timestamp */
  lastUsed?: Date;
  /** Method-specific configuration */
  config: MFAMethodConfig;
}

/**
 * MFA method configuration
 * @responsibility Configuration for different MFA methods
 */
export interface MFAMethodConfig {
  /** TOTP configuration */
  totp?: {
    secret: string;
    qrCode: string;
    backupCodes: string[];
  };
  /** SMS configuration */
  sms?: {
    phoneNumber: string;
    verified: boolean;
  };
  /** Email configuration */
  email?: {
    emailAddress: string;
    verified: boolean;
  };
  /** WebAuthn configuration */
  webauthn?: {
    credentialId: string;
    publicKey: string;
    counter: number;
  };
}

/**
 * MFA challenge
 * @responsibility MFA challenge information
 */
export interface MFAChallenge {
  /** Challenge identifier */
  challengeId: string;
  /** Required MFA method */
  method: MFAMethod['type'];
  /** Challenge message */
  message: string;
  /** Challenge expiration */
  expiresAt: Date;
  /** Remaining attempts */
  remainingAttempts: number;
}

/**
 * MFA verification
 * @responsibility MFA verification attempt
 */
export interface MFAVerification {
  /** Challenge identifier */
  challengeId: string;
  /** Verification code */
  code: string;
  /** Method used for verification */
  method: MFAMethod['type'];
}

/**
 * Session information
 * @responsibility Active user session data
 */
export interface UserSession {
  /** Session identifier */
  sessionId: string;
  /** User identifier */
  userId: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Session device information */
  device: DeviceInfo;
  /** Session IP address */
  ipAddress: string;
  /** Session location */
  location?: SessionLocation;
}

/**
 * Device information
 * @responsibility Information about user's device
 */
export interface DeviceInfo {
  /** Device identifier */
  deviceId: string;
  /** Device type */
  type: 'desktop' | 'mobile' | 'tablet' | 'browser-extension';
  /** Operating system */
  os: string;
  /** Browser information */
  browser?: string;
  /** Device name/label */
  name?: string;
  /** Device trusted status */
  trusted: boolean;
}

/**
 * Session location
 * @responsibility Geographic location of session
 */
export interface SessionLocation {
  /** Country */
  country: string;
  /** Region/State */
  region: string;
  /** City */
  city: string;
  /** Latitude */
  latitude?: number;
  /** Longitude */
  longitude?: number;
}

/**
 * Authentication error codes
 * @responsibility Standardized error codes for authentication
 */
export type AuthErrorCode =
  | 'invalid-credentials'
  | 'user-not-found'
  | 'user-disabled'
  | 'email-not-verified'
  | 'account-locked'
  | 'password-expired'
  | 'mfa-required'
  | 'invalid-mfa-code'
  | 'session-expired'
  | 'rate-limited'
  | 'network-error'
  | 'unknown-error';

/**
 * Password reset request
 * @responsibility Password reset flow initiation
 */
export interface PasswordResetRequest {
  /** User email address */
  email: string;
  /** Reset token */
  token: string;
  /** Request timestamp */
  requestedAt: Date;
  /** Token expiration */
  expiresAt: Date;
  /** Reset completed status */
  completed: boolean;
}

/**
 * Password reset verification
 * @responsibility Password reset completion
 */
export interface PasswordResetVerification {
  /** Reset token */
  token: string;
  /** New password */
  newPassword: string;
  /** Confirmation password */
  confirmPassword: string;
}

/**
 * Account recovery options
 * @responsibility Available account recovery methods
 */
export interface AccountRecoveryOptions {
  /** Email recovery available */
  emailRecovery: boolean;
  /** SMS recovery available */
  smsRecovery: boolean;
  /** Security questions available */
  securityQuestions: boolean;
  /** Recovery codes available */
  recoveryCodes: boolean;
  /** Trusted contacts available */
  trustedContacts: boolean;
}
