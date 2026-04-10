<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import AppLayout from '@/components/layout/AppLayout.vue'
import SpendingPie from '@/components/charts/SpendingPie.vue'
import TrendLine from '@/components/charts/TrendLine.vue'
import { formatCurrency } from '@/lib/utils'
import { CATEGORIES, type TransactionCategory } from '@/types'

const authStore = useAuthStore()
const transactionStore = useTransactionStore()

function getCategoryInfo(category: TransactionCategory) {
  return CATEGORIES[category] || CATEGORIES.other
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6 pb-20 md:pb-6">
      <!-- Header -->
      <div class="animate-fade-in">
        <h1 class="text-2xl sm:text-3xl font-bold text-foreground">Insights</h1>
        <p class="text-muted-foreground mt-1">Understand your spending patterns</p>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up">
        <div class="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <p class="text-xs text-muted-foreground mb-1">Avg/Day (7d)</p>
          <p class="text-lg font-bold text-card-foreground">
            {{ formatCurrency(transactionStore.last7DaysSpending.reduce((s, d) => s + d.total, 0) / 7) }}
          </p>
        </div>
        <div class="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <p class="text-xs text-muted-foreground mb-1">Total Txns</p>
          <p class="text-lg font-bold text-card-foreground">
            {{ transactionStore.transactions.length }}
          </p>
        </div>
        <div class="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <p class="text-xs text-muted-foreground mb-1">Biggest Expense</p>
          <p class="text-lg font-bold text-expense">
            {{
              transactionStore.transactions.filter((t) => t.type === 'expense').length > 0
                ? formatCurrency(Math.max(...transactionStore.transactions.filter((t) => t.type === 'expense').map((t) => t.amount)))
                : formatCurrency(0)
            }}
          </p>
        </div>
        <div class="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <p class="text-xs text-muted-foreground mb-1">Categories</p>
          <p class="text-lg font-bold text-card-foreground">
            {{ Object.keys(transactionStore.categoryBreakdown).length }}
          </p>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style="animation-delay: 100ms">
        <TrendLine />
        <SpendingPie />
      </div>

      <!-- Category Breakdown Table -->
      <div class="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-slide-up" style="animation-delay: 200ms">
        <div class="p-5 sm:p-6 border-b border-border">
          <h3 class="text-sm font-semibold text-card-foreground uppercase tracking-wider">Category Details</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Category</th>
                <th class="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Amount</th>
                <th class="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Share</th>
                <th class="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Bar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="[category, amount] in Object.entries(transactionStore.categoryBreakdown).sort(([,a], [,b]) => b - a)"
                :key="category"
                class="hover:bg-muted/50 transition-colors"
              >
                <td class="px-5 py-3">
                  <div class="flex items-center gap-2">
                    <span>{{ getCategoryInfo(category as TransactionCategory).icon }}</span>
                    <span class="text-sm font-medium text-card-foreground">
                      {{ getCategoryInfo(category as TransactionCategory).label }}
                    </span>
                  </div>
                </td>
                <td class="text-right px-5 py-3 text-sm font-semibold text-card-foreground">
                  {{ formatCurrency(amount) }}
                </td>
                <td class="text-right px-5 py-3 text-sm text-muted-foreground">
                  {{ transactionStore.monthlyExpenses > 0 ? ((amount / transactionStore.monthlyExpenses) * 100).toFixed(1) : 0 }}%
                </td>
                <td class="px-5 py-3 hidden sm:table-cell">
                  <div class="w-full bg-muted rounded-full h-2">
                    <div
                      class="h-2 rounded-full transition-all duration-500"
                      :style="{
                        width: `${transactionStore.monthlyExpenses > 0 ? (amount / transactionStore.monthlyExpenses) * 100 : 0}%`,
                        backgroundColor: getCategoryInfo(category as TransactionCategory).color,
                      }"
                    ></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="Object.keys(transactionStore.categoryBreakdown).length === 0" class="p-8 text-center">
          <p class="text-muted-foreground text-sm">No expense data yet</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
