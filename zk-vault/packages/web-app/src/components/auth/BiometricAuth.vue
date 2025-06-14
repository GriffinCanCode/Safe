<template>
  <div class="biometric-auth">
    <!-- Header -->
    <div class="auth-header">
      <div class="biometric-icon" :class="iconClasses">
        <svg v-if="currentStep === 'prompt'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
        <svg
          v-else-if="currentStep === 'authenticating'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <svg
          v-else-if="currentStep === 'success'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <svg
          v-else-if="currentStep === 'error'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 class="auth-title">{{ stepTitle }}</h2>
      <p class="auth-subtitle">{{ stepSubtitle }}</p>
    </div>

    <!-- Biometric Prompt -->
    <div v-if="currentStep === 'prompt'" class="auth-content">
      <!-- Available Methods -->
      <div class="biometric-methods">
        <div
          v-for="method in availableMethods"
          :key="method.type"
          class="method-item"
          :class="{ 'method-preferred': method.preferred }"
        >
          <div class="method-icon">
            <svg
              v-if="method.type === 'fingerprint'"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            <svg
              v-else-if="method.type === 'face'"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div class="method-info">
            <h3 class="method-name">{{ method.name }}</h3>
            <p class="method-description">{{ method.description }}</p>
          </div>
          <div v-if="method.preferred" class="preferred-badge">Preferred</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="auth-actions">
        <BaseButton
          variant="primary"
          size="lg"
          block
          @click="startAuthentication"
          :disabled="!canAuthenticate"
          icon="fingerprint"
        >
          Use Biometric Authentication
        </BaseButton>

        <BaseButton variant="outline" size="lg" block @click="useFallback">
          Use Password Instead
        </BaseButton>
      </div>
    </div>

    <!-- Authentication in Progress -->
    <div v-else-if="currentStep === 'authenticating'" class="auth-content">
      <div class="auth-progress">
        <LoadingSpinner size="lg" />
        <div class="progress-content">
          <h3 class="progress-title">Authenticating...</h3>
          <p class="progress-text">{{ authenticationMessage }}</p>
        </div>
      </div>

      <div class="auth-actions">
        <BaseButton variant="outline" @click="cancelAuthentication" :disabled="!canCancel">
          Cancel
        </BaseButton>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="currentStep === 'success'" class="auth-content">
      <div class="auth-success biometric">
        <div class="auth-success-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div class="auth-success-content">
          <h3 class="auth-success-title">Authentication Successful!</h3>
          <p class="auth-success-subtitle">Access Granted</p>
          <p class="auth-success-message">
            You have been successfully authenticated using biometrics.
          </p>
        </div>

        <div class="auth-success-details">
          <div class="auth-success-info">
            <span class="auth-success-info-label">Authentication Method</span>
            <span class="auth-success-info-value">{{ authSuccess.successInfo.value.method }}</span>
          </div>
          <div class="auth-success-info">
            <span class="auth-success-info-label">Security Level</span>
            <span class="auth-success-info-value">{{
              authSuccess.successInfo.value.securityLevel
            }}</span>
          </div>
          <div class="auth-success-info">
            <span class="auth-success-info-label">Session Duration</span>
            <span class="auth-success-info-value">{{
              authSuccess.successInfo.value.sessionDuration
            }}</span>
          </div>
          <div v-if="authSuccess.successInfo.value.deviceInfo" class="auth-success-info">
            <span class="auth-success-info-label">Device</span>
            <span class="auth-success-info-value">{{
              authSuccess.successInfo.value.deviceInfo
            }}</span>
          </div>
        </div>

        <div v-if="authSuccess.showFeedback.value" class="auth-success-feedback">
          <svg
            class="auth-success-feedback-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="authSuccess.feedbackIcon.value"
            />
          </svg>
          <span>{{ authSuccess.feedbackMessage.value }}</span>
        </div>

        <div class="auth-success-progress"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="currentStep === 'error'" class="auth-content">
      <div class="error-message">
        <h3 class="error-title">Authentication Failed</h3>
        <p class="error-text">{{ errorMessage }}</p>
      </div>

      <div class="auth-actions">
        <BaseButton variant="primary" @click="retry" v-if="canRetry"> Try Again </BaseButton>

        <BaseButton variant="outline" @click="useFallback"> Use Password Instead </BaseButton>
      </div>
    </div>

    <!-- Device Management -->
    <div v-if="showDeviceManagement && registeredDevices.length > 0" class="device-management">
      <h3 class="devices-title">Registered Devices</h3>
      <div class="devices-list">
        <div v-for="device in registeredDevices" :key="device.id" class="device-item">
          <div class="device-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div class="device-info">
            <span class="device-name">{{ device.name }}</span>
            <span class="device-last-used">Last used: {{ formatLastUsed(device.lastUsed) }}</span>
          </div>
          <button
            class="device-remove"
            @click="removeDevice(device.id)"
            :title="`Remove ${device.name}`"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Setup New Device -->
    <div v-if="showSetup" class="setup-section">
      <div class="setup-header">
        <h3 class="setup-title">Set Up Biometric Authentication</h3>
        <p class="setup-description">
          Enable biometric authentication for faster and more secure access to your vault.
        </p>
      </div>

      <div class="setup-actions">
        <BaseButton variant="primary" @click="setupBiometric" :loading="settingUp">
          Set Up Biometrics
        </BaseButton>

        <BaseButton variant="outline" @click="skipSetup"> Skip for Now </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import BaseButton from '@/components/common/BaseButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { formatRelativeTime } from '@/utils/helpers';
import { useAuthSuccess } from '@/composables/useAuthSuccess';
import { useAuthStore } from '@/store/auth.store';

interface BiometricMethod {
  type: 'fingerprint' | 'face' | 'security-key';
  name: string;
  description: string;
  preferred: boolean;
  available: boolean;
}

interface RegisteredDevice {
  id: string;
  name: string;
  lastUsed: Date;
  type: string;
}

interface StoredCredential {
  id: string;
  userEmail: string;
  createdAt: Date;
}

interface VerificationResult {
  success: boolean;
  userEmail?: string;
  error?: string;
}

interface Props {
  mode?: 'authentication' | 'setup' | 'management';
  showDeviceManagement?: boolean;
  autoStart?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'authentication',
  showDeviceManagement: false,
  autoStart: false,
});

const emit = defineEmits<{
  success: [credential: any];
  error: [error: string];
  fallback: [];
  cancel: [];
  setup: [];
  skip: [];
}>();

// Auth store
const authStore = useAuthStore();

// State
const currentStep = ref<'prompt' | 'authenticating' | 'success' | 'error'>('prompt');
const errorMessage = ref('');
const authenticationMessage = ref('');
const settingUp = ref(false);
const canCancel = ref(true);
const retryCount = ref(0);
const maxRetries = 3;

// Auth success composable
const authSuccess = useAuthSuccess({
  type: 'biometric',
  autoRedirect: true,
  redirectDelay: 2500,
  showProgress: true,
});

// Mock data
const availableMethods = ref<BiometricMethod[]>([
  {
    type: 'fingerprint',
    name: 'Fingerprint',
    description: 'Use your fingerprint to authenticate',
    preferred: true,
    available: true,
  },
  {
    type: 'face',
    name: 'Face Recognition',
    description: 'Use your face to authenticate',
    preferred: false,
    available: false,
  },
]);

const registeredDevices = ref<RegisteredDevice[]>([
  {
    id: '1',
    name: 'iPhone 14 Pro',
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    type: 'mobile',
  },
  {
    id: '2',
    name: 'MacBook Pro',
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    type: 'desktop',
  },
]);

// Computed
const canAuthenticate = computed(() => {
  return (
    availableMethods.value.some((method: BiometricMethod) => method.available) &&
    isWebAuthnSupported.value
  );
});

const canRetry = computed(() => {
  return retryCount.value < maxRetries;
});

const showSetup = computed(() => {
  return props.mode === 'setup';
});

const isWebAuthnSupported = computed(() => {
  return (
    typeof window !== 'undefined' && 'credentials' in navigator && 'create' in navigator.credentials
  );
});

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 'prompt':
      return 'Biometric Authentication';
    case 'authenticating':
      return 'Authenticating';
    case 'success':
      return 'Success!';
    case 'error':
      return 'Authentication Failed';
    default:
      return 'Biometric Authentication';
  }
});

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 'prompt':
      return 'Use your biometric data to securely access your vault';
    case 'authenticating':
      return 'Please complete the biometric verification';
    case 'success':
      return 'Access granted';
    case 'error':
      return 'Please try again or use an alternative method';
    default:
      return '';
  }
});

const iconClasses = computed(() => ({
  'icon-prompt': currentStep.value === 'prompt',
  'icon-authenticating': currentStep.value === 'authenticating',
  'icon-success': currentStep.value === 'success',
  'icon-error': currentStep.value === 'error',
}));

// Helper functions
const base64UrlDecode = (str: string): ArrayBuffer => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '===='.slice(0, (4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const base64UrlEncode = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const getStoredCredentials = (): StoredCredential[] => {
  try {
    const stored = localStorage.getItem('zk-vault-biometric-credentials');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const storeCredential = (credential: StoredCredential): void => {
  const credentials = getStoredCredentials();
  const existingIndex = credentials.findIndex(c => c.id === credential.id);
  
  if (existingIndex >= 0) {
    credentials[existingIndex] = credential;
  } else {
    credentials.push(credential);
  }
  
  localStorage.setItem('zk-vault-biometric-credentials', JSON.stringify(credentials));
};

const verifyAndAuthenticateCredential = async (
  credential: PublicKeyCredential, 
  challenge: Uint8Array
): Promise<VerificationResult> => {
  try {
    // Get the credential ID
    const credentialId = base64UrlEncode(credential.rawId);
    
    // Find the associated user account
    const storedCredentials = getStoredCredentials();
    const matchingCredential = storedCredentials.find(c => c.id === credentialId);
    
    if (!matchingCredential) {
      return { success: false, error: 'Credential not found' };
    }

    // In a real implementation, you would:
    // 1. Send the credential response to your server
    // 2. Verify the signature using the stored public key
    // 3. Verify the challenge and origin
    // 4. Verify the user verification flag
    
    // For now, we'll do basic verification and sign in the user
    const response = credential.response as AuthenticatorAssertionResponse;
    if (!response.signature) {
      return { success: false, error: 'No signature in credential response' };
    }

    // Authenticate the user associated with this credential
    // In a real implementation, this would verify the credential with the server
    // and then authenticate the user. For now, we'll return success and let
    // the parent component handle the authentication flow.
    return { success: true, userEmail: matchingCredential.userEmail };
  } catch (error: any) {
    return { success: false, error: error.message || 'Credential verification failed' };
  }
};

// Methods
const startAuthentication = async () => {
  if (!canAuthenticate.value) {
    errorMessage.value = 'Biometric authentication is not available';
    currentStep.value = 'error';
    return;
  }

  currentStep.value = 'authenticating';
  authenticationMessage.value = 'Touch the sensor or look at the camera';
  canCancel.value = true;

  try {
    // WebAuthn authentication
    const credential = await authenticate();

    currentStep.value = 'success';

    // Show enhanced success animation
    await authSuccess.show({
      autoRedirect: true,
      redirectDelay: 2500,
    });

    setTimeout(() => {
      emit('success', credential);
    }, 1500);
  } catch (error: any) {
    retryCount.value++;
    errorMessage.value = getErrorMessage(error);
    currentStep.value = 'error';
    emit('error', errorMessage.value);
  }
};

const authenticate = async () => {
  if (!isWebAuthnSupported.value) {
    throw new Error('WebAuthn is not supported on this device');
  }

  try {
    // Generate a cryptographically secure challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Get stored credential IDs for this device (in real app, from server)
    const allowedCredentials = getStoredCredentials();
    
    // Create WebAuthn authentication request
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge,
      timeout: 60000,
      rpId: window.location.hostname,
           allowCredentials: allowedCredentials.map((cred: StoredCredential) => ({
       id: base64UrlDecode(cred.id),
       type: 'public-key' as const,
       transports: ['internal', 'usb', 'ble', 'nfc'] as AuthenticatorTransport[]
     })),
      userVerification: 'required'
    };

    // Request authentication from WebAuthn
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('No credential returned from authenticator');
    }

    // Verify the credential and authenticate user
    const authResult = await verifyAndAuthenticateCredential(credential, challenge);
    
    if (!authResult.success) {
      throw new Error(authResult.error || 'Authentication verification failed');
    }

    // Authenticate the user using the email associated with the credential
    if (authResult.userEmail) {
      try {
        await authStore.authenticateUserByEmail(authResult.userEmail);
      } catch (error) {
        throw new Error('Failed to authenticate user after biometric verification');
      }
    }

    return credential;
  } catch (error: any) {
    console.error('Biometric authentication failed:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Authentication was cancelled or not allowed');
    } else if (error.name === 'SecurityError') {
      throw new Error('Security error during authentication');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Biometric authentication is not supported');
    } else {
      throw new Error(error.message || 'Biometric authentication failed');
    }
  }
};

const setupBiometric = async () => {
  if (!isWebAuthnSupported.value) {
    errorMessage.value = 'WebAuthn is not supported on this device';
    currentStep.value = 'error';
    return;
  }

  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    errorMessage.value = 'You must be signed in to set up biometrics';
    currentStep.value = 'error';
    return;
  }

  settingUp.value = true;

  try {
    // Generate a cryptographically secure challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Get user information
    const user = authStore.user;
    if (!user) {
      throw new Error('No user information available');
    }

    // Create WebAuthn registration request
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: 'ZK-Vault',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(user.uid),
        name: user.email,
        displayName: user.displayName || user.email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'direct'
    };

    // Request credential creation from WebAuthn
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('No credential returned from authenticator');
    }

    // Store the credential information
    const credentialId = base64UrlEncode(credential.rawId);
    const storedCredential: StoredCredential = {
      id: credentialId,
      userEmail: user.email,
      createdAt: new Date()
    };

    storeCredential(storedCredential);

    // Update user profile to indicate biometric is enabled
    await authStore.enableBiometric();

    emit('setup');
  } catch (error: any) {
    console.error('Biometric setup failed:', error);
    errorMessage.value = getErrorMessage(error);
    currentStep.value = 'error';
  } finally {
    settingUp.value = false;
  }
};

const cancelAuthentication = () => {
  currentStep.value = 'prompt';
  canCancel.value = false;
  emit('cancel');
};

const retry = () => {
  currentStep.value = 'prompt';
  errorMessage.value = '';
};

const useFallback = () => {
  emit('fallback');
};

const skipSetup = () => {
  emit('skip');
};

const removeDevice = async (deviceId: string) => {
  // Remove device from registered devices
  const index = registeredDevices.value.findIndex((d: RegisteredDevice) => d.id === deviceId);
  if (index >= 0) {
    registeredDevices.value.splice(index, 1);
  }
};

const formatLastUsed = (date: Date) => {
  return formatRelativeTime(date);
};

const getErrorMessage = (error: any): string => {
  if (error.name === 'NotAllowedError') {
    return 'Authentication was cancelled or timed out';
  } else if (error.name === 'SecurityError') {
    return 'Security error occurred during authentication';
  } else if (error.name === 'AbortError') {
    return 'Authentication was aborted';
  } else if (error.name === 'NotSupportedError') {
    return 'Biometric authentication is not supported on this device';
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unknown error occurred during authentication';
  }
};

// Lifecycle
onMounted(() => {
  if (props.autoStart && props.mode === 'authentication') {
    startAuthentication();
  }
});
</script>
