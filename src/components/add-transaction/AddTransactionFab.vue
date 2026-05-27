<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useTransactionStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useAI } from '@/composables/useAI'

const transactionStore = useTransactionStore()
const authStore = useAuthStore()
const { parseTransactions } = useAI()

// Form sheet states
const isOpen = ref(false)
const saving = ref(false)
const showSuccess = ref(false)

const form = ref({
  description: '',
  amount: null as number | null,
  type: 'expense' as 'income' | 'expense',
  category: 'food' as TransactionCategory,
})

const categoryOptions = computed(() =>
  form.value.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
)

const isValid = computed(() =>
  form.value.description.trim() && form.value.amount && form.value.amount > 0
)

// Reset category when type changes
watch(() => form.value.type, (newType) => {
  form.value.category = newType === 'income' ? 'salary' : 'food'
})

function open() {
  isOpen.value = true
  document.body.style.overflow = 'hidden'
}

function close() {
  isOpen.value = false
  document.body.style.overflow = ''
}

function resetForm() {
  form.value = {
    description: '',
    amount: null,
    type: form.value.type,
    category: form.value.type === 'income' ? 'salary' : 'food',
  }
}

async function submit() {
  if (!isValid.value || !authStore.user || saving.value) return
  saving.value = true

  try {
    await transactionStore.addTransaction(authStore.user.uid, {
      amount: form.value.amount!,
      category: form.value.category,
      description: form.value.description,
      type: form.value.type,
    })

    showSuccess.value = true
    resetForm()

    setTimeout(() => {
      showSuccess.value = false
      close()
    }, 1500)
  } catch (e) {
    console.error('Failed to save:', e)
  } finally {
    saving.value = false
  }
}

function getCategoryInfo(category: TransactionCategory) {
  return CATEGORIES[category] || CATEGORIES.other
}

// ==========================================
// VOICE DICTATION & OVERLAY STATE MACHINE
// ==========================================
const isVoiceOverlayOpen = ref(false)
const isListening = ref(false)
const voiceTranscript = ref('')
const parsingVoice = ref(false)
const parsedVoiceResults = ref<any[]>([])

let recognition: any = null

function initSpeechRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    console.warn('Speech Recognition is not supported by this browser.')
    return
  }

  recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'id-ID' // Default to Indonesian

  recognition.onstart = () => {
    isListening.value = true
    voiceTranscript.value = ''
    parsedVoiceResults.value = []
  }

  recognition.onerror = (e: any) => {
    console.error('Speech recognition error:', e.error)
    isListening.value = false
    isVoiceOverlayOpen.value = false
    document.body.style.overflow = ''
  }

  recognition.onend = () => {
    isListening.value = false
    if (voiceTranscript.value.trim().length > 0) {
      processVoiceTranscript()
    } else {
      isVoiceOverlayOpen.value = false
      document.body.style.overflow = ''
    }
  }

  recognition.onresult = (event: any) => {
    const transcript = event.results[0]?.[0]?.transcript
    if (transcript) {
      voiceTranscript.value = transcript
    }
  }
}

function startVoiceCapture() {
  isVoiceOverlayOpen.value = true
  document.body.style.overflow = 'hidden'

  if (!recognition) {
    initSpeechRecognition()
  }

  if (!recognition) {
    alert('Voice input is not supported in this browser. Please try Google Chrome or Microsoft Edge.')
    isVoiceOverlayOpen.value = false
    document.body.style.overflow = ''
    return
  }

  parsedVoiceResults.value = []
  voiceTranscript.value = ''
  recognition.start()
}

async function processVoiceTranscript() {
  if (!voiceTranscript.value.trim()) return
  parsingVoice.value = true
  try {
    const results = await parseTransactions(voiceTranscript.value)
    if (results.length > 0) {
      parsedVoiceResults.value = results
    } else {
      alert('AI was unable to extract any transaction details. Please speak more clearly.')
      cancelVoiceCapture()
    }
  } catch (err) {
    console.error('AI Voice processing failed:', err)
    cancelVoiceCapture()
  } finally {
    parsingVoice.value = false
  }
}

async function saveVoiceTransactions() {
  if (!parsedVoiceResults.value.length || !authStore.user || saving.value) return
  saving.value = true
  try {
    for (const tx of parsedVoiceResults.value) {
      await transactionStore.addTransaction(authStore.user.uid, {
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        type: tx.type,
      })
    }
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
      cancelVoiceCapture()
    }, 1500)
  } catch (err) {
    console.error('Failed to commit voice transactions:', err)
  } finally {
    saving.value = false
  }
}

function cancelVoiceCapture() {
  isVoiceOverlayOpen.value = false
  isListening.value = false
  parsingVoice.value = false
  voiceTranscript.value = ''
  parsedVoiceResults.value = []
  document.body.style.overflow = ''
  if (recognition) {
    try {
      recognition.stop()
    } catch (e) {
      // Ignore if not running
    }
  }
}

onBeforeUnmount(() => {
  if (recognition) {
    try {
      recognition.stop()
    } catch {}
  }
})
</script>

<template>
  <!-- SIBLING VOICE FAB (Floats directly above the "+" FAB) -->
  <button
    @click="startVoiceCapture"
    class="fixed bottom-[8.5rem] right-4 sm:right-5 md:bottom-24 md:right-8 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-card hover:bg-accent border border-border text-rose-500 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
    id="fab-voice-transaction"
    title="Add transaction with voice"
  >
    <span class="text-lg sm:text-xl group-hover:scale-110 transition-transform">🎙️</span>
  </button>

  <!-- FAB Button -->
  <button
    @click="open"
    class="fixed bottom-[5rem] right-4 sm:right-5 md:bottom-8 md:right-8 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
    :class="{ 'rotate-45': isOpen }"
    id="fab-add-transaction"
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="transition-transform duration-300 sm:w-6 sm:h-6">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  </button>

  <!-- Backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      @click="close"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
    />
  </Transition>

  <!-- Bottom Sheet -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="isOpen"
      class="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl border-t border-border max-h-[85vh] overflow-y-auto"
    >
      <!-- Handle bar -->
      <div class="flex justify-center pt-3 pb-2">
        <div class="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>

      <div class="px-4 pb-6 sm:px-8 sm:pb-8 sm:max-w-lg sm:mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-bold text-card-foreground">Add Transaction</h2>
          <button @click="close" class="p-2 -mr-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-card-foreground transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Success state -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-90"
          enter-to-class="opacity-100 scale-100"
        >
          <div v-if="showSuccess" class="text-center py-8">
            <div class="text-5xl mb-3 animate-bounce">✅</div>
            <p class="text-lg font-semibold text-income">Transaction saved!</p>
          </div>
        </Transition>

        <!-- Form -->
        <form v-if="!showSuccess" @submit.prevent="submit" class="space-y-5">
          <!-- Type toggle -->
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in (['expense', 'income'] as const)"
              :key="t"
              type="button"
              @click="form.type = t"
              :class="[
                'py-3 rounded-2xl text-sm font-semibold transition-all',
                form.type === t
                  ? t === 'expense'
                    ? 'bg-expense/15 text-expense border-2 border-expense/30'
                    : 'bg-income/15 text-income border-2 border-income/30'
                  : 'bg-muted text-muted-foreground border-2 border-transparent',
              ]"
            >
              {{ t === 'expense' ? '↘ Expense' : '↗ Income' }}
            </button>
          </div>

          <!-- Description -->
          <div>
            <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
            <input
              id="sheet-description"
              v-model="form.description"
              type="text"
              placeholder="What was it for?"
              class="w-full px-4 py-3.5 rounded-2xl bg-muted border border-input text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm"
              autocomplete="off"
            />
          </div>

          <!-- Amount -->
          <div>
            <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">Rp</span>
              <input
                id="sheet-amount"
                v-model.number="form.amount"
                type="number"
                placeholder="0"
                min="0"
                class="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted border border-input text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm text-right font-semibold text-lg"
              />
            </div>
            <!-- Quick amount buttons -->
            <div class="flex gap-2 mt-2">
              <button
                v-for="amt in [10000, 25000, 50000, 100000]"
                :key="amt"
                type="button"
                @click="form.amount = amt"
                :class="[
                  'flex-1 py-1.5 rounded-xl text-xs font-medium transition-all',
                  form.amount === amt
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground border border-transparent hover:bg-accent',
                ]"
              >
                {{ amt >= 1000 ? `${amt / 1000}k` : amt }}
              </button>
            </div>
          </div>

          <!-- Category -->
          <div>
            <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
            <div class="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
              <button
                v-for="cat in categoryOptions"
                :key="cat"
                type="button"
                @click="form.category = cat"
                :class="[
                  'flex flex-col items-center gap-0.5 sm:gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-medium transition-all border',
                  form.category === cat
                    ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-card-foreground',
                ]"
              >
                <span class="text-lg sm:text-xl">{{ getCategoryInfo(cat).icon }}</span>
                <span class="truncate w-full text-center leading-tight">{{ getCategoryInfo(cat).label }}</span>
              </button>
            </div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="!isValid || saving"
            :class="[
              'w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed',
              form.type === 'expense'
                ? 'bg-expense text-white hover:opacity-90'
                : 'bg-income text-white hover:opacity-90',
            ]"
          >
            {{ saving ? 'Saving...' : `Add ${form.type === 'income' ? 'Income' : 'Expense'}` }}
          </button>
        </form>
      </div>
    </div>
  </Transition>

  <!-- ==========================================
       FULL SCREEN GLASSMORPHIC VOICE OVERLAY PORTAL
       ========================================== -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isVoiceOverlayOpen"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl text-center select-none"
    >
      <!-- Top Cancel Cross -->
      <button
        @click="cancelVoiceCapture"
        class="absolute top-6 right-6 p-3 rounded-2xl text-muted-foreground hover:bg-white/10 hover:text-white transition-all text-lg"
        title="Cancel voice capture"
      >
        ✕
      </button>

      <!-- SUCCESS SAVED FEEDBACK -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
      >
        <div v-if="showSuccess" class="text-center">
          <div class="text-6xl mb-4 animate-bounce">🎙️✨</div>
          <p class="text-xl font-bold text-income tracking-wide">Transactions Saved Successfully!</p>
        </div>
      </Transition>

      <div v-if="!showSuccess" class="w-full flex flex-col items-center justify-center max-w-sm sm:max-w-md">
        
        <!-- STATE 1: ACTIVE CAPTURING MICROPHONE -->
        <div v-if="isListening" class="flex flex-col items-center animate-fade-in">
          <div class="relative mb-8">
            <!-- Pulsing backdrops -->
            <div class="absolute inset-0 rounded-full bg-rose-500/20 blur-xl animate-ping duration-1000"></div>
            <div class="relative w-24 h-24 rounded-full bg-rose-500/10 border-2 border-rose-500/50 flex items-center justify-center text-4xl text-rose-500 animate-pulse">
              🎙️
            </div>
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Listening...</h2>
          <p class="text-xs text-muted-foreground uppercase tracking-widest mb-6">Speak your transaction</p>
          
          <!-- Helper Guidances -->
          <div class="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-left text-white/70 max-w-xs space-y-2 mt-4">
            <p class="font-semibold text-white/90 text-center mb-1">💡 Try saying something like:</p>
            <p class="italic">"Beli ayam geprek 30 ribu terus grab 15 ribu"</p>
            <p class="italic">"Gaji freelance masuk 2 juta rupiah"</p>
          </div>
        </div>

        <!-- STATE 2: LOADING PARSER -->
        <div v-else-if="parsingVoice" class="flex flex-col items-center animate-fade-in">
          <div class="flex flex-col items-center justify-center mb-6">
            <svg class="animate-spin h-14 w-14 text-primary mb-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <h2 class="text-xl font-bold text-white mb-1">Analyzing Dictation...</h2>
            <p class="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse font-medium">Gemini AI structuring transaction</p>
          </div>
          
          <!-- Show spoken readout -->
          <div v-if="voiceTranscript" class="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm max-w-sm italic text-white/90">
            "{{ voiceTranscript }}"
          </div>
        </div>

        <!-- STATE 3: PARSED RESULTS PREVIEW & CONFIRMATION -->
        <div v-else-if="parsedVoiceResults.length > 0" class="w-full bg-card border border-border p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col gap-3 sm:gap-4 animate-scale-up">
          <div class="flex items-center justify-between border-b border-border pb-3">
            <h3 class="text-sm font-semibold text-card-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>✨</span> Voice-to-Text Review
            </h3>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {{ parsedVoiceResults.length }} {{ parsedVoiceResults.length > 1 ? 'Entries' : 'Entry' }}
            </span>
          </div>

          <!-- Dictation source bubble -->
          <div class="px-3 py-2 rounded-xl bg-muted text-xs text-left text-muted-foreground italic border border-border/40">
            "{{ voiceTranscript }}"
          </div>

          <!-- Parsed preview lists -->
          <div class="space-y-3 sm:space-y-3.5 max-h-48 sm:max-h-60 overflow-y-auto pr-1">
            <div
              v-for="(tx, index) in parsedVoiceResults"
              :key="index"
              class="p-4 rounded-2xl bg-muted/60 border border-border/60 text-left flex flex-col gap-2.5 hover:bg-muted/80 transition-all"
            >
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ getCategoryInfo(tx.category).icon }}</span>
                  <span class="text-xs font-bold text-card-foreground">{{ getCategoryInfo(tx.category).label }}</span>
                </div>
                <span :class="['text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider', tx.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense']">
                  {{ tx.type }}
                </span>
              </div>

              <div class="flex justify-between items-center gap-3">
                <p class="text-xs text-muted-foreground truncate mr-2 font-medium">{{ tx.description }}</p>
                <p :class="['text-base font-extrabold flex-shrink-0', tx.type === 'income' ? 'text-income' : 'text-expense']">
                  {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex gap-2 mt-2">
            <button
              @click="saveVoiceTransactions"
              :disabled="saving"
              class="flex-1 py-3.5 bg-income text-white font-bold rounded-2xl hover:opacity-90 active:scale-98 transition-all text-sm shadow-md"
            >
              ✓ Save Transactions
            </button>
            <button
              @click="cancelVoiceCapture"
              class="px-4 py-3.5 bg-muted border border-border text-muted-foreground font-semibold rounded-2xl hover:bg-accent transition-all text-sm"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>
