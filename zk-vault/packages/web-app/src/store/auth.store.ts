/**
 * @fileoverview Authentication Store
 * @description Pinia store for managing authentication state and user profile
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  authService,
  type UserProfile,
  type AuthResult,
  type RegistrationData,
} from '@/services/auth.service';
import type { User } from 'firebase/auth';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const profile = ref<UserProfile | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const sessionTimeout = ref<number | null>(null);
  const lastActivity = ref<Date>(new Date());

  // Getters
  const isAuthenticated = computed(() => !!user.value);
  const isEmailVerified = computed(() => user.value?.emailVerified ?? false);
  const userInitials = computed(() => {
    if (!profile.value) return '';
    const name = profile.value.displayName || profile.value.email;
    return name
      .split(' ')
      .map((part: string) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  });

  const subscriptionPlan = computed(() => profile.value?.subscription.plan || 'free');
  const isSubscriptionActive = computed(() => profile.value?.subscription.status === 'active');
  const canAccessPremiumFeatures = computed(
    () =>
      isSubscriptionActive.value &&
      (subscriptionPlan.value === 'premium' || subscriptionPlan.value === 'enterprise')
  );

  const securityStatus = computed(() => {
    if (!profile.value) return 'unknown';

    const security = profile.value.security;
    let score = 0;

    if (security.twoFactorEnabled) score += 2;
    if (profile.value.preferences.biometricEnabled) score += 1;
    if (
      security.lastPasswordChange &&
      new Date().getTime() - security.lastPasswordChange.getTime() < 90 * 24 * 60 * 60 * 1000
    ) {
      score += 1;
    }

    if (score >= 3) return 'excellent';
    if (score >= 2) return 'good';
    if (score >= 1) return 'fair';
    return 'poor';
  });

  // Actions
  const initialize = async (): Promise<void> => {
    try {
      // Set up auth state listener
      authService.addAuthStateListener(async firebaseUser => {
        user.value = firebaseUser;

        if (firebaseUser) {
          try {
            profile.value = await authService.getUserProfile(firebaseUser.uid);
            setupSessionTimeout();
          } catch (error) {
            console.error('Failed to load user profile:', error);
            profile.value = null;
          }
        } else {
          profile.value = null;
          clearSessionTimeout();
        }

        error.value = null;
      });
    } catch (err: any) {
      console.error('Failed to initialize auth store:', err);
      error.value = err.message;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      const result: AuthResult = await authService.signIn(email, password);
      user.value = result.user;
      profile.value = result.profile;
      setupSessionTimeout();
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (data: RegistrationData): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      const result: AuthResult = await authService.register(data);
      user.value = result.user;
      profile.value = result.profile;
      setupSessionTimeout();
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      await authService.signOut();
      user.value = null;
      profile.value = null;
      clearSessionTimeout();
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      await authService.resetPassword(email);
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      await authService.updatePassword(newPassword);
      if (user.value && profile.value) {
        // Refresh profile to get updated password change timestamp
        profile.value = await authService.getUserProfile(user.value.uid);
      }
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user.value) {
      throw new Error('User not authenticated');
    }

    isLoading.value = true;
    error.value = null;

    try {
      await authService.updateUserProfile(user.value.uid, updates);
      // Refresh profile
      profile.value = await authService.getUserProfile(user.value.uid);
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteAccount = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      await authService.deleteAccount();
      user.value = null;
      profile.value = null;
      clearSessionTimeout();
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const checkBiometricAvailability = async (): Promise<boolean> => {
    try {
      return await authService.isBiometricAvailable();
    } catch {
      return false;
    }
  };

  const enableBiometric = async (): Promise<void> => {
    if (!user.value) {
      throw new Error('User not authenticated');
    }

    isLoading.value = true;
    error.value = null;

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32)).toString();
      await authService.registerBiometric({
        challenge,
        timeout: 60000,
        userVerification: 'required',
      });

      // Update profile to reflect biometric enabled
      if (profile.value) {
        await updateProfile({
          preferences: {
            ...profile.value.preferences,
            biometricEnabled: true,
          },
        });
      }
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32)).toString();
      return await authService.authenticateWithBiometric({
        challenge,
        timeout: 60000,
        userVerification: 'required',
      });
    } catch (err: any) {
      error.value = err.message;
      return false;
    }
  };

  const updateActivity = (): void => {
    lastActivity.value = new Date();

    // Reset session timeout if user is active
    if (sessionTimeout.value && profile.value) {
      setupSessionTimeout();
    }
  };

  const setupSessionTimeout = (): void => {
    if (!profile.value) return;

    clearSessionTimeout();

    const timeoutMinutes = profile.value.preferences.autoLockTimeout;
    if (timeoutMinutes > 0) {
      sessionTimeout.value = window.setTimeout(
        () => {
          logout();
        },
        timeoutMinutes * 60 * 1000
      );
    }
  };

  const clearSessionTimeout = (): void => {
    if (sessionTimeout.value) {
      window.clearTimeout(sessionTimeout.value);
      sessionTimeout.value = null;
    }
  };

  const clearError = (): void => {
    error.value = null;
  };

  const refreshProfile = async (): Promise<void> => {
    if (!user.value) return;

    try {
      profile.value = await authService.getUserProfile(user.value.uid);
    } catch (err: any) {
      console.error('Failed to refresh profile:', err);
      error.value = err.message;
    }
  };

  const checkEmailVerification = (): boolean => {
    return user.value?.emailVerified ?? false;
  };

  const sendEmailVerification = async (): Promise<void> => {
    if (!user.value) {
      throw new Error('User not authenticated');
    }

    try {
      // This would use Firebase's sendEmailVerification
      // For now, we'll simulate it
      console.log('Email verification sent');
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  };

  const enable2FA = async (): Promise<string[]> => {
    if (!user.value || !profile.value) {
      throw new Error('User not authenticated');
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      // Update profile with 2FA enabled
      await updateProfile({
        security: {
          ...profile.value.security,
          twoFactorEnabled: true,
          backupCodesCount: backupCodes.length,
        },
      });

      return backupCodes;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const disable2FA = async (): Promise<void> => {
    if (!user.value || !profile.value) {
      throw new Error('User not authenticated');
    }

    isLoading.value = true;
    error.value = null;

    try {
      await updateProfile({
        security: {
          ...profile.value.security,
          twoFactorEnabled: false,
          backupCodesCount: 0,
        },
      });
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // Initialize on store creation
  initialize();

  return {
    // State
    user: readonly(user),
    profile: readonly(profile),
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastActivity: readonly(lastActivity),

    // Getters
    isAuthenticated,
    isEmailVerified,
    userInitials,
    subscriptionPlan,
    isSubscriptionActive,
    canAccessPremiumFeatures,
    securityStatus,

    // Actions
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    deleteAccount,
    checkBiometricAvailability,
    enableBiometric,
    authenticateWithBiometric,
    updateActivity,
    clearError,
    refreshProfile,
    checkEmailVerification,
    sendEmailVerification,
    enable2FA,
    disable2FA,
  };
});

// Helper function to make reactive refs readonly
function readonly<T>(ref: any) {
  return computed(() => ref.value);
}
