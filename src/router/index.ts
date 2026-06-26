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
      path: '/wages',
      name: 'wages',
      component: () => import('../pages/wages/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/labor',
      name: 'labor-dashboard',
      component: () => import('../pages/labor/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/labor/periods/:id',
      name: 'labor-period-details',
      component: () => import('../pages/labor/PeriodDetails.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/inventory',
      name: 'inventory-dashboard',
      component: () => import('../pages/inventory/InventoryDashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/inventory/stocks',
      name: 'inventory-stocks',
      component: () => import('../pages/inventory/Stocks.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/inventory/reports',
      name: 'inventory-reports',
      component: () => import('../pages/inventory/InventoryReports.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/inventory/movements',
      name: 'inventory-movements',
      component: () => import('../pages/inventory/InventoryMovement.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/expenses',
      name: 'expenses-dashboard',
      component: () => import('../pages/expenses/ExpensesMobileShell.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/documents',
      name: 'documents-dashboard',
      component: () => import('../pages/documents/index.vue'),
      meta: { requiresAuth: true }
    },

    {
      path: '/accounting/bills',
      name: 'bills-list',
      component: () => import('../pages/accounting/BillsList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/sales/new',
      name: 'sales-invoice',
      component: () => import('../pages/accounting/SalesInvoice.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/sales/:id/edit',
      name: 'sales-invoice-edit',
      component: () => import('../pages/accounting/SalesInvoice.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/purchases/new',
      name: 'purchase-invoice',
      component: () => import('../pages/accounting/PurchaseInvoice.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/purchases/:id/edit',
      name: 'purchase-invoice-edit',
      component: () => import('../pages/accounting/PurchaseInvoice.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/parties',
      name: 'parties-hub',
      component: () => import('../pages/accounting/PartiesHub.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/ledger',
      name: 'ledger-dashboard',
      component: () => import('../pages/accounting/LedgerDashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/gst-returns',
      name: 'gst-returns',
      component: () => import('../pages/accounting/GSTReturns.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/coa',
      name: 'chart-of-accounts',
      component: () => import('../pages/accounting/ChartOfAccounts.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/ledger-view',
      name: 'ledger-view',
      component: () => import('../pages/accounting/LedgerView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/banking',
      name: 'banking-hub',
      component: () => import('../pages/accounting/BankingHub.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/trial-balance',
      name: 'trial-balance',
      component: () => import('../pages/accounting/TrialBalance.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/accounting/statements',
      name: 'financial-statements',
      component: () => import('../pages/accounting/ProfitLoss.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/mutual-funds',
      name: 'mutual-funds',
      component: () => import('../pages/mutual-funds/index.vue'),
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
