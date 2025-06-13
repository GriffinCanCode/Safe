/**
 * @fileoverview Authentication Service
 * @description Handles user authentication using zero-knowledge cryptography
 */

import { ZeroKnowledgeAuth, ZeroKnowledgeVault } from '@zk-vault/crypto';
import type { SRPAuthProof, MasterKeyStructure, CryptoOperationResult } from '@zk-vault/shared';

// User profile interface
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
    biometricEnabled: boolean;
    autoLockTimeout: number; // minutes
  };
  security: {
    twoFactorEnabled: boolean;
    backupCodesCount: number;
    lastPasswordChange: Date;
    loginAttempts: number;
    lockedUntil?: Date;
  };
  subscription: {
    plan: 'free' | 'premium' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt?: Date;
  };
}

// Authentication result interface
export interface AuthResult {
  user: ZKUser;
  profile: UserProfile;
  isNewUser: boolean;
  masterKeyStructure: MasterKeyStructure;
}

// ZK User interface
export interface ZKUser {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
}

// Registration data interface
export interface RegistrationData {
  email: string;
  password: string;
  displayName?: string;
  acceptTerms: boolean;
  acceptMarketing?: boolean;
}

// Biometric authentication interface
export interface BiometricOptions {
  challenge: string;
  timeout: number;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

class AuthService {
  private static instance: AuthService;
  private authStateListeners: Set<(user: ZKUser | null) => void> = new Set();
  private currentUser: ZKUser | null = null;
  private currentProfile: UserProfile | null = null;
  private masterKeyStructure: MasterKeyStructure | null = null;
  private zkVault: ZeroKnowledgeVault = new ZeroKnowledgeVault();

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register new user with zero-knowledge authentication
   */
  async register(data: RegistrationData): Promise<AuthResult> {
    try {
      if (!data.acceptTerms) {
        throw new Error('Terms and conditions must be accepted');
      }

      // Initialize ZK vault with password to create master key structure
      const initResult = await this.zkVault.initialize(data.password, data.email);
      if (!initResult.success || !initResult.data) {
        throw new Error(initResult.error || 'Failed to initialize vault');
      }

      // Create user profile
      const userId = this.generateUserId(data.email);
      const user: ZKUser = {
        uid: userId,
        email: data.email,
        emailVerified: false,
        ...(data.displayName && { displayName: data.displayName }),
      };

      const profile = await this.createUserProfile(user, {
        displayName: data.displayName,
        acceptMarketing: data.acceptMarketing,
      });

      // Store user data in localStorage for this demo
      this.storeUserSession(user, profile, initResult.data);

      this.currentUser = user;
      this.currentProfile = profile;
      this.masterKeyStructure = initResult.data;
      this.notifyAuthStateListeners(user);

      return {
        user,
        profile,
        isNewUser: true,
        masterKeyStructure: initResult.data,
      };
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with zero-knowledge authentication
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // Verify stored credentials exist
      const storedUser = this.getStoredUser(email);
      if (!storedUser) {
        throw new Error('No account found with this email');
      }

      // Initialize ZK vault with password
      const initResult = await this.zkVault.initialize(password, email);
      if (!initResult.success || !initResult.data) {
        await this.incrementLoginAttempts(email);
        throw new Error('Invalid credentials');
      }

      const profile = await this.getUserProfile(storedUser.uid);

      // Check if account is locked
      if (profile.security.lockedUntil && profile.security.lockedUntil > new Date()) {
        throw new Error('Account is temporarily locked due to multiple failed login attempts');
      }

      // Reset login attempts on successful login
      await this.resetLoginAttempts(storedUser.uid);
      await this.updateLastLoginTime(storedUser.uid);

      this.currentUser = storedUser;
      this.currentProfile = profile;
      this.masterKeyStructure = initResult.data;
      this.notifyAuthStateListeners(storedUser);

      return {
        user: storedUser,
        profile,
        isNewUser: false,
        masterKeyStructure: initResult.data,
      };
    } catch (error: any) {
      console.error('Sign in failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      this.clearUserSession();
      this.currentUser = null;
      this.currentProfile = null;
      this.masterKeyStructure = null;
      this.zkVault.lock();
      this.notifyAuthStateListeners(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email (simulated)
   */
  async resetPassword(email: string): Promise<void> {
    try {
      // In a real implementation, this would trigger a secure reset process
      console.log(`Password reset initiated for: ${email}`);
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Password reset failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      // Initialize vault with new password to create new master key structure
      const initResult = await this.zkVault.initialize(newPassword, this.currentUser.email);
      if (!initResult.success || !initResult.data) {
        throw new Error('Failed to update password');
      }

      // Update stored user data
      this.updateStoredUserAuth(this.currentUser.uid, initResult.data);

      // Update profile with password change timestamp
      if (this.currentProfile) {
        this.currentProfile.security.lastPasswordChange = new Date();
        this.updateStoredProfile(this.currentUser.uid, this.currentProfile);
      }

      this.masterKeyStructure = initResult.data;
    } catch (error: any) {
      console.error('Password update failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      // Remove user data from storage
      this.removeStoredUser(this.currentUser.uid);

      // Sign out
      await this.signOut();
    } catch (error: any) {
      console.error('Account deletion failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    if (!window.PublicKeyCredential) {
      return false;
    }

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Register biometric credentials
   */
  async registerBiometric(options: BiometricOptions): Promise<string> {
    try {
      if (!(await this.isBiometricAvailable())) {
        throw new Error('Biometric authentication not available');
      }

      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: new TextEncoder().encode(options.challenge),
          rp: {
            name: 'ZK-Vault',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(this.currentUser.uid),
            name: this.currentUser.email,
            displayName: this.currentUser.displayName || this.currentUser.email,
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: options.timeout,
          userVerification: options.userVerification,
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: options.userVerification,
          },
        },
      })) as PublicKeyCredential;

      const credentialId = Array.from(new Uint8Array(credential.rawId))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Update profile to reflect biometric enabled
      if (this.currentProfile) {
        this.currentProfile.preferences.biometricEnabled = true;
        this.updateStoredProfile(this.currentUser.uid, this.currentProfile);
      }

      return credentialId;
    } catch (error) {
      console.error('Biometric registration failed:', error);
      throw new Error('Failed to register biometric authentication');
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometric(options: BiometricOptions): Promise<boolean> {
    try {
      if (!(await this.isBiometricAvailable())) {
        throw new Error('Biometric authentication not available');
      }

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: new TextEncoder().encode(options.challenge),
          timeout: options.timeout,
          userVerification: options.userVerification,
          rpId: window.location.hostname,
        },
      })) as PublicKeyCredential;

      return assertion !== null;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): ZKUser | null {
    return this.currentUser;
  }

  /**
   * Get current master key structure
   */
  getMasterKeyStructure(): MasterKeyStructure | null {
    return this.masterKeyStructure;
  }

  /**
   * Get ZK Vault instance
   */
  getZKVault(): ZeroKnowledgeVault {
    return this.zkVault;
  }

  /**
   * Get user profile
   */
  async getUserProfile(uid: string): Promise<UserProfile> {
    try {
      const profile = this.getStoredProfile(uid);
      if (!profile) {
        throw new Error('User profile not found');
      }
      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const currentProfile = await this.getUserProfile(uid);
      const updatedProfile = { ...currentProfile, ...updates };
      this.updateStoredProfile(uid, updatedProfile);

      if (this.currentUser?.uid === uid) {
        this.currentProfile = updatedProfile;
      }
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Add auth state listener
   */
  addAuthStateListener(listener: (user: ZKUser | null) => void): () => void {
    this.authStateListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(listener);
    };
  }

  /**
   * Initialize auth state from storage
   */
  async initializeAuthState(): Promise<void> {
    try {
      const session = this.getStoredSession();
      if (session) {
        this.currentUser = session.user;
        this.currentProfile = session.profile;
        this.masterKeyStructure = session.masterKeyStructure;

        // Restore the ZK vault if we have the master key structure
        if (session.masterKeyStructure) {
          await this.zkVault.restoreFromMasterKey(session.masterKeyStructure);
        }

        this.notifyAuthStateListeners(session.user);
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
    }
  }

  // Private helper methods

  private generateUserId(email: string): string {
    // Generate deterministic user ID from email
    return btoa(email)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);
  }

  private async createUserProfile(user: ZKUser, additionalData?: any): Promise<UserProfile> {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      preferences: {
        theme: 'auto',
        language: 'en',
        notifications: true,
        biometricEnabled: false,
        autoLockTimeout: 15,
      },
      security: {
        twoFactorEnabled: false,
        backupCodesCount: 0,
        lastPasswordChange: new Date(),
        loginAttempts: 0,
      },
      subscription: {
        plan: 'free',
        status: 'active',
      },
      ...(additionalData?.displayName && {
        displayName: additionalData.displayName,
      }),
    };

    this.storeUserProfile(user.uid, profile);
    return profile;
  }

  private async updateLastLoginTime(uid: string): Promise<void> {
    try {
      const profile = await this.getUserProfile(uid);
      profile.lastLoginAt = new Date();
      this.updateStoredProfile(uid, profile);
    } catch (error) {
      console.error('Failed to update last login time:', error);
    }
  }

  private async incrementLoginAttempts(email: string): Promise<void> {
    try {
      const user = this.getStoredUser(email);
      if (user) {
        const profile = await this.getUserProfile(user.uid);
        profile.security.loginAttempts += 1;

        // Lock account after 5 failed attempts
        if (profile.security.loginAttempts >= 5) {
          profile.security.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        this.updateStoredProfile(user.uid, profile);
      }
    } catch (error) {
      console.error('Failed to increment login attempts:', error);
    }
  }

  private async resetLoginAttempts(uid: string): Promise<void> {
    try {
      const profile = await this.getUserProfile(uid);
      profile.security.loginAttempts = 0;
      delete profile.security.lockedUntil;
      this.updateStoredProfile(uid, profile);
    } catch (error) {
      console.error('Failed to reset login attempts:', error);
    }
  }

  private notifyAuthStateListeners(user: ZKUser | null): void {
    this.authStateListeners.forEach(listener => listener(user));
  }

  private handleAuthError(error: any): Error {
    const errorMap: Record<string, string> = {
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/weak-password': 'Password is too weak',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Invalid password',
      'auth/invalid-email': 'Invalid email address',
      'auth/user-disabled': 'This account has been disabled',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection',
    };

    const message = errorMap[error.code] || error.message || 'An unknown error occurred';
    return new Error(message);
  }

  // Storage helper methods (using localStorage for demo)

  private storeUserSession(
    user: ZKUser,
    profile: UserProfile,
    masterKeyStructure: MasterKeyStructure
  ): void {
    const session = { user, profile, masterKeyStructure };
    localStorage.setItem('zk-vault-session', JSON.stringify(session, this.dateReplacer));
    localStorage.setItem(`zk-vault-user-${user.email}`, JSON.stringify(user, this.dateReplacer));
  }

  private getStoredSession(): {
    user: ZKUser;
    profile: UserProfile;
    masterKeyStructure: MasterKeyStructure;
  } | null {
    try {
      const session = localStorage.getItem('zk-vault-session');
      return session ? JSON.parse(session, this.dateReviver) : null;
    } catch {
      return null;
    }
  }

  private clearUserSession(): void {
    localStorage.removeItem('zk-vault-session');
  }

  private getStoredUser(email: string): ZKUser | null {
    try {
      const user = localStorage.getItem(`zk-vault-user-${email}`);
      return user ? JSON.parse(user, this.dateReviver) : null;
    } catch {
      return null;
    }
  }

  private storeUserProfile(uid: string, profile: UserProfile): void {
    localStorage.setItem(`zk-vault-profile-${uid}`, JSON.stringify(profile, this.dateReplacer));
  }

  private getStoredProfile(uid: string): UserProfile | null {
    try {
      const profile = localStorage.getItem(`zk-vault-profile-${uid}`);
      return profile ? JSON.parse(profile, this.dateReviver) : null;
    } catch {
      return null;
    }
  }

  private updateStoredProfile(uid: string, profile: UserProfile): void {
    this.storeUserProfile(uid, profile);
  }

  private updateStoredUserAuth(uid: string, masterKeyStructure: MasterKeyStructure): void {
    // Store updated auth data
    const session = this.getStoredSession();
    if (session) {
      session.masterKeyStructure = masterKeyStructure;
      localStorage.setItem('zk-vault-session', JSON.stringify(session, this.dateReplacer));
    }
  }

  private removeStoredUser(uid: string): void {
    // Remove all user data
    localStorage.removeItem('zk-vault-session');
    localStorage.removeItem(`zk-vault-profile-${uid}`);

    // Find and remove user by uid
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('zk-vault-user-')) {
        const userData = localStorage.getItem(key);
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.uid === uid) {
              localStorage.removeItem(key);
              break;
            }
          } catch {
            // Ignore invalid data
          }
        }
      }
    }
  }

  private dateReplacer(key: string, value: any): any {
    return value instanceof Date ? { __date: value.toISOString() } : value;
  }

  private dateReviver(key: string, value: any): any {
    return value?.__date ? new Date(value.__date) : value;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.authStateListeners.clear();
  }
}

export const authService = AuthService.getInstance();
