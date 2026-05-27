<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency } from '@/lib/utils'
import AppLayout from '@/components/layout/AppLayout.vue'
import { CATEGORIES, BUDGET_CATEGORIES, type TransactionCategory } from '@/types'

const authStore = useAuthStore()

const budgetInput = ref(authStore.user?.monthlyBudget || 5000000)
const isSaving = ref(false)
const showSaved = ref(false)
const showCategoryPicker = ref(false)

// Category budgets inputs state
const categoryBudgetsInput = ref<Record<string, number>>({})

// Initialize category budgets from user profile
if (authStore.user?.categoryBudgets) {
  categoryBudgetsInput.value = { ...authStore.user.categoryBudgets }
}

const budgetPresets = [
  { label: '3 Juta', value: 3000000 },
  { label: '5 Juta', value: 5000000 },
  { label: '7.5 Juta', value: 7500000 },
  { label: '10 Juta', value: 10000000 },
  { label: '15 Juta', value: 15000000 },
  { label: '20 Juta', value: 20000000 },
]

// Categories that already have budgets set
const activeCategoryBudgets = computed(() => {
  return BUDGET_CATEGORIES.filter(cat => {
    const val = categoryBudgetsInput.value[cat]
    return val !== undefined && val !== null
  })
})

// Categories available to add (not yet configured)
const availableCategories = computed(() => {
  return BUDGET_CATEGORIES.filter(cat => !activeCategoryBudgets.value.includes(cat))
})

async function saveBudget() {
  isSaving.value = true
  try {
    const budgetsToSave: Record<string, number> = {}
    for (const cat of BUDGET_CATEGORIES) {
      const val = categoryBudgetsInput.value[cat]
      if (val && val > 0) {
        budgetsToSave[cat] = val
      }
    }
    await authStore.updateBudget(budgetInput.value, budgetsToSave)
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

function addCategoryBudget(cat: TransactionCategory) {
  categoryBudgetsInput.value[cat] = 0
  showCategoryPicker.value = false
}

function removeCategoryBudget(cat: TransactionCategory) {
  delete categoryBudgetsInput.value[cat]
}

function getCategoryInfo(category: string) {
  return CATEGORIES[category as TransactionCategory] || CATEGORIES.other
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

      <!-- Budget Section -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm animate-slide-up" style="animation-delay: 100ms">
        <h2 class="text-sm font-semibold text-card-foreground uppercase tracking-wider mb-4">Monthly Budget</h2>
        <p class="text-xs text-muted-foreground mb-4">Set your monthly spending limit to track your budget progress</p>

        <!-- Info badge about what counts -->
        <div class="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 mb-4">
          <span class="text-sm mt-0.5">💡</span>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            <span class="font-semibold text-card-foreground">Only consumptive spending</span> counts toward your budget.
            Investments, crypto, stocks, and transfers to people are excluded.
          </p>
        </div>

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

        <!-- Category Budgets Section -->
        <div class="mt-6 border-t border-border pt-6">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-xs font-bold text-card-foreground uppercase tracking-wider">Category Spending Limits</h3>
            <span class="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">Optional</span>
          </div>
          <p class="text-[11px] text-muted-foreground mb-4">Add custom limits for specific spending categories</p>

          <!-- Active category budgets -->
          <div v-if="activeCategoryBudgets.length > 0" class="space-y-3 mb-4">
            <TransitionGroup
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-2 scale-95"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-for="cat in activeCategoryBudgets"
                :key="cat"
                class="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/40 hover:border-border/80 hover:bg-muted/60 transition-all group"
              >
                <!-- Category icon & name -->
                <div class="flex items-center gap-2 min-w-0 flex-shrink-0">
                  <span class="text-lg">{{ getCategoryInfo(cat).icon }}</span>
                  <span class="text-xs font-semibold text-card-foreground whitespace-nowrap">{{ getCategoryInfo(cat).label }}</span>
                </div>

                <!-- Budget input -->
                <div class="relative flex-1 min-w-0">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">Rp</span>
                  <input
                    v-model.number="categoryBudgetsInput[cat]"
                    type="number"
                    placeholder="Set limit"
                    min="0"
                    class="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-input text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs text-right font-medium"
                  />
                </div>

                <!-- Remove button -->
                <button
                  @click="removeCategoryBudget(cat)"
                  class="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Remove category budget"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </TransitionGroup>
          </div>

          <!-- Empty state -->
          <div v-else class="text-center py-6 rounded-2xl border border-dashed border-border/60 bg-muted/20 mb-4">
            <span class="text-2xl mb-2 block">🎯</span>
            <p class="text-xs text-muted-foreground">No category budgets set yet</p>
            <p class="text-[10px] text-muted-foreground mt-0.5">Your general monthly budget applies to all spending</p>
          </div>

          <!-- Add Category Budget button & picker -->
          <div class="relative">
            <button
              v-if="availableCategories.length > 0"
              @click="showCategoryPicker = !showCategoryPicker"
              :class="[
                'w-full py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 border',
                showCategoryPicker
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted hover:text-card-foreground hover:border-border',
              ]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Category Budget
            </button>

            <!-- Category picker dropdown -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-2 scale-95"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 -translate-y-2 scale-95"
            >
              <div v-if="showCategoryPicker" class="mt-2 p-3 rounded-2xl bg-card border border-border shadow-lg">
                <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Select a category</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    v-for="cat in availableCategories"
                    :key="cat"
                    @click="addCategoryBudget(cat)"
                    class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-card-foreground bg-muted/50 border border-border/30 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                  >
                    <span class="text-base">{{ getCategoryInfo(cat).icon }}</span>
                    <span class="truncate">{{ getCategoryInfo(cat).label }}</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
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
          <div v-if="showSaved" class="mt-4 p-2 rounded-lg bg-income/10 text-income text-sm flex items-center gap-2">
            <span>✅</span> Budgets successfully updated!
          </div>
        </Transition>
      </div>

      <!-- Currency Section -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm animate-slide-up" style="animation-delay: 200ms">
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
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm animate-slide-up" style="animation-delay: 300ms">
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
