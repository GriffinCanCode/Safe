<template>
  <div id="app" class="app-container">
    <!-- Global Loading Bar -->
    <div v-if="isLoading" class="loading-bar">
      <div class="loading-progress" :style="{ width: `${loadingProgress}%` }"></div>
    </div>

    <!-- Router View -->
    <RouterView v-slot="{ Component, route }">
      <Transition
        :name="getTransitionName(route)"
        mode="out-in"
        appear
      >
        <Suspense>
          <component :is="Component" :key="route.path" />
          
          <template #fallback>
            <div class="page-loading">
              <LoadingSpinner size="lg" />
              <h3 class="loading-title">Loading...</h3>
            </div>
          </template>
        </Suspense>
      </Transition>
    </RouterView>

    <!-- Global Modals -->
    <Teleport to="body">
      <!-- Maintenance Mode -->
      <BaseModal
        v-model="showMaintenanceModal"
        title="Scheduled Maintenance"
        size="md"
        :closable="false"
        persistent
      >
        <div class="maintenance-content">
          <div class="maintenance-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 class="maintenance-title">System Under Maintenance</h3>
          <p class="maintenance-description">
            We're performing scheduled maintenance to improve your experience. 
            We'll be back shortly.
          </p>
          <div class="maintenance-timer">
            <span class="timer-label">Estimated completion:</span>
            <span class="timer-value">{{ maintenanceTimer }}</span>
          </div>
        </div>
      </BaseModal>

      <!-- Network Error -->
      <BaseModal
        v-model="showNetworkError"
        title="Connection Lost"
        size="md"
        :closable="false"
      >
        <div class="network-error-content">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="error-title">No Internet Connection</h3>
          <p class="error-description">
            Please check your internet connection and try again.
          </p>
        </div>
        
        <template #footer>
          <BaseButton
            variant="primary"
            @click="retryConnection"
            :loading="retryingConnection"
            block
          >
            Retry Connection
          </BaseButton>
        </template>
      </BaseModal>

      <!-- Update Available -->
      <BaseModal
        v-model="showUpdateModal"
        title="Update Available"
        size="md"
      >
        <div class="update-content">
          <div class="update-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h3 class="update-title">New Version Available</h3>
          <p class="update-description">
            A new version of ZK-Vault is available with security improvements and new features.
          </p>
          <div class="update-details">
            <h4 class="details-title">What's New:</h4>
            <ul class="update-list">
              <li>Enhanced security encryption</li>
              <li>Improved password generator</li>
              <li>Better biometric authentication</li>
              <li>Bug fixes and performance improvements</li>
            </ul>
          </div>
        </div>
        
        <template #footer>
          <div class="update-actions">
            <BaseButton
              variant="outline"
              @click="dismissUpdate"
            >
              Later
            </BaseButton>
            <BaseButton
              variant="primary"
              @click="updateApplication"
              :loading="updatingApp"
            >
              Update Now
            </BaseButton>
          </div>
        </template>
      </BaseModal>

      <!-- Global Notifications -->
      <div class="notification-container">
        <TransitionGroup name="notification" tag="div">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification"
            :class="[
              `notification-${notification.type}`,
              { 'notification-dismissible': notification.dismissible }
            ]"
          >
            <div class="notification-icon">
              <svg v-if="notification.type === 'success'" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg v-else-if="notification.type === 'error'" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <svg v-else-if="notification.type === 'warning'" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <svg v-else fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="notification-content">
              <h4 v-if="notification.title" class="notification-title">{{ notification.title }}</h4>
              <p class="notification-message">{{ notification.message }}</p>
            </div>
            <button
              v-if="notification.dismissible"
              class="notification-close"
              @click="dismissNotification(notification.id)"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  dismissible: boolean
  duration?: number
}

// Router & Store
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

// Global State
const isLoading = ref(false)
const loadingProgress = ref(0)
const showMaintenanceModal = ref(false)
const showNetworkError = ref(false)
const showUpdateModal = ref(false)
const retryingConnection = ref(false)
const updatingApp = ref(false)
const maintenanceTimer = ref('15 minutes')
const notifications = ref<Notification[]>([])

// Connection monitoring
const isOnline = ref(navigator.onLine)
let loadingInterval: number | null = null

// Computed
const currentRouteName = computed(() => route.name as string)

// Methods
const getTransitionName = (route: any) => {
  // Different transitions for different route types
  if (route.meta?.transition) {
    return route.meta.transition
  }
  
  if (route.path.startsWith('/auth')) {
    return 'auth'
  } else if (route.path.startsWith('/vault')) {
    return 'vault'
  } else {
    return 'page'
  }
}

const startLoading = () => {
  isLoading.value = true
  loadingProgress.value = 0
  
  loadingInterval = window.setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += Math.random() * 10
    }
  }, 100)
}

const finishLoading = () => {
  loadingProgress.value = 100
  setTimeout(() => {
    isLoading.value = false
    loadingProgress.value = 0
    if (loadingInterval) {
      clearInterval(loadingInterval)
      loadingInterval = null
    }
  }, 200)
}

const handleOnlineStatusChange = () => {
  isOnline.value = navigator.onLine
  
  if (!isOnline.value) {
    showNetworkError.value = true
    addNotification({
      type: 'error',
      message: 'Connection lost. Some features may not work properly.',
      dismissible: true,
      duration: 0
    })
  } else {
    showNetworkError.value = false
    addNotification({
      type: 'success',
      message: 'Connection restored.',
      dismissible: true,
      duration: 3000
    })
  }
}

const retryConnection = () => {
  retryingConnection.value = true
  
  setTimeout(() => {
    retryingConnection.value = false
    handleOnlineStatusChange()
  }, 2000)
}

const checkForUpdates = () => {
  // Simulate update check
  setTimeout(() => {
    if (Math.random() > 0.8) {
      showUpdateModal.value = true
    }
  }, 5000)
}

const updateApplication = () => {
  updatingApp.value = true
  
  setTimeout(() => {
    updatingApp.value = false
    showUpdateModal.value = false
    addNotification({
      type: 'success',
      title: 'Update Complete',
      message: 'ZK-Vault has been updated to the latest version.',
      dismissible: true,
      duration: 5000
    })
  }, 3000)
}

const dismissUpdate = () => {
  showUpdateModal.value = false
  addNotification({
    type: 'info',
    message: 'Update reminder will show again in 24 hours.',
    dismissible: true,
    duration: 3000
  })
}

const addNotification = (notification: Omit<Notification, 'id'>) => {
  const id = Math.random().toString(36).substring(2, 15)
  const newNotification: Notification = {
    id,
    ...notification
  }
  
  notifications.value.push(newNotification)
  
  if (notification.duration && notification.duration > 0) {
    setTimeout(() => {
      dismissNotification(id)
    }, notification.duration)
  }
}

const dismissNotification = (id: string) => {
  const index = notifications.value.findIndex((n: Notification) => n.id === id)
  if (index >= 0) {
    notifications.value.splice(index, 1)
  }
}

const handleRouteChange = () => {
  // Clear notifications on route change (optional)
  notifications.value = notifications.value.filter((n: Notification) => !n.dismissible)
}

// Global error handler
const handleGlobalError = (error: Error) => {
  console.error('Global error:', error)
  
  addNotification({
    type: 'error',
    title: 'Something went wrong',
    message: error.message || 'An unexpected error occurred.',
    dismissible: true,
    duration: 5000
  })
}

// Watch route changes
watch(
  () => route.path,
  () => {
    handleRouteChange()
  }
)

// Lifecycle
onMounted(() => {
  // Load settings
  settingsStore.loadSettings()

  // Set up global event listeners
  window.addEventListener('online', handleOnlineStatusChange)
  window.addEventListener('offline', handleOnlineStatusChange)
  window.addEventListener('error', (event) => {
    handleGlobalError(new Error(event.message))
  })
  window.addEventListener('unhandledrejection', (event) => {
    handleGlobalError(new Error(event.reason))
  })
  
  // Check for updates
  checkForUpdates()
  
  // Initial connection check
  handleOnlineStatusChange()
  
  // Demo notifications
  setTimeout(() => {
    addNotification({
      type: 'info',
      title: 'Welcome to ZK-Vault',
      message: 'Your secure password manager is ready to use.',
      dismissible: true,
      duration: 5000
    })
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatusChange)
  window.removeEventListener('offline', handleOnlineStatusChange)
  
  if (loadingInterval) {
    clearInterval(loadingInterval)
  }
})

// Expose methods globally (for use in other components)
defineExpose({
  addNotification,
  dismissNotification,
  startLoading,
  finishLoading
})
</script>

<style scoped>
.app-container {
  @apply min-h-screen bg-neutral-50;
}

.loading-bar {
  @apply fixed top-0 left-0 right-0 h-1 bg-neutral-200 z-50;
}

.loading-progress {
  @apply h-full bg-primary-600 transition-all duration-300 ease-out;
}

.page-loading {
  @apply flex flex-col items-center justify-center min-h-screen space-y-4;
}

.loading-title {
  @apply text-lg font-medium text-neutral-600;
}

.maintenance-content {
  @apply text-center space-y-6 py-6;
}

.maintenance-icon {
  @apply w-16 h-16 mx-auto bg-warning-100 rounded-full flex items-center justify-center;
}

.maintenance-icon svg {
  @apply w-8 h-8 text-warning-600;
}

.maintenance-title {
  @apply text-xl font-semibold text-neutral-900;
}

.maintenance-description {
  @apply text-neutral-600;
}

.maintenance-timer {
  @apply flex flex-col space-y-1;
}

.timer-label {
  @apply text-sm text-neutral-500;
}

.timer-value {
  @apply text-lg font-semibold text-primary-600;
}

.network-error-content {
  @apply text-center space-y-4 py-6;
}

.error-icon {
  @apply w-16 h-16 mx-auto bg-danger-100 rounded-full flex items-center justify-center;
}

.error-icon svg {
  @apply w-8 h-8 text-danger-600;
}

.error-title {
  @apply text-xl font-semibold text-neutral-900;
}

.error-description {
  @apply text-neutral-600;
}

.update-content {
  @apply space-y-6 py-4;
}

.update-icon {
  @apply w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center;
}

.update-icon svg {
  @apply w-6 h-6 text-primary-600;
}

.update-title {
  @apply text-lg font-semibold text-neutral-900;
}

.update-description {
  @apply text-neutral-600;
}

.update-details {
  @apply space-y-3;
}

.details-title {
  @apply text-sm font-semibold text-neutral-900;
}

.update-list {
  @apply list-disc list-inside space-y-1 text-sm text-neutral-600;
}

.update-actions {
  @apply flex gap-3;
}

.notification-container {
  @apply fixed top-6 right-6 z-50 space-y-3 max-w-sm;
}

.notification {
  @apply flex items-start gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm;
  @apply border border-opacity-20;
}

.notification-success {
  @apply bg-success-50 border-success-200 text-success-800;
}

.notification-error {
  @apply bg-danger-50 border-danger-200 text-danger-800;
}

.notification-warning {
  @apply bg-warning-50 border-warning-200 text-warning-800;
}

.notification-info {
  @apply bg-info-50 border-info-200 text-info-800;
}

.notification-icon {
  @apply w-5 h-5 shrink-0 mt-0.5;
}

.notification-content {
  @apply flex-1 space-y-1;
}

.notification-title {
  @apply text-sm font-semibold;
}

.notification-message {
  @apply text-sm;
}

.notification-close {
  @apply p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors duration-200;
}

.notification-close svg {
  @apply w-4 h-4;
}

/* Page Transitions */
.page-enter-active,
.page-leave-active {
  @apply transition-all duration-300;
}

.page-enter-from {
  @apply opacity-0 translate-y-4;
}

.page-leave-to {
  @apply opacity-0 -translate-y-4;
}

.auth-enter-active,
.auth-leave-active {
  @apply transition-all duration-400;
}

.auth-enter-from {
  @apply opacity-0 scale-95;
}

.auth-leave-to {
  @apply opacity-0 scale-105;
}

.vault-enter-active,
.vault-leave-active {
  @apply transition-all duration-300;
}

.vault-enter-from {
  @apply opacity-0 translate-x-8;
}

.vault-leave-to {
  @apply opacity-0 -translate-x-8;
}

/* Notification Transitions */
.notification-enter-active {
  @apply transition-all duration-300;
}

.notification-leave-active {
  @apply transition-all duration-200;
}

.notification-enter-from {
  @apply opacity-0 translate-x-full;
}

.notification-leave-to {
  @apply opacity-0 translate-x-full;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .app-container {
    @apply bg-neutral-900;
  }
  
  .loading-bar {
    @apply bg-neutral-700;
  }
  
  .loading-title {
    @apply text-neutral-400;
  }
  
  .maintenance-icon {
    @apply bg-warning-900;
  }
  
  .maintenance-icon svg {
    @apply text-warning-400;
  }
  
  .maintenance-title {
    @apply text-neutral-100;
  }
  
  .maintenance-description {
    @apply text-neutral-400;
  }
  
  .timer-label {
    @apply text-neutral-500;
  }
  
  .timer-value {
    @apply text-primary-400;
  }
  
  .error-icon {
    @apply bg-danger-900;
  }
  
  .error-icon svg {
    @apply text-danger-400;
  }
  
  .error-title {
    @apply text-neutral-100;
  }
  
  .error-description {
    @apply text-neutral-400;
  }
  
  .update-icon {
    @apply bg-primary-900;
  }
  
  .update-icon svg {
    @apply text-primary-400;
  }
  
  .update-title {
    @apply text-neutral-100;
  }
  
  .update-description {
    @apply text-neutral-400;
  }
  
  .details-title {
    @apply text-neutral-100;
  }
  
  .update-list {
    @apply text-neutral-400;
  }
  
  .notification-success {
    @apply bg-success-900 border-success-700 text-success-200;
  }
  
  .notification-error {
    @apply bg-danger-900 border-danger-700 text-danger-200;
  }
  
  .notification-warning {
    @apply bg-warning-900 border-warning-700 text-warning-200;
  }
  
  .notification-info {
    @apply bg-info-900 border-info-700 text-info-200;
  }
}
</style>
