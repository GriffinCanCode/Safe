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

const emit = defineEmits<{
  success: [data: { email: string; requiresUnlock?: boolean }]
  biometric: []
  error: [message: string]
}>()

const handleLogin = async () => {
  if (!validateForm()) return
  
  loading.value = true
  generalError.value = ''
  
  try {
    await authStore.login(form.email, form.password)
    
    // Emit success event to parent
    emit('success', { 
      email: form.email,
      requiresUnlock: false // In a real app, this would depend on vault state
    })
  } catch (error: any) {
    const errorMessage = error.message || 'An error occurred during sign in'
    generalError.value = errorMessage
    emit('error', errorMessage)
  } finally {
    loading.value = false
  }
}

const handleBiometricLogin = async () => {
  biometricLoading.value = true
  generalError.value = ''
  
  try {
    // Emit biometric event to parent to handle the authentication
    emit('biometric')
  } catch (error: any) {
    const errorMessage = error.message || 'Biometric authentication failed'
    generalError.value = errorMessage
    emit('error', errorMessage)
  } finally {
    biometricLoading.value = false
  }
}

const handleGoogleLogin = async () => {
  loading.value = true
  generalError.value = ''
  
  try {
    // Google login not implemented in ZK auth system
    generalError.value = 'Google login not available with zero-knowledge authentication'
  } catch (error: any) {
    generalError.value = error.message || 'Google sign in failed'
  } finally {
    loading.value = false
  }
}

const checkBiometricSupport = async () => {
  try {
    biometricSupported.value = await authStore.checkBiometricAvailability()
  } catch {
    biometricSupported.value = false
  }
}

// Lifecycle
onMounted(() => {
  checkBiometricSupport()
})
</script>

<!-- Styles are now handled by the comprehensive CSS architecture in /src/styles/components/auth/login-form.css -->
