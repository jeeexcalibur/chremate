import { createRouter, createWebHistory } from 'vue-router'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('@/views/TransactionsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('@/views/InsightsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Wait for Firebase auth to initialize (with timeout fallback)
let authReady = false
const authPromise = new Promise<void>((resolve) => {
  if (!isFirebaseConfigured || !auth) {
    authReady = true
    resolve()
    return
  }

  const timeout = setTimeout(() => {
    authReady = true
    resolve()
  }, 3000)

  try {
    const unsub = onAuthStateChanged(auth, () => {
      clearTimeout(timeout)
      authReady = true
      unsub()
      resolve()
    })
  } catch {
    clearTimeout(timeout)
    authReady = true
    resolve()
  }
})

router.beforeEach(async (to) => {
  if (!authReady) await authPromise

  const currentUser = auth?.currentUser

  if (to.meta.requiresAuth && !currentUser) {
    return { name: 'login' }
  }

  if (to.meta.requiresGuest && currentUser) {
    return { name: 'dashboard' }
  }
})

export default router
