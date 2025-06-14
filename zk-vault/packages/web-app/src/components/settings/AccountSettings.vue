<template>
  <div class="account-settings">
    <div class="settings-section">
      <h2 class="section-title">Account Information</h2>
      <div class="section-content">
        <!-- Profile Information -->
        <div class="setting-group">
          <h3 class="group-title">Profile</h3>

          <div class="form-grid">
            <BaseInput
              v-model="form.displayName"
              label="Display Name"
              placeholder="Enter your display name"
              :error="errors.displayName"
            />

            <BaseInput
              v-model="form.email"
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              :error="errors.email"
              disabled
            />
          </div>

          <div class="setting-actions">
            <BaseButton
              variant="primary"
              @click="updateProfile"
              :loading="updating"
              :disabled="!isProfileChanged"
            >
              Update Profile
            </BaseButton>
          </div>
        </div>

        <!-- Password Change -->
        <div class="setting-group">
          <h3 class="group-title">Change Password</h3>

          <div class="form-grid">
            <BaseInput
              v-model="passwordForm.currentPassword"
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              :error="passwordErrors.currentPassword"
              autocomplete="current-password"
            />

            <BaseInput
              v-model="passwordForm.newPassword"
              label="New Password"
              type="password"
              placeholder="Enter new password"
              :error="passwordErrors.newPassword"
              autocomplete="new-password"
            />

            <BaseInput
              v-model="passwordForm.confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
              :error="passwordErrors.confirmPassword"
              autocomplete="new-password"
            />
          </div>

          <!-- Password Strength Meter -->
          <PasswordStrengthMeter
            v-if="passwordForm.newPassword"
            :password="passwordForm.newPassword"
            class="mt-4"
          />

          <div class="setting-actions">
            <BaseButton
              variant="primary"
              @click="changePassword"
              :loading="changingPassword"
              :disabled="!isPasswordFormValid"
            >
              Change Password
            </BaseButton>
          </div>
        </div>

        <!-- Account Preferences -->
        <div class="setting-group">
          <h3 class="group-title">Preferences</h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            Other settings for appearance, notifications, and security can be found in their
            respective sections.
          </p>
        </div>

        <!-- Danger Zone -->
        <div class="setting-group danger-zone">
          <h3 class="group-title danger">Danger Zone</h3>

          <div class="danger-actions">
            <div class="danger-item">
              <div class="danger-content">
                <h4 class="danger-title">Delete Account</h4>
                <p class="danger-description">
                  Permanently delete your account and all associated data. This action cannot be
                  undone.
                </p>
              </div>
              <BaseButton variant="danger" @click="showDeleteConfirmation = true">
                Delete Account
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Account Confirmation Modal -->
    <BaseModal
      :modelValue="showDeleteConfirmation"
      title="Delete Account"
      @update:modelValue="showDeleteConfirmation = $event"
    >
      <div class="delete-confirmation">
        <div class="warning-icon">
          <svg class="h-12 w-12 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
        </div>

        <h3 class="confirmation-title">Are you absolutely sure?</h3>
        <p class="confirmation-description">
          This action will permanently delete your account and all associated data including:
        </p>

        <ul class="deletion-list">
          <li>All stored passwords and vault items</li>
          <li>Account settings and preferences</li>
          <li>Backup data and recovery keys</li>
          <li>Usage history and analytics</li>
        </ul>

        <p class="confirmation-warning">
          <strong>This action cannot be undone.</strong> Please type <strong>DELETE</strong> to
          confirm.
        </p>

        <BaseInput v-model="deleteConfirmation" placeholder="Type DELETE to confirm" class="mt-4" />

        <div class="confirmation-actions">
          <BaseButton variant="ghost" @click="showDeleteConfirmation = false"> Cancel </BaseButton>
          <BaseButton
            variant="danger"
            @click="deleteAccount"
            :loading="deleting"
            :disabled="deleteConfirmation !== 'DELETE'"
          >
            Delete Account
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import PasswordStrengthMeter from '@/components/vault/PasswordStrengthMeter.vue';
import { authService } from '@/services/auth.service';
import type { UserProfile } from '@/services/auth.service';
import { useSettingsStore } from '@/store/settings.store';

// Store
const settingsStore = useSettingsStore();

// State
const updating = ref(false);
const changingPassword = ref(false);
const deleting = ref(false);
const showDeleteConfirmation = ref(false);
const deleteConfirmation = ref('');

const originalProfile = ref<UserProfile | null>(null);

const form = reactive({
  displayName: '',
  email: '',
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const errors = reactive({
  displayName: '',
  email: '',
});

const passwordErrors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// Computed
const isProfileChanged = computed(() => {
  if (!originalProfile.value) return false;
  return (
    form.displayName !== (originalProfile.value.displayName || '') ||
    form.email !== originalProfile.value.email
  );
});

const isPasswordFormValid = computed(() => {
  return (
    passwordForm.currentPassword &&
    passwordForm.newPassword &&
    passwordForm.confirmPassword &&
    passwordForm.newPassword === passwordForm.confirmPassword &&
    passwordForm.newPassword.length >= 8 &&
    !passwordErrors.currentPassword &&
    !passwordErrors.newPassword &&
    !passwordErrors.confirmPassword
  );
});

// Methods
const loadUserData = async () => {
  try {
    const user = authService.getCurrentUser();
    if (!user) return;

    const profile = await authService.getUserProfile(user.uid);
    originalProfile.value = profile;

    // Populate form
    form.displayName = profile.displayName || '';
    form.email = profile.email;

    // Check biometric support
    // biometricSupported.value = await authService.isBiometricAvailable()
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
};

const validateProfile = () => {
  errors.displayName = '';
  errors.email = '';

  if (!form.displayName.trim()) {
    errors.displayName = 'Display name is required';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address';
  }

  return !errors.displayName && !errors.email;
};

const validatePasswordForm = () => {
  passwordErrors.currentPassword = '';
  passwordErrors.newPassword = '';
  passwordErrors.confirmPassword = '';

  if (!passwordForm.currentPassword) {
    passwordErrors.currentPassword = 'Current password is required';
  }

  if (!passwordForm.newPassword) {
    passwordErrors.newPassword = 'New password is required';
  } else if (passwordForm.newPassword.length < 8) {
    passwordErrors.newPassword = 'Password must be at least 8 characters';
  }

  if (!passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = 'Please confirm your new password';
  } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = 'Passwords do not match';
  }

  return (
    !passwordErrors.currentPassword &&
    !passwordErrors.newPassword &&
    !passwordErrors.confirmPassword
  );
};

const updateProfile = async () => {
  if (!validateProfile()) return;

  updating.value = true;

  try {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    await authService.updateUserProfile(user.uid, {
      displayName: form.displayName.trim(),
      email: form.email.trim(),
    });

    await loadUserData();
    // TODO: Show success notification
  } catch (error: any) {
    console.error('Failed to update profile:', error);
    // TODO: Show error notification
  } finally {
    updating.value = false;
  }
};

const changePassword = async () => {
  if (!validatePasswordForm()) return;

  changingPassword.value = true;

  try {
    await authService.updatePassword(passwordForm.newPassword);

    // Clear form
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';

    // TODO: Show success notification
  } catch (error: any) {
    console.error('Failed to change password:', error);
    passwordErrors.currentPassword = 'Current password is incorrect';
    // TODO: Show error notification
  } finally {
    changingPassword.value = false;
  }
};

const deleteAccount = async () => {
  if (deleteConfirmation.value !== 'DELETE') return;

  deleting.value = true;

  try {
    await authService.deleteAccount();
    // User will be redirected by auth state change
  } catch (error: any) {
    console.error('Failed to delete account:', error);
    // TODO: Show error notification
  } finally {
    deleting.value = false;
    showDeleteConfirmation.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadUserData();
});
</script>

<!-- CSS classes are now defined in /styles/components/settings/account-settings.css -->
