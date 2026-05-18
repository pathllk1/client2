import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../pages/About.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../pages/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/superadmin',
      name: 'superadmin',
      component: () => import('../pages/SuperAdmin.vue'),
      meta: { requiresAuth: true, role: 'superadmin' }
    },
    {
      path: '/master-roll',
      name: 'master-roll',
      component: () => import('../pages/master-roll/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/auth/login',
      name: 'login',
      component: () => import('../pages/auth/Login.vue'),
    },
    {
      path: '/auth/signup',
      name: 'signup',
      component: () => import('../pages/auth/Signup.vue'),
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('../pages/About.vue'), // Placeholder
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('../pages/About.vue'), // Placeholder
    },
  ],
})

router.beforeEach(async (to) => {
  const { isAuthenticated, user, fetchMe } = useAuth()
  
  // Ensure user data is loaded if we have a token
  if (localStorage.getItem('access_token') && !user.value) {
    await fetchMe()
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return '/auth/login'
  }
  
  if (to.meta.role && user.value?.role !== to.meta.role) {
    return '/'
  }
})

export default router
