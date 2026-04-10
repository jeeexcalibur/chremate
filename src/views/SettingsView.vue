<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { formatCurrency } from '@/lib/utils'
import AppLayout from '@/components/layout/AppLayout.vue'

const authStore = useAuthStore()
const { isDark, toggle: toggleTheme } = useTheme()

const budgetInput = ref(authStore.user?.monthlyBudget || 5000000)
const isSaving = ref(false)
const showSaved = ref(false)

const budgetPresets = [
  { label: '3 Juta', value: 3000000 },
  { label: '5 Juta', value: 5000000 },
  { label: '7.5 Juta', value: 7500000 },
  { label: '10 Juta', value: 10000000 },
  { label: '15 Juta', value: 15000000 },
  { label: '20 Juta', value: 20000000 },
]

async function saveBudget() {
  isSaving.value = true
  try {
    await authStore.updateBudget(budgetInput.value)
    showSaved.value = true
    setTimeout(() => showSaved.value = false, 3000)
  } catch (e) {
    console.error('Failed to save budget:', e)
  } finally {
    isSaving.value = false
  }
}

function selectPreset(value: number) {
  budgetInput.value = value
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6 pb-20 md:pb-6 max-w-2xl">
      <!-- Header -->
      <div class="animate-fade-in">
        <h1 class="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
        <p class="text-muted-foreground mt-1">Customize your experience</p>
      </div>

      <!-- Profile Section -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm animate-slide-up">
        <h2 class="text-sm font-semibold text-card-foreground uppercase tracking-wider mb-4">Profile</h2>
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
            {{ authStore.user?.displayName?.charAt(0) || authStore.user?.email?.charAt(0) || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-lg font-semibold text-card-foreground truncate">
              {{ authStore.user?.displayName || 'User' }}
            </p>
            <p class="text-sm text-muted-foreground truncate">{{ authStore.user?.email }}</p>
          </div>
        </div>
      </div>

      <!-- Theme Section -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm animate-slide-up" style="animation-delay: 100ms">
        <h2 class="text-sm font-semibold text-card-foreground uppercase tracking-wider mb-4">Appearance</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-card-foreground">Dark Mode</p>
            <p class="text-xs text-muted-foreground mt-0.5">Switch between light and dark themes</p>
          </div>
          <button
            @click="toggleTheme"
            :class="[
              'relative w-14 h-7 rounded-full transition-colors duration-300',
              isDark ? 'bg-primary' : 'bg-muted',
            ]"
          >
            <div
              :class="[
                'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center text-xs',
                isDark ? 'left-7.5' : 'left-0.5',
              ]"
            >
              {{ isDark ? '🌙' : '☀️' }}
            </div>
          </button>
        </div>
      </div>

      <!-- Budget Section -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm animate-slide-up" style="animation-delay: 200ms">
        <h2 class="text-sm font-semibold text-card-foreground uppercase tracking-wider mb-4">Monthly Budget</h2>
        <p class="text-xs text-muted-foreground mb-4">Set your monthly spending limit to track your budget progress</p>

        <!-- Presets -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="preset in budgetPresets"
            :key="preset.value"
            @click="selectPreset(preset.value)"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              budgetInput === preset.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            ]"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Custom Input -->
        <div class="flex gap-3">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">IDR</span>
            <input
              v-model.number="budgetInput"
              type="number"
              class="w-full pl-12 pr-4 py-2.5 rounded-xl bg-muted border border-input text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm"
              placeholder="Enter amount"
            />
          </div>
          <button
            @click="saveBudget"
            :disabled="isSaving"
            class="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <!-- Success Message -->
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="showSaved" class="mt-3 p-2 rounded-lg bg-income/10 text-income text-sm flex items-center gap-2">
            <span>✅</span> Budget updated to {{ formatCurrency(budgetInput) }}
          </div>
        </Transition>
      </div>

      <!-- Currency Section -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm animate-slide-up" style="animation-delay: 300ms">
        <h2 class="text-sm font-semibold text-card-foreground uppercase tracking-wider mb-4">Currency</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-card-foreground">Indonesian Rupiah (IDR)</p>
            <p class="text-xs text-muted-foreground mt-0.5">Default currency for all transactions</p>
          </div>
          <span class="text-2xl">🇮🇩</span>
        </div>
      </div>

      <!-- About Section -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm animate-slide-up" style="animation-delay: 400ms">
        <h2 class="text-sm font-semibold text-card-foreground uppercase tracking-wider mb-4">About</h2>
        <div class="flex items-center gap-3 mb-4">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2.5" class="text-primary" />
            <path d="M19.5 11.5C18.5 10.5 17.3 10 16 10C13.2 10 11 12.2 11 15C11 17.8 13.2 20 16 20C17.3 20 18.5 19.5 19.5 18.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="text-primary" />
          </svg>
          <div>
            <p class="text-base font-bold gradient-text">Chremate</p>
            <p class="text-xs text-muted-foreground">From <em>Chrēmata</em> (χρήματα) — money, wealth. Your money mate.</p>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Version</span>
            <span class="text-sm text-card-foreground font-medium">1.0.0</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">AI Model</span>
            <span class="text-sm text-card-foreground font-medium">Gemini 1.5 Flash</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Database</span>
            <span class="text-sm text-card-foreground font-medium">Firebase Firestore</span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
