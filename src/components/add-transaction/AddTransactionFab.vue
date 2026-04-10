<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTransactionStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from '@/types'
import { formatCurrency } from '@/lib/utils'

const transactionStore = useTransactionStore()
const authStore = useAuthStore()

const isOpen = ref(false)
const saving = ref(false)
const showSuccess = ref(false)

const form = ref({
  description: '',
  amount: null as number | null,
  type: 'expense' as 'income' | 'expense',
  category: 'food' as TransactionCategory,
})

const categoryOptions = computed(() =>
  form.value.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
)

const isValid = computed(() =>
  form.value.description.trim() && form.value.amount && form.value.amount > 0
)

// Reset category when type changes
watch(() => form.value.type, (newType) => {
  form.value.category = newType === 'income' ? 'salary' : 'food'
})

function open() {
  isOpen.value = true
  // Prevent body scroll
  document.body.style.overflow = 'hidden'
}

function close() {
  isOpen.value = false
  document.body.style.overflow = ''
}

function resetForm() {
  form.value = {
    description: '',
    amount: null,
    type: form.value.type,
    category: form.value.type === 'income' ? 'salary' : 'food',
  }
}

async function submit() {
  if (!isValid.value || !authStore.user || saving.value) return
  saving.value = true

  try {
    await transactionStore.addTransaction(authStore.user.uid, {
      amount: form.value.amount!,
      category: form.value.category,
      description: form.value.description,
      type: form.value.type,
    })

    showSuccess.value = true
    resetForm()

    setTimeout(() => {
      showSuccess.value = false
      close()
    }, 1500)
  } catch (e) {
    console.error('Failed to save:', e)
  } finally {
    saving.value = false
  }
}

function getCategoryInfo(category: TransactionCategory) {
  return CATEGORIES[category] || CATEGORIES.other
}
</script>

<template>
  <!-- FAB Button -->
  <button
    @click="open"
    class="fixed bottom-24 right-5 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
    :class="{ 'rotate-45': isOpen }"
    id="fab-add-transaction"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="transition-transform duration-300">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  </button>

  <!-- Backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      @click="close"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
    />
  </Transition>

  <!-- Bottom Sheet -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="isOpen"
      class="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl border-t border-border max-h-[85vh] overflow-y-auto"
    >
      <!-- Handle bar -->
      <div class="flex justify-center pt-3 pb-2">
        <div class="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>

      <div class="px-5 pb-8 sm:px-8 sm:max-w-lg sm:mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-bold text-card-foreground">Add Transaction</h2>
          <button @click="close" class="p-2 -mr-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-card-foreground transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Success state -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-90"
          enter-to-class="opacity-100 scale-100"
        >
          <div v-if="showSuccess" class="text-center py-8">
            <div class="text-5xl mb-3 animate-bounce">✅</div>
            <p class="text-lg font-semibold text-income">Transaction saved!</p>
          </div>
        </Transition>

        <!-- Form -->
        <form v-if="!showSuccess" @submit.prevent="submit" class="space-y-5">
          <!-- Type toggle -->
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in (['expense', 'income'] as const)"
              :key="t"
              type="button"
              @click="form.type = t"
              :class="[
                'py-3 rounded-2xl text-sm font-semibold transition-all',
                form.type === t
                  ? t === 'expense'
                    ? 'bg-expense/15 text-expense border-2 border-expense/30'
                    : 'bg-income/15 text-income border-2 border-income/30'
                  : 'bg-muted text-muted-foreground border-2 border-transparent',
              ]"
            >
              {{ t === 'expense' ? '↘ Expense' : '↗ Income' }}
            </button>
          </div>

          <!-- Description -->
          <div>
            <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
            <input
              id="sheet-description"
              v-model="form.description"
              type="text"
              placeholder="What was it for?"
              class="w-full px-4 py-3.5 rounded-2xl bg-muted border border-input text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm"
              autocomplete="off"
            />
          </div>

          <!-- Amount -->
          <div>
            <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">Rp</span>
              <input
                id="sheet-amount"
                v-model.number="form.amount"
                type="number"
                placeholder="0"
                min="0"
                class="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted border border-input text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm text-right font-semibold text-lg"
              />
            </div>
            <!-- Quick amount buttons -->
            <div class="flex gap-2 mt-2">
              <button
                v-for="amt in [10000, 25000, 50000, 100000]"
                :key="amt"
                type="button"
                @click="form.amount = amt"
                :class="[
                  'flex-1 py-1.5 rounded-xl text-xs font-medium transition-all',
                  form.amount === amt
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground border border-transparent hover:bg-accent',
                ]"
              >
                {{ amt >= 1000 ? `${amt / 1000}k` : amt }}
              </button>
            </div>
          </div>

          <!-- Category -->
          <div>
            <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <button
                v-for="cat in categoryOptions"
                :key="cat"
                type="button"
                @click="form.category = cat"
                :class="[
                  'flex flex-col items-center gap-1 py-3 px-2 rounded-2xl text-xs font-medium transition-all border',
                  form.category === cat
                    ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-card-foreground',
                ]"
              >
                <span class="text-xl">{{ getCategoryInfo(cat).icon }}</span>
                <span class="truncate w-full text-center">{{ getCategoryInfo(cat).label }}</span>
              </button>
            </div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="!isValid || saving"
            :class="[
              'w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed',
              form.type === 'expense'
                ? 'bg-expense text-white hover:opacity-90'
                : 'bg-income text-white hover:opacity-90',
            ]"
          >
            {{ saving ? 'Saving...' : `Add ${form.type === 'income' ? 'Income' : 'Expense'}` }}
          </button>
        </form>
      </div>
    </div>
  </Transition>
</template>
