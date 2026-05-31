<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMonthlyReport } from '@/composables/useMonthlyReport'
import { useTransactionStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/utils'

const { generating, reportError, generateReport, collectReportData } = useMonthlyReport()
const transactionStore = useTransactionStore()
const authStore = useAuthStore()

const monthLabel = computed(() => getMonthLabel(getCurrentMonthKey()))
const hasData = computed(() => transactionStore.transactions.length > 0)

const savingsRate = computed(() => {
  const income = transactionStore.monthlyIncome
  const expenses = transactionStore.monthlyExpenses
  if (income <= 0) return 0
  return ((income - expenses) / income) * 100
})

const lastGenerated = ref<string | null>(null)

async function handleGenerate() {
  try {
    const filename = await generateReport()
    lastGenerated.value = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    // error is handled in the composable
  }
}
</script>

<template>
  <div class="report-card">
    <!-- Gradient border effect -->
    <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 -z-10 blur-sm"></div>

    <div class="relative bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm overflow-hidden">
      <!-- Decorative background -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>

      <!-- Header -->
      <div class="flex items-start justify-between mb-5 relative">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <div class="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <span class="text-base">📄</span>
            </div>
            <h3 class="text-sm font-bold text-card-foreground uppercase tracking-wider">Monthly Report</h3>
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ monthLabel }} — AI-Powered Financial Analysis</p>
        </div>

        <!-- Last generated badge -->
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-90"
          enter-to-class="opacity-100 scale-100"
        >
          <div v-if="lastGenerated" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-income/10 border border-income/20">
            <span class="w-1.5 h-1.5 rounded-full bg-income"></span>
            <span class="text-[10px] font-semibold text-income">Downloaded {{ lastGenerated }}</span>
          </div>
        </Transition>
      </div>

      <!-- Quick Preview Stats -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="p-3 rounded-xl bg-muted/30 border border-border/40">
          <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Income</p>
          <p class="text-sm font-bold text-income">{{ formatCurrency(transactionStore.monthlyIncome) }}</p>
        </div>
        <div class="p-3 rounded-xl bg-muted/30 border border-border/40">
          <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Expenses</p>
          <p class="text-sm font-bold text-expense">{{ formatCurrency(transactionStore.monthlyExpenses) }}</p>
        </div>
        <div class="p-3 rounded-xl bg-muted/30 border border-border/40">
          <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Savings</p>
          <p :class="['text-sm font-bold', savingsRate >= 0 ? 'text-income' : 'text-expense']">
            {{ savingsRate.toFixed(1) }}%
          </p>
        </div>
      </div>

      <!-- What's included -->
      <div class="mb-5 p-3 rounded-xl bg-muted/20 border border-border/30">
        <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Report Includes</p>
        <div class="grid grid-cols-2 gap-1.5">
          <div v-for="item in [
            { icon: '📊', label: 'Financial Summary' },
            { icon: '📋', label: 'Category Breakdown' },
            { icon: '📈', label: 'Daily Spending Trend' },
            { icon: '🤖', label: 'AI Recommendations' },
          ]" :key="item.label" class="flex items-center gap-2 text-xs text-muted-foreground">
            <span class="text-sm">{{ item.icon }}</span>
            <span class="font-medium">{{ item.label }}</span>
          </div>
        </div>
      </div>

      <!-- Generate Button -->
      <button
        @click="handleGenerate"
        :disabled="generating || !hasData"
        :class="[
          'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]',
          generating
            ? 'bg-indigo-500/20 text-indigo-400 cursor-wait'
            : hasData
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:brightness-110'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
        ]"
      >
        <!-- Loading spinner -->
        <svg v-if="generating" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-else-if="hasData" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>
          {{ generating ? 'Generating Report...' : hasData ? 'Generate PDF Report' : 'No Data Available' }}
        </span>
      </button>

      <!-- Error message -->
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="reportError" class="mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <span>❌</span>
          {{ reportError }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.report-card {
  position: relative;
}
</style>
