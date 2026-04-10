<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import AddTransactionFab from '@/components/add-transaction/AddTransactionFab.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { isDark, toggle: toggleTheme } = useTheme()

const isMobileMenuOpen = ref(false)

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', name: 'dashboard' },
  { path: '/transactions', label: 'Transactions', icon: '📋', name: 'transactions' },
  { path: '/insights', label: 'Insights', icon: '📈', name: 'insights' },
  { path: '/settings', label: 'Settings', icon: '⚙️', name: 'settings' },
]

const currentNav = computed(() => navItems.find((n) => n.name === route.name))

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function navigateTo(path: string) {
  router.push(path)
  isMobileMenuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <router-link to="/" class="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" class="flex-shrink-0">
                <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2.5" class="text-primary" />
                <path d="M19.5 11.5C18.5 10.5 17.3 10 16 10C13.2 10 11 12.2 11 15C11 17.8 13.2 20 16 20C17.3 20 18.5 19.5 19.5 18.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="text-primary" />
              </svg>
              <span class="text-xl font-bold gradient-text hidden sm:inline">Chremate</span>
            </router-link>
          </div>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center gap-1">
            <button
              v-for="item in navItems"
              :key="item.path"
              @click="navigateTo(item.path)"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                route.name === item.name
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ]"
            >
              <span>{{ item.icon }}</span>
              {{ item.label }}
            </button>
          </nav>

          <!-- Right Actions -->
          <div class="flex items-center gap-3">
            <!-- Theme Toggle -->
            <button
              @click="toggleTheme"
              class="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              :title="isDark ? 'Light mode' : 'Dark mode'"
            >
              <span class="text-lg">{{ isDark ? '☀️' : '🌙' }}</span>
            </button>

            <!-- User Avatar -->
            <div class="hidden sm:flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {{ authStore.user?.displayName?.charAt(0) || authStore.user?.email?.charAt(0) || '?' }}
              </div>
              <span class="text-sm font-medium text-card-foreground max-w-[120px] truncate">
                {{ authStore.user?.displayName || authStore.user?.email }}
              </span>
            </div>

            <!-- Logout -->
            <button
              @click="handleLogout"
              class="hidden sm:flex p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Logout"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>

            <!-- Mobile Menu Toggle -->
            <button
              @click="isMobileMenuOpen = !isMobileMenuOpen"
              class="md:hidden p-2 rounded-xl text-muted-foreground hover:bg-muted transition-all"
            >
              <svg v-if="!isMobileMenuOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Menu -->
      <div
        v-if="isMobileMenuOpen"
        class="md:hidden border-t border-border animate-slide-up"
      >
        <div class="px-4 py-3 space-y-1">
          <button
            v-for="item in navItems"
            :key="item.path"
            @click="navigateTo(item.path)"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
              route.name === item.name
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ]"
          >
            <span class="text-lg">{{ item.icon }}</span>
            {{ item.label }}
          </button>

          <div class="border-t border-border my-2"></div>

          <!-- Mobile user info -->
          <div class="flex items-center gap-3 px-4 py-2">
            <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {{ authStore.user?.displayName?.charAt(0) || authStore.user?.email?.charAt(0) || '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-card-foreground truncate">
                {{ authStore.user?.displayName || 'User' }}
              </p>
              <p class="text-xs text-muted-foreground truncate">{{ authStore.user?.email }}</p>
            </div>
          </div>

          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <slot />
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl safe-area-bottom">
      <div class="flex items-center justify-around py-2">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="navigateTo(item.path)"
          :class="[
            'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px]',
            route.name === item.name
              ? 'text-primary'
              : 'text-muted-foreground',
          ]"
        >
          <span class="text-lg">{{ item.icon }}</span>
          <span class="text-[10px] font-medium">{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <!-- Floating Action Button -->
    <AddTransactionFab />
  </div>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
