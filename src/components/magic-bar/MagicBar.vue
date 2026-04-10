<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAI } from '@/composables/useAI'
import { useTransactionStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES, type TransactionCategory } from '@/types'
import type { ParsedTransaction } from '@/types'
import { formatCurrency } from '@/lib/utils'

const { parsing, parseTransactions } = useAI()
const transactionStore = useTransactionStore()
const authStore = useAuthStore()

const input = ref('')
const showResult = ref(false)
const showSuccess = ref(false)
const successCount = ref(0)
const parsedResults = ref<ParsedTransaction[]>([])

const examples = [
  'Received 10jt salary',
  'Grab ke office 15k',
  'Netflix subscription 54k',
  'Beli ayam geprek 30k terus naik gojek 15k',
]

const currentExample = ref(0)
const placeholderText = computed(() => `Try: "${examples[currentExample.value]}"`)

setInterval(() => {
  currentExample.value = (currentExample.value + 1) % examples.length
}, 4000)

async function handleSubmit() {
  if (!input.value.trim() || parsing.value) return
  try {
    const results = await parseTransactions(input.value)
    if (results.length > 0) {
      parsedResults.value = results
      showResult.value = true
    }
  } catch (e) {
    console.error('Parse error:', e)
  }
}

async function confirmAll() {
  if (!parsedResults.value.length || !authStore.user) return
  try {
    let count = 0
    for (const tx of parsedResults.value) {
      await transactionStore.addTransaction(authStore.user.uid, {
        amount: tx.amount, category: tx.category, description: tx.description, type: tx.type,
      })
      count++
    }
    showResult.value = false
    showSuccess.value = true
    successCount.value = count
    input.value = ''
    parsedResults.value = []
    setTimeout(() => { showSuccess.value = false }, 3000)
  } catch (e) {
    console.error('Failed to save:', e)
  }
}

function removeResult(index: number) {
  parsedResults.value.splice(index, 1)
  if (parsedResults.value.length === 0) showResult.value = false
}

function cancelResult() {
  showResult.value = false
  parsedResults.value = []
}

function getCategoryInfo(category: TransactionCategory) {
  return CATEGORIES[category] || CATEGORIES.other
}
</script>

<template>
  <div class="relative">
    <div class="relative group">
      <div class="absolute -inset-0.5 bg-gradient-to-r from-primary via-chart-3 to-chart-5 rounded-2xl opacity-30 group-hover:opacity-50 blur transition-opacity duration-300"></div>

      <div class="relative bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-lg">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl">✨</span>
          <h3 class="text-sm font-semibold text-card-foreground">Magic Bar</h3>
          <span class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">AI Powered</span>
        </div>

        <form @submit.prevent="handleSubmit" class="flex gap-2">
          <div class="relative flex-1">
            <input
              id="magic-bar-input"
              v-model="input"
              type="text"
              :placeholder="placeholderText"
              :disabled="parsing"
              class="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-muted border border-input text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-sm disabled:opacity-50"
              autocomplete="off"
            />
            <div v-if="parsing" class="absolute right-3 top-1/2 -translate-y-1/2">
              <svg class="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          </div>
          <button
            type="submit"
            :disabled="!input.trim() || parsing"
            class="px-5 py-3 sm:py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
          >
            Add
          </button>
        </form>

        <!-- Parsed Results -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="showResult && parsedResults.length > 0" class="mt-4 space-y-3">
            <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AI Parsed — {{ parsedResults.length }} transaction{{ parsedResults.length > 1 ? 's' : '' }} found
            </span>

            <div
              v-for="(tx, index) in parsedResults"
              :key="index"
              class="p-4 rounded-xl bg-muted border border-border animate-slide-up"
              :style="{ animationDelay: `${index * 80}ms` }"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{{ getCategoryInfo(tx.category).icon }}</span>
                  <span class="text-sm font-medium text-card-foreground">{{ getCategoryInfo(tx.category).label }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', tx.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense']">
                    {{ tx.type === 'income' ? '↗ Income' : '↘ Expense' }}
                  </span>
                  <button @click="removeResult(index)" class="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title="Remove">✕</button>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <p class="text-sm text-muted-foreground truncate mr-3">{{ tx.description }}</p>
                <p :class="['text-lg font-bold flex-shrink-0', tx.type === 'income' ? 'text-income' : 'text-expense']">
                  {{ formatCurrency(tx.amount) }}
                </p>
              </div>
            </div>

            <div class="flex gap-2">
              <button @click="confirmAll" class="flex-1 py-2.5 rounded-xl bg-income text-white font-semibold hover:opacity-90 transition-all text-sm">
                ✓ Save {{ parsedResults.length > 1 ? `All ${parsedResults.length}` : '' }}
              </button>
              <button @click="cancelResult" class="px-4 py-2.5 rounded-xl bg-muted border border-border text-muted-foreground font-medium hover:bg-accent transition-all text-sm">
                Cancel
              </button>
            </div>
          </div>
        </Transition>

        <!-- Success Toast -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 translate-y-2"
        >
          <div v-if="showSuccess" class="mt-4 p-3 rounded-xl bg-income/10 border border-income/20 flex items-center gap-2">
            <span class="text-lg">✅</span>
            <span class="text-sm font-medium text-income">
              {{ successCount }} transaction{{ successCount > 1 ? 's' : '' }} saved successfully!
            </span>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
