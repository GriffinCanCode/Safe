<template>
  <div class="biometric-auth">
    <!-- Header -->
    <div class="auth-header">
      <div class="biometric-icon" :class="iconClasses">
        <svg v-if="currentStep === 'prompt'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        <svg v-else-if="currentStep === 'authenticating'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <svg v-else-if="currentStep === 'success'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="currentStep === 'error'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
            <svg v-if="method.type === 'fingerprint'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <svg v-else-if="method.type === 'face'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div class="method-info">
            <h3 class="method-name">{{ method.name }}</h3>
            <p class="method-description">{{ method.description }}</p>
          </div>
          <div v-if="method.preferred" class="preferred-badge">
            Preferred
          </div>
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
        
        <BaseButton
          variant="outline"
          size="lg"
          block
          @click="useFallback"
        >
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
        <BaseButton
          variant="outline"
          @click="cancelAuthentication"
          :disabled="!canCancel"
        >
          Cancel
        </BaseButton>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="currentStep === 'success'" class="auth-content">
      <div class="auth-success biometric">
        <div class="auth-success-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div class="auth-success-content">
          <h3 class="auth-success-title">Authentication Successful!</h3>
          <p class="auth-success-subtitle">Access Granted</p>
          <p class="auth-success-message">You have been successfully authenticated using biometrics.</p>
        </div>

        <div class="auth-success-details">
          <div class="auth-success-info">
            <span class="auth-success-info-label">Authentication Method</span>
            <span class="auth-success-info-value">{{ authSuccess.successInfo.value.method }}</span>
          </div>
          <div class="auth-success-info">
            <span class="auth-success-info-label">Security Level</span>
            <span class="auth-success-info-value">{{ authSuccess.successInfo.value.securityLevel }}</span>
          </div>
          <div class="auth-success-info">
            <span class="auth-success-info-label">Session Duration</span>
            <span class="auth-success-info-value">{{ authSuccess.successInfo.value.sessionDuration }}</span>
          </div>
          <div v-if="authSuccess.successInfo.value.deviceInfo" class="auth-success-info">
            <span class="auth-success-info-label">Device</span>
            <span class="auth-success-info-value">{{ authSuccess.successInfo.value.deviceInfo }}</span>
          </div>
        </div>

        <div v-if="authSuccess.showFeedback.value" class="auth-success-feedback">
          <svg class="auth-success-feedback-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="authSuccess.feedbackIcon.value" />
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
        <BaseButton
          variant="primary"
          @click="retry"
          v-if="canRetry"
        >
          Try Again
        </BaseButton>
        
        <BaseButton
          variant="outline"
          @click="useFallback"
        >
          Use Password Instead
        </BaseButton>
      </div>
    </div>

    <!-- Device Management -->
    <div v-if="showDeviceManagement && registeredDevices.length > 0" class="device-management">
      <h3 class="devices-title">Registered Devices</h3>
      <div class="devices-list">
        <div
          v-for="device in registeredDevices"
          :key="device.id"
          class="device-item"
        >
          <div class="device-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
        <BaseButton
          variant="primary"
          @click="setupBiometric"
          :loading="settingUp"
        >
          Set Up Biometrics
        </BaseButton>
        
        <BaseButton
          variant="outline"
          @click="skipSetup"
        >
          Skip for Now
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { formatRelativeTime } from '@/utils/helpers'
import { useAuthSuccess } from '@/composables/useAuthSuccess'

interface BiometricMethod {
  type: 'fingerprint' | 'face' | 'security-key'
  name: string
  description: string
  preferred: boolean
  available: boolean
}

interface RegisteredDevice {
  id: string
  name: string
  lastUsed: Date
  type: string
}

interface Props {
  mode?: 'authentication' | 'setup' | 'management'
  showDeviceManagement?: boolean
  autoStart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'authentication',
  showDeviceManagement: false,
  autoStart: false
})

const emit = defineEmits<{
  success: [credential: any]
  error: [error: string]
  fallback: []
  cancel: []
  setup: []
  skip: []
}>()

// State
const currentStep = ref<'prompt' | 'authenticating' | 'success' | 'error'>('prompt')
const errorMessage = ref('')
const authenticationMessage = ref('')
const settingUp = ref(false)
const canCancel = ref(true)
const retryCount = ref(0)
const maxRetries = 3

// Auth success composable
const authSuccess = useAuthSuccess({ 
  type: 'biometric',
  autoRedirect: true,
  redirectDelay: 2500,
  showProgress: true
})

// Mock data
const availableMethods = ref<BiometricMethod[]>([
  {
    type: 'fingerprint',
    name: 'Fingerprint',
    description: 'Use your fingerprint to authenticate',
    preferred: true,
    available: true
  },
  {
    type: 'face',
    name: 'Face Recognition',
    description: 'Use your face to authenticate',
    preferred: false,
    available: false
  }
])

const registeredDevices = ref<RegisteredDevice[]>([
  {
    id: '1',
    name: 'iPhone 14 Pro',
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    type: 'mobile'
  },
  {
    id: '2',
    name: 'MacBook Pro',
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    type: 'desktop'
  }
])

// Computed
const canAuthenticate = computed(() => {
  return availableMethods.value.some((method: BiometricMethod) => method.available) && isWebAuthnSupported.value
})

const canRetry = computed(() => {
  return retryCount.value < maxRetries
})

const showSetup = computed(() => {
  return props.mode === 'setup'
})

const isWebAuthnSupported = computed(() => {
  return typeof window !== 'undefined' && 
         'credentials' in navigator && 
         'create' in navigator.credentials
})

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 'prompt':
      return 'Biometric Authentication'
    case 'authenticating':
      return 'Authenticating'
    case 'success':
      return 'Success!'
    case 'error':
      return 'Authentication Failed'
    default:
      return 'Biometric Authentication'
  }
})

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 'prompt':
      return 'Use your biometric data to securely access your vault'
    case 'authenticating':
      return 'Please complete the biometric verification'
    case 'success':
      return 'Access granted'
    case 'error':
      return 'Please try again or use an alternative method'
    default:
      return ''
  }
})

const iconClasses = computed(() => ({
  'icon-prompt': currentStep.value === 'prompt',
  'icon-authenticating': currentStep.value === 'authenticating',
  'icon-success': currentStep.value === 'success',
  'icon-error': currentStep.value === 'error'
}))

// Methods
const startAuthentication = async () => {
  if (!canAuthenticate.value) {
    errorMessage.value = 'Biometric authentication is not available'
    currentStep.value = 'error'
    return
  }

  currentStep.value = 'authenticating'
  authenticationMessage.value = 'Touch the sensor or look at the camera'
  canCancel.value = true

  try {
    // WebAuthn authentication
    const credential = await authenticate()
    
    currentStep.value = 'success'
    
    // Show enhanced success animation
    await authSuccess.show({
      autoRedirect: true,
      redirectDelay: 2500
    })
    
    setTimeout(() => {
      emit('success', credential)
    }, 1500)
  } catch (error: any) {
    retryCount.value++
    errorMessage.value = getErrorMessage(error)
    currentStep.value = 'error'
    emit('error', errorMessage.value)
  }
}

const authenticate = async () => {
  // Simulate WebAuthn authentication
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // For demo purposes, randomly succeed or fail
  if (Math.random() > 0.7) {
    throw new Error('User verification failed')
  }
  
  return {
    id: 'mock-credential-id',
    type: 'public-key',
    response: {
      clientDataJSON: 'mock-data',
      authenticatorData: 'mock-data'
    }
  }
}

const setupBiometric = async () => {
  settingUp.value = true
  
  try {
    // Simulate WebAuthn registration
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    emit('setup')
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error)
    currentStep.value = 'error'
  } finally {
    settingUp.value = false
  }
}

const cancelAuthentication = () => {
  currentStep.value = 'prompt'
  canCancel.value = false
  emit('cancel')
}

const retry = () => {
  currentStep.value = 'prompt'
  errorMessage.value = ''
}

const useFallback = () => {
  emit('fallback')
}

const skipSetup = () => {
  emit('skip')
}

const removeDevice = async (deviceId: string) => {
  // Remove device from registered devices
  const index = registeredDevices.value.findIndex((d: RegisteredDevice) => d.id === deviceId)
  if (index >= 0) {
    registeredDevices.value.splice(index, 1)
  }
}

const formatLastUsed = (date: Date) => {
  return formatRelativeTime(date)
}

const getErrorMessage = (error: any): string => {
  if (error.name === 'NotAllowedError') {
    return 'Authentication was cancelled or timed out'
  } else if (error.name === 'SecurityError') {
    return 'Security error occurred during authentication'
  } else if (error.name === 'AbortError') {
    return 'Authentication was aborted'
  } else if (error.name === 'NotSupportedError') {
    return 'Biometric authentication is not supported on this device'
  } else if (error.message) {
    return error.message
  } else {
    return 'An unknown error occurred during authentication'
  }
}

// Lifecycle
onMounted(() => {
  if (props.autoStart && props.mode === 'authentication') {
    startAuthentication()
  }
})
</script>

<style scoped>
.biometric-auth {
  @apply w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg space-y-6;
}

.auth-header {
  @apply text-center space-y-3;
}

.biometric-icon {
  @apply w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all duration-300;
}

.biometric-icon svg {
  @apply w-8 h-8;
}

.icon-prompt {
  @apply bg-primary-100 text-primary-600;
}

.icon-authenticating {
  @apply bg-warning-100 text-warning-600 animate-pulse;
}

.icon-success {
  @apply bg-success-100 text-success-600;
}

.icon-error {
  @apply bg-danger-100 text-danger-600;
}

.auth-title {
  @apply text-2xl font-bold text-neutral-900;
}

.auth-subtitle {
  @apply text-neutral-600;
}

.auth-content {
  @apply space-y-6;
}

.biometric-methods {
  @apply space-y-3;
}

.method-item {
  @apply flex items-center gap-4 p-4 border border-neutral-200 rounded-lg;
  @apply transition-all duration-200;
}

.method-preferred {
  @apply border-primary-300 bg-primary-50;
}

.method-icon {
  @apply w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center shrink-0;
}

.method-icon svg {
  @apply w-5 h-5 text-neutral-600;
}

.method-info {
  @apply flex-1 space-y-1;
}

.method-name {
  @apply text-sm font-semibold text-neutral-900;
}

.method-description {
  @apply text-sm text-neutral-600;
}

.preferred-badge {
  @apply px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded;
}

.auth-actions {
  @apply space-y-3;
}

.auth-progress {
  @apply flex flex-col items-center space-y-4 py-6;
}

.progress-content {
  @apply text-center space-y-2;
}

.progress-title {
  @apply text-lg font-semibold text-neutral-900;
}

.progress-text {
  @apply text-neutral-600;
}

.error-message {
  @apply text-center space-y-2 py-4;
}

.error-title {
  @apply text-lg font-semibold text-danger-600;
}

.error-text {
  @apply text-neutral-600;
}

.device-management {
  @apply space-y-4 border-t border-neutral-200 pt-6;
}

.devices-title {
  @apply text-lg font-semibold text-neutral-900;
}

.devices-list {
  @apply space-y-2;
}

.device-item {
  @apply flex items-center gap-3 p-3 bg-neutral-50 rounded-lg;
}

.device-icon {
  @apply w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center shrink-0;
}

.device-icon svg {
  @apply w-4 h-4 text-neutral-600;
}

.device-info {
  @apply flex-1 space-y-1;
}

.device-name {
  @apply block text-sm font-medium text-neutral-900;
}

.device-last-used {
  @apply block text-xs text-neutral-500;
}

.device-remove {
  @apply p-1 text-neutral-400 hover:text-danger-600 transition-colors duration-200;
}

.device-remove svg {
  @apply w-4 h-4;
}

.setup-section {
  @apply space-y-6 border-t border-neutral-200 pt-6;
}

.setup-header {
  @apply text-center space-y-3;
}

.setup-title {
  @apply text-lg font-semibold text-neutral-900;
}

.setup-description {
  @apply text-neutral-600;
}

.setup-actions {
  @apply space-y-3;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .biometric-auth {
    @apply bg-neutral-800;
  }
  
  .auth-title {
    @apply text-neutral-100;
  }
  
  .auth-subtitle {
    @apply text-neutral-400;
  }
  
  .icon-prompt {
    @apply bg-primary-900 text-primary-400;
  }
  
  .icon-authenticating {
    @apply bg-warning-900 text-warning-400;
  }
  
  .icon-success {
    @apply bg-success-900 text-success-400;
  }
  
  .icon-error {
    @apply bg-danger-900 text-danger-400;
  }
  
  .method-item {
    @apply border-neutral-600;
  }
  
  .method-preferred {
    @apply border-primary-600 bg-primary-900;
  }
  
  .method-icon {
    @apply bg-neutral-700;
  }
  
  .method-icon svg {
    @apply text-neutral-400;
  }
  
  .method-name {
    @apply text-neutral-100;
  }
  
  .method-description {
    @apply text-neutral-400;
  }
  
  .progress-title {
    @apply text-neutral-100;
  }
  
  .progress-text {
    @apply text-neutral-400;
  }
  
  .error-text {
    @apply text-neutral-400;
  }
  
  .device-management {
    @apply border-neutral-600;
  }
  
  .devices-title {
    @apply text-neutral-100;
  }
  
  .device-item {
    @apply bg-neutral-700;
  }
  
  .device-icon {
    @apply bg-neutral-600;
  }
  
  .device-icon svg {
    @apply text-neutral-400;
  }
  
  .device-name {
    @apply text-neutral-100;
  }
  
  .device-last-used {
    @apply text-neutral-400;
  }
  
  .device-remove {
    @apply text-neutral-400 hover:text-danger-400;
  }
  
  .setup-section {
    @apply border-neutral-600;
  }
  
  .setup-title {
    @apply text-neutral-100;
  }
  
  .setup-description {
    @apply text-neutral-400;
  }
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
