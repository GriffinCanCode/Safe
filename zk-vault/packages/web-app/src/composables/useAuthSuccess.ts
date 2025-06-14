/**
 * Authentication Success Composable
 * Handles success states, animations, and user feedback for authentication flows
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface AuthSuccessOptions {
  type: 'biometric' | 'password' | 'mfa';
  duration?: number;
  showProgress?: boolean;
  showDetails?: boolean;
  autoRedirect?: boolean;
  redirectDelay?: number;
}

export interface AuthSuccessInfo {
  method: string;
  securityLevel: 'Low' | 'Medium' | 'High' | 'Maximum';
  sessionDuration: string;
  timestamp: Date;
  deviceInfo?: string;
}

export function useAuthSuccess(options: AuthSuccessOptions = { type: 'biometric' }) {
  // State
  const isVisible = ref(false);
  const isAnimating = ref(false);
  const progress = ref(0);
  const showFeedback = ref(false);

  // Timers
  let progressTimer: NodeJS.Timeout | null = null;
  let feedbackTimer: NodeJS.Timeout | null = null;
  let redirectTimer: NodeJS.Timeout | null = null;

  // Computed properties
  const successClasses = computed(() => ({
    'auth-success': true,
    biometric: options.type === 'biometric',
    password: options.type === 'password',
    mfa: options.type === 'mfa',
    quick: options.duration && options.duration < 2000,
  }));

  const successInfo = computed((): AuthSuccessInfo => {
    const baseInfo: AuthSuccessInfo = {
      method: getMethodDisplayName(options.type),
      securityLevel: getSecurityLevel(options.type),
      sessionDuration: getSessionDuration(),
      timestamp: new Date(),
    };

    // Add device info for biometric authentication
    if (options.type === 'biometric') {
      baseInfo.deviceInfo = getDeviceInfo();
    }

    return baseInfo;
  });

  const feedbackMessage = computed(() => {
    switch (options.type) {
      case 'biometric':
        return 'Secure biometric connection established';
      case 'password':
        return 'Password authentication successful';
      case 'mfa':
        return 'Multi-factor authentication complete';
      default:
        return 'Authentication successful';
    }
  });

  const feedbackIcon = computed(() => {
    switch (options.type) {
      case 'biometric':
        return 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z';
      case 'password':
        return 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z';
      case 'mfa':
        return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
      default:
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  });

  // Methods
  const show = async (customOptions?: Partial<AuthSuccessOptions>) => {
    // Merge options
    const mergedOptions = { ...options, ...customOptions };

    isVisible.value = true;
    isAnimating.value = true;

    // Start progress animation if enabled
    if (mergedOptions.showProgress !== false) {
      startProgressAnimation(mergedOptions.duration || 3000);
    }

    // Show feedback after initial animation
    feedbackTimer = setTimeout(() => {
      showFeedback.value = true;
    }, 900);

    // Auto redirect if enabled
    if (mergedOptions.autoRedirect) {
      const delay = mergedOptions.redirectDelay || 2500;
      redirectTimer = setTimeout(() => {
        emit('redirect');
      }, delay);
    }

    // Mark animation as complete
    setTimeout(() => {
      isAnimating.value = false;
    }, 1000);
  };

  const hide = () => {
    isVisible.value = false;
    isAnimating.value = false;
    showFeedback.value = false;
    progress.value = 0;
    clearTimers();
  };

  const startProgressAnimation = (duration: number) => {
    progress.value = 0;
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;

    progressTimer = setInterval(() => {
      progress.value += increment;
      if (progress.value >= 100) {
        progress.value = 100;
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
      }
    }, interval);
  };

  const clearTimers = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      redirectTimer = null;
    }
  };

  const getMethodDisplayName = (type: string): string => {
    switch (type) {
      case 'biometric':
        return 'Biometric';
      case 'password':
        return 'Password';
      case 'mfa':
        return 'Multi-Factor';
      default:
        return 'Standard';
    }
  };

  const getSecurityLevel = (type: string): 'Low' | 'Medium' | 'High' | 'Maximum' => {
    switch (type) {
      case 'biometric':
        return 'High';
      case 'password':
        return 'Medium';
      case 'mfa':
        return 'Maximum';
      default:
        return 'Low';
    }
  };

  const getSessionDuration = (): string => {
    // This could be dynamic based on security policies
    return '24 hours';
  };

  const getDeviceInfo = (): string => {
    if (typeof navigator === 'undefined') return 'Unknown Device';

    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Linux')) return 'Linux';

    return 'Unknown Device';
  };

  // Event emitter (would be replaced with actual emit in component)
  const emit = (event: string, ...args: any[]) => {
    console.log(`Auth success event: ${event}`, ...args);
  };

  // Lifecycle
  onUnmounted(() => {
    clearTimers();
  });

  return {
    // State
    isVisible,
    isAnimating,
    progress,
    showFeedback,

    // Computed
    successClasses,
    successInfo,
    feedbackMessage,
    feedbackIcon,

    // Methods
    show,
    hide,
    clearTimers,
  };
}
