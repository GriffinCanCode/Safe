<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h1 class="settings-title">Settings</h1>
      <p class="settings-subtitle">Manage your account and vault preferences</p>
    </div>

    <div class="settings-layout">
      <!-- Settings Navigation -->
      <nav class="settings-nav">
        <div class="nav-section">
          <h3 class="nav-section-title">Account</h3>
          <ul class="nav-list">
            <li>
              <button
                @click="currentSection = 'account'"
                :class="['nav-item', { active: currentSection === 'account' }]"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
                Account Settings
              </button>
            </li>
            <li>
              <button
                @click="currentSection = 'security'"
                :class="['nav-item', { active: currentSection === 'security' }]"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Security
              </button>
            </li>
          </ul>
        </div>

        <div class="nav-section">
          <h3 class="nav-section-title">Vault</h3>
          <ul class="nav-list">
            <li>
              <button
                @click="currentSection = 'encryption'"
                :class="['nav-item', { active: currentSection === 'encryption' }]"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                </svg>
                Encryption
              </button>
            </li>
            <li>
              <button
                @click="currentSection = 'backup'"
                :class="['nav-item', { active: currentSection === 'backup' }]"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                </svg>
                Backup & Restore
              </button>
            </li>
          </ul>
        </div>

        <div class="nav-section">
          <h3 class="nav-section-title">Preferences</h3>
          <ul class="nav-list">
            <li>
              <button
                @click="currentSection = 'appearance'"
                :class="['nav-item', { active: currentSection === 'appearance' }]"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clip-rule="evenodd" />
                </svg>
                Appearance
              </button>
            </li>
            <li>
              <button
                @click="currentSection = 'notifications'"
                :class="['nav-item', { active: currentSection === 'notifications' }]"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                Notifications
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Settings Content -->
      <main class="settings-content">
        <AccountSettings v-if="currentSection === 'account'" />
        <SecuritySettings v-else-if="currentSection === 'security'" />
        <EncryptionSettings v-else-if="currentSection === 'encryption'" />
        <BackupRestore v-else-if="currentSection === 'backup'" />
        <AppearanceSettings v-else-if="currentSection === 'appearance'" />
        <NotificationSettings v-else-if="currentSection === 'notifications'" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AccountSettings from './AccountSettings.vue'
import EncryptionSettings from './EncryptionSettings.vue'
import BackupRestore from './BackupRestore.vue'
import SecuritySettings from './SecuritySettings.vue'
import AppearanceSettings from './AppearanceSettings.vue'
import NotificationSettings from './NotificationSettings.vue'

// Router
const route = useRoute()
const router = useRouter()

// State
const currentSection = ref<'account' | 'security' | 'encryption' | 'backup' | 'appearance' | 'notifications'>('account')

// Methods
const updateRouteQuery = (section: string) => {
  router.replace({ 
    query: { ...route.query, section } 
  })
}

// Watch for section changes and update URL
const watchCurrentSection = () => {
  updateRouteQuery(currentSection.value)
}

// Lifecycle
onMounted(() => {
  // Initialize section from query parameter
  const sectionFromQuery = route.query.section as string
  if (sectionFromQuery && ['account', 'security', 'encryption', 'backup', 'appearance', 'notifications'].includes(sectionFromQuery)) {
    currentSection.value = sectionFromQuery as any
  }
})
</script>

<style scoped>
.settings-panel {
  @apply max-w-7xl mx-auto p-6;
}

.settings-header {
  @apply mb-8;
}

.settings-title {
  @apply text-3xl font-bold text-neutral-900 mb-2;
}

.settings-subtitle {
  @apply text-lg text-neutral-600;
}

.settings-layout {
  @apply flex gap-8;
}

.settings-nav {
  @apply w-64 flex-shrink-0 space-y-6;
}

.nav-section {
  @apply space-y-3;
}

.nav-section-title {
  @apply text-sm font-semibold text-neutral-900 uppercase tracking-wider;
}

.nav-list {
  @apply space-y-1;
}

.nav-item {
  @apply w-full flex items-center gap-3 px-3 py-2 text-left;
  @apply text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900;
  @apply rounded-lg transition-colors;
}

.nav-item.active {
  @apply bg-primary-100 text-primary-900;
}

.nav-icon {
  @apply w-5 h-5 flex-shrink-0;
}

.settings-content {
  @apply flex-1 min-w-0;
}

.placeholder {
  @apply bg-white rounded-lg p-8 shadow-sm border border-neutral-200;
  @apply text-center text-neutral-500;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .settings-title {
    @apply text-neutral-100;
  }

  .settings-subtitle {
    @apply text-neutral-400;
  }

  .nav-section-title {
    @apply text-neutral-300;
  }

  .nav-item {
    @apply text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100;
  }

  .nav-item.active {
    @apply bg-primary-900 text-primary-100;
  }

  .placeholder {
    @apply bg-neutral-800 border-neutral-700 text-neutral-400;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .settings-layout {
    @apply flex-col gap-6;
  }

  .settings-nav {
    @apply w-full;
  }

  .nav-section {
    @apply space-y-2;
  }

  .nav-list {
    @apply flex flex-wrap gap-2;
  }

  .nav-item {
    @apply flex-1 min-w-0 text-center justify-center;
  }
}
</style>
