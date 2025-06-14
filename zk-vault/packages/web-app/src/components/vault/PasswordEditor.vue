<template>
  <div class="password-editor">
    <div class="editor-header">
      <h3 class="editor-title">{{ isEditing ? 'Edit Password' : 'Add Password' }}</h3>
      <BaseButton variant="ghost" size="sm" @click="$emit('close')" icon="x" />
    </div>

    <form @submit.prevent="handleSubmit" class="editor-form">
      <!-- Name Field -->
      <BaseInput
        v-model="form.name"
        label="Item Name"
        placeholder="Enter a name for this password"
        :error="errors.name"
        required
      />

      <!-- Website Field -->
      <BaseInput
        v-model="form.website"
        label="Website"
        placeholder="https://example.com"
        :error="errors.website"
        type="url"
        prefix-icon="globe"
      />

      <!-- Username Field -->
      <BaseInput
        v-model="form.username"
        label="Username"
        placeholder="Enter username or email"
        :error="errors.username"
        autocomplete="username"
        prefix-icon="user"
      />

      <!-- Password Field -->
      <div class="password-field-group">
        <BaseInput
          v-model="form.password"
          label="Password"
          placeholder="Enter password"
          :type="showPassword ? 'text' : 'password'"
          :error="errors.password"
          required
          autocomplete="new-password"
          prefix-icon="lock"
        >
          <template #suffix>
            <button type="button" @click="showPassword = !showPassword" class="password-toggle">
              <svg v-if="showPassword" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                  clip-rule="evenodd"
                />
                <path
                  d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"
                />
              </svg>
              <svg v-else class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fill-rule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              @click="generatePassword"
              class="generate-password-btn"
              title="Generate Password"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </template>
        </BaseInput>

        <!-- Password Strength Meter -->
        <PasswordStrengthMeter v-if="form.password" :password="form.password" class="mt-2" />
      </div>

      <!-- TOTP Secret Field -->
      <BaseInput
        v-model="form.totpSecret"
        label="2FA Secret (Optional)"
        placeholder="Enter TOTP secret key"
        :error="errors.totpSecret"
        prefix-icon="shield"
      />

      <!-- Folder Field -->
      <div class="form-group">
        <label class="form-label">Folder</label>
        <select v-model="form.folder" class="form-select">
          <option value="">No folder</option>
          <option v-for="folder in folders" :key="folder" :value="folder">
            {{ folder }}
          </option>
        </select>
      </div>

      <!-- Tags Field -->
      <div class="form-group">
        <label class="form-label">Tags</label>
        <div class="tags-input">
          <div class="tag" v-for="tag in form.tags" :key="tag">
            {{ tag }}
            <button type="button" @click="removeTag(tag)" class="tag-remove">×</button>
          </div>
          <input
            v-model="newTag"
            @keydown.enter.prevent="addTag"
            @keydown.comma.prevent="addTag"
            placeholder="Add tags..."
            class="tag-input"
          />
        </div>
      </div>

      <!-- Notes Field -->
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea
          v-model="form.notes"
          placeholder="Additional notes..."
          class="form-textarea"
          rows="3"
        ></textarea>
      </div>

      <!-- Favorite Toggle -->
      <label class="favorite-toggle">
        <input v-model="form.favorite" type="checkbox" class="favorite-checkbox" />
        <span class="favorite-label">Mark as favorite</span>
      </label>

      <!-- Action Buttons -->
      <div class="editor-actions">
        <BaseButton type="button" variant="ghost" @click="$emit('close')"> Cancel </BaseButton>
        <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
          {{ isEditing ? 'Update' : 'Save' }} Password
        </BaseButton>
      </div>
    </form>

    <!-- Password Generator Modal -->
    <PasswordGenerator
      v-if="showGenerator"
      @close="showGenerator = false"
      @generated="onPasswordGenerated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import PasswordStrengthMeter from './PasswordStrengthMeter.vue';
import PasswordGenerator from './PasswordGenerator.vue';
import { vaultService } from '@/services/vault.service';
import type { PasswordVaultItem, DecryptedVaultItem } from '@/services/vault.service';

interface Props {
  item?: PasswordVaultItem;
}

interface Emits {
  (event: 'close'): void;
  (event: 'saved', item: DecryptedVaultItem): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const loading = ref(false);
const showPassword = ref(false);
const showGenerator = ref(false);
const newTag = ref('');
const folders = ref<string[]>([]);

const form = reactive({
  name: '',
  website: '',
  username: '',
  password: '',
  totpSecret: '',
  folder: '',
  tags: [] as string[],
  notes: '',
  favorite: false,
});

const errors = reactive({
  name: '',
  website: '',
  username: '',
  password: '',
  totpSecret: '',
});

// Computed
const isEditing = computed(() => !!props.item);

const isFormValid = computed(() => {
  return form.name.trim() && form.password.trim() && !errors.name && !errors.password;
});

// Methods
const validateForm = () => {
  errors.name = '';
  errors.website = '';
  errors.username = '';
  errors.password = '';
  errors.totpSecret = '';

  if (!form.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!form.password.trim()) {
    errors.password = 'Password is required';
  }

  if (form.website && !isValidUrl(form.website)) {
    errors.website = 'Please enter a valid URL';
  }

  return !errors.name && !errors.password && !errors.website;
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  loading.value = true;

  try {
    const itemData = {
      type: 'password' as const,
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password,
      website: form.website || undefined,
      notes: form.notes || undefined,
      totpSecret: form.totpSecret || undefined,
      customFields: {},
      folder: form.folder || undefined,
      favorite: form.favorite,
      tags: form.tags,
      metadata: {
        strength: vaultService.calculatePasswordStrength(form.password),
        compromised: false,
        lastPasswordChange: new Date(),
        autoFill: true,
      },
    };

    let savedItem: DecryptedVaultItem;

    if (isEditing.value && props.item) {
      savedItem = await vaultService.updateItem(props.item.id, itemData);
    } else {
      savedItem = await vaultService.createItem(itemData);
    }

    emit('saved', savedItem);
    emit('close');
  } catch (error: any) {
    console.error('Failed to save password:', error);
    // TODO: Show error notification
  } finally {
    loading.value = false;
  }
};

const generatePassword = () => {
  showGenerator.value = true;
};

const onPasswordGenerated = (password: string) => {
  form.password = password;
  showGenerator.value = false;
};

const addTag = () => {
  const tag = newTag.value.trim().replace(',', '');
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag);
    newTag.value = '';
  }
};

const removeTag = (tag: string) => {
  const index = form.tags.indexOf(tag);
  if (index > -1) {
    form.tags.splice(index, 1);
  }
};

const loadFolders = async () => {
  try {
    folders.value = await vaultService.getFolders();
  } catch (error) {
    console.error('Failed to load folders:', error);
  }
};

// Lifecycle
onMounted(async () => {
  await loadFolders();

  if (props.item) {
    // Pre-fill form with existing item data
    form.name = props.item.name;
    form.username = props.item.username;
    form.password = props.item.password;
    form.website = props.item.website || '';
    form.notes = props.item.notes || '';
    form.totpSecret = props.item.totpSecret || '';
    form.folder = props.item.folder || '';
    form.tags = [...props.item.tags];
    form.favorite = props.item.favorite;
  }
});
</script>
