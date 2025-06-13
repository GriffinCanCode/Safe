<template>
  <div class="security-dashboard">
    <!-- Security Score Overview -->
    <div class="security-score-section">
      <div class="score-card">
        <div class="score-header">
          <h2 class="score-title">Security Score</h2>
          <div class="score-badge" :class="scoreClass">
            {{ securityScore }}/100
          </div>
        </div>
        <div class="score-progress">
          <ProgressBar
            :value="securityScore"
            :variant="scoreVariant"
            size="lg"
            :animated="true"
            :show-percentage="true"
          />
        </div>
        <p class="score-description">{{ scoreDescription }}</p>
      </div>
    </div>

    <!-- Security Metrics Grid -->
    <div class="security-metrics">
      <div class="metric-card" :class="{ 'metric-warning': weakPasswords > 0 }">
        <div class="metric-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div class="metric-content">
          <h3 class="metric-title">Password Health</h3>
          <div class="metric-value">{{ weakPasswords }} weak</div>
          <p class="metric-description">{{ totalPasswords }} total passwords</p>
        </div>
        <BaseButton
          v-if="weakPasswords > 0"
          variant="outline"
          size="sm"
          @click="$emit('view-weak-passwords')"
        >
          Review
        </BaseButton>
      </div>

      <div class="metric-card" :class="{ 'metric-danger': breachedPasswords > 0 }">
        <div class="metric-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div class="metric-content">
          <h3 class="metric-title">Breach Monitor</h3>
          <div class="metric-value">{{ breachedPasswords }} breached</div>
          <p class="metric-description">Passwords found in data breaches</p>
        </div>
        <BaseButton
          v-if="breachedPasswords > 0"
          variant="outline"
          size="sm"
          @click="$emit('view-breached-passwords')"
        >
          Fix Now
        </BaseButton>
      </div>

      <div class="metric-card">
        <div class="metric-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div class="metric-content">
          <h3 class="metric-title">Two-Factor Auth</h3>
          <div class="metric-value">{{ twoFactorEnabled ? 'Enabled' : 'Disabled' }}</div>
          <p class="metric-description">{{ twoFactorEnabled ? 'Your account is protected' : 'Add extra security' }}</p>
        </div>
        <BaseButton
          variant="outline"
          size="sm"
          @click="$emit('setup-2fa')"
        >
          {{ twoFactorEnabled ? 'Manage' : 'Enable' }}
        </BaseButton>
      </div>

      <div class="metric-card">
        <div class="metric-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
        </div>
        <div class="metric-content">
          <h3 class="metric-title">Biometric Auth</h3>
          <div class="metric-value">{{ biometricEnabled ? 'Enabled' : 'Disabled' }}</div>
          <p class="metric-description">{{ biometricEnabled ? 'Quick secure access' : 'Enable for convenience' }}</p>
        </div>
        <BaseButton
          variant="outline"
          size="sm"
          @click="$emit('setup-biometric')"
        >
          {{ biometricEnabled ? 'Manage' : 'Enable' }}
        </BaseButton>
      </div>
    </div>

    <!-- Recent Security Activity -->
    <div class="activity-section">
      <div class="activity-header">
        <h3 class="activity-title">Recent Security Activity</h3>
        <BaseButton
          variant="ghost"
          size="sm"
          @click="$emit('view-audit-log')"
        >
          View All
        </BaseButton>
      </div>
      <div class="activity-list">
        <div
          v-for="activity in recentActivity"
          :key="activity.id"
          class="activity-item"
        >
          <div class="activity-icon" :class="getActivityIconClass(activity.type)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getActivityIconPath(activity.type)" />
            </svg>
          </div>
          <div class="activity-content">
            <p class="activity-description">{{ activity.description }}</p>
            <p class="activity-time">{{ formatRelativeTime(activity.timestamp) }}</p>
          </div>
          <div v-if="activity.severity === 'high'" class="activity-badge">
            High Priority
          </div>
        </div>
      </div>
    </div>

    <!-- Security Recommendations -->
    <div class="recommendations-section" v-if="recommendations.length > 0">
      <h3 class="recommendations-title">Security Recommendations</h3>
      <div class="recommendations-list">
        <div
          v-for="recommendation in recommendations"
          :key="recommendation.id"
          class="recommendation-item"
          :class="getRecommendationClass(recommendation.priority)"
        >
          <div class="recommendation-icon">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="recommendation-content">
            <h4 class="recommendation-title">{{ recommendation.title }}</h4>
            <p class="recommendation-description">{{ recommendation.description }}</p>
          </div>
          <BaseButton
            variant="outline"
            size="sm"
            @click="handleRecommendationAction(recommendation)"
          >
            {{ recommendation.actionText }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { useAuthStore } from '@/store/auth.store'
import { formatRelativeTime } from '@/utils/helpers'

interface SecurityActivity {
  id: string
  type: 'login' | 'password_change' | 'breach_detected' | '2fa_enabled' | 'biometric_added'
  description: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high'
  location?: string
}

interface SecurityRecommendation {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  actionText: string
  action: string
}

interface Props {
  totalPasswords?: number
  weakPasswords?: number
  breachedPasswords?: number
}

const props = withDefaults(defineProps<Props>(), {
  totalPasswords: 0,
  weakPasswords: 0,
  breachedPasswords: 0
})

const emit = defineEmits<{
  'view-weak-passwords': []
  'view-breached-passwords': []
  'setup-2fa': []
  'setup-biometric': []
  'view-audit-log': []
}>()

// Store
const authStore = useAuthStore()

// State
const recentActivity = ref<SecurityActivity[]>([])
const recommendations = ref<SecurityRecommendation[]>([])

// Computed
const twoFactorEnabled = computed(() => 
  authStore.profile?.security.twoFactorEnabled ?? false
)

const biometricEnabled = computed(() => 
  authStore.profile?.preferences.biometricEnabled ?? false
)

const securityScore = computed(() => {
  let score = 50 // Base score
  
  // Two-factor authentication (+20 points)
  if (twoFactorEnabled.value) score += 20
  
  // Biometric authentication (+10 points)
  if (biometricEnabled.value) score += 10
  
  // Password health (up to +20 points)
  if (props.totalPasswords > 0) {
    const weakRatio = props.weakPasswords / props.totalPasswords
    score += Math.round((1 - weakRatio) * 20)
  }
  
  // Breach monitoring (-10 points per breached password, max -20)
  score -= Math.min(props.breachedPasswords * 10, 20)
  
  return Math.max(0, Math.min(100, score))
})

const scoreClass = computed(() => {
  const score = securityScore.value
  if (score >= 80) return 'score-excellent'
  if (score >= 60) return 'score-good'
  if (score >= 40) return 'score-fair'
  return 'score-poor'
})

const scoreVariant = computed(() => {
  const score = securityScore.value
  if (score >= 80) return 'success'
  if (score >= 60) return 'info'
  if (score >= 40) return 'warning'
  return 'danger'
}) as any

const scoreDescription = computed(() => {
  const score = securityScore.value
  if (score >= 80) return 'Excellent security posture. Your vault is well protected.'
  if (score >= 60) return 'Good security setup. Consider enabling additional features.'
  if (score >= 40) return 'Fair security. Several improvements recommended.'
  return 'Poor security. Immediate action required to secure your vault.'
})

// Methods
const loadSecurityData = async () => {
  // Load recent security activity
  recentActivity.value = [
    {
      id: '1',
      type: 'login',
      description: 'Successful login from Chrome on macOS',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      severity: 'low',
      location: 'San Francisco, CA'
    },
    {
      id: '2',
      type: 'password_change',
      description: 'Master password updated',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      severity: 'medium'
    },
    {
      id: '3',
      type: 'breach_detected',
      description: '2 passwords found in recent data breach',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      severity: 'high'
    }
  ]

  // Generate recommendations based on current security state
  generateRecommendations()
}

const generateRecommendations = () => {
  const recs: SecurityRecommendation[] = []

  if (!twoFactorEnabled.value) {
    recs.push({
      id: 'enable-2fa',
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your account with 2FA.',
      priority: 'high',
      actionText: 'Enable 2FA',
      action: 'setup-2fa'
    })
  }

  if (!biometricEnabled.value) {
    recs.push({
      id: 'enable-biometric',
      title: 'Enable Biometric Authentication',
      description: 'Use your fingerprint or face for quick, secure access.',
      priority: 'medium',
      actionText: 'Set Up',
      action: 'setup-biometric'
    })
  }

  if (props.weakPasswords > 0) {
    recs.push({
      id: 'fix-weak-passwords',
      title: 'Strengthen Weak Passwords',
      description: `You have ${props.weakPasswords} weak passwords that should be updated.`,
      priority: 'high',
      actionText: 'Review',
      action: 'view-weak-passwords'
    })
  }

  if (props.breachedPasswords > 0) {
    recs.push({
      id: 'fix-breached-passwords',
      title: 'Update Breached Passwords',
      description: `${props.breachedPasswords} passwords were found in data breaches.`,
      priority: 'high',
      actionText: 'Fix Now',
      action: 'view-breached-passwords'
    })
  }

  recommendations.value = recs.slice(0, 3) // Show max 3 recommendations
}

const getActivityIconClass = (type: string) => {
  switch (type) {
    case 'login':
      return 'activity-icon-info'
    case 'password_change':
      return 'activity-icon-success'
    case 'breach_detected':
      return 'activity-icon-danger'
    case '2fa_enabled':
      return 'activity-icon-success'
    case 'biometric_added':
      return 'activity-icon-success'
    default:
      return 'activity-icon-info'
  }
}

const getActivityIconPath = (type: string) => {
  switch (type) {
    case 'login':
      return 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
    case 'password_change':
      return 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
    case 'breach_detected':
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
    case '2fa_enabled':
      return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    case 'biometric_added':
      return 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4'
    default:
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
}

const getRecommendationClass = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'recommendation-high'
    case 'medium':
      return 'recommendation-medium'
    case 'low':
      return 'recommendation-low'
    default:
      return 'recommendation-medium'
  }
}

const handleRecommendationAction = (recommendation: SecurityRecommendation) => {
  switch (recommendation.action) {
    case 'setup-2fa':
      emit('setup-2fa')
      break
    case 'setup-biometric':
      emit('setup-biometric')
      break
    case 'view-weak-passwords':
      emit('view-weak-passwords')
      break
    case 'view-breached-passwords':
      emit('view-breached-passwords')
      break
  }
}

// Lifecycle
onMounted(() => {
  loadSecurityData()
})
</script>

<style scoped>
.security-dashboard {
  @apply space-y-8;
}

.security-score-section {
  @apply bg-white rounded-lg border border-neutral-200 p-6;
}

.score-card {
  @apply space-y-4;
}

.score-header {
  @apply flex items-center justify-between;
}

.score-title {
  @apply text-xl font-semibold text-neutral-900;
}

.score-badge {
  @apply px-4 py-2 rounded-full text-lg font-bold;
}

.score-excellent {
  @apply bg-green-100 text-green-800;
}

.score-good {
  @apply bg-blue-100 text-blue-800;
}

.score-fair {
  @apply bg-yellow-100 text-yellow-800;
}

.score-poor {
  @apply bg-red-100 text-red-800;
}

.score-description {
  @apply text-neutral-600;
}

.security-metrics {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
}

.metric-card {
  @apply bg-white rounded-lg border border-neutral-200 p-6 space-y-4;
}

.metric-warning {
  @apply border-yellow-300 bg-yellow-50;
}

.metric-danger {
  @apply border-red-300 bg-red-50;
}

.metric-icon {
  @apply text-neutral-600;
}

.metric-content {
  @apply space-y-1;
}

.metric-title {
  @apply text-sm font-medium text-neutral-900;
}

.metric-value {
  @apply text-2xl font-bold text-neutral-900;
}

.metric-description {
  @apply text-sm text-neutral-600;
}

.activity-section {
  @apply bg-white rounded-lg border border-neutral-200 p-6;
}

.activity-header {
  @apply flex items-center justify-between mb-6;
}

.activity-title {
  @apply text-lg font-semibold text-neutral-900;
}

.activity-list {
  @apply space-y-4;
}

.activity-item {
  @apply flex items-center space-x-4 p-4 rounded-lg bg-neutral-50;
}

.activity-icon {
  @apply w-8 h-8 rounded-full flex items-center justify-center;
}

.activity-icon-info {
  @apply bg-blue-100 text-blue-600;
}

.activity-icon-success {
  @apply bg-green-100 text-green-600;
}

.activity-icon-danger {
  @apply bg-red-100 text-red-600;
}

.activity-content {
  @apply flex-1 space-y-1;
}

.activity-description {
  @apply text-sm font-medium text-neutral-900;
}

.activity-time {
  @apply text-xs text-neutral-600;
}

.activity-badge {
  @apply px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded;
}

.recommendations-section {
  @apply bg-white rounded-lg border border-neutral-200 p-6;
}

.recommendations-title {
  @apply text-lg font-semibold text-neutral-900 mb-6;
}

.recommendations-list {
  @apply space-y-4;
}

.recommendation-item {
  @apply flex items-start space-x-4 p-4 rounded-lg border;
}

.recommendation-high {
  @apply border-red-200 bg-red-50;
}

.recommendation-medium {
  @apply border-yellow-200 bg-yellow-50;
}

.recommendation-low {
  @apply border-blue-200 bg-blue-50;
}

.recommendation-icon {
  @apply w-8 h-8 rounded-full flex items-center justify-center bg-white;
}

.recommendation-content {
  @apply flex-1 space-y-1;
}

.recommendation-title {
  @apply text-sm font-semibold text-neutral-900;
}

.recommendation-description {
  @apply text-sm text-neutral-600;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .security-score-section,
  .metric-card,
  .activity-section,
  .recommendations-section {
    @apply bg-neutral-800 border-neutral-700;
  }

  .score-title,
  .metric-title,
  .metric-value,
  .activity-title,
  .activity-description,
  .recommendations-title,
  .recommendation-title {
    @apply text-neutral-100;
  }

  .score-description,
  .metric-description,
  .activity-time,
  .recommendation-description {
    @apply text-neutral-400;
  }

  .activity-item {
    @apply bg-neutral-700;
  }

  .metric-icon {
    @apply text-neutral-400;
  }
}
</style>
