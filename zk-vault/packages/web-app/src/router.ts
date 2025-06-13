import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Lazy load components
const DashboardView = () => import('@/views/DashboardView.vue');
const VaultView = () => import('@/views/VaultView.vue');
const FilesView = () => import('@/views/FilesView.vue');
const SecurityView = () => import('@/views/SecurityView.vue');
const SettingsView = () => import('@/views/SettingsView.vue');
const AuthView = () => import('@/views/AuthView.vue');

// Admin components
const AdminDashboard = () => import('@/components/admin/AdminDashboard.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    redirect: '/dashboard',
  },
  {
    path: '/auth',
    name: 'Auth',
    component: AuthView,
    meta: {
      requiresGuest: true,
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/vault',
    name: 'Vault',
    component: VaultView,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/files',
    name: 'Files',
    component: FilesView,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/security',
    name: 'Security',
    component: SecurityView,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminDashboard,
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation guards
router.beforeEach(async (to: any, _from: any, next: any) => {
  // Check authentication requirements
  if (to.meta.requiresAuth) {
    // This would check auth state from store/service
    // For now, allow through - implement auth check later
    next();
  } else if (to.meta.requiresGuest) {
    // Check if user is already authenticated
    // For now, allow through - implement auth check later
    next();
  } else {
    next();
  }
});

export default router;
