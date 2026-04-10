<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartData, type ChartOptions } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { useTransactionStore } from '@/stores/transactions'
import { CATEGORIES, type TransactionCategory } from '@/types'
import { formatCurrency } from '@/lib/utils'

ChartJS.register(ArcElement, Tooltip, Legend)

const transactionStore = useTransactionStore()

const chartData = computed<ChartData<'doughnut'>>(() => {
  const breakdown = transactionStore.categoryBreakdown
  const categories = Object.keys(breakdown) as TransactionCategory[]

  if (categories.length === 0) {
    return {
      labels: ['No data'],
      datasets: [{
        data: [1],
        backgroundColor: ['#e2e8f0'],
        borderWidth: 0,
      }],
    }
  }

  return {
    labels: categories.map((c) => CATEGORIES[c]?.label || c),
    datasets: [{
      data: categories.map((c) => breakdown[c]!),
      backgroundColor: categories.map((c) => CATEGORIES[c]?.color || '#64748b'),
      borderWidth: 0,
      hoverOffset: 8,
    }],
  }
})

const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { family: 'Inter', size: 12 },
      bodyFont: { family: 'Inter', size: 11 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${formatCurrency(Number(ctx.parsed))}`,
      },
    },
  },
}

const topCategories = computed(() => {
  const breakdown = transactionStore.categoryBreakdown
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  return Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({
      category: category as TransactionCategory,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      ...CATEGORIES[category as TransactionCategory],
    }))
})
</script>

<template>
  <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm shine">
    <h3 class="text-sm font-semibold text-card-foreground uppercase tracking-wider mb-4">Spending Breakdown</h3>

    <div class="flex flex-col items-center">
      <!-- Chart -->
      <div class="w-48 h-48 sm:w-56 sm:h-56 relative mb-4">
        <Doughnut :data="chartData" :options="chartOptions" />
        <!-- Center label -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <p class="text-xs text-muted-foreground">Total</p>
            <p class="text-base font-bold text-card-foreground">
              {{ formatCurrency(transactionStore.monthlyExpenses) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="w-full space-y-2">
        <div
          v-for="cat in topCategories"
          :key="cat.category"
          class="flex items-center gap-3"
        >
          <div
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: cat.color }"
          ></div>
          <span class="text-sm text-card-foreground flex-1">{{ cat.label }}</span>
          <span class="text-sm font-medium text-card-foreground">{{ cat.percentage.toFixed(0) }}%</span>
        </div>

        <div v-if="topCategories.length === 0" class="text-center py-4">
          <p class="text-sm text-muted-foreground">Add expenses to see breakdown</p>
        </div>
      </div>
    </div>
  </div>
</template>
