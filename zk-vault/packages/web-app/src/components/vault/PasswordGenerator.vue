<template>
  <div class="password-generator">
    <!-- Header -->
    <div class="generator-header">
      <h3 class="generator-title">Password Generator</h3>
      <p class="generator-subtitle">Create strong, secure passwords</p>
    </div>

    <!-- Generated Password Display -->
    <div class="password-display">
      <div class="password-field">
        <BaseInput
          v-model="generatedPassword"
          label="Generated Password"
          readonly
          :class="{ 'password-field-input': true }"
          suffix-icon="copy"
          @click="copyPassword"
        />
        <div class="password-actions">
          <BaseButton
            variant="outline"
            size="sm"
            icon="refresh"
            @click="generatePassword"
            :disabled="!hasValidOptions"
            title="Generate new password"
          />
          <BaseButton
            variant="outline"
            size="sm"
            icon="copy"
            @click="copyPassword"
            :disabled="!generatedPassword"
            title="Copy to clipboard"
          />
        </div>
      </div>

      <!-- Password Strength Meter -->
      <div v-if="generatedPassword" class="strength-section">
        <div class="strength-header">
          <span class="strength-label">Password Strength</span>
          <span class="strength-score" :class="strengthClass">
            {{ strengthText }}
          </span>
        </div>
        <ProgressBar
          :value="strengthScore"
          :max="100"
          :variant="strengthVariant"
          size="sm"
          animated
        />
        <div class="strength-details">
          <div class="strength-metrics">
            <span class="metric">{{ generatedPassword.length }} characters</span>
            <span class="metric">{{ calculateEntropy(generatedPassword) }} bits entropy</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Generation Options -->
    <div class="generator-options">
      <h4 class="options-title">Password Options</h4>

      <!-- Length Slider -->
      <div class="option-group">
        <label class="option-label">
          Length: {{ options.length }}
        </label>
        <input
          v-model.number="options.length"
          type="range"
          min="4"
          max="128"
          class="length-slider"
          @input="generatePassword"
        />
        <div class="length-indicators">
          <span class="length-min">4</span>
          <span class="length-max">128</span>
        </div>
      </div>

      <!-- Character Type Options -->
      <div class="character-options">
        <div class="option-item">
          <label class="option-checkbox">
            <input
              v-model="options.includeUppercase"
              type="checkbox"
              @change="generatePassword"
            />
            <span class="checkbox-label">Uppercase Letters (A-Z)</span>
          </label>
        </div>

        <div class="option-item">
          <label class="option-checkbox">
            <input
              v-model="options.includeLowercase"
              type="checkbox"
              @change="generatePassword"
            />
            <span class="checkbox-label">Lowercase Letters (a-z)</span>
          </label>
        </div>

        <div class="option-item">
          <label class="option-checkbox">
            <input
              v-model="options.includeNumbers"
              type="checkbox"
              @change="generatePassword"
            />
            <span class="checkbox-label">Numbers (0-9)</span>
          </label>
        </div>

        <div class="option-item">
          <label class="option-checkbox">
            <input
              v-model="options.includeSymbols"
              type="checkbox"
              @change="generatePassword"
            />
            <span class="checkbox-label">Symbols (!@#$%^&*)</span>
          </label>
        </div>

        <div class="option-item">
          <label class="option-checkbox">
            <input
              v-model="options.excludeSimilar"
              type="checkbox"
              @change="generatePassword"
            />
            <span class="checkbox-label">Exclude Similar Characters (0, O, l, I)</span>
          </label>
        </div>

        <div class="option-item">
          <label class="option-checkbox">
            <input
              v-model="options.excludeAmbiguous"
              type="checkbox"
              @change="generatePassword"
            />
            <span class="checkbox-label">Exclude Ambiguous Characters ({ } [ ] ( ) / \ ' " ` ~ , ; . < >)</span>
          </label>
        </div>
      </div>

      <!-- Custom Characters -->
      <div class="option-group">
        <BaseInput
          v-model="options.customCharacters"
          label="Custom Characters"
          placeholder="Add custom characters to include"
          help="These characters will be added to the generation pool"
          @input="generatePassword"
        />
      </div>

      <!-- Excluded Characters -->
      <div class="option-group">
        <BaseInput
          v-model="options.excludeCharacters"
          label="Exclude Characters"
          placeholder="Characters to exclude from generation"
          help="These specific characters will not be used"
          @input="generatePassword"
        />
      </div>
    </div>

    <!-- Preset Buttons -->
    <div class="preset-section">
      <h4 class="options-title">Quick Presets</h4>
      <div class="preset-buttons">
        <BaseButton
          variant="outline"
          size="sm"
          @click="applyPreset('basic')"
        >
          Basic
        </BaseButton>
        <BaseButton
          variant="outline"
          size="sm"
          @click="applyPreset('strong')"
        >
          Strong
        </BaseButton>
        <BaseButton
          variant="outline"
          size="sm"
          @click="applyPreset('complex')"
        >
          Complex
        </BaseButton>
        <BaseButton
          variant="outline"
          size="sm"
          @click="applyPreset('pin')"
        >
          PIN
        </BaseButton>
      </div>
    </div>

    <!-- Actions -->
    <div class="generator-actions">
      <BaseButton
        variant="primary"
        size="lg"
        block
        @click="usePassword"
        :disabled="!generatedPassword"
      >
        Use This Password
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { copyToClipboard } from '@/utils/helpers'

interface PasswordOptions {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  excludeSimilar: boolean
  excludeAmbiguous: boolean
  customCharacters: string
  excludeCharacters: string
}

interface Props {
  initialOptions?: Partial<PasswordOptions>
}

const props = withDefaults(defineProps<Props>(), {
  initialOptions: () => ({})
})

const emit = defineEmits<{
  'password-generated': [password: string]
  'password-selected': [password: string]
}>()

// State
const generatedPassword = ref('')
const copySuccess = ref(false)

const options = reactive<PasswordOptions>({
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: false,
  excludeSimilar: false,
  excludeAmbiguous: false,
  customCharacters: '',
  excludeCharacters: '',
  ...props.initialOptions
})

// Character sets
const characterSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  similar: '0O1lI',
  ambiguous: '{}[]()/\\\'"`~,;.<>'
}

// Computed
const hasValidOptions = computed(() => {
  return options.includeUppercase ||
         options.includeLowercase ||
         options.includeNumbers ||
         options.includeSymbols ||
         options.customCharacters.length > 0
})

const strengthScore = computed(() => {
  return calculatePasswordStrength(generatedPassword.value)
})

const strengthText = computed(() => {
  const score = strengthScore.value
  if (score < 20) return 'Very Weak'
  if (score < 40) return 'Weak'
  if (score < 60) return 'Fair'
  if (score < 80) return 'Good'
  return 'Strong'
})

const strengthClass = computed(() => {
  const score = strengthScore.value
  if (score < 20) return 'strength-very-weak'
  if (score < 40) return 'strength-weak'
  if (score < 60) return 'strength-fair'
  if (score < 80) return 'strength-good'
  return 'strength-strong'
})

const strengthVariant = computed(() => {
  const score = strengthScore.value
  if (score < 40) return 'danger'
  if (score < 60) return 'warning'
  if (score < 80) return 'info'
  return 'success'
}) as any

// Methods
const buildCharacterPool = (): string => {
  let pool = ''
  
  if (options.includeUppercase) pool += characterSets.uppercase
  if (options.includeLowercase) pool += characterSets.lowercase
  if (options.includeNumbers) pool += characterSets.numbers
  if (options.includeSymbols) pool += characterSets.symbols
  if (options.customCharacters) pool += options.customCharacters
  
  // Remove excluded characters
  if (options.excludeSimilar) {
    pool = pool.split('').filter(char => !characterSets.similar.includes(char)).join('')
  }
  
  if (options.excludeAmbiguous) {
    pool = pool.split('').filter(char => !characterSets.ambiguous.includes(char)).join('')
  }
  
  if (options.excludeCharacters) {
    pool = pool.split('').filter(char => !options.excludeCharacters.includes(char)).join('')
  }
  
  return pool
}

const generatePassword = () => {
  if (!hasValidOptions.value) return
  
  const pool = buildCharacterPool()
  if (!pool) return
  
  let password = ''
  
  // Use crypto.getRandomValues for secure randomness
  const array = new Uint32Array(options.length)
  crypto.getRandomValues(array)
  
  for (let i = 0; i < options.length; i++) {
    password += pool.charAt(array[i] % pool.length)
  }
  
  generatedPassword.value = password
  emit('password-generated', password)
}

const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0
  
  let score = 0
  
  // Length bonus
  score += Math.min(password.length * 4, 32)
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 5
  if (/[A-Z]/.test(password)) score += 5
  if (/[0-9]/.test(password)) score += 5
  if (/[^A-Za-z0-9]/.test(password)) score += 10
  
  // Pattern penalties
  if (/(.)\1{2,}/.test(password)) score -= 10 // Repeated characters
  if (/012|123|234|345|456|567|678|789|890/.test(password)) score -= 10 // Sequential numbers
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) score -= 10 // Sequential letters
  
  return Math.max(0, Math.min(100, score))
}

const calculateEntropy = (password: string): number => {
  const pool = buildCharacterPool()
  if (!pool || !password) return 0
  
  return Math.round(Math.log2(Math.pow(pool.length, password.length)))
}

const copyPassword = async () => {
  if (!generatedPassword.value) return
  
  const success = await copyToClipboard(generatedPassword.value)
  if (success) {
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

const usePassword = () => {
  if (generatedPassword.value) {
    emit('password-selected', generatedPassword.value)
  }
}

const applyPreset = (preset: string) => {
  switch (preset) {
    case 'basic':
      Object.assign(options, {
        length: 12,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      })
      break
    case 'strong':
      Object.assign(options, {
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: true,
        excludeAmbiguous: false
      })
      break
    case 'complex':
      Object.assign(options, {
        length: 24,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: true,
        excludeAmbiguous: true
      })
      break
    case 'pin':
      Object.assign(options, {
        length: 6,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: true,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      })
      break
  }
  generatePassword()
}

// Lifecycle
onMounted(() => {
  generatePassword()
})

// Watch for option changes
watch([
  () => options.length,
  () => options.includeUppercase,
  () => options.includeLowercase,
  () => options.includeNumbers,
  () => options.includeSymbols,
  () => options.excludeSimilar,
  () => options.excludeAmbiguous
], () => {
  if (hasValidOptions.value) {
    generatePassword()
  }
}, { immediate: true })
</script>


