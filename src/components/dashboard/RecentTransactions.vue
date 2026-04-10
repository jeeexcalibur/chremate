<script setup lang="ts">
import { computed } from 'vue'
import { useTransactionStore } from '@/stores/transactions'
import { CATEGORIES, type TransactionCategory } from '@/types'
import { formatCurrency, formatRelativeDate, formatTime } from '@/lib/utils'

const transactionStore = useTransactionStore()

const recentItems = computed(() => transactionStore.recentTransactions)

function getCategoryInfo(category: TransactionCategory) {
  return CATEGORIES[category] || CATEGORIES.other
}
</script>

<template>
  <div class="bg-card rounded-2xl border border-border shadow-sm shine overflow-hidden">
    <div class="p-5 sm:p-6 border-b border-border">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-card-foreground uppercase tracking-wider">Recent Transactions</h3>
        <router-link
          to="/transactions"
          class="text-xs font-medium text-primary hover:underline"
        >
          View All →
        </router-link>
      </div>
    </div>

    <div v-if="recentItems.length === 0" class="p-8 text-center">
      <span class="text-4xl block mb-3">📝</span>
      <p class="text-muted-foreground text-sm">No transactions yet</p>
      <p class="text-muted-foreground text-xs mt-1">Use the Magic Bar above to add your first entry!</p>
    </div>

    <div v-else class="divide-y divide-border">
      <div
        v-for="(tx, index) in recentItems"
        :key="tx.id"
        class="flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-muted/50 transition-colors"
        :style="{ animationDelay: `${index * 50}ms` }"
      >
        <!-- Category Icon -->
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          :style="{ backgroundColor: getCategoryInfo(tx.category).bgColor }"
        >
          {{ getCategoryInfo(tx.category).icon }}
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-card-foreground truncate">{{ tx.description }}</p>
          <p class="text-xs text-muted-foreground">
            {{ getCategoryInfo(tx.category).label }} · {{ formatRelativeDate(tx.timestamp) }}
          </p>
        </div>

        <!-- Amount -->
        <div class="text-right flex-shrink-0">
          <p
            :class="[
              'text-sm font-semibold',
              tx.type === 'income' ? 'text-income' : 'text-expense',
            ]"
          >
            {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
          </p>
          <p class="text-xs text-muted-foreground">{{ formatTime(tx.timestamp) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
