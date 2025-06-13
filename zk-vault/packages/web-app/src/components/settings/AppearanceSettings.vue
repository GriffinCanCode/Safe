<template>
  <div class="appearance-settings">
    <div class="settings-section">
      <h2 class="section-title">Appearance</h2>
      <div class="section-content">
        <div class="setting-group">
          <h3 class="group-title">Theme & Language</h3>
          <p class="group-description">Customize the look and feel of the application.</p>
          <div class="preference-items">
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Theme</h4>
                <p class="preference-description">Choose your preferred theme for the application.</p>
              </div>
              <select v-model="settingsStore.settings.theme" class="preference-select">
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Language</h4>
                <p class="preference-description">Select your display language.</p>
              </div>
              <select v-model="settingsStore.settings.language" class="preference-select">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>
        </div>

        <div class="setting-actions">
          <BaseButton
            variant="primary"
            @click="saveAppearanceSettings"
            :loading="isSaving"
            :disabled="!settingsStore.areSettingsChanged"
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

const saveAppearanceSettings = async () => {
  isSaving.value = true;
  await settingsStore.updateSettings(settingsStore.settings);
  isSaving.value = false;
};
</script>

<style scoped>
.appearance-settings {
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

.preference-select {
  @apply px-3 py-2 border border-neutral-300 rounded-lg text-sm;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
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

  .preference-select {
    @apply bg-neutral-700 border-neutral-600 text-neutral-100;
  }
}
</style> 