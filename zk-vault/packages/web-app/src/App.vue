<template>
  <div id="app" class="app-container">
    <!-- Global Loading Bar -->
    <div v-if="isLoading" class="loading-bar">
      <div
        class="loading-progress dynamic-progress"
        :style="{ '--progress-width': `${loadingProgress}%` }"
      ></div>
    </div>

    <!-- Router View -->
    <RouterView v-slot="{ Component, route }">
      <Transition :name="getTransitionName(route)" mode="out-in" appear>
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
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 class="maintenance-title">System Under Maintenance</h3>
          <p class="maintenance-description">
            We're performing scheduled maintenance to improve your experience. We'll be back
            shortly.
          </p>
          <div class="maintenance-timer">
            <span class="timer-label">Estimated completion:</span>
            <span class="timer-value">{{ maintenanceTimer }}</span>
          </div>
        </div>
      </BaseModal>

      <!-- Network Error -->
      <BaseModal v-model="showNetworkError" title="Connection Lost" size="md" :closable="false">
        <div class="network-error-content">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 class="error-title">No Internet Connection</h3>
          <p class="error-description">Please check your internet connection and try again.</p>
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
      <BaseModal v-model="showUpdateModal" title="Update Available" size="md">
        <div class="update-content">
          <div class="update-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
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
            <BaseButton variant="outline" @click="dismissUpdate"> Later </BaseButton>
            <BaseButton variant="primary" @click="updateApplication" :loading="updatingApp">
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
              { 'notification-dismissible': notification.dismissible },
            ]"
          >
            <div class="notification-icon">
              <svg v-if="notification.type === 'success'" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <svg
                v-else-if="notification.type === 'error'"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
              <svg
                v-else-if="notification.type === 'warning'"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <svg v-else fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
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
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { integrationStatusService } from '@/services/integration-status';
import { vaultIntegration } from '@/services/vault-integration.service';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  dismissible: boolean;
  duration?: number;
}

// Router & Store
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();

// Global State
const isLoading = ref(false);
const loadingProgress = ref(0);
const showMaintenanceModal = ref(false);
const showNetworkError = ref(false);
const showUpdateModal = ref(false);
const retryingConnection = ref(false);
const updatingApp = ref(false);
const maintenanceTimer = ref('15 minutes');
const notifications = ref<Notification[]>([]);

// Connection monitoring
const isOnline = ref(navigator.onLine);
let loadingInterval: number | null = null;

// Computed
const currentRouteName = computed(() => route.name as string);

// Methods
const getTransitionName = (route: any) => {
  // Different transitions for different route types
  if (route.meta?.transition) {
    return route.meta.transition;
  }

  if (route.path.startsWith('/auth')) {
    return 'auth';
  } else if (route.path.startsWith('/vault')) {
    return 'vault';
  } else {
    return 'page';
  }
};

const startLoading = () => {
  isLoading.value = true;
  loadingProgress.value = 0;

  loadingInterval = window.setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += Math.random() * 10;
    }
  }, 100);
};

const finishLoading = () => {
  loadingProgress.value = 100;
  setTimeout(() => {
    isLoading.value = false;
    loadingProgress.value = 0;
    if (loadingInterval) {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
  }, 200);
};

const handleOnlineStatusChange = () => {
  isOnline.value = navigator.onLine;

  if (!isOnline.value) {
    showNetworkError.value = true;
    addNotification({
      type: 'error',
      message: 'Connection lost. Some features may not work properly.',
      dismissible: true,
      duration: 0,
    });
  } else {
    showNetworkError.value = false;
    addNotification({
      type: 'success',
      message: 'Connection restored.',
      dismissible: true,
      duration: 3000,
    });
  }
};

const retryConnection = () => {
  retryingConnection.value = true;

  setTimeout(() => {
    retryingConnection.value = false;
    handleOnlineStatusChange();
  }, 2000);
};

const checkForUpdates = () => {
  // Simulate update check
  setTimeout(() => {
    if (Math.random() > 0.8) {
      showUpdateModal.value = true;
    }
  }, 5000);
};

const updateApplication = () => {
  updatingApp.value = true;

  setTimeout(() => {
    updatingApp.value = false;
    showUpdateModal.value = false;
    addNotification({
      type: 'success',
      title: 'Update Complete',
      message: 'ZK-Vault has been updated to the latest version.',
      dismissible: true,
      duration: 5000,
    });
  }, 3000);
};

const dismissUpdate = () => {
  showUpdateModal.value = false;
  addNotification({
    type: 'info',
    message: 'Update reminder will show again in 24 hours.',
    dismissible: true,
    duration: 3000,
  });
};

const addNotification = (notification: Omit<Notification, 'id'>) => {
  const id = Math.random().toString(36).substring(2, 15);
  const newNotification: Notification = {
    id,
    ...notification,
  };

  notifications.value.push(newNotification);

  if (notification.duration && notification.duration > 0) {
    setTimeout(() => {
      dismissNotification(id);
    }, notification.duration);
  }
};

const dismissNotification = (id: string) => {
  const index = notifications.value.findIndex((n: Notification) => n.id === id);
  if (index >= 0) {
    notifications.value.splice(index, 1);
  }
};

const handleRouteChange = () => {
  // Clear notifications on route change (optional)
  notifications.value = notifications.value.filter((n: Notification) => !n.dismissible);
};

// Global error handler
const handleGlobalError = (error: Error) => {
  console.error('Global error:', error);

  addNotification({
    type: 'error',
    title: 'Something went wrong',
    message: error.message || 'An unexpected error occurred.',
    dismissible: true,
    duration: 5000,
  });
};

// Watch route changes
watch(
  () => route.path,
  () => {
    handleRouteChange();
  }
);

// Lifecycle
onMounted(async () => {
  // Initialize stores and services in proper order
  try {
    console.log('🚀 Initializing App.vue services...');

    // Load settings first (needed for theme, etc.)
    await settingsStore.loadSettings();
    console.log('✅ Settings loaded');

    // Ensure vault integration is initialized (in case main.ts failed)
    if (!vaultIntegration.isServiceInitialized()) {
      console.log('🔧 Vault integration not initialized, initializing now...');
      await vaultIntegration.initialize({
        autoIndexing: true,
        searchWorker: true,
        encryptionWorker: false, // Keep disabled for security by default
        fileProcessingWorker: true,
      });
      console.log('✅ Vault integration initialized from App.vue');
    } else {
      console.log('✅ Vault integration already initialized');
    }

    // Check integration status in development
    if (import.meta.env.DEV) {
      await integrationStatusService.logIntegrationStatus();
      console.log('✅ Integration status checked');
    }
  } catch (error) {
    console.error('❌ Failed to initialize app stores:', error);
    addNotification({
      type: 'error',
      title: 'Initialization Error',
      message: 'Some features may not work properly. Please refresh the page.',
      dismissible: true,
      duration: 0,
    });
  }

  // Set up global event listeners
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);
  window.addEventListener('error', event => {
    handleGlobalError(new Error(event.message));
  });
  window.addEventListener('unhandledrejection', event => {
    handleGlobalError(new Error(event.reason));
  });

  // Check for updates
  checkForUpdates();

  // Initial connection check
  handleOnlineStatusChange();

  // Demo notifications
  setTimeout(() => {
    addNotification({
      type: 'info',
      title: 'Welcome to ZK-Vault',
      message: 'Your secure password manager is ready to use.',
      dismissible: true,
      duration: 5000,
    });
  }, 1000);
});

onUnmounted(async () => {
  window.removeEventListener('online', handleOnlineStatusChange);
  window.removeEventListener('offline', handleOnlineStatusChange);

  if (loadingInterval) {
    clearInterval(loadingInterval);
  }

  // Clean shutdown of services
  try {
    await vaultIntegration.shutdown();
    console.log('✅ Vault integration shut down cleanly');
  } catch (error) {
    console.warn('⚠️ Error during vault integration shutdown:', error);
  }
});

// Expose methods globally (for use in other components)
defineExpose({
  addNotification,
  dismissNotification,
  startLoading,
  finishLoading,
});
</script>

<style scoped>
/* Component styles are handled by /src/styles/components/layout/app-layout.css */
</style>
