<template>
  <div class="sidebar-layout-container">
    <!-- Sidebar Navigation -->
    <nav class="sidebar-panel" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="sidebar-header-brand">
          <svg class="sidebar-header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span class="sidebar-header-text">ZK-Vault</span>
        </div>

        <div class="sidebar-header-actions">
          <button class="sidebar-toggle-button hidden-lg" @click="toggleSidebar">
            <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="sidebar-content">
        <div class="sidebar-scroll-area">
          <!-- Main Navigation -->
          <div class="sidebar-nav">
            <div class="sidebar-nav-items">
              <router-link
                to="/dashboard"
                class="sidebar-nav-item"
                :class="{ active: $route.name === 'Dashboard' }"
              >
                <svg class="sidebar-nav-item-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM14 9a1 1 0 100 2h3a1 1 0 100-2h-3zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  />
                </svg>
                <span class="sidebar-nav-item-text">Dashboard</span>
              </router-link>

              <router-link
                to="/vault"
                class="sidebar-nav-item"
                :class="{ active: $route.name === 'Vault' }"
              >
                <svg class="sidebar-nav-item-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="sidebar-nav-item-text">Password Vault</span>
              </router-link>

              <router-link
                to="/files"
                class="sidebar-nav-item"
                :class="{ active: $route.name === 'Files' }"
              >
                <svg class="sidebar-nav-item-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="sidebar-nav-item-text">Files</span>
              </router-link>

              <router-link
                to="/security"
                class="sidebar-nav-item"
                :class="{ active: $route.name === 'Security' }"
              >
                <svg class="sidebar-nav-item-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="sidebar-nav-item-text">Security</span>
              </router-link>
            </div>
          </div>

          <!-- Settings Section -->
          <div class="sidebar-nav-section">
            <h3 class="sidebar-nav-section-title">Settings</h3>
            <div class="sidebar-nav-items">
              <router-link
                to="/settings"
                class="sidebar-nav-item"
                :class="{ active: $route.name === 'Settings' }"
              >
                <svg class="sidebar-nav-item-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="sidebar-nav-item-text">Settings</span>
              </router-link>
            </div>
          </div>
        </div>

        <!-- User Section -->
        <div class="sidebar-footer">
          <div class="sidebar-user-section">
            <div class="sidebar-user-avatar">
              <svg class="icon-md" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name">{{ userEmail || 'User' }}</div>
              <div class="sidebar-user-status">{{ vaultStatus }}</div>
            </div>
            <button class="sidebar-user-menu" @click="handleLogout" title="Sign out">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Mobile Overlay -->
    <div
      v-if="sidebarOpen"
      class="sidebar-panel-overlay active hidden-lg"
      @click="closeSidebar"
    ></div>

    <!-- Main Content -->
    <main class="main-content-area">
      <!-- Top Bar -->
      <header class="header-layout">
        <div class="header-container">
          <div class="header-left">
            <button class="header-action-button hidden-lg" @click="toggleSidebar">
              <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div class="header-brand">
              <span class="header-brand-text">{{ currentPageTitle }}</span>
            </div>
          </div>

          <div class="header-right">
            <!-- Search -->
            <div class="header-search">
              <SearchBar
                size="sm"
                placeholder="Search vault..."
                :show-filter-toggle="true"
                @search="handleSearch"
                @focus="handleSearchFocus"
                @blur="handleSearchBlur"
              />
            </div>

            <!-- Notifications -->
            <button class="header-action-button" @click="showNotifications = !showNotifications">
              <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-5 5v-5zM10.07 2.82a3 3 0 00-4.24 0L2.82 5.83a3 3 0 000 4.24l2.01 2.01a3 3 0 004.24 0l2.01-2.01a3 3 0 000-4.24L10.07 2.82z"
                />
              </svg>
              <span v-if="notificationCount > 0" class="notification-badge">{{
                notificationCount
              }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="main-content-wrapper">
        <div class="main-content-inner">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authService } from '@/services/auth.service';
import SearchBar from '@/components/search/SearchBar.vue';
import type { SearchFilters } from '@/store/search.store';
import { useAuthStore } from '@/store/auth.store';

// Router
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// State
const sidebarOpen = ref(false);
const showNotifications = ref(false);
const notificationCount = ref(0);
const isSearchFocused = ref(false);

// Computed
const currentPageTitle = computed(() => {
  const routeNames: Record<string, string> = {
    Dashboard: 'Dashboard',
    Vault: 'Password Vault',
    Files: 'Files',
    Security: 'Security',
    Settings: 'Settings',
  };
  return routeNames[route.name as string] || 'ZK-Vault';
});

const vaultStatus = computed(() => {
  // This would come from a store or service
  return 'Vault Unlocked';
});

// Methods
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const closeSidebar = () => {
  sidebarOpen.value = false;
};

const handleLogout = async () => {
  try {
    await authStore.logout();
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

const handleResize = () => {
  if (window.innerWidth >= 768) {
    sidebarOpen.value = false;
  }
};

const handleSearch = (query: string, filters: SearchFilters) => {
  // Navigate to search results page if not already there
  if (route.name !== 'Search') {
    router.push({
      name: 'Search',
      query: {
        q: query,
        ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) }),
      },
    });
  }
};

const handleSearchFocus = () => {
  isSearchFocused.value = true;
};

const handleSearchBlur = () => {
  isSearchFocused.value = false;
};

// Computed
const userEmail = computed(() => authStore.user?.email || '');

// Lifecycle
onMounted(() => {
  // Set up resize listener
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<!-- Styles handled by /src/styles/components/layout/main-layout.css -->
