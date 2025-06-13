<template>
  <div class="login-form">
    <div class="login-header">
      <h2 class="login-title">Welcome Back</h2>
      <p class="login-subtitle">Sign in to your secure vault</p>
    </div>

    <form @submit.prevent="handleLogin" class="login-form-content">
      <!-- Email Field -->
      <BaseInput
        v-model="form.email"
        type="email"
        label="Email Address"
        placeholder="Enter your email"
        :error="errors.email"
        :disabled="loading"
        required
        autocomplete="email"
        prefix-icon="mail"
      />

      <!-- Password Field -->
      <BaseInput
        v-model="form.password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        :error="errors.password"
        :disabled="loading"
        required
        autocomplete="current-password"
        prefix-icon="lock"
      />

      <!-- Remember Me -->
      <div class="login-options">
        <label class="remember-me">
          <input
            v-model="form.rememberMe"
            type="checkbox"
            :disabled="loading"
            class="remember-checkbox"
          >
          <span class="remember-label">Remember me</span>
        </label>

        <router-link
          to="/auth/forgot-password"
          class="forgot-password"
        >
          Forgot password?
        </router-link>
      </div>

      <!-- Login Button -->
      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        block
        :loading="loading"
        :disabled="!isFormValid"
      >
        Sign In
      </BaseButton>

      <!-- Divider -->
      <div class="divider">
        <span class="divider-text">or</span>
      </div>

      <!-- Biometric Login -->
      <BaseButton
        v-if="biometricSupported"
        variant="outline"
        size="lg"
        block
        :loading="biometricLoading"
        :disabled="loading"
        @click="handleBiometricLogin"
        icon="fingerprint"
      >
        Sign in with Biometrics
      </BaseButton>

      <!-- Social Login Options -->
      <div v-if="socialEnabled" class="social-login">
        <BaseButton
          variant="outline"
          size="lg"
          block
          :disabled="loading"
          @click="handleGoogleLogin"
          icon="google"
        >
          Continue with Google
        </BaseButton>
      </div>
    </form>

    <!-- Footer -->
    <div class="login-footer">
      <p class="signup-prompt">
        Don't have an account?
        <router-link to="/auth/register" class="signup-link">
          Sign up
        </router-link>
      </p>
    </div>

    <!-- Error Alert -->
    <div v-if="generalError" class="error-alert" role="alert">
      <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      {{ generalError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { useAuthStore } from '@/store/auth.store'
import { isValidEmail } from '@/utils/helpers'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

// Router
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(false)
const biometricLoading = ref(false)
const biometricSupported = ref(false)
const socialEnabled = ref(true)
const generalError = ref('')

const form = reactive<LoginForm>({
  email: '',
  password: '',
  rememberMe: false
})

const errors = reactive({
  email: '',
  password: ''
})

// Computed
const isFormValid = computed(() => {
  return form.email &&
         form.password &&
         isValidEmail(form.email) &&
         form.password.length >= 8 &&
         !errors.email &&
         !errors.password
})

// Methods
const validateForm = () => {
  errors.email = ''
  errors.password = ''
  
  if (!form.email) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }
  
  return !errors.email && !errors.password
}

const handleLogin = async () => {
  if (!validateForm()) return
  
  loading.value = true
  generalError.value = ''
  
  try {
    await authStore.signIn({
      email: form.email,
      password: form.password,
      rememberMe: form.rememberMe
    })
    
    // Redirect to dashboard or intended route
    const redirectTo = router.currentRoute.value.query.redirect as string || '/dashboard'
    await router.push(redirectTo)
  } catch (error: any) {
    generalError.value = error.message || 'An error occurred during sign in'
  } finally {
    loading.value = false
  }
}

const handleBiometricLogin = async () => {
  biometricLoading.value = true
  generalError.value = ''
  
  try {
    await authStore.signInWithBiometric()
    
    const redirectTo = router.currentRoute.value.query.redirect as string || '/dashboard'
    await router.push(redirectTo)
  } catch (error: any) {
    generalError.value = error.message || 'Biometric authentication failed'
  } finally {
    biometricLoading.value = false
  }
}

const handleGoogleLogin = async () => {
  loading.value = true
  generalError.value = ''
  
  try {
    await authStore.signInWithGoogle()
    
    const redirectTo = router.currentRoute.value.query.redirect as string || '/dashboard'
    await router.push(redirectTo)
  } catch (error: any) {
    generalError.value = error.message || 'Google sign in failed'
  } finally {
    loading.value = false
  }
}

const checkBiometricSupport = async () => {
  try {
    biometricSupported.value = await authStore.isBiometricSupported()
  } catch {
    biometricSupported.value = false
  }
}

// Lifecycle
onMounted(() => {
  checkBiometricSupport()
})
</script>

<style scoped>
.login-form {
  @apply w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg;
}

.login-header {
  @apply text-center mb-8;
}

.login-title {
  @apply text-2xl font-bold text-neutral-900 mb-2;
}

.login-subtitle {
  @apply text-neutral-600;
}

.login-form-content {
  @apply space-y-6;
}

.login-options {
  @apply flex items-center justify-between;
}

.remember-me {
  @apply flex items-center gap-2 cursor-pointer;
}

.remember-checkbox {
  @apply w-4 h-4 text-primary-600 border-neutral-300 rounded;
  @apply focus:ring-primary-500 focus:ring-2;
}

.remember-label {
  @apply text-sm text-neutral-700;
}

.forgot-password {
  @apply text-sm text-primary-600 hover:text-primary-700;
  @apply transition-colors duration-200;
}

.divider {
  @apply relative flex items-center justify-center;
}

.divider::before {
  content: '';
  @apply flex-1 h-px bg-neutral-300;
}

.divider::after {
  content: '';
  @apply flex-1 h-px bg-neutral-300;
}

.divider-text {
  @apply px-4 text-sm text-neutral-500 bg-white;
}

.social-login {
  @apply space-y-3;
}

.login-footer {
  @apply mt-8 text-center;
}

.signup-prompt {
  @apply text-sm text-neutral-600;
}

.signup-link {
  @apply text-primary-600 hover:text-primary-700 font-medium;
  @apply transition-colors duration-200;
}

.error-alert {
  @apply mt-4 p-4 bg-danger-50 border border-danger-200 rounded-lg;
  @apply flex items-center gap-3 text-danger-700;
}

.error-icon {
  @apply w-5 h-5 shrink-0;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .login-form {
    @apply bg-neutral-800;
  }
  
  .login-title {
    @apply text-neutral-100;
  }
  
  .login-subtitle {
    @apply text-neutral-400;
  }
  
  .remember-label {
    @apply text-neutral-300;
  }
  
  .signup-prompt {
    @apply text-neutral-400;
  }
  
  .divider::before,
  .divider::after {
    @apply bg-neutral-600;
  }
  
  .divider-text {
    @apply text-neutral-400 bg-neutral-800;
  }
  
  .error-alert {
    @apply bg-danger-900 border-danger-700 text-danger-300;
  }
}

/* Focus styles */
.remember-checkbox:focus {
  @apply ring-offset-2 ring-offset-white;
}

@media (prefers-color-scheme: dark) {
  .remember-checkbox:focus {
    @apply ring-offset-neutral-800;
  }
}
</style>
