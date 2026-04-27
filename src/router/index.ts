import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/LandingPage.vue'),
    meta: { guestOnly: false }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../pages/DashboardPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../pages/ProfilePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { guestOnly: true }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to, from) => {
  const auth = useAuth();
  
  if (!auth.initialized.value) {
    await auth.fetchUser();
  }

  const isAuthenticated = !!auth.user.value;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' };
  }
  
  if (to.meta.guestOnly && isAuthenticated) {
    return { name: 'dashboard' };
  }

  // Redirect to dashboard if logged in and hitting home
  if (to.name === 'home' && isAuthenticated) {
    return { name: 'dashboard' };
  }
  
  return true;
});

export default router;
