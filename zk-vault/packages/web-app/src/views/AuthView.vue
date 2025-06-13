<template>
  <div class="auth-view">
    <!-- Background -->
    <div class="auth-background">
      <div class="background-pattern"></div>
      <div class="background-gradient"></div>
    </div>

    <!-- Header -->
    <header class="auth-header">
      <div class="header-content">
        <div class="logo">
          <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span class="logo-text">ZK-Vault</span>
        </div>
        
        <nav class="auth-nav" v-if="currentView !== 'unlock'">
          <BaseButton
            v-if="currentView !== 'login'"
            variant="ghost"
            @click="switchToLogin"
          >
            Sign In
          </BaseButton>
          <BaseButton
            v-if="currentView !== 'register'"
            variant="outline"
            @click="switchToRegister"
          >
            Sign Up
          </BaseButton>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="auth-main">
      <div class="auth-container">
        <!-- Welcome Section -->
        <div v-if="showWelcome" class="welcome-section">
          <h1 class="welcome-title">
            {{ welcomeTitle }}
          </h1>
          <p class="welcome-description">
            {{ welcomeDescription }}
          </p>
          
          <!-- Feature Highlights -->
          <div class="feature-highlights">
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div class="feature-content">
                <h3 class="feature-title">Zero-Knowledge Security</h3>
                <p class="feature-text">Your passwords are encrypted locally and never visible to us</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div class="feature-content">
                <h3 class="feature-title">Biometric Authentication</h3>
                <p class="feature-text">Quick and secure access with fingerprint or face recognition</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div class="feature-content">
                <h3 class="feature-title">Password Generator</h3>
                <p class="feature-text">Create strong, unique passwords for all your accounts</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Auth Forms -->
        <div class="auth-forms">
          <!-- Login Form -->
          <Transition name="form" mode="out-in">
            <LoginForm
              v-if="currentView === 'login'"
              @success="handleLoginSuccess"
              @biometric="handleBiometricAuth"
              @error="handleAuthError"
            />
            
            <!-- Register Form -->
            <RegisterForm
              v-else-if="currentView === 'register'"
              @success="handleRegisterSuccess"
              @error="handleAuthError"
            />
            
            <!-- Master Password Unlock -->
            <MasterPasswordPrompt
              v-else-if="currentView === 'unlock'"
              :user-email="userEmail"
              :password-hint="passwordHint"
              :last-login="lastLogin"
              :biometric-available="biometricAvailable"
              @unlock="handleVaultUnlock"
              @biometric-unlock="handleBiometricUnlock"
              @reset-password="handlePasswordReset"
              @recovery-kit="handleRecoveryKit"
              @support="handleSupport"
            />
            
            <!-- Biometric Authentication -->
            <BiometricAuth
              v-else-if="currentView === 'biometric'"
              :mode="biometricMode"
              :auto-start="true"
              @success="handleBiometricSuccess"
              @error="handleBiometricError"
              @fallback="handleBiometricFallback"
              @setup="handleBiometricSetup"
              @skip="handleBiometricSkip"
            />
          </Transition>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="auth-footer">
      <div class="footer-content">
        <div class="footer-links">
          <a href="/privacy" class="footer-link">Privacy Policy</a>
          <a href="/terms" class="footer-link">Terms of Service</a>
          <a href="/help" class="footer-link">Help Center</a>
        </div>
        <p class="footer-copyright">
          © 2024 ZK-Vault. All rights reserved.
        </p>
      </div>
    </footer>

    <!-- Loading Overlay -->
    <div v-if="globalLoading" class="loading-overlay">
      <div class="loading-content">
        <LoadingSpinner size="lg" />
        <h3 class="loading-title">{{ loadingMessage }}</h3>
        <p class="loading-text">{{ loadingSubtext }}</p>
      </div>
    </div>

    <!-- Success Modal -->
    <BaseModal
      v-model="showSuccessModal"
      title="Welcome to ZK-Vault!"
      size="md"
      :closable="false"
    >
      <div class="success-content">
        <div class="success-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="success-title">Account Created Successfully!</h3>
        <p class="success-description">
          Your secure vault is ready. You can now start adding your passwords and sensitive information.
        </p>
      </div>
      
      <template #footer>
        <BaseButton
          variant="primary"
          @click="handleSuccessModalClose"
          block
        >
          Continue to Vault
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Error Toast -->
    <div v-if="errorMessage" class="error-toast">
      <div class="toast-content">
        <svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <span class="toast-message">{{ errorMessage }}</span>
      </div>
      <button class="toast-close" @click="clearError">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import MasterPasswordPrompt from '@/components/auth/MasterPasswordPrompt.vue'
import BiometricAuth from '@/components/auth/BiometricAuth.vue'
import { useAuthStore } from '@/stores/auth'

type AuthView = 'login' | 'register' | 'unlock' | 'biometric'
type BiometricMode = 'authentication' | 'setup' | 'management'

// Router
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// State
const currentView = ref<AuthView>('login')
const biometricMode = ref<BiometricMode>('authentication')
const globalLoading = ref(false)
const loadingMessage = ref('')
const loadingSubtext = ref('')
const errorMessage = ref('')
const showSuccessModal = ref(false)

// User data (would come from store/props)
const userEmail = ref('user@example.com')
const passwordHint = ref('Your favorite childhood pet')
const lastLogin = ref(new Date(Date.now() - 24 * 60 * 60 * 1000))
const biometricAvailable = ref(true)

// Computed
const showWelcome = computed(() => {
  return currentView.value === 'login' || currentView.value === 'register'
})

const welcomeTitle = computed(() => {
  switch (currentView.value) {
    case 'login':
      return 'Welcome Back to Your Secure Vault'
    case 'register':
      return 'Create Your Secure Password Vault'
    default:
      return 'ZK-Vault'
  }
})

const welcomeDescription = computed(() => {
  switch (currentView.value) {
    case 'login':
      return 'Sign in to access your encrypted passwords and secure information'
    case 'register':
      return 'Join thousands of users who trust ZK-Vault to keep their digital lives secure'
    default:
      return ''
  }
})

// Methods
const switchToLogin = () => {
  currentView.value = 'login'
  router.push({ name: 'auth-login' })
}

const switchToRegister = () => {
  currentView.value = 'register'
  router.push({ name: 'auth-register' })
}

const handleLoginSuccess = async (data: any) => {
  globalLoading.value = true
  loadingMessage.value = 'Signing you in...'
  loadingSubtext.value = 'Preparing your secure vault'
  
  try {
    // Simulate authentication process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check if vault needs to be unlocked
    if (data.requiresUnlock) {
      currentView.value = 'unlock'
      userEmail.value = data.email
    } else {
      // Direct access - redirect to vault
      await router.push('/vault')
    }
  } catch (error: any) {
    handleAuthError(error.message)
  } finally {
    globalLoading.value = false
  }
}

const handleRegisterSuccess = async (data: any) => {
  globalLoading.value = true
  loadingMessage.value = 'Creating your account...'
  loadingSubtext.value = 'Setting up your secure vault'
  
  try {
    // Simulate registration process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    globalLoading.value = false
    showSuccessModal.value = true
  } catch (error: any) {
    handleAuthError(error.message)
    globalLoading.value = false
  }
}

const handleVaultUnlock = async (masterPassword: string) => {
  globalLoading.value = true
  loadingMessage.value = 'Unlocking your vault...'
  loadingSubtext.value = 'Decrypting your secure data'
  
  try {
    // Simulate vault unlock
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await router.push('/vault')
  } catch (error: any) {
    handleAuthError(error.message)
  } finally {
    globalLoading.value = false
  }
}

const handleBiometricAuth = () => {
  currentView.value = 'biometric'
  biometricMode.value = 'authentication'
}

const handleBiometricUnlock = async () => {
  globalLoading.value = true
  loadingMessage.value = 'Authenticating...'
  loadingSubtext.value = 'Verifying your biometric data'
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    await router.push('/vault')
  } catch (error: any) {
    handleAuthError(error.message)
  } finally {
    globalLoading.value = false
  }
}

const handleBiometricSuccess = async (credential: any) => {
  await router.push('/vault')
}

const handleBiometricError = (error: string) => {
  handleAuthError(error)
}

const handleBiometricFallback = () => {
  currentView.value = 'unlock'
}

const handleBiometricSetup = () => {
  // Handle biometric setup completion
  currentView.value = 'unlock'
}

const handleBiometricSkip = () => {
  currentView.value = 'unlock'
}

const handlePasswordReset = () => {
  // Handle password reset flow
  router.push({ name: 'auth-reset' })
}

const handleRecoveryKit = () => {
  // Handle recovery kit flow
  router.push({ name: 'auth-recovery' })
}

const handleSupport = () => {
  // Open support
  window.open('/support', '_blank')
}

const handleAuthError = (error: string) => {
  errorMessage.value = error
  setTimeout(() => {
    errorMessage.value = ''
  }, 5000)
}

const handleSuccessModalClose = () => {
  showSuccessModal.value = false
  router.push('/vault')
}

const clearError = () => {
  errorMessage.value = ''
}

// Watch route changes
watch(
  () => route.name,
  (newRoute) => {
    switch (newRoute) {
      case 'auth-login':
        currentView.value = 'login'
        break
      case 'auth-register':
        currentView.value = 'register'
        break
      case 'auth-unlock':
        currentView.value = 'unlock'
        break
      case 'auth-biometric':
        currentView.value = 'biometric'
        break
      default:
        currentView.value = 'login'
    }
  },
  { immediate: true }
)

// Lifecycle
onMounted(() => {
  // Check if user needs to unlock vault
  const needsUnlock = route.query.unlock === 'true'
  if (needsUnlock) {
    currentView.value = 'unlock'
  }
})
</script>

<style scoped>
.auth-view {
  @apply min-h-screen flex flex-col relative;
}

.auth-background {
  @apply absolute inset-0 overflow-hidden;
}

.background-pattern {
  @apply absolute inset-0 opacity-5;
  background-image: radial-gradient(circle at 25% 25%, #6366f1 0%, transparent 50%),
                    radial-gradient(circle at 75% 75%, #8b5cf6 0%, transparent 50%);
}

.background-gradient {
  @apply absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-purple-50;
}

.auth-header {
  @apply relative z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-sm;
}

.header-content {
  @apply container mx-auto px-6 py-4 flex items-center justify-between;
}

.logo {
  @apply flex items-center gap-3;
}

.logo-icon {
  @apply w-8 h-8 text-primary-600;
}

.logo-text {
  @apply text-xl font-bold text-neutral-900;
}

.auth-nav {
  @apply flex items-center gap-3;
}

.auth-main {
  @apply relative z-10 flex-1 flex items-center justify-center px-6 py-12;
}

.auth-container {
  @apply w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center;
}

.welcome-section {
  @apply space-y-8;
}

.welcome-title {
  @apply text-4xl lg:text-5xl font-bold text-neutral-900 leading-tight;
}

.welcome-description {
  @apply text-xl text-neutral-600 leading-relaxed;
}

.feature-highlights {
  @apply space-y-6;
}

.feature-item {
  @apply flex gap-4;
}

.feature-icon {
  @apply w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center shrink-0;
}

.feature-icon svg {
  @apply w-6 h-6 text-primary-600;
}

.feature-content {
  @apply space-y-2;
}

.feature-title {
  @apply text-lg font-semibold text-neutral-900;
}

.feature-text {
  @apply text-neutral-600;
}

.auth-forms {
  @apply flex justify-center;
}

.auth-footer {
  @apply relative z-10 border-t border-neutral-200 bg-white/80 backdrop-blur-sm;
}

.footer-content {
  @apply container mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4;
}

.footer-links {
  @apply flex items-center gap-6;
}

.footer-link {
  @apply text-sm text-neutral-600 hover:text-neutral-900 transition-colors duration-200;
}

.footer-copyright {
  @apply text-sm text-neutral-500;
}

.loading-overlay {
  @apply fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50;
}

.loading-content {
  @apply text-center space-y-4 max-w-sm mx-auto px-6;
}

.loading-title {
  @apply text-xl font-semibold text-white;
}

.loading-text {
  @apply text-neutral-300;
}

.success-content {
  @apply text-center space-y-6 py-6;
}

.success-icon {
  @apply w-16 h-16 mx-auto bg-success-100 rounded-full flex items-center justify-center;
}

.success-icon svg {
  @apply w-8 h-8 text-success-600;
}

.success-title {
  @apply text-xl font-semibold text-neutral-900;
}

.success-description {
  @apply text-neutral-600;
}

.error-toast {
  @apply fixed bottom-6 right-6 bg-danger-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-3 z-50;
  @apply animate-slide-in-right;
}

.toast-content {
  @apply flex items-center gap-3;
}

.toast-icon {
  @apply w-5 h-5 shrink-0;
}

.toast-message {
  @apply text-sm font-medium;
}

.toast-close {
  @apply p-1 hover:bg-danger-700 rounded transition-colors duration-200;
}

.toast-close svg {
  @apply w-4 h-4;
}

/* Transitions */
.form-enter-active,
.form-leave-active {
  @apply transition-all duration-300;
}

.form-enter-from {
  @apply opacity-0 translate-x-8;
}

.form-leave-to {
  @apply opacity-0 -translate-x-8;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .background-gradient {
    @apply bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800;
  }
  
  .auth-header {
    @apply border-neutral-700 bg-neutral-900/80;
  }
  
  .logo-text {
    @apply text-neutral-100;
  }
  
  .welcome-title {
    @apply text-neutral-100;
  }
  
  .welcome-description {
    @apply text-neutral-400;
  }
  
  .feature-icon {
    @apply bg-primary-900;
  }
  
  .feature-icon svg {
    @apply text-primary-400;
  }
  
  .feature-title {
    @apply text-neutral-100;
  }
  
  .feature-text {
    @apply text-neutral-400;
  }
  
  .auth-footer {
    @apply border-neutral-700 bg-neutral-900/80;
  }
  
  .footer-link {
    @apply text-neutral-400 hover:text-neutral-300;
  }
  
  .footer-copyright {
    @apply text-neutral-500;
  }
  
  .success-title {
    @apply text-neutral-100;
  }
  
  .success-description {
    @apply text-neutral-400;
  }
}

/* Animations */
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

/* Responsive */
@media (max-width: 1024px) {
  .auth-container {
    @apply grid-cols-1 text-center;
  }
  
  .welcome-section {
    @apply order-2;
  }
  
  .auth-forms {
    @apply order-1;
  }
}
</style>
