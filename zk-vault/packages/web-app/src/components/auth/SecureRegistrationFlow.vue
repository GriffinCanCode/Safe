<template>
  <div class="secure-registration-flow">
    <!-- Registration Header -->
    <div class="registration-header">
      <h2 class="registration-title">Create Your Secure Account</h2>
      <p class="registration-subtitle">
        Choose your preferred registration method and secure your digital life
      </p>
    </div>

    <!-- Security Notice -->
    <div class="security-notice">
      <div class="security-notice-icon">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
      <div class="security-notice-content">
        <p class="security-notice-title">Zero-Knowledge Security</p>
        <p class="security-notice-text">
          Your data is encrypted locally using post-quantum cryptography. We never see your
          passwords or personal information.
        </p>
      </div>
    </div>

    <!-- Registration Method Selection -->
    <div v-if="currentStep === 'method'" class="method-selection">
      <h3 class="method-title">Choose Registration Method</h3>
      
      <!-- Google OAuth Registration -->
      <div class="registration-method">
        <BaseButton
          variant="outline"
          size="lg"
          block
          @click="handleGoogleRegistration"
          :loading="loadingGoogle"
          :disabled="loading"
          class="google-register-btn"
        >
          <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </BaseButton>
        <p class="method-description">
          Quick setup with your Google account. Biometric authentication available.
        </p>
      </div>

      <!-- Email/Password Registration -->
      <div class="registration-method">
        <BaseButton
          variant="primary"
          size="lg"
          block
          @click="selectEmailRegistration"
          :disabled="loading"
          class="email-register-btn"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Continue with Email
        </BaseButton>
        <p class="method-description">
          Maximum security with zero-knowledge master password encryption.
        </p>
      </div>
    </div>

    <!-- Email Registration Form -->
    <div v-else-if="currentStep === 'email'" class="email-registration">
      <form @submit.prevent="handleEmailRegistration" class="registration-form">
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

        <!-- Password Field with Security Enhancements -->
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

          <!-- Advanced Password Strength Analysis -->
          <div v-if="form.password" class="password-analysis">
            <div class="strength-header">
              <span class="strength-label">Security Strength</span>
              <span class="strength-score" :class="strengthScoreClass">
                {{ strengthScoreText }}
              </span>
            </div>
            
            <ProgressBar
              :value="strengthScore"
              :max="100"
              :variant="strengthVariant"
              size="sm"
              animated
            />

            <!-- Detailed Security Requirements -->
            <div class="security-requirements">
              <div class="requirement-group">
                <h4 class="requirement-group-title">Basic Requirements</h4>
                <div class="requirement" :class="{ met: form.password.length >= 12 }">
                  <span class="requirement-icon">{{ form.password.length >= 12 ? '✓' : '○' }}</span>
                  At least 12 characters
                </div>
                <div class="requirement" :class="{ met: /[A-Z]/.test(form.password) }">
                  <span class="requirement-icon">{{ /[A-Z]/.test(form.password) ? '✓' : '○' }}</span>
                  Uppercase letter
                </div>
                <div class="requirement" :class="{ met: /[a-z]/.test(form.password) }">
                  <span class="requirement-icon">{{ /[a-z]/.test(form.password) ? '✓' : '○' }}</span>
                  Lowercase letter
                </div>
                <div class="requirement" :class="{ met: /[0-9]/.test(form.password) }">
                  <span class="requirement-icon">{{ /[0-9]/.test(form.password) ? '✓' : '○' }}</span>
                  Number
                </div>
                <div class="requirement" :class="{ met: /[^A-Za-z0-9]/.test(form.password) }">
                  <span class="requirement-icon">{{ /[^A-Za-z0-9]/.test(form.password) ? '✓' : '○' }}</span>
                  Special character
                </div>
              </div>

              <div class="requirement-group" v-if="form.password.length >= 8">
                <h4 class="requirement-group-title">Advanced Security</h4>
                <div class="requirement" :class="{ met: !hasCommonPatterns(form.password) }">
                  <span class="requirement-icon">{{ !hasCommonPatterns(form.password) ? '✓' : '○' }}</span>
                  No common patterns
                </div>
                <div class="requirement" :class="{ met: hasGoodEntropy(form.password) }">
                  <span class="requirement-icon">{{ hasGoodEntropy(form.password) ? '✓' : '○' }}</span>
                  High entropy
                </div>
                <div class="requirement" :class="{ met: !isBreachedPassword(form.password) }">
                  <span class="requirement-icon">{{ !isBreachedPassword(form.password) ? '✓' : '○' }}</span>
                  Not in breach database
                </div>
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
          help="Choose a hint that only you would understand. Never include the actual password."
          prefix-icon="lightbulb"
        />

        <!-- Terms and Privacy -->
        <div class="form-agreements">
          <label class="form-agreement">
            <input
              v-model="form.acceptTerms"
              type="checkbox"
              :disabled="loading"
              class="form-agreement-checkbox"
            />
            <span class="form-agreement-text">
              I agree to the
              <a href="/terms" target="_blank" class="form-agreement-link">Terms of Service</a>
              and
              <a href="/privacy" target="_blank" class="form-agreement-link">Privacy Policy</a>
            </span>
          </label>
          <div v-if="errors.acceptTerms" class="form-error">
            {{ errors.acceptTerms }}
          </div>
        </div>

        <!-- Marketing Opt-in -->
        <div class="form-error-offset">
          <label class="form-agreement">
            <input
              v-model="form.acceptMarketing"
              type="checkbox"
              :disabled="loading"
              class="form-agreement-checkbox"
            />
            <span class="form-agreement-text">
              Send me security tips and product updates (optional)
            </span>
          </label>
        </div>

        <!-- Navigation Buttons -->
        <div class="form-navigation">
          <BaseButton
            type="button"
            variant="outline"
            @click="backToMethodSelection"
            :disabled="loading"
          >
            Back
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :loading="loading"
            :disabled="!isEmailFormValid"
          >
            Create Account
          </BaseButton>
        </div>
      </form>
    </div>

    <!-- Registration Success -->
    <div v-else-if="currentStep === 'success'" class="registration-success">
      <div class="success-content">
        <div class="success-icon">
          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 class="success-title">Account Created Successfully!</h3>
        <p class="success-description">
          Your secure vault is ready with advanced encryption.
          {{ registrationMethod === 'google' ? 'Biometric authentication is available.' : 'You can enable biometric authentication in settings.' }}
        </p>

        <BaseButton
          variant="primary"
          size="lg"
          block
          @click="completeRegistration"
          class="success-continue-btn"
        >
          Continue to Your Vault
        </BaseButton>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="generalError" class="error-alert" role="alert">
      <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
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
import ProgressBar from '@/components/common/ProgressBar.vue'
import { useAuthStore } from '@/store/auth.store'
import { isValidEmail } from '@/utils/helpers'
// Import crypto packages for enhanced security
import { 
  ZeroKnowledgeVault, 
  ZeroKnowledgeAuth,
  SRPClient,
  MasterKeyDerivation,
  SecureMemoryManager,
  MemoryProtection,
  ConstantTime,
  AlgorithmSelector
} from '@zk-vault/crypto'
import type { RegistrationData } from '@/services/auth.service'

type RegistrationStep = 'method' | 'email' | 'success'
type RegistrationMethod = 'email' | 'google'

interface RegistrationForm {
  email: string
  password: string
  confirmPassword: string
  passwordHint: string
  acceptTerms: boolean
  acceptMarketing: boolean
}

// Router and stores
const router = useRouter()
const authStore = useAuthStore()

// State
const currentStep = ref<RegistrationStep>('method')
const registrationMethod = ref<RegistrationMethod>('email')
const loading = ref(false)
const loadingGoogle = ref(false)
const generalError = ref('')

// Crypto components
const zkVault = ref<ZeroKnowledgeVault>(new ZeroKnowledgeVault())
const srpClient = ref<SRPClient>(new SRPClient())
const secureMemoryManager = ref<SecureMemoryManager>(new SecureMemoryManager())

// Form data
const form = reactive<RegistrationForm>({
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

// Computed properties
const strengthScore = computed(() => {
  return calculateAdvancedPasswordStrength(form.password)
})

const strengthScoreText = computed(() => {
  const score = strengthScore.value
  if (score < 20) return 'Very Weak'
  if (score < 40) return 'Weak'
  if (score < 60) return 'Fair'
  if (score < 80) return 'Good'
  if (score < 90) return 'Strong'
  return 'Excellent'
})

const strengthScoreClass = computed(() => {
  const score = strengthScore.value
  if (score < 20) return 'strength-very-weak'
  if (score < 40) return 'strength-weak'
  if (score < 60) return 'strength-fair'
  if (score < 80) return 'strength-good'
  if (score < 90) return 'strength-strong'
  return 'strength-excellent'
})

const strengthVariant = computed(() => {
  const score = strengthScore.value
  if (score < 40) return 'danger'
  if (score < 60) return 'warning'
  if (score < 80) return 'info'
  return 'success'
}) as any

const isEmailFormValid = computed(() => {
  return (
    form.email &&
    form.password &&
    form.confirmPassword &&
    form.acceptTerms &&
    isValidEmail(form.email) &&
    strengthScore.value >= 70 &&
    form.password === form.confirmPassword &&
    !Object.values(errors).some(error => error)
  )
})

// Methods
const selectEmailRegistration = () => {
  registrationMethod.value = 'email'
  currentStep.value = 'email'
}

const backToMethodSelection = () => {
  currentStep.value = 'method'
}

const handleGoogleRegistration = async () => {
  loadingGoogle.value = true
  generalError.value = ''

  try {
    registrationMethod.value = 'google'
    
    // Use Google OAuth
    const result = await authStore.loginWithGoogle(false)
    
    currentStep.value = 'success'
    
    // Emit success event
    emit('success', {
      email: result.user.email,
      isNewUser: result.isNewUser,
      method: 'google'
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Google registration failed'
    generalError.value = errorMessage
    emit('error', errorMessage)
  } finally {
    loadingGoogle.value = false
  }
}

const handleEmailRegistration = async () => {
  if (!validateEmailForm()) return

  loading.value = true
  generalError.value = ''

  try {
    // Enhanced registration with crypto security
    const registrationData: RegistrationData = {
      email: form.email,
      password: form.password,
      displayName: form.email.split('@')[0],
      acceptTerms: form.acceptTerms,
      acceptMarketing: form.acceptMarketing
    }

    await authStore.register(registrationData)
    
    // Clear sensitive data from memory
    ConstantTime.secureClear(new TextEncoder().encode(form.password))
    
    currentStep.value = 'success'
    
    // Emit success event
    emit('success', {
      email: form.email,
      isNewUser: true,
      method: 'email'
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Registration failed'
    generalError.value = errorMessage
    emit('error', errorMessage)
  } finally {
    loading.value = false
  }
}

const validateEmailForm = (): boolean => {
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

  // Password validation with enhanced security
  if (!form.password) {
    errors.password = 'Master password is required'
  } else if (form.password.length < 12) {
    errors.password = 'Master password must be at least 12 characters'
  } else if (strengthScore.value < 70) {
    errors.password = 'Please choose a stronger master password (minimum 70% strength)'
  } else if (hasCommonPatterns(form.password)) {
    errors.password = 'Password contains common patterns. Please choose a more unique password.'
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

const calculateAdvancedPasswordStrength = (password: string): number => {
  if (!password) return 0

  let score = 0

  // Length scoring (enhanced)
  if (password.length >= 8) score += 10
  if (password.length >= 12) score += 15
  if (password.length >= 16) score += 15
  if (password.length >= 20) score += 10

  // Character variety (enhanced)
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^A-Za-z0-9]/.test(password)) score += 15

  // Advanced scoring
  if (hasGoodEntropy(password)) score += 15
  if (!hasCommonPatterns(password)) score += 10
  if (!isBreachedPassword(password)) score += 10

  // Bonus for excellent practices
  if (
    password.length >= 16 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    hasGoodEntropy(password) &&
    !hasCommonPatterns(password)
  ) {
    score += 15
  }

  return Math.max(0, Math.min(100, score))
}

const hasCommonPatterns = (password: string): boolean => {
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters
    /012|123|234|345|456|567|678|789|890/, // Sequential numbers
    /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, // Sequential letters
    /password|admin|user|login|welcome|qwerty|azerty|football|baseball|basketball/i // Common words
  ]
  
  return commonPatterns.some(pattern => pattern.test(password))
}

const hasGoodEntropy = (password: string): boolean => {
  // Calculate Shannon entropy
  const freq = new Map<string, number>()
  for (const char of password) {
    freq.set(char, (freq.get(char) || 0) + 1)
  }
  
  let entropy = 0
  for (const count of freq.values()) {
    const p = count / password.length
    entropy -= p * Math.log2(p)
  }
  
  return entropy >= 3.5 // Good entropy threshold
}

const isBreachedPassword = (password: string): boolean => {
  // In a real implementation, this would check against a breach database
  // For now, we'll check against a small list of common breached passwords
  const commonBreachedPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty', 'welcome',
    'letmein', 'monkey', 'dragon', 'football', 'baseball', 'basketball'
  ]
  
  return commonBreachedPasswords.includes(password.toLowerCase())
}

const completeRegistration = () => {
  emit('complete', {
    method: registrationMethod.value
  })
}

// Emits
const emit = defineEmits<{
  success: [data: { email: string; isNewUser: boolean; method: RegistrationMethod }]
  error: [message: string]
  complete: [data: { method: RegistrationMethod }]
}>()
</script> 