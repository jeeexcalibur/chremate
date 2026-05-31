import { computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import { getLastMonthKey, getCurrentMonthKey, getMonthLabel } from '@/lib/utils'

/**
 * Composable for over-budget carry-over detection and enforcement.
 *
 * On each new month, checks if the previous month went over budget.
 * If so, writes a penalty to the user profile that reduces the current
 * month's effective budget. The penalty expires after one month automatically.
 */
export function useBudgetPenalty() {
  const authStore = useAuthStore()
  const transactionStore = useTransactionStore()

  const penalty = computed(() => authStore.user?.budgetPenalty ?? null)
  const hasPenalty = computed(() => !!penalty.value && penalty.value.amount > 0)
  const penaltyAmount = computed(() => penalty.value?.amount ?? 0)
  const penaltyMonth = computed(() => penalty.value?.fromMonth ?? '')
  const penaltyMonthLabel = computed(() =>
    penaltyMonth.value ? getMonthLabel(penaltyMonth.value) : ''
  )
  const isAcknowledged = computed(() => penalty.value?.acknowledged ?? false)

  const effectiveBudget = computed(() => {
    const base = authStore.user?.monthlyBudget ?? 5000000
    if (!hasPenalty.value) return base
    return Math.max(base - penaltyAmount.value, 0)
  })

  const budgetRemaining = computed(() => {
    return effectiveBudget.value - transactionStore.monthlyBudgetSpending
  })

  /**
   * Run penalty detection. Should be called once after auth + transactions are ready.
   * - Checks if last month was over budget → creates penalty
   * - Checks if existing penalty is stale (2+ months old) → clears it
   */
  async function detectAndApplyPenalty() {
    if (!authStore.user) return

    const currentMonth = getCurrentMonthKey()
    const lastMonth = getLastMonthKey()
    const existing = authStore.user.budgetPenalty

    // If there's an existing penalty from 2+ months ago, clear it (only lasts 1 month)
    if (existing && existing.fromMonth !== lastMonth) {
      await authStore.clearPenalty()
      return
    }

    // If penalty already exists for last month, don't recalculate
    if (existing && existing.fromMonth === lastMonth) {
      return
    }

    // Calculate if last month went over budget
    const lastMonthSpending = transactionStore.lastMonthBudgetSpending
    const budget = authStore.user.monthlyBudget || 5000000

    if (lastMonthSpending > budget) {
      const overAmount = lastMonthSpending - budget
      await authStore.updateBudgetPenalty({
        amount: overAmount,
        fromMonth: lastMonth,
        acknowledged: false,
      })
    }
  }

  async function acknowledge() {
    await authStore.acknowledgePenalty()
  }

  /**
   * Initialize penalty detection when data is ready.
   * Watches for auth + transactions to be loaded before running detection.
   */
  function init() {
    watch(
      [() => authStore.user, () => transactionStore.loading],
      ([user, loading]) => {
        if (user && !loading && transactionStore.transactions.length >= 0) {
          // Small delay to ensure all data is settled
          setTimeout(() => detectAndApplyPenalty(), 500)
        }
      },
      { immediate: true }
    )
  }

  return {
    penalty,
    hasPenalty,
    penaltyAmount,
    penaltyMonth,
    penaltyMonthLabel,
    isAcknowledged,
    effectiveBudget,
    budgetRemaining,
    acknowledge,
    init,
  }
}
