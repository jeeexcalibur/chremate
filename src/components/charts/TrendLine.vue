<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { useTransactionStore } from '@/stores/transactions'
import { getDayLabel, formatCurrency } from '@/lib/utils'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const transactionStore = useTransactionStore()

const chartData = computed<ChartData<'line'>>(() => {
  const data = transactionStore.last7DaysSpending

  return {
    labels: data.map((d) => getDayLabel(d.date)),
    datasets: [{
      label: 'Spending',
      data: data.map((d) => d.total),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderWidth: 3,
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: true,
      tension: 0.4,
    }],
  }
})

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: 'Inter', size: 11 },
        color: '#94a3b8',
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(148, 163, 184, 0.1)',
      },
      ticks: {
        font: { family: 'Inter', size: 11 },
        color: '#94a3b8',
        callback: (value) => {
          const num = Number(value)
          if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`
          if (num >= 1000) return `${(num / 1000).toFixed(0)}k`
          return num.toString()
        },
      },
    },
  },
  plugins: {
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { family: 'Inter', size: 12 },
      bodyFont: { family: 'Inter', size: 11 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${formatCurrency(Number(ctx.parsed.y))}`,
      },
    },
    legend: {
      display: false,
    },
  },
}

const totalWeekSpending = computed(() =>
  transactionStore.last7DaysSpending.reduce((sum, d) => sum + d.total, 0)
)

const avgDailySpending = computed(() =>
  totalWeekSpending.value / 7
)
</script>

<template>
  <div class="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm shine">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-card-foreground uppercase tracking-wider">7-Day Trend</h3>
      <div class="flex items-center gap-3">
        <div class="text-right">
          <p class="text-xs text-muted-foreground">Avg/day</p>
          <p class="text-sm font-semibold text-card-foreground">{{ formatCurrency(avgDailySpending) }}</p>
        </div>
      </div>
    </div>

    <div class="h-48 sm:h-56">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
