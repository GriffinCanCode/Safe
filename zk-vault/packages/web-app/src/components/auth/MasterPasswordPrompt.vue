<template>
  <div class="master-password-prompt">
    <!-- Header -->
    <div class="prompt-header">
      <div class="vault-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h2 class="prompt-title">Unlock Your Vault</h2>
      <p class="prompt-subtitle">Enter your master password to access your passwords</p>
    </div>

    <!-- User Info -->
    <div class="user-info">
      <div class="user-avatar">
        <img
          v-if="userEmail"
          :src="avatarUrl"
          :alt="userEmail"
          class="avatar-image"
          @error="showAvatarFallback = true"
        />
        <div v-if="showAvatarFallback || !userEmail" class="avatar-fallback">
          {{ userInitials }}
        </div>
      </div>
      <div class="user-details">
        <span class="user-email">{{ userEmail || 'Unknown User' }}</span>
        <span class="last-login">Last login: {{ formatLastLogin() }}</span>
      </div>
    </div>

    <!-- Master Password Form -->
    <form @submit.prevent="handleUnlock" class="unlock-form">
      <div class="password-field">
        <BaseInput
          ref="passwordInput"
          v-model="masterPassword"
          type="password"
          label="Master Password"
          placeholder="Enter your master password"
          :error="passwordError"
          :disabled="loading || !!isLocked"
          required
          autocomplete="current-password"
          prefix-icon="key"
          @keydown="handleKeydown"
        />

        <!-- Password Hint -->
        <button
          v-if="passwordHint && !showHint"
          type="button"
          class="hint-button"
          @click="showHint = true"
          :disabled="loading"
        >
          Show password hint
        </button>

        <div v-if="showHint && passwordHint" class="password-hint">
          <div class="hint-content">
            <svg class="hint-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span class="hint-text">{{ passwordHint }}</span>
          </div>
        </div>
      </div>

      <!-- Unlock Button -->
      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        block
        :loading="loading"
        :disabled="!masterPassword || !!isLocked"
      >
        <span v-if="!loading">Unlock Vault</span>
        <span v-else>Unlocking...</span>
      </BaseButton>
    </form>

    <!-- Alternative Options -->
    <div class="alternative-options">
      <!-- Biometric Unlock -->
      <BaseButton
        v-if="biometricAvailable && !isLocked"
        variant="outline"
        size="lg"
        block
        :loading="biometricLoading"
        :disabled="loading"
        @click="handleBiometricUnlock"
        icon="fingerprint"
      >
        Unlock with Biometrics
      </BaseButton>

      <!-- Emergency Access -->
      <div class="emergency-section">
        <button
          type="button"
          class="emergency-link"
          @click="showEmergencyOptions = true"
          :disabled="loading"
        >
          Can't access your vault?
        </button>
      </div>
    </div>

    <!-- Attempt Counter -->
    <div v-if="failedAttempts > 0" class="attempt-warning">
      <svg class="warning-icon" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      <span class="warning-text">
        {{ failedAttempts }} failed attempt{{ failedAttempts > 1 ? 's' : '' }}.
        {{ (maxAttempts || 5) - failedAttempts }} attempt{{
          (maxAttempts || 5) - failedAttempts > 1 ? 's' : ''
        }}
        remaining.
      </span>
    </div>

    <!-- Lockout Message -->
    <div v-if="isLocked" class="lockout-message">
      <svg class="lockout-icon" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clip-rule="evenodd"
        />
      </svg>
      <div class="lockout-content">
        <h3 class="lockout-title">Account Temporarily Locked</h3>
        <p class="lockout-text">
          Too many failed attempts. Please wait {{ formatLockoutTime() }} before trying again.
        </p>
        <ProgressBar
          :value="lockoutProgress"
          :max="100"
          variant="warning"
          size="sm"
          animated
          class="lockout-progress"
        />
      </div>
    </div>

    <!-- Emergency Options Modal -->
    <BaseModal
      v-model="showEmergencyOptions"
      title="Emergency Access Options"
      size="md"
      @close="showEmergencyOptions = false"
    >
      <div class="emergency-content">
        <div class="emergency-option">
          <div class="option-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <div class="option-content">
            <h3 class="option-title">Reset Master Password</h3>
            <p class="option-description">
              Reset your master password using your email. This will permanently delete all your
              data.
            </p>
            <BaseButton
              variant="danger"
              size="sm"
              @click="initiateMasterPasswordReset"
              :loading="resetting"
            >
              Reset Password
            </BaseButton>
          </div>
        </div>

        <div class="emergency-option">
          <div class="option-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div class="option-content">
            <h3 class="option-title">Recovery Kit</h3>
            <p class="option-description">Use your emergency recovery kit if you have one saved.</p>
            <BaseButton variant="outline" size="sm" @click="initiateRecoveryKit">
              Use Recovery Kit
            </BaseButton>
          </div>
        </div>

        <div class="emergency-option">
          <div class="option-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z"
              />
            </svg>
          </div>
          <div class="option-content">
            <h3 class="option-title">Contact Support</h3>
            <p class="option-description">
              Get help from our support team. Note: We cannot recover your master password.
            </p>
            <BaseButton variant="outline" size="sm" @click="contactSupport">
              Contact Support
            </BaseButton>
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  userEmail?: string;
  passwordHint?: string;
  lastLogin?: Date;
  biometricAvailable?: boolean;
  maxAttempts?: number;
}

const props = withDefaults(defineProps<Props>(), {
  userEmail: '',
  passwordHint: '',
  lastLogin: () => new Date(),
  biometricAvailable: false,
  maxAttempts: 5,
});

const emit = defineEmits<{
  unlock: [masterPassword: string];
  biometricUnlock: [];
  resetPassword: [];
  recoveryKit: [];
  support: [];
}>();

// Store
const authStore = useAuthStore();

// State
const passwordInput = ref<any>(null);
const masterPassword = ref('');
const passwordError = ref('');
const loading = ref(false);
const biometricLoading = ref(false);
const resetting = ref(false);
const showHint = ref(false);
const showAvatarFallback = ref(false);
const showEmergencyOptions = ref(false);
const failedAttempts = ref(0);
const lockoutEndTime = ref<Date | null>(null);
const lockoutTimer = ref<number | null>(null);

// Computed
const userInitials = computed(() => {
  if (!props.userEmail) return 'U';
  const parts = props.userEmail.split('@')[0].split('.');
  return parts
    .map((part: string) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
});

const avatarUrl = computed(() => {
  if (!props.userEmail) return '';
  // Generate avatar URL (could use Gravatar, etc.)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(props.userEmail)}&background=6366f1&color=fff&size=48`;
});

const isLocked = computed(() => {
  return lockoutEndTime.value && new Date() < lockoutEndTime.value;
});

const lockoutProgress = computed(() => {
  if (!lockoutEndTime.value) return 0;

  const lockoutDuration = 5 * 60 * 1000; // 5 minutes
  const elapsed = Date.now() - (lockoutEndTime.value.getTime() - lockoutDuration);
  const progress = (elapsed / lockoutDuration) * 100;

  return Math.min(100, Math.max(0, progress));
});

// Methods
const formatLastLogin = () => {
  if (!props.lastLogin) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - props.lastLogin.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return props.lastLogin.toLocaleDateString();
};

const formatLockoutTime = () => {
  if (!lockoutEndTime.value) return '';

  const remaining = lockoutEndTime.value.getTime() - Date.now();
  const minutes = Math.ceil(remaining / (1000 * 60));

  if (minutes <= 1) return 'less than a minute';
  return `${minutes} minutes`;
};

const handleUnlock = async () => {
  if (!masterPassword.value || loading.value || isLocked.value) return;

  passwordError.value = '';
  loading.value = true;

  try {
    // Simulate authentication
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For demo purposes, reject if password is "wrong"
    if (masterPassword.value === 'wrong') {
      throw new Error('Invalid master password');
    }

    // Reset failed attempts on success
    failedAttempts.value = 0;
    emit('unlock', masterPassword.value);
  } catch (error: unknown) {
    failedAttempts.value++;
    const errorMessage = error instanceof Error ? error.message : 'Invalid master password';
    passwordError.value = errorMessage;

    // Trigger lockout if max attempts reached
    if (failedAttempts.value >= props.maxAttempts) {
      triggerLockout();
    }

    // Clear password and refocus
    masterPassword.value = '';
    await nextTick();
    passwordInput.value?.focus();
  } finally {
    loading.value = false;
  }
};

const handleBiometricUnlock = async () => {
  biometricLoading.value = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    emit('biometricUnlock');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Biometric authentication failed';
    passwordError.value = errorMessage;
  } finally {
    biometricLoading.value = false;
  }
};

const triggerLockout = () => {
  const lockoutDuration = 5 * 60 * 1000; // 5 minutes
  lockoutEndTime.value = new Date(Date.now() + lockoutDuration);

  // Start countdown timer
  startLockoutTimer();
};

const startLockoutTimer = () => {
  if (lockoutTimer.value) {
    clearInterval(lockoutTimer.value);
  }

  lockoutTimer.value = window.setInterval(() => {
    if (!isLocked.value) {
      clearInterval(lockoutTimer.value!);
      lockoutTimer.value = null;
      lockoutEndTime.value = null;
    }
  }, 1000);
};

const handleKeydown = (event: KeyboardEvent) => {
  // Clear error on typing
  if (passwordError.value) {
    passwordError.value = '';
  }
};

const initiateMasterPasswordReset = () => {
  resetting.value = true;
  showEmergencyOptions.value = false;

  setTimeout(() => {
    resetting.value = false;
    emit('resetPassword');
  }, 1000);
};

const initiateRecoveryKit = () => {
  showEmergencyOptions.value = false;
  emit('recoveryKit');
};

const contactSupport = () => {
  showEmergencyOptions.value = false;
  emit('support');
};

// Lifecycle
onMounted(() => {
  // Auto-focus password input
  nextTick(() => {
    passwordInput.value?.focus();
  });
});

onUnmounted(() => {
  if (lockoutTimer.value) {
    clearInterval(lockoutTimer.value);
  }
});
</script>

<!-- Styles are now handled by the comprehensive CSS architecture in /src/styles/components/auth/master-password-prompt.css -->
