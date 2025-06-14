<template>
  <MainLayout>
    <div class="main-single-column">
      <div class="vault-dashboard">
        <!-- Header -->
        <div class="dashboard-header">
          <div class="header-content">
            <h1 class="dashboard-title">Password Vault</h1>
            <p class="dashboard-subtitle">
              {{ filteredItems.length }} of {{ items.length }} passwords
            </p>
          </div>

          <div class="header-actions">
            <BaseButton
              variant="outline"
              icon="refresh"
              @click="refreshVault"
              :loading="refreshing"
              title="Refresh vault"
            />

            <BaseButton variant="primary" icon="plus" @click="showAddModal = true">
              Add Password
            </BaseButton>
          </div>
        </div>

        <!-- Search and Filter Bar -->
        <div class="search-bar-container">
          <div class="search-input-container">
            <BaseInput
              v-model="searchQuery"
              type="search"
              placeholder="Search passwords, usernames, or websites..."
              prefix-icon="search"
              clearable
              class="search-input"
            />

            <BaseButton
              variant="outline"
              icon="filter"
              @click="showFilters = !showFilters"
              :class="{ active: showFilters }"
            >
              Filters
            </BaseButton>
          </div>

          <!-- Advanced Filters -->
          <div v-if="showFilters" class="search-filters-dropdown">
            <div class="grid-responsive-md">
              <div class="filter-group">
                <label class="filter-label">Category</label>
                <select v-model="selectedCategory" class="filter-select">
                  <option value="">All Categories</option>
                  <option value="social">Social Media</option>
                  <option value="banking">Banking</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div class="filter-group">
                <label class="filter-label">Security</label>
                <select v-model="securityFilter" class="filter-select">
                  <option value="">All Passwords</option>
                  <option value="weak">Weak Passwords</option>
                  <option value="strong">Strong Passwords</option>
                  <option value="old">Old Passwords</option>
                  <option value="favorites">Favorites</option>
                </select>
              </div>

              <div class="filter-group">
                <label class="filter-label">Sort By</label>
                <select v-model="sortBy" class="filter-select">
                  <option value="name">Name</option>
                  <option value="updated">Last Updated</option>
                  <option value="created">Date Created</option>
                  <option value="strength">Password Strength</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="stats-section">
          <div class="stat-card">
            <div class="stat-icon success">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ strongPasswords }}</span>
              <span class="stat-label">Strong Passwords</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon warning">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ weakPasswords }}</span>
              <span class="stat-label">Need Attention</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon info">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ recentlyUpdated }}</span>
              <span class="stat-label">Recently Updated</span>
            </div>
          </div>
        </div>

        <!-- Password List -->
        <div class="vault-content">
          <div v-if="loading" class="loading-state">
            <LoadingSpinner size="lg" />
            <p class="loading-text">Loading your passwords...</p>
          </div>

          <div v-else-if="filteredItems.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 class="empty-title">
              {{ searchQuery ? 'No passwords found' : 'No passwords yet' }}
            </h3>
            <p class="empty-description">
              {{
                searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first password to the vault'
              }}
            </p>
            <BaseButton v-if="!searchQuery" variant="primary" @click="showAddModal = true">
              Add Your First Password
            </BaseButton>
          </div>

          <div v-else class="password-list">
            <PasswordItem
              v-for="item in paginatedItems"
              :key="item.id"
              :item="item"
              :selected="selectedItem?.id === item.id"
              @click="selectItem"
              @edit="editItem"
              @delete="deleteItem"
              @duplicate="duplicateItem"
              @favorite="toggleFavorite"
            />

            <!-- Load More -->
            <div v-if="hasMoreItems" class="load-more">
              <BaseButton variant="outline" @click="loadMore" :loading="loadingMore">
                Load More Passwords
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Add/Edit Password Modal -->
        <BaseModal v-model="showAddModal" title="Add Password" size="lg" @close="resetForm">
          <div class="modal-content">
            <form @submit.prevent="savePassword" class="password-form">
              <div class="form-row">
                <BaseInput
                  v-model="passwordForm.name"
                  label="Name"
                  placeholder="Enter a name for this password"
                  :error="formErrors.name"
                  required
                />
              </div>

              <div class="form-row">
                <BaseInput
                  v-model="passwordForm.username"
                  label="Username/Email"
                  placeholder="Enter username or email"
                  :error="formErrors.username"
                />
              </div>

              <div class="form-row">
                <BaseInput
                  v-model="passwordForm.password"
                  type="password"
                  label="Password"
                  placeholder="Enter or generate a password"
                  :error="formErrors.password"
                  required
                />
                <BaseButton
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="showPasswordGenerator = true"
                  class="generate-button"
                >
                  Generate
                </BaseButton>
              </div>

              <!-- Password Strength Meter -->
              <PasswordStrengthMeter
                v-if="passwordForm.password"
                :password="passwordForm.password"
                :show-requirements="true"
                :show-tips="true"
              />

              <div class="form-row">
                <BaseInput
                  v-model="passwordForm.website"
                  label="Website"
                  placeholder="https://example.com"
                  :error="formErrors.website"
                />
              </div>

              <div class="form-row">
                <BaseInput
                  v-model="passwordForm.notes"
                  label="Notes"
                  placeholder="Additional notes (optional)"
                  type="textarea"
                  rows="3"
                />
              </div>
            </form>
          </div>

          <template #footer>
            <BaseButton variant="outline" @click="showAddModal = false"> Cancel </BaseButton>
            <BaseButton variant="primary" @click="savePassword" :loading="saving">
              Save Password
            </BaseButton>
          </template>
        </BaseModal>

        <!-- Password Generator Modal -->
        <BaseModal
          v-model="showPasswordGenerator"
          title="Password Generator"
          size="xl"
          @close="showPasswordGenerator = false"
        >
          <PasswordGenerator @password-selected="useGeneratedPassword" />
        </BaseModal>

        <!-- Delete Confirmation Modal -->
        <BaseModal
          v-model="showDeleteModal"
          title="Delete Password"
          @close="showDeleteModal = false"
        >
          <div class="delete-content">
            <div class="delete-warning">
              <svg class="warning-icon" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <div class="warning-content">
                <h3 class="warning-title">Are you sure?</h3>
                <p class="warning-text">
                  This will permanently delete "<strong>{{ itemToDelete?.name }}</strong
                  >". This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <template #footer>
            <BaseButton variant="outline" @click="showDeleteModal = false"> Cancel </BaseButton>
            <BaseButton variant="danger" @click="confirmDelete" :loading="deleting">
              Delete Password
            </BaseButton>
          </template>
        </BaseModal>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import MainLayout from '@/components/layout/MainLayout.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import PasswordItem from '@/components/vault/PasswordItem.vue';
import PasswordGenerator from '@/components/vault/PasswordGenerator.vue';
import PasswordStrengthMeter from '@/components/vault/PasswordStrengthMeter.vue';

// Mock data is used instead of store for now

// State
const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const deleting = ref(false);
const loadingMore = ref(false);
const showFilters = ref(false);
const showAddModal = ref(false);
const showPasswordGenerator = ref(false);
const showDeleteModal = ref(false);

const searchQuery = ref('');
const selectedCategory = ref('');
const securityFilter = ref('');
const sortBy = ref('name');

const selectedItem = ref<any>(null);
const itemToDelete = ref<any>(null);
const currentPage = ref(1);
const itemsPerPage = 20;

const passwordForm = reactive({
  name: '',
  username: '',
  password: '',
  website: '',
  notes: '',
});

const formErrors = reactive({
  name: '',
  username: '',
  password: '',
  website: '',
});

// Mock data for demonstration
const items = ref([
  {
    id: '1',
    name: 'Gmail',
    username: 'user@example.com',
    password: 'SecurePass123!',
    website: 'https://gmail.com',
    iconUrl: null,
    isFavorite: true,
    tags: ['email', 'google'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    passwordStrength: 85,
  },
  {
    id: '2',
    name: 'Banking App',
    username: 'john.doe',
    password: 'weakpass',
    website: 'https://bank.com',
    iconUrl: null,
    isFavorite: false,
    tags: ['banking', 'finance'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    passwordStrength: 25,
  },
  {
    id: '3',
    name: 'Work Portal',
    username: 'jdoe@company.com',
    password: 'Complex@Pass2024!',
    website: 'https://portal.company.com',
    iconUrl: null,
    isFavorite: false,
    tags: ['work', 'productivity'],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-10'),
    passwordStrength: 95,
  },
]);

// Computed
const filteredItems = computed(() => {
  let filtered = [...items.value];

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      item =>
        item.name.toLowerCase().includes(query) ||
        item.username.toLowerCase().includes(query) ||
        (item.website && item.website.toLowerCase().includes(query))
    );
  }

  // Security filter
  if (securityFilter.value) {
    switch (securityFilter.value) {
      case 'weak':
        filtered = filtered.filter(item => (item.passwordStrength || 0) < 40);
        break;
      case 'strong':
        filtered = filtered.filter(item => (item.passwordStrength || 0) >= 80);
        break;
      case 'old':
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        filtered = filtered.filter(item => item.updatedAt < threeMonthsAgo);
        break;
      case 'favorites':
        filtered = filtered.filter(item => item.isFavorite);
        break;
    }
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'updated':
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case 'created':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'strength':
        return (b.passwordStrength || 0) - (a.passwordStrength || 0);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return filtered;
});

const paginatedItems = computed(() => {
  const end = currentPage.value * itemsPerPage;
  return filteredItems.value.slice(0, end);
});

const hasMoreItems = computed(() => {
  return filteredItems.value.length > currentPage.value * itemsPerPage;
});

const strongPasswords = computed(() => {
  return items.value.filter(item => (item.passwordStrength || 0) >= 80).length;
});

const weakPasswords = computed(() => {
  return items.value.filter(item => (item.passwordStrength || 0) < 40).length;
});

const recentlyUpdated = computed(() => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return items.value.filter(item => item.updatedAt > oneWeekAgo).length;
});

// Methods
const refreshVault = async () => {
  refreshing.value = true;
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  refreshing.value = false;
};

const loadMore = () => {
  loadingMore.value = true;
  setTimeout(() => {
    currentPage.value++;
    loadingMore.value = false;
  }, 500);
};

const selectItem = (item: any) => {
  selectedItem.value = item;
};

const editItem = (item: any) => {
  selectedItem.value = item;
  Object.assign(passwordForm, {
    name: item.name,
    username: item.username,
    password: item.password,
    website: item.website || '',
    notes: item.notes || '',
  });
  showAddModal.value = true;
};

const deleteItem = (item: any) => {
  itemToDelete.value = item;
  showDeleteModal.value = true;
};

const duplicateItem = (item: any) => {
  Object.assign(passwordForm, {
    name: `${item.name} (Copy)`,
    username: item.username,
    password: item.password,
    website: item.website || '',
    notes: item.notes || '',
  });
  showAddModal.value = true;
};

const toggleFavorite = (item: any, favorite: boolean) => {
  const index = items.value.findIndex(i => i.id === item.id);
  if (index >= 0) {
    items.value[index].isFavorite = favorite;
  }
};

const savePassword = async () => {
  // Validate form
  Object.keys(formErrors).forEach(key => {
    formErrors[key as keyof typeof formErrors] = '';
  });

  if (!passwordForm.name) {
    formErrors.name = 'Name is required';
    return;
  }

  if (!passwordForm.password) {
    formErrors.password = 'Password is required';
    return;
  }

  saving.value = true;

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Add or update item
  if (selectedItem.value) {
    // Update existing
    const index = items.value.findIndex(i => i.id === selectedItem.value.id);
    if (index >= 0) {
      items.value[index] = {
        ...items.value[index],
        ...passwordForm,
        updatedAt: new Date(),
      };
    }
  } else {
    // Add new
    const newItem = {
      id: Date.now().toString(),
      ...passwordForm,
      isFavorite: false,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordStrength: calculatePasswordStrength(passwordForm.password),
    };
    items.value.unshift(newItem);
  }

  saving.value = false;
  showAddModal.value = false;
  resetForm();
};

const confirmDelete = async () => {
  if (!itemToDelete.value) return;

  deleting.value = true;

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Remove item
  const index = items.value.findIndex(i => i.id === itemToDelete.value.id);
  if (index >= 0) {
    items.value.splice(index, 1);
  }

  deleting.value = false;
  showDeleteModal.value = false;
  itemToDelete.value = null;
};

const useGeneratedPassword = (password: string) => {
  passwordForm.password = password;
  showPasswordGenerator.value = false;
};

const resetForm = () => {
  selectedItem.value = null;
  Object.assign(passwordForm, {
    name: '',
    username: '',
    password: '',
    website: '',
    notes: '',
  });
  Object.keys(formErrors).forEach(key => {
    formErrors[key as keyof typeof formErrors] = '';
  });
};

const calculatePasswordStrength = (password: string): number => {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 25;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  return Math.min(100, score);
};

// Lifecycle
onMounted(async () => {
  // Simulate loading
  await new Promise(resolve => setTimeout(resolve, 1000));
  loading.value = false;
});

// Reset pagination when filters change
watch([searchQuery, selectedCategory, securityFilter], () => {
  currentPage.value = 1;
});
</script>

<style scoped></style>
