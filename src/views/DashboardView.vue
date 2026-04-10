<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import AppLayout from '@/components/layout/AppLayout.vue'
import MagicBar from '@/components/magic-bar/MagicBar.vue'
import BalanceCards from '@/components/dashboard/BalanceCards.vue'
import RecentTransactions from '@/components/dashboard/RecentTransactions.vue'
import SpendingPie from '@/components/charts/SpendingPie.vue'
import TrendLine from '@/components/charts/TrendLine.vue'

const authStore = useAuthStore()
const transactionStore = useTransactionStore()
</script>

<template>
  <AppLayout>
    <div class="space-y-6 pb-20 md:pb-6">
      <!-- Greeting -->
      <div class="animate-fade-in">
        <h1 class="text-2xl sm:text-3xl font-bold text-foreground">
          Hello, {{ authStore.user?.displayName?.split(' ')[0] || 'there' }} 👋
        </h1>
        <p class="text-muted-foreground mt-1">Here's your financial overview for today</p>
      </div>

      <!-- Magic Bar -->
      <div class="animate-slide-up" style="animation-delay: 100ms">
        <MagicBar />
      </div>

      <!-- Balance Cards -->
      <div class="animate-slide-up" style="animation-delay: 200ms">
        <BalanceCards />
      </div>

      <!-- Charts & Recent -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style="animation-delay: 300ms">
        <div class="lg:col-span-2 space-y-6">
          <TrendLine />
          <RecentTransactions />
        </div>
        <div>
          <SpendingPie />
        </div>
      </div>
    </div>
  </AppLayout>
</template>
