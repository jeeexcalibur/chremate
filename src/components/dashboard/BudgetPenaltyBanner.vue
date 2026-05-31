<script setup lang="ts">
import { useBudgetPenalty } from '@/composables/useBudgetPenalty'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const {
  hasPenalty,
  penaltyAmount,
  penaltyMonthLabel,
  isAcknowledged,
  effectiveBudget,
  acknowledge,
} = useBudgetPenalty()

const originalBudget = computed(() => authStore.user?.monthlyBudget ?? 5000000)

import { computed } from 'vue'
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    enter-from-class="opacity-0 -translate-y-4 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 -translate-y-4 scale-95"
  >
    <div
      v-if="hasPenalty && !isAcknowledged"
      class="penalty-banner"
    >
      <!-- Animated glow background -->
      <div class="absolute inset-0 overflow-hidden rounded-2xl">
        <div class="absolute -top-1/2 -left-1/4 w-3/4 h-full bg-gradient-to-br from-amber-500/20 to-red-500/10 rounded-full blur-3xl animate-slow-pulse"></div>
        <div class="absolute -bottom-1/2 -right-1/4 w-1/2 h-full bg-gradient-to-tl from-red-500/15 to-orange-400/10 rounded-full blur-3xl animate-slow-pulse" style="animation-delay: 1s"></div>
      </div>

      <div class="relative z-10">
        <!-- Header -->
        <div class="flex items-start gap-3 mb-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <span class="text-xl animate-bounce-gentle">⚠️</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-bold text-amber-200">Over-Budget Alert</h3>
            <p class="text-xs text-amber-300/70 mt-0.5">Budget carry-over from {{ penaltyMonthLabel }}</p>
          </div>
          <button
            @click="acknowledge"
            class="flex-shrink-0 p-1.5 rounded-lg text-amber-400/60 hover:text-amber-200 hover:bg-amber-500/20 transition-all"
            title="Dismiss notification"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Message -->
        <div class="pl-[52px]">
          <p class="text-sm text-amber-100/90 leading-relaxed">
            You went over budget by
            <span class="font-bold text-red-300">{{ formatCurrency(penaltyAmount) }}</span>
            in {{ penaltyMonthLabel }}. Your monthly budget has been reduced this month.
          </p>

          <!-- Budget breakdown -->
          <div class="mt-3 flex items-center gap-2 flex-wrap">
            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span class="text-[10px] text-amber-300/60 uppercase tracking-wider font-semibold">Original</span>
              <span class="text-xs font-bold text-amber-200/80 line-through">{{ formatCurrency(originalBudget) }}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="text-amber-400/40 flex-shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <span class="text-[10px] text-red-300/70 uppercase tracking-wider font-semibold">Adjusted</span>
              <span class="text-xs font-bold text-red-300">{{ formatCurrency(effectiveBudget) }}</span>
            </div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15">
              <span class="text-xs font-semibold text-red-400">−{{ formatCurrency(penaltyAmount) }}</span>
            </div>
          </div>

          <!-- Acknowledge button -->
          <button
            @click="acknowledge"
            class="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 hover:border-amber-500/50 text-amber-200 text-xs font-semibold transition-all active:scale-95"
          >
            I Understand — Keep Budget Adjusted
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.penalty-banner {
  position: relative;
  padding: 1.25rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.08));
  border: 1px solid rgba(245, 158, 11, 0.25);
  backdrop-filter: blur(12px);
  overflow: hidden;
}

@keyframes slow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

@keyframes bounce-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.animate-slow-pulse {
  animation: slow-pulse 4s ease-in-out infinite;
}

.animate-bounce-gentle {
  animation: bounce-gentle 2s ease-in-out infinite;
}
</style>
