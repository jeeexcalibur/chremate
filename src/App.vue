<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import { useTheme } from '@/composables/useTheme'

const authStore = useAuthStore()
const transactionStore = useTransactionStore()
const { init: initTheme } = useTheme()

onMounted(() => {
  authStore.init()
  initTheme()
})

// Global subscription: subscribe when user logs in, cleanup when user logs out.
// This lives at the app level so navigation between pages doesn't kill the subscription.
watch(
  () => authStore.user?.uid,
  (uid, oldUid) => {
    if (uid && uid !== oldUid) {
      transactionStore.subscribeToTransactions(uid)
    } else if (!uid) {
      transactionStore.cleanup()
    }
  },
  { immediate: true }
)
</script>

<template>
  <RouterView />
</template>
