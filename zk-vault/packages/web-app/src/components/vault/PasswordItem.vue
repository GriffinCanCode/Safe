<template>
  <div 
    ref="itemElement"
    class="password-item card-lift" 
    :class="itemClasses"
  >
    <!-- Main Content -->
    <div class="item-content" @click="handleItemClick">
      <!-- Icon and Info -->
      <div class="item-info">
        <div 
          ref="iconElement"
          class="item-icon" 
          :class="iconClasses"
        >
          <img
            v-if="item.iconUrl"
            :src="item.iconUrl"
            :alt="`${item.name} icon`"
            class="icon-image"
            @error="handleIconError"
          />
          <svg v-else class="icon-fallback" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <div class="item-details">
          <h3 class="item-name">{{ item.name }}</h3>
          <p class="item-username" :title="item.username">{{ item.username }}</p>
          <div class="item-meta">
            <span v-if="item.website" class="meta-website">
              {{ formatUrl(item.website) }}
            </span>
            <span class="meta-updated">
              Updated {{ formatRelativeTime(item.updatedAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Security Indicators -->
      <div class="item-indicators">
        <div v-if="passwordStrength" class="strength-indicator" :class="strengthClasses">
          <div class="strength-bar">
            <div 
              ref="strengthBarElement"
              class="strength-fill dynamic-progress" 
              :style="{ '--progress-width': `${passwordStrength}%` }" 
            />
          </div>
          <span class="strength-text">{{ strengthLabel }}</span>
        </div>
        
        <!-- Warning Indicators -->
        <div v-if="securityWarnings.length > 0" class="security-warnings">
          <div
            v-for="warning in securityWarnings"
            :key="warning.type"
            class="warning-badge"
            :class="warning.severity"
            :title="warning.message"
          >
            <svg class="warning-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
        
        <!-- Favorite Star -->
        <button
          v-if="showFavorite"
          ref="favoriteButtonElement"
          class="favorite-button icon-bounce"
          :class="{ 'favorited': item.isFavorite }"
          @click.stop="toggleFavorite"
          :title="item.isFavorite ? 'Remove from favorites' : 'Add to favorites'"
        >
          <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="item-actions">
      <BaseButton
        ref="copyUsernameButton"
        variant="ghost"
        size="sm"
        icon="copy"
        @click.stop="copyUsername"
        :disabled="!item.username"
        title="Copy username"
        class="action-button btn-hover"
      />
      
      <BaseButton
        ref="copyPasswordButton"
        variant="ghost"
        size="sm"
        icon="key"
        @click.stop="copyPassword"
        title="Copy password"
        class="action-button btn-hover"
      />
      
      <BaseButton
        v-if="item.website"
        ref="openWebsiteButton"
        variant="ghost"
        size="sm"
        icon="external-link"
        @click.stop="openWebsite"
        title="Open website"
        class="action-button btn-hover"
      />
      
      <!-- More Actions Menu -->
      <div class="more-actions-menu" v-if="showActions">
        <BaseButton
          ref="moreActionsButton"
          variant="ghost"
          size="sm"
          icon="more-vertical"
          @click.stop="toggleActionsMenu"
          title="More actions"
          class="action-button btn-hover"
        />
        
        <div 
          v-if="showActionsMenu" 
          ref="actionsDropdownElement"
          class="actions-dropdown animate-fade-in" 
          @click.stop
        >
          <button
            class="dropdown-item btn-hover"
            @click="editItem"
          >
            <svg class="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          
          <button
            class="dropdown-item btn-hover"
            @click="duplicateItem"
          >
            <svg class="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          
          <button
            class="dropdown-item btn-hover"
            @click="shareItem"
          >
            <svg class="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share
          </button>
          
          <hr class="dropdown-divider" />
          
          <button
            class="dropdown-item danger btn-hover"
            @click="deleteItem"
          >
            <svg class="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Copy Success Toast -->
    <div 
      v-if="showCopySuccess" 
      ref="copyToastElement"
      class="copy-toast animate-fade-in"
    >
      <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      {{ copySuccessMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { copyToClipboard, formatRelativeTime } from '@/utils/helpers'

interface VaultItem {
  id: string
  name: string
  username: string
  password: string
  website?: string
  iconUrl?: string
  isFavorite: boolean
  tags: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
  passwordStrength?: number
  lastUsed?: Date
}

interface SecurityWarning {
  type: 'weak' | 'reused' | 'old' | 'breached'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
}

interface Props {
  item: VaultItem
  showFavorite?: boolean
  showActions?: boolean
  selected?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showFavorite: true,
  showActions: true,
  selected: false,
  compact: false
})

const emit = defineEmits<{
  click: [item: VaultItem]
  edit: [item: VaultItem]
  delete: [item: VaultItem]
  duplicate: [item: VaultItem]
  share: [item: VaultItem]
  favorite: [item: VaultItem, favorite: boolean]
}>()

// Template refs
const itemElement = ref<HTMLElement>()
const iconElement = ref<HTMLElement>()
const strengthBarElement = ref<HTMLElement>()
const favoriteButtonElement = ref<HTMLElement>()
const copyUsernameButton = ref<HTMLElement>()
const copyPasswordButton = ref<HTMLElement>()
const openWebsiteButton = ref<HTMLElement>()
const moreActionsButton = ref<HTMLElement>()
const actionsDropdownElement = ref<HTMLElement>()
const copyToastElement = ref<HTMLElement>()

// State
const showActionsMenu = ref(false)
const showCopySuccess = ref(false)
const copySuccessMessage = ref('')
const iconError = ref(false)

// Computed
const itemClasses = computed(() => ({
  'password-item-selected': props.selected,
  'password-item-compact': props.compact
}))

const iconClasses = computed(() => ({
  'icon-error': iconError.value
}))

const passwordStrength = computed(() => {
  return props.item.passwordStrength || calculatePasswordStrength(props.item.password)
})

const strengthClasses = computed(() => {
  const strength = passwordStrength.value
  if (strength < 40) return 'strength-weak'
  if (strength < 70) return 'strength-fair'
  return 'strength-good'
})

const strengthLabel = computed(() => {
  const strength = passwordStrength.value
  if (strength < 40) return 'Weak'
  if (strength < 70) return 'Fair'
  return 'Strong'
})

const securityWarnings = computed((): SecurityWarning[] => {
  const warnings: SecurityWarning[] = []
  
  // Weak password
  if (passwordStrength.value < 40) {
    warnings.push({
      type: 'weak',
      severity: 'high',
      message: 'Password is weak and should be strengthened'
    })
  }
  
  // Old password (90+ days)
  const daysSinceUpdate = Math.floor((Date.now() - props.item.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceUpdate > 90) {
    warnings.push({
      type: 'old',
      severity: 'medium',
      message: `Password is ${daysSinceUpdate} days old`
    })
  }
  
  return warnings
})

// Methods
const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0
  
  let score = 0
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 25
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^A-Za-z0-9]/.test(password)) score += 20
  
  return Math.min(100, score)
}

const formatUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

const handleItemClick = () => {
  emit('click', props.item)
}

const handleIconError = () => {
  iconError.value = true
}

const showCopyToast = (message: string) => {
  copySuccessMessage.value = message
  showCopySuccess.value = true
  
  setTimeout(() => {
    showCopySuccess.value = false
  }, 2000)
}

const copyUsername = async () => {
  if (!props.item.username) return
  
  const success = await copyToClipboard(props.item.username)
  if (success) {
    showCopyToast('Username copied!')
  }
}

const copyPassword = async () => {
  const success = await copyToClipboard(props.item.password)
  if (success) {
    showCopyToast('Password copied!')
  }
}

const openWebsite = () => {
  if (props.item.website) {
    window.open(props.item.website, '_blank', 'noopener,noreferrer')
  }
}

const toggleFavorite = () => {
  emit('favorite', props.item, !props.item.isFavorite)
}

const toggleActionsMenu = () => {
  showActionsMenu.value = !showActionsMenu.value
}

const editItem = () => {
  showActionsMenu.value = false
  emit('edit', props.item)
}

const duplicateItem = () => {
  showActionsMenu.value = false
  emit('duplicate', props.item)
}

const shareItem = () => {
  showActionsMenu.value = false
  emit('share', props.item)
}

const deleteItem = () => {
  showActionsMenu.value = false
  emit('delete', props.item)
}

// Click outside handler
const handleClickOutside = (event: Event) => {
  if (showActionsMenu.value) {
    showActionsMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>


