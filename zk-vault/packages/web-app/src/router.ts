import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { authService } from '@/services/auth.service';

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
    component: AuthView,
    meta: {
      requiresGuest: true,
    },
    children: [
      {
        path: '',
        name: 'Auth',
        redirect: '/auth/login',
      },
      {
        path: 'login',
        name: 'auth-login',
        component: AuthView,
      },
      {
        path: 'register',
        name: 'auth-register',
        component: AuthView,
      },
      {
        path: 'unlock',
        name: 'auth-unlock',
        component: AuthView,
      },
      {
        path: 'biometric',
        name: 'auth-biometric',
        component: AuthView,
      },
    ],
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
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  // Check authentication requirements
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      // Redirect to auth page if not authenticated
      next({ name: 'Auth', query: { redirect: to.fullPath } });
      return;
    }

    // Check admin requirements
    if (to.meta.requiresAdmin) {
      // For now, allow all authenticated users to access admin
      // In a real app, you'd check user roles/permissions
      next();
      return;
    }

    // Check email verification if required
    if (to.meta.requiresEmailVerification && !authService.isEmailVerified()) {
      next({ name: 'Auth', query: { action: 'verify-email' } });
      return;
    }

    next();
  } else if (to.meta.requiresGuest) {
    // Redirect authenticated users away from guest-only pages
    if (isAuthenticated) {
      next({ name: 'Dashboard' });
      return;
    }
    next();
  } else {
    next();
  }
});

export default router;
