<template>
  <div class="main-layout">
    <!-- Sidebar Navigation -->
    <nav class="nav-sidebar" :class="{ 'open': sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">
          <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span class="logo-text">ZK-Vault</span>
        </div>
        
        <button
          class="sidebar-toggle md:hidden"
          @click="toggleSidebar"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="sidebar-content">
        <!-- Main Navigation -->
        <div class="nav-section">
          <ul class="nav-list">
            <li>
              <router-link
                to="/dashboard"
                class="nav-item"
                :class="{ 'active': $route.name === 'Dashboard' }"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM14 9a1 1 0 100 2h3a1 1 0 100-2h-3zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
                <span class="nav-text">Dashboard</span>
              </router-link>
            </li>
            
            <li>
              <router-link
                to="/vault"
                class="nav-item"
                :class="{ 'active': $route.name === 'Vault' }"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                </svg>
                <span class="nav-text">Password Vault</span>
              </router-link>
            </li>
            
            <li>
              <router-link
                to="/files"
                class="nav-item"
                :class="{ 'active': $route.name === 'Files' }"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                </svg>
                <span class="nav-text">Files</span>
              </router-link>
            </li>
            
            <li>
              <router-link
                to="/security"
                class="nav-item"
                :class="{ 'active': $route.name === 'Security' }"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="nav-text">Security</span>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Settings Section -->
        <div class="nav-section">
          <h3 class="nav-section-title">Settings</h3>
          <ul class="nav-list">
            <li>
              <router-link
                to="/settings"
                class="nav-item"
                :class="{ 'active': $route.name === 'Settings' }"
              >
                <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                </svg>
                <span class="nav-text">Settings</span>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- User Section -->
        <div class="nav-section nav-user">
          <div class="user-info">
            <div class="user-avatar">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="user-details">
              <div class="user-name">{{ userEmail || 'User' }}</div>
              <div class="user-status">{{ vaultStatus }}</div>
            </div>
          </div>
          
          <button
            class="logout-button"
            @click="handleLogout"
            title="Sign out"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Overlay -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay md:hidden"
      @click="closeSidebar"
    ></div>

    <!-- Main Content -->
    <main class="main-content" :class="{ 'sidebar-open': sidebarOpen }">
      <!-- Top Bar -->
      <header class="top-bar">
        <div class="top-bar-left">
          <button
            class="sidebar-toggle md:hidden"
            @click="toggleSidebar"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div class="breadcrumb">
            <span class="breadcrumb-item">{{ currentPageTitle }}</span>
          </div>
        </div>

        <div class="top-bar-right">
          <!-- Search -->
          <div class="search-container">
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
          <button class="notification-button" @click="showNotifications = !showNotifications">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM10.07 2.82a3 3 0 00-4.24 0L2.82 5.83a3 3 0 000 4.24l2.01 2.01a3 3 0 004.24 0l2.01-2.01a3 3 0 000-4.24L10.07 2.82z" />
            </svg>
            <span v-if="notificationCount > 0" class="notification-badge">{{ notificationCount }}</span>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <div class="page-content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '@/services/auth.service'
import SearchBar from '@/components/search/SearchBar.vue'
import type { SearchFilters } from '@/store/search.store'

// Router
const route = useRoute()
const router = useRouter()

// State
const sidebarOpen = ref(false)
const showNotifications = ref(false)
const userEmail = ref('')
const notificationCount = ref(0)
const isSearchFocused = ref(false)

// Computed
const currentPageTitle = computed(() => {
  const routeNames: Record<string, string> = {
    'Dashboard': 'Dashboard',
    'Vault': 'Password Vault',
    'Files': 'Files',
    'Security': 'Security',
    'Settings': 'Settings'
  }
  return routeNames[route.name as string] || 'ZK-Vault'
})

const vaultStatus = computed(() => {
  // This would come from a store or service
  return 'Vault Unlocked'
})

// Methods
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

const handleLogout = async () => {
  try {
    await authService.signOut()
    router.push('/auth')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const handleResize = () => {
  if (window.innerWidth >= 768) {
    sidebarOpen.value = false
  }
}

const handleSearch = (query: string, filters: SearchFilters) => {
  // Navigate to search results page if not already there
  if (route.name !== 'Search') {
    router.push({
      name: 'Search',
      query: {
        q: query,
        ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) })
      }
    })
  }
}

const handleSearchFocus = () => {
  isSearchFocused.value = true
}

const handleSearchBlur = () => {
  isSearchFocused.value = false
}

// Lifecycle
onMounted(() => {
  // Load user info
  userEmail.value = 'user@example.com' // This would come from auth service
  
  // Set up resize listener
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.main-layout {
  @apply flex h-screen bg-neutral-50;
}

.nav-sidebar {
  @apply fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200;
  @apply transform transition-transform duration-300 ease-in-out;
  @apply md:relative md:translate-x-0;
}

.nav-sidebar:not(.open) {
  @apply -translate-x-full md:translate-x-0;
}

.nav-sidebar.open {
  @apply translate-x-0;
}

.sidebar-header {
  @apply flex items-center justify-between p-6 border-b border-neutral-200;
}

.logo {
  @apply flex items-center gap-3;
}

.logo-icon {
  @apply w-8 h-8 text-primary-600;
}

.logo-text {
  @apply text-xl font-bold text-neutral-900;
}

.sidebar-toggle {
  @apply p-2 rounded-lg hover:bg-neutral-100 transition-colors;
}

.sidebar-content {
  @apply flex flex-col h-full p-4 space-y-6;
}

.nav-section {
  @apply space-y-2;
}

.nav-section-title {
  @apply text-xs font-semibold text-neutral-500 uppercase tracking-wider px-3;
}

.nav-list {
  @apply space-y-1;
}

.nav-item {
  @apply flex items-center gap-3 px-3 py-2 text-neutral-700 rounded-lg;
  @apply hover:bg-neutral-100 hover:text-neutral-900 transition-colors;
  @apply text-decoration-none;
}

.nav-item.active {
  @apply bg-primary-100 text-primary-900 font-medium;
}

.nav-icon {
  @apply w-5 h-5 flex-shrink-0;
}

.nav-text {
  @apply truncate;
}

.nav-user {
  @apply mt-auto pt-4 border-t border-neutral-200;
}

.user-info {
  @apply flex items-center gap-3 p-3 rounded-lg bg-neutral-50;
}

.user-avatar {
  @apply w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center;
  @apply text-primary-600;
}

.user-details {
  @apply flex-1 min-w-0;
}

.user-name {
  @apply text-sm font-medium text-neutral-900 truncate;
}

.user-status {
  @apply text-xs text-neutral-500;
}

.logout-button {
  @apply p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100;
  @apply rounded-lg transition-colors;
}

.sidebar-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 z-40;
}

.main-content {
  @apply flex-1 flex flex-col min-w-0;
  @apply md:ml-0;
}

.main-content.sidebar-open {
  @apply md:ml-0;
}

.top-bar {
  @apply flex items-center justify-between px-6 py-4 bg-white border-b border-neutral-200;
}

.top-bar-left {
  @apply flex items-center gap-4;
}

.breadcrumb {
  @apply flex items-center;
}

.breadcrumb-item {
  @apply text-lg font-semibold text-neutral-900;
}

.top-bar-right {
  @apply flex items-center gap-4;
}

.search-container {
  @apply w-64;
}

.notification-button {
  @apply relative p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100;
  @apply rounded-lg transition-colors;
}

.notification-badge {
  @apply absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs;
  @apply rounded-full flex items-center justify-center;
}

.page-content {
  @apply flex-1 overflow-auto;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .main-layout {
    @apply bg-neutral-900;
  }

  .nav-sidebar {
    @apply bg-neutral-800 border-neutral-700;
  }

  .sidebar-header {
    @apply border-neutral-700;
  }

  .logo-text {
    @apply text-neutral-100;
  }

  .sidebar-toggle {
    @apply hover:bg-neutral-700;
  }

  .nav-section-title {
    @apply text-neutral-400;
  }

  .nav-item {
    @apply text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100;
  }

  .nav-item.active {
    @apply bg-primary-900 text-primary-100;
  }

  .nav-user {
    @apply border-neutral-700;
  }

  .user-info {
    @apply bg-neutral-700;
  }

  .user-name {
    @apply text-neutral-100;
  }

  .user-status {
    @apply text-neutral-400;
  }

  .logout-button {
    @apply text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700;
  }

  .top-bar {
    @apply bg-neutral-800 border-neutral-700;
  }

  .breadcrumb-item {
    @apply text-neutral-100;
  }

  .notification-button {
    @apply text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .search-container {
    @apply w-48;
  }
}

@media (max-width: 640px) {
  .search-container {
    @apply hidden;
  }
  
  .top-bar {
    @apply px-4;
  }
}
</style> 