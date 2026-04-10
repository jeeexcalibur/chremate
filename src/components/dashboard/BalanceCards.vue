<script setup lang="ts">
import { computed } from 'vue'
import { useTransactionStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency } from '@/lib/utils'

const transactionStore = useTransactionStore()
const authStore = useAuthStore()

const cards = computed(() => [
  {
    title: 'Total Balance',
    amount: transactionStore.totalBalance,
    icon: '💎',
    gradient: 'from-indigo-500 to-purple-600',
    textColor: transactionStore.totalBalance >= 0 ? 'text-income' : 'text-expense',
    bgGlow: '#6366f1',
  },
  {
    title: 'Monthly Income',
    amount: transactionStore.monthlyIncome,
    icon: '📥',
    gradient: 'from-emerald-500 to-teal-600',
    textColor: 'text-income',
    bgGlow: '#10b981',
  },
  {
    title: 'Monthly Expenses',
    amount: transactionStore.monthlyExpenses,
    icon: '📤',
    gradient: 'from-rose-500 to-pink-600',
    textColor: 'text-expense',
    bgGlow: '#ef4444',
  },
])

const budgetUsed = computed(() => {
  const budget = authStore.user?.monthlyBudget || 5000000
  const percentage = Math.min((transactionStore.monthlyExpenses / budget) * 100, 100)
  return {
    percentage,
    remaining: budget - transactionStore.monthlyExpenses,
    budget,
  }
})

const budgetStatus = computed(() => {
  const pct = budgetUsed.value.percentage
  if (pct >= 90) return { label: 'Critical', color: 'bg-expense', textColor: 'text-expense' }
  if (pct >= 70) return { label: 'Warning', color: 'bg-warning', textColor: 'text-warning' }
  return { label: 'Healthy', color: 'bg-income', textColor: 'text-income' }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Balance Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        v-for="(card, i) in cards"
        :key="card.title"
        class="relative group bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden shine"
        :style="{ animationDelay: `${i * 100}ms` }"
      >
        <!-- Subtle glow -->
        <div
          class="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 blur-2xl transition-opacity duration-500"
          :style="{ background: card.bgGlow }"
        ></div>

        <div class="relative">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ card.title }}</span>
            <span class="text-xl">{{ card.icon }}</span>
          </div>
          <p :class="['text-2xl sm:text-3xl font-bold', card.textColor]">
            {{ formatCurrency(card.amount) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Today's Spending & Budget Progress -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Today Spending Pulse -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm shine">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today's Spending</span>
          <span class="text-xl animate-pulse-soft">🔥</span>
        </div>
        <p class="text-2xl sm:text-3xl font-bold text-expense">
          {{ formatCurrency(transactionStore.todaySpending) }}
        </p>
        <p class="text-xs text-muted-foreground mt-1">
          {{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}
        </p>
      </div>

      <!-- Budget Progress -->
      <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm shine">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monthly Budget</span>
          <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', budgetStatus.textColor, budgetStatus.color + '/10']">
            {{ budgetStatus.label }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="relative w-full h-3 bg-muted rounded-full overflow-hidden mb-3">
          <div
            :class="['h-full rounded-full transition-all duration-1000 ease-out', budgetStatus.color]"
            :style="{ width: `${budgetUsed.percentage}%` }"
          ></div>
        </div>

        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-card-foreground">
            {{ formatCurrency(budgetUsed.remaining) }}
            <span class="text-xs text-muted-foreground font-normal ml-1">remaining</span>
          </p>
          <p class="text-sm text-muted-foreground">
            {{ budgetUsed.percentage.toFixed(0) }}%
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
