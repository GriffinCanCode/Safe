<template>
  <div class="register-form">
    <div class="register-header">
      <h2 class="register-title">Create Your Account</h2>
      <p class="register-subtitle">Start securing your digital life today</p>
    </div>

    <form @submit.prevent="handleRegister" class="register-form-content">
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
      <div class="password-section">
        <BaseInput
          v-model="form.password"
          type="password"
          label="Master Password"
          placeholder="Create a strong master password"
          :error="errors.password"
          :disabled="loading"
          required
          autocomplete="new-password"
          prefix-icon="lock"
        />
        
        <!-- Password Strength Meter -->
        <div v-if="form.password" class="password-strength">
          <div class="strength-header">
            <span class="strength-label">Password Strength</span>
            <span class="strength-score" :class="passwordStrengthClass">
              {{ passwordStrengthText }}
            </span>
          </div>
          <ProgressBar
            :value="passwordStrengthScore"
            :max="100"
            :variant="passwordStrengthVariant"
            size="sm"
            animated
          />
          <div class="strength-requirements">
            <div class="requirement" :class="{ 'met': form.password.length >= 12 }">
              <span class="requirement-icon">{{ form.password.length >= 12 ? '✓' : '○' }}</span>
              At least 12 characters
            </div>
            <div class="requirement" :class="{ 'met': /[A-Z]/.test(form.password) }">
              <span class="requirement-icon">{{ /[A-Z]/.test(form.password) ? '✓' : '○' }}</span>
              Uppercase letter
            </div>
            <div class="requirement" :class="{ 'met': /[a-z]/.test(form.password) }">
              <span class="requirement-icon">{{ /[a-z]/.test(form.password) ? '✓' : '○' }}</span>
              Lowercase letter
            </div>
            <div class="requirement" :class="{ 'met': /[0-9]/.test(form.password) }">
              <span class="requirement-icon">{{ /[0-9]/.test(form.password) ? '✓' : '○' }}</span>
              Number
            </div>
            <div class="requirement" :class="{ 'met': /[^A-Za-z0-9]/.test(form.password) }">
              <span class="requirement-icon">{{ /[^A-Za-z0-9]/.test(form.password) ? '✓' : '○' }}</span>
              Special character
            </div>
          </div>
        </div>
      </div>

      <!-- Confirm Password Field -->
      <BaseInput
        v-model="form.confirmPassword"
        type="password"
        label="Confirm Master Password"
        placeholder="Re-enter your master password"
        :error="errors.confirmPassword"
        :disabled="loading"
        required
        autocomplete="new-password"
        prefix-icon="lock"
      />

      <!-- Password Hint -->
      <BaseInput
        v-model="form.passwordHint"
        label="Password Hint (Optional)"
        placeholder="A hint to help you remember your password"
        :error="errors.passwordHint"
        :disabled="loading"
        help="Choose a hint that only you would understand. Do not include the actual password."
        prefix-icon="lightbulb"
      />

      <!-- Terms and Privacy -->
      <div class="terms-section">
        <label class="terms-checkbox">
          <input
            v-model="form.acceptTerms"
            type="checkbox"
            :disabled="loading"
            class="terms-input"
          >
          <span class="terms-label">
            I agree to the 
            <a href="/terms" target="_blank" class="terms-link">Terms of Service</a>
            and 
            <a href="/privacy" target="_blank" class="terms-link">Privacy Policy</a>
          </span>
        </label>
        <div v-if="errors.acceptTerms" class="terms-error">
          {{ errors.acceptTerms }}
        </div>
      </div>

      <!-- Marketing Opt-in -->
      <div class="marketing-section">
        <label class="marketing-checkbox">
          <input
            v-model="form.acceptMarketing"
            type="checkbox"
            :disabled="loading"
            class="marketing-input"
          >
          <span class="marketing-label">
            Send me security tips and product updates (optional)
          </span>
        </label>
      </div>

      <!-- Register Button -->
      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        block
        :loading="loading"
        :disabled="!isFormValid"
      >
        Create Account
      </BaseButton>

      <!-- Security Notice -->
      <div class="security-notice">
        <div class="notice-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div class="notice-content">
          <p class="notice-title">Your master password cannot be recovered</p>
          <p class="notice-text">
            We use zero-knowledge encryption. If you forget your master password, 
            we cannot recover your data. Please store it safely.
          </p>
        </div>
      </div>
    </form>

    <!-- Footer -->
    <div class="register-footer">
      <p class="login-prompt">
        Already have an account?
        <router-link to="/auth/login" class="login-link">
          Sign in
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
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { useAuthStore } from '@/store/auth.store'
import { isValidEmail } from '@/utils/helpers'

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  passwordHint: string
  acceptTerms: boolean
  acceptMarketing: boolean
}

// Router
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(false)
const generalError = ref('')

const form = reactive<RegisterForm>({
  email: '',
  password: '',
  confirmPassword: '',
  passwordHint: '',
  acceptTerms: false,
  acceptMarketing: false
})

const errors = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  passwordHint: '',
  acceptTerms: ''
})

// Computed
const passwordStrengthScore = computed(() => {
  return calculatePasswordStrength(form.password)
})

const passwordStrengthText = computed(() => {
  const score = passwordStrengthScore.value
  if (score < 20) return 'Very Weak'
  if (score < 40) return 'Weak'
  if (score < 60) return 'Fair'
  if (score < 80) return 'Good'
  return 'Strong'
})

const passwordStrengthClass = computed(() => {
  const score = passwordStrengthScore.value
  if (score < 20) return 'strength-very-weak'
  if (score < 40) return 'strength-weak'
  if (score < 60) return 'strength-fair'
  if (score < 80) return 'strength-good'
  return 'strength-strong'
})

const passwordStrengthVariant = computed(() => {
  const score = passwordStrengthScore.value
  if (score < 40) return 'danger'
  if (score < 60) return 'warning'
  if (score < 80) return 'info'
  return 'success'
}) as any

const isFormValid = computed(() => {
  return form.email &&
         form.password &&
         form.confirmPassword &&
         form.acceptTerms &&
         isValidEmail(form.email) &&
         passwordStrengthScore.value >= 60 &&
         form.password === form.confirmPassword &&
         !Object.values(errors).some(error => error)
})

// Methods
const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0
  
  let score = 0
  
  // Length scoring
  if (password.length >= 8) score += 10
  if (password.length >= 12) score += 15
  if (password.length >= 16) score += 10
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^A-Za-z0-9]/.test(password)) score += 15
  
  // Bonus for good practices
  if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
    score += 20
  }
  
  // Penalties
  if (/(.)\1{2,}/.test(password)) score -= 15 // Repeated characters
  if (/012|123|234|345|456|567|678|789|890/.test(password)) score -= 10 // Sequential numbers
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) score -= 10 // Sequential letters
  
  return Math.max(0, Math.min(100, score))
}

const validateForm = () => {
  // Reset errors
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = ''
  })
  
  // Email validation
  if (!form.email) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  // Password validation
  if (!form.password) {
    errors.password = 'Master password is required'
  } else if (form.password.length < 8) {
    errors.password = 'Master password must be at least 8 characters'
  } else if (passwordStrengthScore.value < 60) {
    errors.password = 'Please choose a stronger master password'
  }
  
  // Confirm password validation
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your master password'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }
  
  // Password hint validation
  if (form.passwordHint && form.passwordHint.toLowerCase().includes(form.password.toLowerCase())) {
    errors.passwordHint = 'Password hint cannot contain your actual password'
  }
  
  // Terms validation
  if (!form.acceptTerms) {
    errors.acceptTerms = 'You must accept the Terms of Service and Privacy Policy'
  }
  
  return !Object.values(errors).some(error => error)
}

const handleRegister = async () => {
  if (!validateForm()) return
  
  loading.value = true
  generalError.value = ''
  
  try {
    await authStore.signUp({
      email: form.email,
      password: form.password,
      passwordHint: form.passwordHint || undefined,
      acceptMarketing: form.acceptMarketing
    })
    
    // Redirect to verification or dashboard
    await router.push('/auth/verify-email')
  } catch (error: any) {
    generalError.value = error.message || 'An error occurred during registration'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-form {
  @apply w-full max-w-lg mx-auto p-8 bg-white rounded-xl shadow-lg;
}

.register-header {
  @apply text-center mb-8;
}

.register-title {
  @apply text-2xl font-bold text-neutral-900 mb-2;
}

.register-subtitle {
  @apply text-neutral-600;
}

.register-form-content {
  @apply space-y-6;
}

.password-section {
  @apply space-y-3;
}

.password-strength {
  @apply space-y-2;
}

.strength-header {
  @apply flex items-center justify-between;
}

.strength-label {
  @apply text-sm font-medium text-neutral-700;
}

.strength-score {
  @apply text-sm font-semibold;
}

.strength-very-weak { @apply text-danger-600; }
.strength-weak { @apply text-danger-500; }
.strength-fair { @apply text-warning-500; }
.strength-good { @apply text-info-600; }
.strength-strong { @apply text-success-600; }

.strength-requirements {
  @apply grid grid-cols-1 gap-1 text-xs;
}

.requirement {
  @apply flex items-center gap-2 text-neutral-600;
}

.requirement.met {
  @apply text-success-600;
}

.requirement-icon {
  @apply w-4 text-center font-mono;
}

.terms-section {
  @apply space-y-2;
}

.terms-checkbox {
  @apply flex items-start gap-3 cursor-pointer;
}

.terms-input {
  @apply mt-0.5 w-4 h-4 text-primary-600 border-neutral-300 rounded;
  @apply focus:ring-primary-500 focus:ring-2;
}

.terms-label {
  @apply text-sm text-neutral-700;
}

.terms-link {
  @apply text-primary-600 hover:text-primary-700 underline;
}

.terms-error {
  @apply text-sm text-danger-600;
}

.marketing-section {
  @apply -mt-2;
}

.marketing-checkbox {
  @apply flex items-start gap-3 cursor-pointer;
}

.marketing-input {
  @apply mt-0.5 w-4 h-4 text-primary-600 border-neutral-300 rounded;
  @apply focus:ring-primary-500 focus:ring-2;
}

.marketing-label {
  @apply text-sm text-neutral-600;
}

.security-notice {
  @apply flex gap-3 p-4 bg-warning-50 border border-warning-200 rounded-lg;
}

.notice-icon {
  @apply text-warning-600 shrink-0 mt-0.5;
}

.notice-content {
  @apply space-y-1;
}

.notice-title {
  @apply text-sm font-semibold text-warning-800;
}

.notice-text {
  @apply text-sm text-warning-700;
}

.register-footer {
  @apply mt-8 text-center;
}

.login-prompt {
  @apply text-sm text-neutral-600;
}

.login-link {
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
  .register-form {
    @apply bg-neutral-800;
  }
  
  .register-title {
    @apply text-neutral-100;
  }
  
  .register-subtitle {
    @apply text-neutral-400;
  }
  
  .strength-label {
    @apply text-neutral-300;
  }
  
  .requirement {
    @apply text-neutral-400;
  }
  
  .requirement.met {
    @apply text-success-400;
  }
  
  .terms-label {
    @apply text-neutral-300;
  }
  
  .marketing-label {
    @apply text-neutral-400;
  }
  
  .security-notice {
    @apply bg-warning-900 border-warning-700;
  }
  
  .notice-title {
    @apply text-warning-300;
  }
  
  .notice-text {
    @apply text-warning-400;
  }
  
  .notice-icon {
    @apply text-warning-400;
  }
  
  .login-prompt {
    @apply text-neutral-400;
  }
  
  .error-alert {
    @apply bg-danger-900 border-danger-700 text-danger-300;
  }
}

/* Focus styles */
.terms-input:focus,
.marketing-input:focus {
  @apply ring-offset-2 ring-offset-white;
}

@media (prefers-color-scheme: dark) {
  .terms-input:focus,
  .marketing-input:focus {
    @apply ring-offset-neutral-800;
  }
}
</style>
