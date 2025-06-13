<template>
  <div class="breach-monitor">
    <!-- Header -->
    <div class="monitor-header">
      <div class="header-content">
        <h2 class="monitor-title">Breach Monitor</h2>
        <p class="monitor-description">Monitor your passwords against known data breaches</p>
      </div>
      <div class="header-actions">
        <BaseButton
          variant="outline"
          size="sm"
          @click="scanPasswords"
          :loading="scanning"
        >
          Scan Now
        </BaseButton>
        <BaseButton
          variant="outline"
          size="sm"
          @click="refreshData"
          :loading="loading"
        >
          Refresh
        </BaseButton>
      </div>
    </div>

    <!-- Status Overview -->
    <div class="status-overview">
      <div class="status-card" :class="getOverallStatusClass()">
        <div class="status-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getOverallStatusIcon()" />
          </svg>
        </div>
        <div class="status-content">
          <h3 class="status-title">{{ getOverallStatusTitle() }}</h3>
          <p class="status-description">{{ getOverallStatusDescription() }}</p>
          <div class="status-stats">
            <span class="stat-item">
              <strong>{{ breachedPasswords.length }}</strong> breached passwords
            </span>
            <span class="stat-item">
              <strong>{{ totalBreaches }}</strong> total breaches found
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Breach Statistics -->
    <div class="breach-stats">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ breachedPasswords.length }}</div>
            <div class="stat-label">Compromised Passwords</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ getHighRiskCount() }}</div>
            <div class="stat-label">High Risk</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ lastScanDate ? formatRelativeTime(lastScanDate) : 'Never' }}</div>
            <div class="stat-label">Last Scan</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ safePasswords }}</div>
            <div class="stat-label">Safe Passwords</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading || scanning" class="monitor-loading">
      <LoadingSpinner size="lg" />
      <p class="loading-text">{{ scanning ? 'Scanning passwords...' : 'Loading breach data...' }}</p>
    </div>

    <!-- Breached Passwords List -->
    <div v-else-if="breachedPasswords.length > 0" class="breached-passwords">
      <div class="section-header">
        <h3 class="section-title">Compromised Passwords</h3>
        <div class="section-actions">
          <BaseButton
            variant="primary"
            size="sm"
            @click="fixAllPasswords"
            :loading="fixingAll"
          >
            Fix All
          </BaseButton>
        </div>
      </div>

      <div class="password-list">
        <div
          v-for="password in breachedPasswords"
          :key="password.id"
          class="password-item"
          :class="getPasswordItemClass(password)"
        >
          <div class="password-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div class="password-content">
            <div class="password-header">
              <h4 class="password-name">{{ password.name }}</h4>
              <div class="password-meta">
                <span class="password-username">{{ password.username }}</span>
                <span class="password-risk" :class="getRiskClass(password.riskLevel)">
                  {{ password.riskLevel.toUpperCase() }} RISK
                </span>
              </div>
            </div>

            <div class="breach-details">
              <div class="breach-info">
                <span class="breach-count">Found in {{ password.breaches.length }} breach{{ password.breaches.length > 1 ? 'es' : '' }}</span>
                <span class="breach-date">Most recent: {{ formatDate(password.mostRecentBreach) }}</span>
              </div>
              
              <div class="breach-list">
                <div
                  v-for="breach in password.breaches.slice(0, 3)"
                  :key="breach.id"
                  class="breach-tag"
                  :title="breach.description"
                >
                  {{ breach.name }}
                </div>
                <span v-if="password.breaches.length > 3" class="breach-more">
                  +{{ password.breaches.length - 3 }} more
                </span>
              </div>
            </div>
          </div>

          <div class="password-actions">
            <BaseButton
              variant="outline"
              size="sm"
              @click="viewPasswordDetails(password)"
            >
              Details
            </BaseButton>
            <BaseButton
              variant="primary"
              size="sm"
              @click="fixPassword(password)"
              :loading="fixingPasswords.includes(password.id)"
            >
              Fix Now
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- No Breaches State -->
    <div v-else class="no-breaches">
      <div class="no-breaches-icon">
        <svg class="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h3 class="no-breaches-title">All Clear!</h3>
      <p class="no-breaches-description">
        None of your passwords have been found in known data breaches.
        Keep up the good security practices!
      </p>
    </div>

    <!-- Recent Breaches -->
    <div v-if="recentBreaches.length > 0" class="recent-breaches">
      <h3 class="section-title">Recent Data Breaches</h3>
      <div class="breach-alerts">
        <div
          v-for="breach in recentBreaches"
          :key="breach.id"
          class="breach-alert"
        >
          <div class="alert-icon">
            <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="alert-content">
            <h4 class="alert-title">{{ breach.name }}</h4>
            <p class="alert-description">{{ breach.description }}</p>
            <div class="alert-meta">
              <span class="alert-date">{{ formatDate(breach.date) }}</span>
              <span class="alert-accounts">{{ breach.affectedAccounts.toLocaleString() }} accounts affected</span>
            </div>
          </div>
          <BaseButton
            variant="outline"
            size="sm"
            @click="checkAgainstBreach(breach)"
          >
            Check My Passwords
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Password Details Modal -->
    <BaseModal
      v-model="showDetailsModal"
      title="Password Breach Details"
      size="lg"
    >
      <div v-if="selectedPassword" class="password-details">
        <div class="details-header">
          <h3 class="details-title">{{ selectedPassword.name }}</h3>
          <span class="details-risk" :class="getRiskClass(selectedPassword.riskLevel)">
            {{ selectedPassword.riskLevel.toUpperCase() }} RISK
          </span>
        </div>

        <div class="details-content">
          <div class="detail-section">
            <h4 class="detail-section-title">Account Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Username:</span>
                <span class="detail-value">{{ selectedPassword.username }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Website:</span>
                <span class="detail-value">{{ selectedPassword.website || 'Not specified' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="detail-section-title">Breach Information</h4>
            <div class="breach-details-list">
              <div
                v-for="breach in selectedPassword.breaches"
                :key="breach.id"
                class="breach-detail-item"
              >
                <div class="breach-detail-header">
                  <h5 class="breach-detail-name">{{ breach.name }}</h5>
                  <span class="breach-detail-date">{{ formatDate(breach.date) }}</span>
                </div>
                <p class="breach-detail-description">{{ breach.description }}</p>
                <div class="breach-detail-data">
                  <span class="data-label">Compromised data:</span>
                  <div class="data-types">
                    <span
                      v-for="dataType in breach.compromisedData"
                      :key="dataType"
                      class="data-type"
                    >
                      {{ dataType }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton
          variant="outline"
          @click="showDetailsModal = false"
        >
          Close
        </BaseButton>
        <BaseButton
          variant="primary"
          @click="fixPassword(selectedPassword!)"
          :loading="fixingPasswords.includes(selectedPassword?.id || '')"
        >
          Fix Password
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { formatRelativeTime } from '@/utils/helpers'

interface BreachedPassword {
  id: string
  name: string
  username: string
  website?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  breaches: DataBreach[]
  mostRecentBreach: Date
}

interface DataBreach {
  id: string
  name: string
  description: string
  date: Date
  affectedAccounts: number
  compromisedData: string[]
}

interface Props {
  totalPasswords?: number
}

const props = withDefaults(defineProps<Props>(), {
  totalPasswords: 0
})

const emit = defineEmits<{
  'password-fixed': [passwordId: string]
  'scan-complete': [results: any]
}>()

// State
const loading = ref(false)
const scanning = ref(false)
const fixingAll = ref(false)
const fixingPasswords = ref<string[]>([])
const showDetailsModal = ref(false)
const selectedPassword = ref<BreachedPassword | null>(null)
const lastScanDate = ref<Date | null>(null)

const breachedPasswords = ref<BreachedPassword[]>([])
const recentBreaches = ref<DataBreach[]>([])

// Computed
const totalBreaches = computed(() => 
  breachedPasswords.value.reduce((total: number, password: BreachedPassword) => total + password.breaches.length, 0)
)

const safePasswords = computed(() => 
  Math.max(0, props.totalPasswords - breachedPasswords.value.length)
)

const getHighRiskCount = () => 
  breachedPasswords.value.filter((p: BreachedPassword) => p.riskLevel === 'high' || p.riskLevel === 'critical').length

// Methods
const loadBreachData = async () => {
  loading.value = true
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock data
    breachedPasswords.value = [
      {
        id: '1',
        name: 'LinkedIn',
        username: 'john.doe@email.com',
        website: 'linkedin.com',
        riskLevel: 'high',
        mostRecentBreach: new Date('2021-06-15'),
        breaches: [
          {
            id: 'linkedin-2021',
            name: 'LinkedIn Data Breach',
            description: 'Professional networking platform breach exposing user profiles and email addresses',
            date: new Date('2021-06-15'),
            affectedAccounts: 700000000,
            compromisedData: ['Email addresses', 'Profile information', 'Phone numbers']
          }
        ]
      },
      {
        id: '2',
        name: 'Adobe',
        username: 'john.doe',
        website: 'adobe.com',
        riskLevel: 'critical',
        mostRecentBreach: new Date('2013-10-03'),
        breaches: [
          {
            id: 'adobe-2013',
            name: 'Adobe Systems Breach',
            description: 'Creative software company breach exposing customer data and encrypted passwords',
            date: new Date('2013-10-03'),
            affectedAccounts: 153000000,
            compromisedData: ['Email addresses', 'Encrypted passwords', 'Password hints', 'Names']
          }
        ]
      }
    ]

    recentBreaches.value = [
      {
        id: 'recent-1',
        name: 'LastPass Security Incident',
        description: 'Password manager service experienced unauthorized access to customer vault data',
        date: new Date('2022-12-22'),
        affectedAccounts: 33000000,
        compromisedData: ['Encrypted password vaults', 'Website URLs', 'Usernames']
      }
    ]

    lastScanDate.value = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  } catch (error) {
    console.error('Failed to load breach data:', error)
  } finally {
    loading.value = false
  }
}

const scanPasswords = async () => {
  scanning.value = true
  
  try {
    // Simulate scanning process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    lastScanDate.value = new Date()
    emit('scan-complete', { breachedCount: breachedPasswords.value.length })
  } catch (error) {
    console.error('Failed to scan passwords:', error)
  } finally {
    scanning.value = false
  }
}

const refreshData = () => {
  loadBreachData()
}

const fixPassword = async (password: BreachedPassword) => {
  fixingPasswords.value.push(password.id)
  
  try {
    // Simulate fixing password
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Remove from breached list
    const index = breachedPasswords.value.findIndex((p: BreachedPassword) => p.id === password.id)
    if (index >= 0) {
      breachedPasswords.value.splice(index, 1)
    }
    
    emit('password-fixed', password.id)
    showDetailsModal.value = false
  } catch (error) {
    console.error('Failed to fix password:', error)
  } finally {
    fixingPasswords.value = fixingPasswords.value.filter((id: string) => id !== password.id)
  }
}

const fixAllPasswords = async () => {
  fixingAll.value = true
  
  try {
    // Fix all passwords sequentially
    for (const password of breachedPasswords.value) {
      await fixPassword(password)
    }
  } catch (error) {
    console.error('Failed to fix all passwords:', error)
  } finally {
    fixingAll.value = false
  }
}

const viewPasswordDetails = (password: BreachedPassword) => {
  selectedPassword.value = password
  showDetailsModal.value = true
}

const checkAgainstBreach = async (breach: DataBreach) => {
  // Simulate checking passwords against specific breach
  scanning.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    // In real app, this would check user's passwords against the specific breach
  } catch (error) {
    console.error('Failed to check against breach:', error)
  } finally {
    scanning.value = false
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

const getOverallStatusClass = () => {
  if (breachedPasswords.value.length === 0) return 'status-safe'
  if (getHighRiskCount() > 0) return 'status-critical'
  return 'status-warning'
}

const getOverallStatusIcon = () => {
  if (breachedPasswords.value.length === 0) {
    return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
  }
  return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
}

const getOverallStatusTitle = () => {
  if (breachedPasswords.value.length === 0) return 'All Secure'
  if (getHighRiskCount() > 0) return 'Critical Security Issues'
  return 'Security Issues Detected'
}

const getOverallStatusDescription = () => {
  if (breachedPasswords.value.length === 0) {
    return 'None of your passwords have been found in known data breaches.'
  }
  if (getHighRiskCount() > 0) {
    return 'Some of your passwords have been found in high-risk data breaches and should be changed immediately.'
  }
  return 'Some of your passwords have been found in data breaches and should be updated.'
}

const getPasswordItemClass = (password: BreachedPassword) => {
  switch (password.riskLevel) {
    case 'critical':
      return 'password-critical'
    case 'high':
      return 'password-high'
    case 'medium':
      return 'password-medium'
    default:
      return 'password-low'
  }
}

const getRiskClass = (riskLevel: string) => {
  switch (riskLevel) {
    case 'critical':
      return 'risk-critical'
    case 'high':
      return 'risk-high'
    case 'medium':
      return 'risk-medium'
    default:
      return 'risk-low'
  }
}

// Lifecycle
onMounted(() => {
  loadBreachData()
})
</script>

<style scoped>
.breach-monitor {
  @apply space-y-8;
}

.monitor-header {
  @apply flex items-start justify-between;
}

.header-content {
  @apply space-y-1;
}

.monitor-title {
  @apply text-2xl font-bold text-neutral-900;
}

.monitor-description {
  @apply text-neutral-600;
}

.header-actions {
  @apply flex items-center space-x-3;
}

.status-overview {
  @apply mb-8;
}

.status-card {
  @apply bg-white border rounded-lg p-6 flex items-start space-x-4;
}

.status-safe {
  @apply border-green-300 bg-green-50;
}

.status-warning {
  @apply border-yellow-300 bg-yellow-50;
}

.status-critical {
  @apply border-red-300 bg-red-50;
}

.status-icon {
  @apply w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0;
}

.status-safe .status-icon {
  @apply bg-green-100 text-green-600;
}

.status-warning .status-icon {
  @apply bg-yellow-100 text-yellow-600;
}

.status-critical .status-icon {
  @apply bg-red-100 text-red-600;
}

.status-content {
  @apply flex-1 space-y-3;
}

.status-title {
  @apply text-xl font-semibold text-neutral-900;
}

.status-description {
  @apply text-neutral-700;
}

.status-stats {
  @apply flex items-center space-x-6 text-sm;
}

.stat-item {
  @apply text-neutral-600;
}

.breach-stats {
  @apply mb-8;
}

.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
}

.stat-card {
  @apply bg-white border border-neutral-200 rounded-lg p-6 flex items-center space-x-4;
}

.stat-icon {
  @apply flex-shrink-0;
}

.stat-content {
  @apply space-y-1;
}

.stat-value {
  @apply text-2xl font-bold text-neutral-900;
}

.stat-label {
  @apply text-sm text-neutral-600;
}

.monitor-loading {
  @apply flex flex-col items-center justify-center py-16 space-y-4;
}

.loading-text {
  @apply text-neutral-600;
}

.breached-passwords {
  @apply space-y-6;
}

.section-header {
  @apply flex items-center justify-between;
}

.section-title {
  @apply text-lg font-semibold text-neutral-900;
}

.section-actions {
  @apply flex items-center space-x-3;
}

.password-list {
  @apply space-y-4;
}

.password-item {
  @apply bg-white border rounded-lg p-6 flex items-start space-x-4;
}

.password-critical {
  @apply border-red-300 bg-red-50;
}

.password-high {
  @apply border-orange-300 bg-orange-50;
}

.password-medium {
  @apply border-yellow-300 bg-yellow-50;
}

.password-low {
  @apply border-blue-300 bg-blue-50;
}

.password-icon {
  @apply w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-600;
}

.password-content {
  @apply flex-1 space-y-3;
}

.password-header {
  @apply space-y-1;
}

.password-name {
  @apply text-lg font-semibold text-neutral-900;
}

.password-meta {
  @apply flex items-center space-x-4 text-sm;
}

.password-username {
  @apply text-neutral-600;
}

.password-risk {
  @apply px-2 py-1 rounded text-xs font-medium;
}

.risk-critical {
  @apply bg-red-100 text-red-800;
}

.risk-high {
  @apply bg-orange-100 text-orange-800;
}

.risk-medium {
  @apply bg-yellow-100 text-yellow-800;
}

.risk-low {
  @apply bg-blue-100 text-blue-800;
}

.breach-details {
  @apply space-y-2;
}

.breach-info {
  @apply flex items-center space-x-4 text-sm text-neutral-600;
}

.breach-list {
  @apply flex items-center space-x-2;
}

.breach-tag {
  @apply px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded;
}

.breach-more {
  @apply text-xs text-neutral-500;
}

.password-actions {
  @apply flex items-center space-x-2 flex-shrink-0;
}

.no-breaches {
  @apply text-center py-16;
}

.no-breaches-icon {
  @apply mb-6;
}

.no-breaches-title {
  @apply text-2xl font-bold text-neutral-900 mb-4;
}

.no-breaches-description {
  @apply text-neutral-600 max-w-md mx-auto;
}

.recent-breaches {
  @apply space-y-6;
}

.breach-alerts {
  @apply space-y-4;
}

.breach-alert {
  @apply bg-orange-50 border border-orange-200 rounded-lg p-6 flex items-start space-x-4;
}

.alert-icon {
  @apply w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0;
}

.alert-content {
  @apply flex-1 space-y-2;
}

.alert-title {
  @apply text-lg font-semibold text-neutral-900;
}

.alert-description {
  @apply text-neutral-700;
}

.alert-meta {
  @apply flex items-center space-x-4 text-sm text-neutral-600;
}

.password-details {
  @apply space-y-6;
}

.details-header {
  @apply flex items-center justify-between;
}

.details-title {
  @apply text-xl font-semibold text-neutral-900;
}

.details-risk {
  @apply px-3 py-1 rounded text-sm font-medium;
}

.details-content {
  @apply space-y-6;
}

.detail-section {
  @apply space-y-4;
}

.detail-section-title {
  @apply text-lg font-semibold text-neutral-900;
}

.detail-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.detail-item {
  @apply flex items-center space-x-2;
}

.detail-label {
  @apply text-sm font-medium text-neutral-600;
}

.detail-value {
  @apply text-sm text-neutral-900;
}

.breach-details-list {
  @apply space-y-4;
}

.breach-detail-item {
  @apply bg-neutral-50 rounded-lg p-4 space-y-3;
}

.breach-detail-header {
  @apply flex items-center justify-between;
}

.breach-detail-name {
  @apply text-lg font-semibold text-neutral-900;
}

.breach-detail-date {
  @apply text-sm text-neutral-600;
}

.breach-detail-description {
  @apply text-neutral-700;
}

.breach-detail-data {
  @apply space-y-2;
}

.data-label {
  @apply text-sm font-medium text-neutral-600;
}

.data-types {
  @apply flex flex-wrap gap-2;
}

.data-type {
  @apply px-2 py-1 bg-neutral-200 text-neutral-700 text-xs rounded;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .monitor-title,
  .status-title,
  .section-title,
  .password-name,
  .no-breaches-title,
  .alert-title,
  .details-title,
  .detail-section-title,
  .breach-detail-name {
    @apply text-neutral-100;
  }

  .monitor-description,
  .status-description,
  .password-username,
  .breach-info,
  .no-breaches-description,
  .alert-description,
  .alert-meta,
  .detail-label,
  .detail-value,
  .breach-detail-description,
  .data-label {
    @apply text-neutral-400;
  }

  .status-card,
  .stat-card,
  .password-item {
    @apply bg-neutral-800 border-neutral-700;
  }

  .password-icon {
    @apply bg-neutral-700 text-neutral-400;
  }

  .breach-tag {
    @apply bg-neutral-700 text-neutral-300;
  }

  .breach-alert {
    @apply bg-orange-900 border-orange-700;
  }

  .breach-detail-item {
    @apply bg-neutral-700;
  }

  .data-type {
    @apply bg-neutral-600 text-neutral-300;
  }
}
</style>
