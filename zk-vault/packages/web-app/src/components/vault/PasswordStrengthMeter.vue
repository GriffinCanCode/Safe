<template>
  <div class="password-strength-meter" :class="wrapperClasses">
    <!-- Strength Header -->
    <div v-if="showHeader" class="strength-header">
      <span class="strength-label">{{ label }}</span>
      <span class="strength-score" :class="strengthClass">
        {{ strengthText }}
      </span>
    </div>

    <!-- Progress Bar -->
    <ProgressBar
      v-if="showProgress"
      :value="score"
      :max="100"
      :variant="strengthVariant"
      :size="progressSize"
      :animated="animated"
    />

    <!-- Requirements Checklist -->
    <div v-if="showRequirements && requirements.length > 0" class="requirements-list">
      <div
        v-for="requirement in requirements"
        :key="requirement.key"
        class="requirement"
        :class="{ 'met': requirement.met }"
      >
        <span class="requirement-icon">
          {{ requirement.met ? '✓' : '○' }}
        </span>
        <span class="requirement-text">{{ requirement.text }}</span>
      </div>
    </div>

    <!-- Detailed Analysis -->
    <div v-if="showDetails && password" class="strength-details">
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Length</span>
          <span class="detail-value">{{ password.length }} characters</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Entropy</span>
          <span class="detail-value">{{ entropy }} bits</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Crack Time</span>
          <span class="detail-value">{{ crackTime }}</span>
        </div>
      </div>
    </div>

    <!-- Security Tips -->
    <div v-if="showTips && score < 80" class="security-tips">
      <div class="tips-header">
        <svg class="tip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="tips-title">Tips to improve your password:</span>
      </div>
      <ul class="tips-list">
        <li v-for="tip in securityTips" :key="tip" class="tip-item">
          {{ tip }}
        </li>
      </ul>
    </div>

    <!-- Feedback Messages -->
    <div v-if="showFeedback && feedback" class="strength-feedback" :class="feedbackClass">
      <svg class="feedback-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="feedbackIconPath" />
      </svg>
      {{ feedback }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from '@/components/common/ProgressBar.vue'

interface Requirement {
  key: string
  text: string
  met: boolean
}

interface Props {
  password: string
  label?: string
  showHeader?: boolean
  showProgress?: boolean
  showRequirements?: boolean
  showDetails?: boolean
  showTips?: boolean
  showFeedback?: boolean
  animated?: boolean
  progressSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  minLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireNumbers?: boolean
  requireSymbols?: boolean
  customRequirements?: Requirement[]
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Password Strength',
  showHeader: true,
  showProgress: true,
  showRequirements: false,
  showDetails: false,
  showTips: false,
  showFeedback: false,
  animated: true,
  progressSize: 'sm',
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: false
})

// Computed
const score = computed(() => calculatePasswordStrength(props.password))

const strengthText = computed(() => {
  const scoreValue = score.value
  if (scoreValue < 20) return 'Very Weak'
  if (scoreValue < 40) return 'Weak'
  if (scoreValue < 60) return 'Fair'
  if (scoreValue < 80) return 'Good'
  return 'Strong'
})

const strengthClass = computed(() => {
  const scoreValue = score.value
  if (scoreValue < 20) return 'strength-very-weak'
  if (scoreValue < 40) return 'strength-weak'
  if (scoreValue < 60) return 'strength-fair'
  if (scoreValue < 80) return 'strength-good'
  return 'strength-strong'
})

const strengthVariant = computed(() => {
  const scoreValue = score.value
  if (scoreValue < 40) return 'danger'
  if (scoreValue < 60) return 'warning'
  if (scoreValue < 80) return 'info'
  return 'success'
}) as any

const wrapperClasses = computed(() => ({
  'strength-compact': !props.showRequirements && !props.showDetails && !props.showTips
}))

const requirements = computed((): Requirement[] => {
  const reqs: Requirement[] = []
  
  if (props.minLength > 0) {
    reqs.push({
      key: 'length',
      text: `At least ${props.minLength} characters`,
      met: props.password.length >= props.minLength
    })
  }
  
  if (props.requireUppercase) {
    reqs.push({
      key: 'uppercase',
      text: 'Uppercase letter (A-Z)',
      met: /[A-Z]/.test(props.password)
    })
  }
  
  if (props.requireLowercase) {
    reqs.push({
      key: 'lowercase',
      text: 'Lowercase letter (a-z)',
      met: /[a-z]/.test(props.password)
    })
  }
  
  if (props.requireNumbers) {
    reqs.push({
      key: 'numbers',
      text: 'Number (0-9)',
      met: /[0-9]/.test(props.password)
    })
  }
  
  if (props.requireSymbols) {
    reqs.push({
      key: 'symbols',
      text: 'Special character (!@#$%^&*)',
      met: /[^A-Za-z0-9]/.test(props.password)
    })
  }
  
  if (props.customRequirements) {
    reqs.push(...props.customRequirements)
  }
  
  return reqs
})

const entropy = computed(() => {
  if (!props.password) return 0
  
  let charsetSize = 0
  if (/[a-z]/.test(props.password)) charsetSize += 26
  if (/[A-Z]/.test(props.password)) charsetSize += 26
  if (/[0-9]/.test(props.password)) charsetSize += 10
  if (/[^A-Za-z0-9]/.test(props.password)) charsetSize += 32
  
  return Math.round(Math.log2(Math.pow(charsetSize, props.password.length)))
})

const crackTime = computed(() => {
  const ent = entropy.value
  if (ent < 30) return 'Instantly'
  if (ent < 40) return 'Seconds'
  if (ent < 50) return 'Minutes'
  if (ent < 60) return 'Hours'
  if (ent < 70) return 'Days'
  if (ent < 80) return 'Months'
  if (ent < 90) return 'Years'
  return 'Centuries'
})

const securityTips = computed(() => {
  const tips: string[] = []
  
  if (props.password.length < props.minLength) {
    tips.push(`Use at least ${props.minLength} characters`)
  }
  
  if (props.requireUppercase && !/[A-Z]/.test(props.password)) {
    tips.push('Add uppercase letters')
  }
  
  if (props.requireLowercase && !/[a-z]/.test(props.password)) {
    tips.push('Add lowercase letters')
  }
  
  if (props.requireNumbers && !/[0-9]/.test(props.password)) {
    tips.push('Include numbers')
  }
  
  if (props.requireSymbols && !/[^A-Za-z0-9]/.test(props.password)) {
    tips.push('Add special characters')
  }
  
  if (/(.)\1{2,}/.test(props.password)) {
    tips.push('Avoid repeating characters')
  }
  
  if (/012|123|234|345|456|567|678|789|890/.test(props.password)) {
    tips.push('Avoid sequential numbers')
  }
  
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(props.password)) {
    tips.push('Avoid sequential letters')
  }
  
  return tips.slice(0, 3) // Limit to 3 tips
})

const feedback = computed(() => {
  const scoreValue = score.value
  if (!props.password) return ''
  
  if (scoreValue < 20) return 'This password is very weak and easily guessable'
  if (scoreValue < 40) return 'This password is weak and could be cracked quickly'
  if (scoreValue < 60) return 'This password is fair but could be stronger'
  if (scoreValue < 80) return 'This password is good and reasonably secure'
  return 'This password is strong and very secure'
})

const feedbackClass = computed(() => {
  const scoreValue = score.value
  if (scoreValue < 40) return 'feedback-danger'
  if (scoreValue < 60) return 'feedback-warning'
  if (scoreValue < 80) return 'feedback-info'
  return 'feedback-success'
})

const feedbackIconPath = computed(() => {
  const scoreValue = score.value
  if (scoreValue < 40) return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' // Warning
  if (scoreValue < 80) return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' // Info
  return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' // Check
})

// Methods
const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0
  
  let score = 0
  
  // Length scoring (0-35 points)
  if (password.length >= 8) score += 10
  if (password.length >= 12) score += 15
  if (password.length >= 16) score += 10
  
  // Character variety (0-45 points)
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^A-Za-z0-9]/.test(password)) score += 15
  
  // Bonus for comprehensive coverage (0-20 points)
  const hasAll = /[a-z]/.test(password) && 
                 /[A-Z]/.test(password) && 
                 /[0-9]/.test(password) && 
                 /[^A-Za-z0-9]/.test(password)
  
  if (hasAll && password.length >= 12) score += 20
  
  // Penalties (reduce score)
  if (/(.)\1{2,}/.test(password)) score -= 15 // Repeated characters
  if (/012|123|234|345|456|567|678|789|890/.test(password)) score -= 10 // Sequential numbers
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) score -= 10 // Sequential letters
  if (/password|123456|qwerty|admin|user/i.test(password)) score -= 25 // Common passwords
  
  return Math.max(0, Math.min(100, score))
}
</script>


