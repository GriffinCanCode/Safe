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
                <p class="preference-description">
                  Receive emails about critical security events, like new device logins or password
                  changes.
                </p>
              </div>
              <label class="preference-toggle">
                <input
                  v-model="settings.notifications.security"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Product Updates</h4>
                <p class="preference-description">
                  Receive emails about new features, tips, and product announcements.
                </p>
              </div>
              <label class="preference-toggle">
                <input
                  v-model="settings.notifications.updates"
                  type="checkbox"
                  class="toggle-input"
                />
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

// Use references for reactive access
const settings = settingsStore.settings;
const areSettingsChanged = settingsStore.areSettingsChanged;

const saveNotificationSettings = async () => {
  isSaving.value = true;
  await settingsStore.updateSettings(settingsStore.settings);
  isSaving.value = false;
};
</script>

<!-- CSS classes are now defined in /styles/components/settings/notification-settings.css -->
