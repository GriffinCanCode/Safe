<template>
  <div class="password-item" :class="itemClasses">
    <!-- Main Content -->
    <div class="item-content" @click="handleItemClick">
      <!-- Icon and Info -->
      <div class="item-info">
        <div class="item-icon" :class="iconClasses">
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
            <div class="strength-fill" :style="{ width: `${passwordStrength}%` }" />
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
          class="favorite-button"
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
        variant="ghost"
        size="sm"
        icon="copy"
        @click.stop="copyUsername"
        :disabled="!item.username"
        title="Copy username"
        class="action-button"
      />
      
      <BaseButton
        variant="ghost"
        size="sm"
        icon="key"
        @click.stop="copyPassword"
        title="Copy password"
        class="action-button"
      />
      
      <BaseButton
        v-if="item.website"
        variant="ghost"
        size="sm"
        icon="external-link"
        @click.stop="openWebsite"
        title="Open website"
        class="action-button"
      />
      
      <!-- More Actions Menu -->
      <div class="more-actions-menu" v-if="showActions">
        <BaseButton
          variant="ghost"
          size="sm"
          icon="more-vertical"
          @click.stop="toggleActionsMenu"
          title="More actions"
          class="action-button"
        />
        
        <div v-if="showActionsMenu" class="actions-dropdown" @click.stop>
          <button
            class="dropdown-item"
            @click="editItem"
          >
            <svg class="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          
          <button
            class="dropdown-item"
            @click="duplicateItem"
          >
            <svg class="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          
          <button
            class="dropdown-item"
            @click="shareItem"
          >
            <svg class="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share
          </button>
          
          <hr class="dropdown-divider" />
          
          <button
            class="dropdown-item danger"
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
    <div v-if="showCopySuccess" class="copy-toast">
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

<style scoped>
.password-item {
  @apply relative flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-200;
  @apply hover:border-neutral-300 hover:shadow-sm transition-all duration-200 cursor-pointer;
}

.password-item-selected {
  @apply border-primary-500 bg-primary-50;
}

.password-item-compact {
  @apply p-3;
}

.item-content {
  @apply flex items-center gap-4 flex-1 min-w-0;
}

.item-info {
  @apply flex items-center gap-3 flex-1 min-w-0;
}

.item-icon {
  @apply w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0;
}

.icon-image {
  @apply w-6 h-6 rounded;
}

.icon-fallback {
  @apply w-5 h-5 text-neutral-500;
}

.icon-error .icon-fallback {
  @apply text-neutral-400;
}

.item-details {
  @apply flex-1 min-w-0 space-y-1;
}

.item-name {
  @apply text-sm font-semibold text-neutral-900 truncate;
}

.item-username {
  @apply text-sm text-neutral-600 truncate;
}

.item-meta {
  @apply flex items-center gap-3 text-xs text-neutral-500;
}

.meta-website {
  @apply truncate;
}

.meta-updated {
  @apply whitespace-nowrap;
}

.item-indicators {
  @apply flex items-center gap-3;
}

.strength-indicator {
  @apply flex items-center gap-2;
}

.strength-bar {
  @apply w-12 h-1.5 bg-neutral-200 rounded-full overflow-hidden;
}

.strength-fill {
  @apply h-full transition-all duration-300;
}

.strength-weak .strength-fill {
  @apply bg-danger-500;
}

.strength-fair .strength-fill {
  @apply bg-warning-500;
}

.strength-good .strength-fill {
  @apply bg-success-500;
}

.strength-text {
  @apply text-xs font-medium;
}

.strength-weak .strength-text {
  @apply text-danger-600;
}

.strength-fair .strength-text {
  @apply text-warning-600;
}

.strength-good .strength-text {
  @apply text-success-600;
}

.security-warnings {
  @apply flex gap-1;
}

.warning-badge {
  @apply w-4 h-4 rounded-full flex items-center justify-center;
}

.warning-badge.high {
  @apply bg-danger-100 text-danger-600;
}

.warning-badge.medium {
  @apply bg-warning-100 text-warning-600;
}

.warning-badge.low {
  @apply bg-info-100 text-info-600;
}

.warning-icon {
  @apply w-2.5 h-2.5;
}

.favorite-button {
  @apply p-1 text-neutral-400 hover:text-warning-500 transition-colors duration-200;
}

.favorite-button.favorited {
  @apply text-warning-500;
}

.star-icon {
  @apply w-4 h-4;
}

.item-actions {
  @apply flex items-center gap-1 shrink-0 relative;
}

.action-button {
  @apply opacity-0 group-hover:opacity-100 transition-opacity duration-200;
}

.password-item:hover .action-button {
  @apply opacity-100;
}

.more-actions-menu {
  @apply relative;
}

.actions-dropdown {
  @apply absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-neutral-200 py-1 z-10;
}

.dropdown-item {
  @apply w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100;
  @apply flex items-center gap-2 transition-colors duration-150;
}

.dropdown-item.danger {
  @apply text-danger-700 hover:bg-danger-50;
}

.dropdown-icon {
  @apply w-4 h-4;
}

.dropdown-divider {
  @apply my-1 border-t border-neutral-200;
}

.copy-toast {
  @apply absolute top-2 right-2 bg-success-600 text-white px-3 py-1 rounded-md text-sm;
  @apply flex items-center gap-1 animate-fade-in-out;
}

.toast-icon {
  @apply w-4 h-4;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .password-item {
    @apply bg-neutral-800 border-neutral-700;
    @apply hover:border-neutral-600;
  }
  
  .password-item-selected {
    @apply border-primary-400 bg-primary-900;
  }
  
  .item-icon {
    @apply bg-neutral-700;
  }
  
  .icon-fallback {
    @apply text-neutral-400;
  }
  
  .item-name {
    @apply text-neutral-100;
  }
  
  .item-username {
    @apply text-neutral-300;
  }
  
  .item-meta {
    @apply text-neutral-400;
  }
  
  .strength-bar {
    @apply bg-neutral-700;
  }
  
  .actions-dropdown {
    @apply bg-neutral-800 border-neutral-600;
  }
  
  .dropdown-item {
    @apply text-neutral-300 hover:bg-neutral-700;
  }
  
  .dropdown-item.danger {
    @apply text-danger-400 hover:bg-danger-900;
  }
  
  .dropdown-divider {
    @apply border-neutral-600;
  }
}

/* Animations */
@keyframes fade-in-out {
  0%, 100% { opacity: 0; transform: translateY(-10px); }
  10%, 90% { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-out {
  animation: fade-in-out 2s ease-in-out;
}
</style>
