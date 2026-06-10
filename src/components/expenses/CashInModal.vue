<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useExpenses } from '@/composables/useExpenses'

const props = defineProps<{
  modelValue: boolean
  registerId: string | null
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const { depositCash } = useExpenses()
const isOpen = ref(false)
const saving = ref(false)

const state = reactive({
  amount: '',
  description: ''
})

watch(() => props.modelValue, (val) => {
  isOpen.value = val
  if (val) {
    state.amount = ''
    state.description = ''
  }
})

watch(isOpen, (val) => {
  emit('update:modelValue', val)
})

const handleSubmit = async () => {
  const amt = parseFloat(state.amount)
  if (isNaN(amt) || amt <= 0) {
    alert('Please enter a valid deposit amount')
    return
  }
  if (!props.registerId) return

  saving.value = true
  try {
    const res = await depositCash(props.registerId, amt, state.description.trim() || 'Manual Deposit')
    if (res.success) {
      emit('saved')
      isOpen.value = false
    } else {
      alert(res.message || 'Deposit failed')
    }
  } catch (err: any) {
    alert(err.message || 'An error occurred')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <!-- Backdrop inside the relative phone container -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-xs rounded-3xl"
        @click="isOpen = false"
      ></div>
    </Transition>

    <!-- Dialog centered inside the relative phone container -->
    <Transition
      enter-active-class="transition duration-300 ease-out transform"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-200 ease-in transform"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-xs z-40 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-2xl rounded-2xl p-5"
      >
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <h3 class="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Load Cash into Register
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              class="rounded-full"
              @click="isOpen = false"
            />
          </div>

          <div class="space-y-4">
            <!-- Amount -->
            <div class="flex flex-col gap-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850 items-center">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Cash-In Amount</label>
              <div class="flex items-center gap-1">
                <span class="text-xl font-black text-slate-400">₹</span>
                <input
                  type="number"
                  v-model="state.amount"
                  placeholder="0.00"
                  class="w-28 text-center text-xl font-black bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 focus:ring-0"
                  required
                />
              </div>
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Source / Notes</label>
              <UInput
                v-model="state.description"
                placeholder="e.g. Bank draw, petty cash"
                size="md"
                icon="i-heroicons-information-circle"
                class="w-full"
              />
            </div>

            <div class="pt-2">
              <UButton
                block
                color="success"
                size="md"
                :loading="saving"
                label="Deposit Cash"
                class="rounded-xl font-bold uppercase tracking-wider h-10"
                @click="handleSubmit"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
