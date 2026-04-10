import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Transaction, TransactionCategory } from '@/types'
import { isToday, isThisMonth, getLast7Days } from '@/lib/utils'

export const useTransactionStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const searchQuery = ref('')
  const categoryFilter = ref<TransactionCategory | 'all'>('all')
  const typeFilter = ref<'all' | 'income' | 'expense'>('all')
  let unsubscribe: Unsubscribe | null = null

  // Computed
  const filteredTransactions = computed(() => {
    let result = [...transactions.value]

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
    }

    if (categoryFilter.value !== 'all') {
      result = result.filter((t) => t.category === categoryFilter.value)
    }

    if (typeFilter.value !== 'all') {
      result = result.filter((t) => t.type === typeFilter.value)
    }

    return result
  })

  const monthlyIncome = computed(() =>
    transactions.value
      .filter((t) => t.type === 'income' && isThisMonth(t.timestamp))
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const monthlyExpenses = computed(() =>
    transactions.value
      .filter((t) => t.type === 'expense' && isThisMonth(t.timestamp))
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const totalBalance = computed(() => monthlyIncome.value - monthlyExpenses.value)

  const todaySpending = computed(() =>
    transactions.value
      .filter((t) => t.type === 'expense' && isToday(t.timestamp))
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const categoryBreakdown = computed(() => {
    const breakdown: Record<string, number> = {}
    transactions.value
      .filter((t) => t.type === 'expense' && isThisMonth(t.timestamp))
      .forEach((t) => {
        breakdown[t.category] = (breakdown[t.category] || 0) + t.amount
      })
    return breakdown
  })

  const last7DaysSpending = computed(() => {
    const days = getLast7Days()
    return days.map((day) => {
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      const total = transactions.value
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.timestamp >= day &&
            t.timestamp <= dayEnd
        )
        .reduce((sum, t) => sum + t.amount, 0)

      return { date: day, total }
    })
  })

  const recentTransactions = computed(() =>
    [...transactions.value].slice(0, 10)
  )

  // Actions
  function subscribeToTransactions(userId: string) {
    if (!db) {
      loading.value = false
      return
    }
    loading.value = true
    if (unsubscribe) unsubscribe()

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    )

    unsubscribe = onSnapshot(q, (snapshot) => {
      transactions.value = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          userId: data.userId,
          amount: data.amount,
          category: data.category,
          description: data.description,
          timestamp: data.timestamp instanceof Timestamp
            ? data.timestamp.toDate()
            : new Date(data.timestamp),
          type: data.type,
        } as Transaction
      })
      loading.value = false
    }, (error) => {
      console.error('Error subscribing to transactions:', error)
      // Fallback: try simpler query without orderBy (index might not be ready)
      console.warn('Falling back to simpler query without orderBy...')
      const fallbackQ = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      )
      unsubscribe = onSnapshot(fallbackQ, (snapshot) => {
        transactions.value = snapshot.docs
          .map((d) => {
            const data = d.data()
            return {
              id: d.id,
              userId: data.userId,
              amount: data.amount,
              category: data.category,
              description: data.description,
              timestamp: data.timestamp instanceof Timestamp
                ? data.timestamp.toDate()
                : new Date(data.timestamp),
              type: data.type,
            } as Transaction
          })
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        loading.value = false
      }, (fallbackError) => {
        console.error('Fallback query also failed:', fallbackError)
        transactions.value = []
        loading.value = false
      })
    })
  }

  async function addTransaction(
    userId: string,
    transaction: Omit<Transaction, 'id' | 'userId' | 'timestamp'>
  ) {
    await addDoc(collection(db, 'transactions'), {
      ...transaction,
      userId,
      timestamp: Timestamp.fromDate(new Date()),
    })
  }

  async function updateTransaction(id: string, data: Partial<Transaction>) {
    const updateData: any = { ...data }
    if (data.timestamp) {
      updateData.timestamp = Timestamp.fromDate(data.timestamp)
    }
    delete updateData.id
    await updateDoc(doc(db, 'transactions', id), updateData)
  }

  async function deleteTransaction(id: string) {
    await deleteDoc(doc(db, 'transactions', id))
  }

  function cleanup() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    transactions.value = []
  }

  return {
    transactions,
    loading,
    searchQuery,
    categoryFilter,
    typeFilter,
    filteredTransactions,
    monthlyIncome,
    monthlyExpenses,
    totalBalance,
    todaySpending,
    categoryBreakdown,
    last7DaysSpending,
    recentTransactions,
    subscribeToTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    cleanup,
  }
})
