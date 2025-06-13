/**
 * @fileoverview Authentication Composable
 * @description Provides reactive authentication state and methods for Vue components
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  authService,
  type UserProfile,
  type RegistrationData,
  type BiometricOptions,
} from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

export interface UseAuthOptions {
  redirectOnLogin?: string;
  redirectOnLogout?: string;
  autoRedirect?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const router = useRouter();
  const authStore = useAuthStore();

  // Local state
  const isInitializing = ref(true);
  const authError = ref<string | null>(null);

  // Computed properties from store
  const user = computed(() => authStore.user);
  const profile = computed(() => authStore.profile);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isLoading = computed(() => authStore.isLoading);
  const isEmailVerified = computed(() => authStore.isEmailVerified);
  const userInitials = computed(() => authStore.userInitials);
  const subscriptionPlan = computed(() => authStore.subscriptionPlan);
  const isSubscriptionActive = computed(() => authStore.isSubscriptionActive);
  const canAccessPremiumFeatures = computed(() => authStore.canAccessPremiumFeatures);
  const securityStatus = computed(() => authStore.securityStatus);
  const lastActivity = computed(() => authStore.lastActivity);

  // Authentication methods
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      authError.value = null;
      await authStore.login(credentials.email, credentials.password);

      if (options.autoRedirect !== false) {
        const redirectTo = options.redirectOnLogin || '/dashboard';
        await router.push(redirectTo);
      }
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const register = async (data: RegistrationData): Promise<void> => {
    try {
      authError.value = null;
      await authStore.register(data);

      if (options.autoRedirect !== false) {
        const redirectTo = options.redirectOnLogin || '/dashboard';
        await router.push(redirectTo);
      }
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      authError.value = null;
      await authStore.logout();

      if (options.autoRedirect !== false) {
        const redirectTo = options.redirectOnLogout || '/auth/login';
        await router.push(redirectTo);
      }
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      authError.value = null;
      await authStore.resetPassword(email);
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      authError.value = null;
      await authStore.updatePassword(newPassword);
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    try {
      authError.value = null;
      await authStore.updateProfile(updates);
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const deleteAccount = async (): Promise<void> => {
    try {
      authError.value = null;
      await authStore.deleteAccount();

      if (options.autoRedirect !== false) {
        const redirectTo = options.redirectOnLogout || '/auth/login';
        await router.push(redirectTo);
      }
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  // Biometric authentication
  const checkBiometricAvailability = async (): Promise<boolean> => {
    try {
      return await authStore.checkBiometricAvailability();
    } catch (error: any) {
      authError.value = error.message;
      return false;
    }
  };

  const enableBiometric = async (): Promise<void> => {
    try {
      authError.value = null;
      await authStore.enableBiometric();
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const authenticateWithBiometric = async (): Promise<BiometricAuthResult> => {
    try {
      authError.value = null;
      const success = await authStore.authenticateWithBiometric();

      if (success && options.autoRedirect !== false) {
        const redirectTo = options.redirectOnLogin || '/dashboard';
        await router.push(redirectTo);
      }

      return { success };
    } catch (error: any) {
      authError.value = error.message;
      return { success: false, error: error.message };
    }
  };

  // Two-factor authentication
  const enable2FA = async (): Promise<string[]> => {
    try {
      authError.value = null;
      return await authStore.enable2FA();
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const disable2FA = async (): Promise<void> => {
    try {
      authError.value = null;
      await authStore.disable2FA();
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  // Email verification
  const sendEmailVerification = async (): Promise<void> => {
    try {
      authError.value = null;
      await authStore.sendEmailVerification();
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  const checkEmailVerification = (): boolean => {
    return authStore.checkEmailVerification();
  };

  // Session management
  const updateActivity = (): void => {
    authStore.updateActivity();
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      authError.value = null;
      await authStore.refreshProfile();
    } catch (error: any) {
      authError.value = error.message;
      throw error;
    }
  };

  // Utility methods
  const clearError = (): void => {
    authError.value = null;
    authStore.clearError();
  };

  const requireAuth = (): void => {
    if (!isAuthenticated.value) {
      router.push('/auth/login');
    }
  };

  const requireEmailVerification = (): void => {
    if (!isEmailVerified.value) {
      router.push('/auth/verify-email');
    }
  };

  const requirePremium = (): void => {
    if (!canAccessPremiumFeatures.value) {
      router.push('/subscription/upgrade');
    }
  };

  // Activity tracking
  let activityTimer: number | null = null;

  const startActivityTracking = (): void => {
    const trackActivity = () => {
      updateActivity();
    };

    // Track various user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    // Set up periodic activity updates
    activityTimer = window.setInterval(() => {
      updateActivity();
    }, 60000); // Update every minute
  };

  const stopActivityTracking = (): void => {
    if (activityTimer) {
      clearInterval(activityTimer);
      activityTimer = null;
    }

    const trackActivity = () => {
      updateActivity();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.removeEventListener(event, trackActivity);
    });
  };

  // Initialize authentication state
  const initialize = async (): Promise<void> => {
    try {
      isInitializing.value = true;
      await authService.initializeAuthState();

      if (isAuthenticated.value) {
        startActivityTracking();
      }
    } catch (error: any) {
      console.error('Failed to initialize auth state:', error);
      authError.value = error.message;
    } finally {
      isInitializing.value = false;
    }
  };

  // Lifecycle hooks
  onMounted(() => {
    initialize();
  });

  onUnmounted(() => {
    stopActivityTracking();
  });

  return {
    // State
    user,
    profile,
    isAuthenticated,
    isLoading,
    isInitializing,
    isEmailVerified,
    userInitials,
    subscriptionPlan,
    isSubscriptionActive,
    canAccessPremiumFeatures,
    securityStatus,
    lastActivity,
    authError,

    // Methods
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
    enable2FA,
    disable2FA,
    sendEmailVerification,
    checkEmailVerification,
    updateActivity,
    refreshProfile,
    clearError,
    requireAuth,
    requireEmailVerification,
    requirePremium,
    initialize,
  };
}
