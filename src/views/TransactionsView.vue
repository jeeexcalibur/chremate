<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from '@/types'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import AppLayout from '@/components/layout/AppLayout.vue'

const authStore = useAuthStore()
const transactionStore = useTransactionStore()

// Editing state
const editingId = ref<string | null>(null)
const editForm = ref({
  amount: 0,
  category: 'other' as TransactionCategory,
  description: '',
  type: 'expense' as 'income' | 'expense',
})

// Delete confirmation
const deletingId = ref<string | null>(null)

const allCategories = computed(() => {
  if (transactionStore.typeFilter === 'income') return INCOME_CATEGORIES
  if (transactionStore.typeFilter === 'expense') return EXPENSE_CATEGORIES
  return [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])]
})

function startEdit(tx: any) {
  editingId.value = tx.id
  editForm.value = {
    amount: tx.amount,
    category: tx.category,
    description: tx.description,
    type: tx.type,
  }
}

async function saveEdit() {
  if (!editingId.value) return
  try {
    await transactionStore.updateTransaction(editingId.value, editForm.value)
    editingId.value = null
  } catch (e) {
    console.error('Failed to update:', e)
  }
}

function cancelEdit() {
  editingId.value = null
}

async function confirmDelete(id: string) {
  try {
    await transactionStore.deleteTransaction(id)
    deletingId.value = null
  } catch (e) {
    console.error('Failed to delete:', e)
  }
}

function getCategoryInfo(category: TransactionCategory) {
  return CATEGORIES[category] || CATEGORIES.other
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6 pb-20 md:pb-6">
      <!-- Header -->
      <div class="animate-fade-in">
        <h1 class="text-2xl sm:text-3xl font-bold text-foreground">Transactions</h1>
        <p class="text-muted-foreground mt-1">Manage and review all your entries</p>
      </div>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-3 animate-slide-up">
        <!-- Search -->
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
          <input
            id="transaction-search"
            v-model="transactionStore.searchQuery"
            type="text"
            placeholder="Search transactions..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-input text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm"
          />
        </div>

        <!-- Type Filter -->
        <div class="flex gap-2">
          <button
            v-for="type in ['all', 'income', 'expense'] as const"
            :key="type"
            @click="transactionStore.typeFilter = type"
            :class="[
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize',
              transactionStore.typeFilter === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-input text-muted-foreground hover:bg-muted',
            ]"
          >
            {{ type }}
          </button>
        </div>

        <!-- Category Filter -->
        <select
          v-model="transactionStore.categoryFilter"
          class="px-4 py-2.5 rounded-xl bg-card border border-input text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Categories</option>
          <option v-for="cat in allCategories" :key="cat" :value="cat">
            {{ getCategoryInfo(cat).icon }} {{ getCategoryInfo(cat).label }}
          </option>
        </select>
      </div>

      <!-- Transaction List -->
      <div v-if="transactionStore.loading" class="text-center py-12">
        <svg class="animate-spin h-8 w-8 text-primary mx-auto" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p class="text-muted-foreground mt-3">Loading transactions...</p>
      </div>

      <div v-else-if="transactionStore.filteredTransactions.length === 0" class="text-center py-12">
        <span class="text-5xl block mb-4">📭</span>
        <p class="text-foreground font-medium">No transactions found</p>
        <p class="text-muted-foreground text-sm mt-1">Try adjusting your filters or add a new transaction</p>
      </div>

      <div v-else class="space-y-2 animate-slide-up">
        <div
          v-for="tx in transactionStore.filteredTransactions"
          :key="tx.id"
          class="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all"
        >
          <!-- View Mode -->
          <div v-if="editingId !== tx.id" class="flex items-center gap-3">
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              :style="{ backgroundColor: getCategoryInfo(tx.category).bgColor }"
            >
              {{ getCategoryInfo(tx.category).icon }}
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-card-foreground truncate">{{ tx.description }}</p>
              <p class="text-xs text-muted-foreground">
                {{ getCategoryInfo(tx.category).label }} · {{ formatDate(tx.timestamp) }} · {{ formatTime(tx.timestamp) }}
              </p>
            </div>

            <div class="text-right flex-shrink-0">
              <p
                :class="[
                  'text-sm font-bold',
                  tx.type === 'income' ? 'text-income' : 'text-expense',
                ]"
              >
                {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                @click="startEdit(tx)"
                class="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                title="Edit"
              >
                ✏️
              </button>
              <button
                @click="deletingId = tx.id"
                class="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-primary uppercase tracking-wider">Editing Transaction</span>
              <div class="flex gap-2">
                <button
                  v-for="t in ['income', 'expense'] as const"
                  :key="t"
                  @click="editForm.type = t"
                  :class="[
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize',
                    editForm.type === t
                      ? t === 'income' ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
                      : 'bg-muted text-muted-foreground',
                  ]"
                >
                  {{ t }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                v-model="editForm.description"
                type="text"
                placeholder="Description"
                class="px-3 py-2 rounded-xl bg-muted border border-input text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                v-model.number="editForm.amount"
                type="number"
                placeholder="Amount"
                class="px-3 py-2 rounded-xl bg-muted border border-input text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                v-model="editForm.category"
                class="px-3 py-2 rounded-xl bg-muted border border-input text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option v-for="cat in (editForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)" :key="cat" :value="cat">
                  {{ getCategoryInfo(cat).icon }} {{ getCategoryInfo(cat).label }}
                </option>
              </select>
            </div>

            <div class="flex gap-2">
              <button
                @click="saveEdit"
                class="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all"
              >
                Save Changes
              </button>
              <button
                @click="cancelEdit"
                class="px-4 py-2 rounded-xl bg-muted border border-input text-muted-foreground font-medium text-sm hover:bg-accent transition-all"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Delete Confirmation -->
          <div
            v-if="deletingId === tx.id"
            class="mt-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center justify-between"
          >
            <p class="text-sm text-destructive">Delete this transaction?</p>
            <div class="flex gap-2">
              <button
                @click="confirmDelete(tx.id)"
                class="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-all"
              >
                Delete
              </button>
              <button
                @click="deletingId = null"
                class="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-accent transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
