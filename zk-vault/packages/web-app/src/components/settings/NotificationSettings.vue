<template>
  <div class="notification-settings">
    <div class="settings-section">
      <h2 class="section-title">Notifications</h2>
      <div class="section-content">
        <div class="setting-group">
          <h3 class="group-title">Email Notifications</h3>
          <p class="group-description">Manage the email notifications you receive from ZK-Vault.</p>
          <div class="preference-items">
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Security Alerts</h4>
                <p class="preference-description">Receive emails about critical security events, like new device logins or password changes.</p>
              </div>
              <label class="preference-toggle">
                <input v-model="settings.notifications.security" type="checkbox" class="toggle-input" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Product Updates</h4>
                <p class="preference-description">Receive emails about new features, tips, and product announcements.</p>
              </div>
              <label class="preference-toggle">
                <input v-model="settings.notifications.updates" type="checkbox" class="toggle-input" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div class="setting-actions">
          <BaseButton
            variant="primary"
            @click="saveNotificationSettings"
            :loading="isSaving"
            :disabled="!areSettingsChanged"
          >
            Save Changes
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '@/store/settings.store';
import BaseButton from '@/components/common/BaseButton.vue';

const settingsStore = useSettingsStore();
const isSaving = ref(false);

const saveNotificationSettings = async () => {
  isSaving.value = true;
  await settingsStore.updateSettings(settingsStore.settings);
  isSaving.value = false;
};
</script>

<style scoped>
.notification-settings {
  @apply space-y-8;
}

.settings-section {
  @apply bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden;
}

.section-title {
  @apply text-xl font-semibold text-neutral-900 p-6 border-b border-neutral-200;
}

.section-content {
  @apply p-6 space-y-8;
}

.setting-group {
  @apply space-y-6;
}

.group-title {
  @apply text-lg font-medium text-neutral-900;
}

.group-description {
  @apply text-sm text-neutral-600;
}

.preference-items {
  @apply space-y-4;
}

.preference-item {
  @apply flex items-center justify-between p-4 bg-neutral-50 rounded-lg;
}

.preference-content {
  @apply flex-1;
}

.preference-title {
  @apply font-medium text-neutral-900 mb-1;
}

.preference-description {
  @apply text-sm text-neutral-600;
}

.preference-toggle {
  @apply relative inline-flex items-center cursor-pointer;
}

.toggle-input {
  @apply sr-only;
}

.toggle-slider {
  @apply w-11 h-6 bg-neutral-200 rounded-full relative transition-colors;
  @apply after:content-[''] after:absolute after:top-[2px] after:left-[2px];
  @apply after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform;
}

.toggle-input:checked + .toggle-slider {
  @apply bg-primary-600;
}

.toggle-input:checked + .toggle-slider:after {
  @apply translate-x-5;
}

.setting-actions {
  @apply flex justify-start pt-2;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .settings-section {
    @apply bg-neutral-800 border-neutral-700;
  }

  .section-title,
  .group-title,
  .preference-title {
    @apply text-neutral-100;
  }

  .group-description,
  .preference-description {
    @apply text-neutral-400;
  }
  
  .section-title {
      @apply border-neutral-700;
  }

  .preference-item {
    @apply bg-neutral-700;
  }

  .toggle-slider {
    @apply bg-neutral-600;
  }
}
</style> 