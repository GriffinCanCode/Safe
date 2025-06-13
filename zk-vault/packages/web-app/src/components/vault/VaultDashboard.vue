<template>
  <div class="vault-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">Your Vault</h1>
        <p class="dashboard-subtitle">Secure password management made simple</p>
      </div>
      <div class="header-actions">
        <BaseButton
          variant="primary"
          @click="showPasswordEditor = true"
          icon="plus"
        >
          Add Password
        </BaseButton>
        <BaseButton
          variant="outline"
          @click="showGenerator = true"
          icon="key"
        >
          Generate Password
        </BaseButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid" v-if="stats">
      <div class="stat-card">
        <div class="stat-icon">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.totalItems }}</div>
          <div class="stat-label">Total Items</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.itemsByType.password }}</div>
          <div class="stat-label">Passwords</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ Math.round(stats.averagePasswordStrength * 100) }}%</div>
          <div class="stat-label">Avg. Strength</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.compromisedPasswords + stats.weakPasswords }}</div>
          <div class="stat-label">Security Issues</div>
        </div>
      </div>
    </div>

    <!-- Security Overview -->
    <div class="security-overview" v-if="stats">
      <h2 class="section-title">Security Overview</h2>
      <div class="security-cards">
        <div class="security-card" :class="{ warning: stats.weakPasswords > 0 }">
          <div class="security-header">
            <h3 class="security-title">Weak Passwords</h3>
            <span class="security-count">{{ stats.weakPasswords }}</span>
          </div>
          <p class="security-description">
            {{ stats.weakPasswords === 0 ? 'All your passwords are strong!' : 'Some passwords need strengthening.' }}
          </p>
          <BaseButton
            v-if="stats.weakPasswords > 0"
            variant="outline"
            size="sm"
            @click="viewWeakPasswords"
          >
            View Weak Passwords
          </BaseButton>
        </div>

        <div class="security-card" :class="{ danger: stats.compromisedPasswords > 0 }">
          <div class="security-header">
            <h3 class="security-title">Compromised Passwords</h3>
            <span class="security-count">{{ stats.compromisedPasswords }}</span>
          </div>
          <p class="security-description">
            {{ stats.compromisedPasswords === 0 ? 'No compromised passwords detected.' : 'Some passwords have been found in data breaches.' }}
          </p>
          <BaseButton
            v-if="stats.compromisedPasswords > 0"
            variant="outline"
            size="sm"
            @click="viewCompromisedPasswords"
          >
            View Compromised
          </BaseButton>
        </div>

        <div class="security-card" :class="{ warning: stats.reusedPasswords > 0 }">
          <div class="security-header">
            <h3 class="security-title">Reused Passwords</h3>
            <span class="security-count">{{ stats.reusedPasswords }}</span>
          </div>
          <p class="security-description">
            {{ stats.reusedPasswords === 0 ? 'No password reuse detected.' : 'Some passwords are used multiple times.' }}
          </p>
          <BaseButton
            v-if="stats.reusedPasswords > 0"
            variant="outline"
            size="sm"
            @click="viewReusedPasswords"
          >
            View Reused
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Recent Items -->
    <div class="recent-items" v-if="recentItems.length > 0">
      <div class="section-header">
        <h2 class="section-title">Recent Items</h2>
        <router-link to="/vault/passwords" class="view-all-link">
          View All
        </router-link>
      </div>
      <div class="recent-items-grid">
        <PasswordItem
          v-for="item in recentItems"
          :key="item.id"
          :item="item"
          @edit="editPassword"
          @delete="deletePassword"
          @copy-username="copyToClipboard"
          @copy-password="copyToClipboard"
          @toggle-favorite="toggleFavorite"
          view-mode="grid"
        />
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h2 class="section-title">Quick Actions</h2>
      <div class="actions-grid">
        <button class="action-card" @click="showPasswordEditor = true">
          <div class="action-icon">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Add Password</h3>
            <p class="action-description">Save a new password securely</p>
          </div>
        </button>

        <button class="action-card" @click="showGenerator = true">
          <div class="action-icon">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Generate Password</h3>
            <p class="action-description">Create a strong password</p>
          </div>
        </button>

        <router-link to="/vault/import" class="action-card">
          <div class="action-icon">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Import Data</h3>
            <p class="action-description">Import from other managers</p>
          </div>
        </router-link>

        <router-link to="/files" class="action-card">
          <div class="action-icon">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Secure Files</h3>
            <p class="action-description">Store and manage encrypted files</p>
          </div>
        </router-link>

        <router-link to="/settings/backup" class="action-card">
          <div class="action-icon">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Backup Vault</h3>
            <p class="action-description">Export and backup your data</p>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Modals -->
    <PasswordEditor
      v-if="showPasswordEditor"
      :item="editingPassword"
      @close="closePasswordEditor"
      @saved="onPasswordSaved"
    />

    <PasswordGenerator
      v-if="showGenerator"
      @close="showGenerator = false"
      @generated="onPasswordGenerated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import PasswordItem from './PasswordItem.vue'
import PasswordEditor from './PasswordEditor.vue'
import PasswordGenerator from './PasswordGenerator.vue'
import { vaultService } from '@/services/vault.service'
import type { VaultStats, PasswordVaultItem, DecryptedVaultItem } from '@/services/vault.service'

// Router
const router = useRouter()

// State
const loading = ref(false)
const stats = ref<VaultStats | null>(null)
const recentItems = ref<PasswordVaultItem[]>([])
const showPasswordEditor = ref(false)
const showGenerator = ref(false)
const editingPassword = ref<PasswordVaultItem | undefined>(undefined)

// Methods
const loadDashboardData = async () => {
  loading.value = true

  try {
    // Load stats and recent items in parallel
    const [statsResult, recentResult] = await Promise.all([
      vaultService.getVaultStats(),
      vaultService.searchItems({ type: 'password' }, { limit: 6 })
    ])

    stats.value = statsResult
    recentItems.value = recentResult.items
      .filter(item => item.type === 'password')
      .slice(0, 6) as PasswordVaultItem[]
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    // TODO: Show error notification
  } finally {
    loading.value = false
  }
}

const editPassword = (item: PasswordVaultItem) => {
  editingPassword.value = item
  showPasswordEditor.value = true
}

const deletePassword = async (id: string) => {
  if (!confirm('Are you sure you want to delete this password?')) {
    return
  }

  try {
    await vaultService.deleteItem(id)
    recentItems.value = recentItems.value.filter((item: PasswordVaultItem) => item.id !== id)
    await loadDashboardData() // Refresh stats
    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to delete password:', error)
    // TODO: Show error notification
  }
}

const toggleFavorite = async (item: PasswordVaultItem) => {
  try {
    const updated = await vaultService.updateItem(item.id, {
      favorite: !item.favorite
    }) as PasswordVaultItem

    const index = recentItems.value.findIndex((p: PasswordVaultItem) => p.id === item.id)
    if (index > -1) {
      recentItems.value[index] = updated
    }
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
    // TODO: Show error notification
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // TODO: Show error notification
  }
}

const closePasswordEditor = () => {
  showPasswordEditor.value = false
  editingPassword.value = undefined
}

const onPasswordSaved = async (item: DecryptedVaultItem) => {
  closePasswordEditor()
  await loadDashboardData() // Refresh data
  // TODO: Show success notification
}

const onPasswordGenerated = (password: string) => {
  showGenerator.value = false
  // TODO: Show notification with copy option
}

const viewWeakPasswords = () => {
  router.push('/vault/passwords?filter=weak')
}

const viewCompromisedPasswords = () => {
  router.push('/vault/passwords?filter=compromised')
}

const viewReusedPasswords = () => {
  router.push('/vault/passwords?filter=reused')
}

// Lifecycle
onMounted(() => {
  loadDashboardData()
})
</script>


