<template>
  <div class="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 w-full mx-auto space-y-8">
    <div v-if="loadingDetails" class="flex flex-col items-center justify-center py-32 gap-4">
      <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin text-indigo-600" />
      <p class="text-xs font-black uppercase tracking-widest text-slate-400">Loading work batch details...</p>
    </div>

    <div v-else-if="period" class="space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 dark:border-zinc-800 pb-8 gap-6 shrink-0">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <UButton 
              icon="i-heroicons-arrow-left" 
              color="neutral" 
              variant="soft" 
              size="sm" 
              to="/labor" 
              class="rounded-xl shadow-sm"
            />
            <UBadge 
              color="primary" 
              variant="soft" 
              size="sm" 
              class="uppercase font-black text-[9px] tracking-wider"
            >
              Batch ID: {{ period.id.substring(0, 8) }}
            </UBadge>
          </div>
          <div class="flex items-center gap-3">
            <h1 class="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {{ period.leader_name }}'s Team
            </h1>
          </div>
          <div class="flex items-center gap-2 text-slate-500 dark:text-zinc-400 font-bold text-sm">
            <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-slate-400" />
            <span>{{ formatDate(period.start_date) }}</span>
            <span class="text-slate-300 dark:text-zinc-700">→</span>
            <span>{{ formatDate(period.end_date) }}</span>
          </div>
        </div>

        <div class="flex gap-3 w-full md:w-auto">
          <UButton 
            v-if="period.status === 'Open'"
            label="Issue Advance" 
            color="warning" 
            variant="soft" 
            icon="i-heroicons-currency-rupee"
            size="lg" 
            class="flex-1 md:flex-none font-bold rounded-xl"
            @click="openAdvanceModal"
          />
          <UButton 
            v-if="period.status === 'Open'"
            label="Final Settlement" 
            color="success" 
            icon="i-heroicons-check-circle"
            size="lg" 
            class="flex-1 md:flex-none font-bold rounded-xl"
            @click="openSettlementModal"
          />
          <UBadge 
            v-else
            color="success" 
            variant="solid" 
            size="lg" 
            class="py-3 px-8 text-xs font-black uppercase tracking-wider rounded-xl animate-pulse"
          >
            Closed & Settled
          </UBadge>
        </div>
      </div>

      <!-- Attendance Grid Section -->
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 class="text-2xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <UIcon name="i-heroicons-finger-print" class="w-6 h-6" />
            </div>
            Attendance & Daily Wages
          </h2>
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <UButton 
              label="Export Excel" 
              color="success" 
              variant="outline" 
              icon="i-heroicons-document-arrow-down"
              size="sm" 
              class="font-bold flex-1 sm:flex-none"
              @click="handleExportExcel"
            />
            <UButton 
              v-if="period.status === 'Open'"
              label="Save All Data" 
              color="primary" 
              icon="i-heroicons-cloud-arrow-up"
              size="sm" 
              class="font-bold flex-1 sm:flex-none"
              @click="handleSaveData"
              :loading="savingData"
            />
          </div>
        </div>

        <!-- Spreadsheet Container -->
        <div class="overflow-x-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800">
          <table class="w-full text-left border-collapse text-sm min-w-max">
            <thead class="bg-slate-50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-bold sticky top-0">
              <tr>
                <th class="px-4 py-3.5 border-b border-r border-slate-100 dark:border-zinc-800 min-w-[200px]">Labor Name</th>
                <th class="px-4 py-3.5 border-b border-r border-slate-100 dark:border-zinc-800 w-28 text-center">Wage / Day</th>
                <th 
                  v-for="(d, dIdx) in dates" 
                  :key="dIdx" 
                  class="px-1 py-3.5 border-b border-r border-slate-100 dark:border-zinc-800 text-center min-w-[40px]"
                  :class="isWeekend(d) ? 'bg-orange-50/50 dark:bg-orange-950/10 text-orange-700' : ''"
                >
                  <div class="opacity-60 text-[8px]">{{ formatWeekday(d) }}</div>
                  <div class="text-xs mt-0.5 font-bold">{{ d.getDate() }}</div>
                </th>
                <th class="px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800 font-bold text-indigo-600 text-center w-28 bg-indigo-50/30 dark:bg-indigo-950/10">Total (₹)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-zinc-800">
              <tr v-for="(w, wIdx) in localWorkers" :key="w.id" class="group">
                <!-- Labor Name -->
                <td class="p-0 border-r border-slate-100 dark:border-zinc-800">
                  <input 
                    type="text" 
                    v-model="w.labor_name" 
                    :disabled="period.status === 'Settled'"
                    class="w-full px-4 py-3.5 bg-transparent border-none outline-none font-bold text-slate-800 dark:text-white focus:bg-indigo-50/50 dark:focus:bg-indigo-950/10 transition-colors disabled:opacity-80"
                    placeholder="Worker Name..."
                    :ref="el => setInputRef(el, wIdx, 'name')"
                    @keydown.down.prevent="moveFocus(wIdx + 1, 'name')"
                    @keydown.up.prevent="moveFocus(wIdx - 1, 'name')"
                    @keydown.right.prevent="moveFocus(wIdx, 'wage')"
                  />
                </td>
                <!-- Wage/Day -->
                <td class="p-0 border-r border-slate-100 dark:border-zinc-800">
                  <input 
                    type="number" 
                    v-model.number="w.daily_wage" 
                    :disabled="period.status === 'Settled'"
                    class="w-full px-2 py-3.5 bg-transparent text-center border-none outline-none font-black text-slate-700 dark:text-zinc-300 focus:bg-indigo-50/50 dark:focus:bg-indigo-950/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-80"
                    :ref="el => setInputRef(el, wIdx, 'wage')"
                    @keydown.down.prevent="moveFocus(wIdx + 1, 'wage')"
                    @keydown.up.prevent="moveFocus(wIdx - 1, 'wage')"
                    @keydown.left.prevent="moveFocus(wIdx, 'name')"
                    @keydown.right.prevent="moveFocus(wIdx, 0)"
                  />
                </td>
                <!-- Calendar Dates -->
                <td 
                  v-for="(d, dIdx) in dates" 
                  :key="dIdx" 
                  class="p-0 border-r border-slate-100 dark:border-zinc-800 text-center"
                >
                  <div 
                    class="w-full h-12 flex items-center justify-center cursor-pointer outline-none font-black text-xs select-none transition-all"
                    :class="getCellClass(w.attendance[dateKey(d)])"
                    :tabindex="period.status === 'Settled' ? -1 : 0"
                    :ref="el => setCellRef(el, wIdx, dIdx)"
                    @click="period.status === 'Open' && cycleCell(wIdx, dateKey(d))"
                    @keydown.space.prevent="period.status === 'Open' && setCellAttendance(wIdx, dateKey(d), 'P', dIdx)"
                    @keydown.enter.prevent="period.status === 'Open' && setCellAttendance(wIdx, dateKey(d), 'L', dIdx)"
                    @keydown.right.prevent="moveFocus(wIdx, dIdx + 1)"
                    @keydown.left.prevent="dIdx === 0 ? moveFocus(wIdx, 'wage') : moveFocus(wIdx, dIdx - 1)"
                    @keydown.down.prevent="moveFocus(wIdx + 1, dIdx)"
                    @keydown.up.prevent="moveFocus(wIdx - 1, dIdx)"
                  >
                    {{ getCellLabel(w.attendance[dateKey(d)]) }}
                  </div>
                </td>
                <!-- Total Wage for worker -->
                <td class="px-4 py-3.5 font-black text-indigo-700 dark:text-indigo-400 text-center bg-indigo-50/20 dark:bg-indigo-950/5">
                  ₹{{ calculateWorkerTotal(w).toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Shortcuts Help Bar -->
        <div class="flex flex-col sm:flex-row justify-between items-center bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl gap-4 shrink-0">
          <UButton 
            v-if="period.status === 'Open'"
            label="Add Worker Row" 
            icon="i-heroicons-plus" 
            color="neutral" 
            variant="outline" 
            size="sm" 
            class="font-bold shadow-sm"
            @click="addWorkerRow"
          />
          <div v-else class="text-xs text-slate-400 dark:text-zinc-500 font-bold uppercase italic">
            Attendance spreadsheet is locked (Read Only).
          </div>
          <div class="text-[10px] text-slate-500 dark:text-zinc-400 flex flex-wrap gap-4 font-semibold">
            <span class="flex items-center gap-1.5"><kbd class="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-zinc-700 shadow-sm text-slate-900 dark:text-white font-black">SPACE</kbd> Present (P)</span>
            <span class="flex items-center gap-1.5"><kbd class="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-zinc-700 shadow-sm text-slate-900 dark:text-white font-black">ENTER</kbd> Leave (L)</span>
            <span class="flex items-center gap-1.5"><kbd class="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-zinc-700 shadow-sm text-slate-900 dark:text-white font-black">CLICK</kbd> Cycle states</span>
            <span class="flex items-center gap-1.5"><kbd class="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-zinc-700 shadow-sm text-slate-900 dark:text-white font-black">Arrows</kbd> Navigate</span>
          </div>
        </div>
      </div>

      <!-- Financials and Expenses Block -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Miscellaneous Expenses -->
        <div class="lg:col-span-2 space-y-4">
          <h3 class="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <UIcon name="i-heroicons-banknotes" class="w-6 h-6 text-rose-500" />
            Miscellaneous Expenses
          </h3>
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
            <div class="overflow-x-auto flex-1">
              <table class="w-full text-left">
                <thead class="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                  <tr>
                    <th class="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Description</th>
                    <th class="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest w-36">Amount</th>
                    <th class="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest w-16 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-zinc-800">
                  <tr v-if="localExpenses.length === 0">
                    <td colspan="3" class="px-6 py-12 text-center text-slate-400 dark:text-zinc-500 italic font-medium">
                      No miscellaneous expenses recorded yet.
                    </td>
                  </tr>
                  <tr v-else v-for="(exp, index) in localExpenses" :key="index" class="group hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition">
                    <td class="px-6 py-4 font-bold text-slate-700 dark:text-zinc-300">{{ exp.description }}</td>
                    <td class="px-6 py-4 font-black text-slate-900 dark:text-white text-lg">₹{{ exp.amount.toLocaleString() }}</td>
                    <td class="px-6 py-4 text-right">
                      <UButton 
                        v-if="period.status === 'Open'"
                        icon="i-heroicons-trash" 
                        variant="ghost" 
                        color="error" 
                        size="sm" 
                        @click="removeExpense(index)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Expense Form Input -->
            <div v-if="period.status === 'Open'" class="p-6 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex gap-4 shrink-0">
              <UInput v-model="newExpense.description" placeholder="Transport, food expense, materials..." class="flex-1" />
              <UInput v-model.number="newExpense.amount" type="number" placeholder="Amount" class="w-36 font-black" />
              <UButton label="Add" color="neutral" class="px-6 font-bold" @click="addExpense" />
            </div>
          </div>
        </div>

        <!-- Sidebar Summary Cards -->
        <div class="space-y-6">
          <h3 class="text-xl font-black text-slate-800 dark:text-zinc-100">Financial Snapshot</h3>
          <!-- Snapshot Display -->
          <div class="bg-slate-900 rounded-[2.2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-indigo-500/25 transition-all duration-700"></div>
            <div class="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full -ml-16 -mb-16 blur-2xl"></div>

            <div class="space-y-6 relative z-10">
              <div class="flex justify-between items-center border-b border-white/5 pb-4">
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Wages</span>
                <span class="font-bold text-lg">₹{{ sumWages.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between items-center border-b border-white/5 pb-4">
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Misc Expenses</span>
                <span class="font-bold text-lg">₹{{ sumExpenses.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between items-center text-rose-400 pb-4">
                <span class="text-[10px] font-black uppercase tracking-widest">Total Advances</span>
                <span class="font-bold text-lg">- ₹{{ sumAdvances.toLocaleString() }}</span>
              </div>
              <div class="pt-4 border-t border-white/10">
                <div class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Net Payable Balance</div>
                <div class="text-4xl font-black tracking-tight text-white">₹{{ netPayable.toLocaleString() }}</div>
              </div>
            </div>
          </div>

          <!-- Advances Payout List -->
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
            <h4 class="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Advance History</h4>
            <div v-if="advances.length === 0" class="text-center py-6 text-sm text-slate-400 dark:text-zinc-500 italic">
              No advances issued yet.
            </div>
            <div v-else class="space-y-3">
              <div 
                v-for="adv in advances" 
                :key="adv.id" 
                class="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-800"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 rounded-lg flex items-center justify-center font-bold text-lg">₹</div>
                  <div>
                    <div class="font-black text-slate-900 dark:text-white text-sm">₹{{ Number(adv.amount).toLocaleString() }}</div>
                    <div class="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{{ formatDate(adv.payment_date) }}</div>
                  </div>
                </div>
                <UBadge color="success" variant="soft" size="sm" class="uppercase font-black text-[8px] tracking-wider">Paid</UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Issue Advance Modal -->
    <UModal v-model:open="isAdvanceModalOpen" title="Issue Advance Payment">
      <template #body>
        <form @submit.prevent="submitAdvance" class="p-6 space-y-4">
          <div class="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 flex flex-col">
            <span class="text-[9px] font-black uppercase text-amber-700 dark:text-amber-500 tracking-wider">Recipient Leader</span>
            <span class="font-black text-amber-950 dark:text-amber-200 mt-0.5 text-base">{{ period.leader_name }}</span>
          </div>

          <UFormField label="Advance Amount (₹)" required>
            <UInput v-model.number="advanceForm.amount" type="number" required class="w-full font-black text-lg" placeholder="0.00" />
          </UFormField>

          <UFormField label="Payment Date" required>
            <UInput v-model="advanceForm.payment_date" type="date" required class="w-full" />
          </UFormField>

          <UFormField label="Payment Mode" required>
            <USelect 
              v-model="advanceForm.payment_mode" 
              :items="[
                { label: 'Bank Transfer', value: 'BANK' },
                { label: 'Cash Payment', value: 'CASH' }
              ]" 
              required 
              class="w-full" 
            />
          </UFormField>

          <UFormField v-if="advanceForm.payment_mode === 'BANK'" label="Select Bank Account" required>
            <USelect 
              v-model="advanceForm.bank_account_id" 
              :items="bankAccountSelectOptions" 
              required 
              class="w-full" 
            />
          </UFormField>

          <div class="flex justify-end gap-2 mt-6">
            <UButton label="Discard" variant="ghost" color="neutral" @click="isAdvanceModalOpen = false" />
            <UButton type="submit" label="Record Advance" color="warning" :loading="savingPayment" />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Final Settlement Modal -->
    <UModal v-model:open="isSettlementModalOpen" title="Final Batch Settlement">
      <template #body>
        <form @submit.prevent="submitSettlement" class="p-6 space-y-5">
          <!-- Settlement Snapshot -->
          <div class="bg-emerald-50 dark:bg-emerald-950/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 grid grid-cols-2 gap-4">
            <div>
              <span class="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest block mb-0.5">Total Wages</span>
              <span class="text-lg font-bold text-emerald-900 dark:text-emerald-200">₹{{ sumWages.toLocaleString() }}</span>
            </div>
            <div>
              <span class="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest block mb-0.5">Misc Expenses</span>
              <span class="text-lg font-bold text-emerald-900 dark:text-emerald-200">₹{{ sumExpenses.toLocaleString() }}</span>
            </div>
            <div class="border-t border-emerald-100 dark:border-emerald-900/30 pt-3">
              <span class="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-0.5">Total Advances</span>
              <span class="text-lg font-bold text-rose-700 dark:text-rose-400">- ₹{{ sumAdvances.toLocaleString() }}</span>
            </div>
            <div class="border-t border-emerald-100 dark:border-emerald-900/30 pt-3">
              <span class="text-[9px] font-black text-indigo-600 dark:text-indigo-500 uppercase tracking-widest block mb-0.5">Net Payable</span>
              <span class="text-xl font-black text-slate-900 dark:text-white">₹{{ netPayable.toLocaleString() }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Final Payment Date" required>
              <UInput v-model="settlementForm.payment_date" type="date" required class="w-full" />
            </UFormField>
            <UFormField label="Payment Mode" required>
              <USelect 
                v-model="settlementForm.payment_mode" 
                :items="[
                  { label: 'Bank Transfer', value: 'BANK' },
                  { label: 'Cash Payment', value: 'CASH' }
                ]" 
                required 
                class="w-full" 
              />
            </UFormField>
          </div>

          <UFormField v-if="settlementForm.payment_mode === 'BANK'" label="Bank Account" required>
            <USelect 
              v-model="settlementForm.bank_account_id" 
              :items="bankAccountSelectOptions" 
              required 
              class="w-full" 
            />
          </UFormField>

          <!-- Settlement Adjustments -->
          <div class="bg-amber-50 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 space-y-4">
            <div class="flex justify-between items-center">
              <h4 class="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-500">Settlement Adjustment</h4>
              <span class="text-[9px] font-bold text-amber-600 italic">Dispute & Rounding</span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Amount to Pay (₹)" required>
                <UInput 
                  v-model.number="settlementForm.paid_amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  class="w-full font-black text-lg" 
                />
              </UFormField>
              <div>
                <label class="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Discount/Adjustment</label>
                <div 
                  class="px-4 py-2.5 rounded-xl border font-black text-lg bg-white dark:bg-zinc-800"
                  :class="adjustmentDifference !== 0 ? 'border-amber-300 text-rose-600' : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'"
                >
                  ₹{{ adjustmentDifference.toLocaleString() }}
                </div>
              </div>
            </div>
            <div v-if="Math.abs(adjustmentDifference) > 0.01">
              <UFormField label="Reason for Adjustment/Dispute" required>
                <UInput 
                  v-model="settlementForm.adjustment_reason" 
                  placeholder="e.g. Penalty for quality issues, Rounding off" 
                  required 
                  class="w-full" 
                />
              </UFormField>
            </div>
          </div>

          <div class="bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-start gap-3">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
            <p class="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
              Settling this batch will freeze attendance sheets, create double-entry General Ledger transactions, and register any discounts as firm income.
            </p>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton label="Discard" variant="ghost" color="neutral" @click="isSettlementModalOpen = false" />
            <UButton type="submit" label="Finalize & Close Batch" color="success" :loading="savingPayment" />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLabor } from '@/composables/useLabor'
import { useBanking } from '@/composables/useBanking'
import { useToast } from '@nuxt/ui/composables'

const route = useRoute()
const toast = useToast()
const { user, selectedFirmId } = useAuth()
const { loading: loadingLabor, fetchPeriodDetails, periodDetails, syncPeriodData, payAdvance, settlePeriod, exportPeriodExcel } = useLabor()
const { loading: loadingBanking, bankAccounts, fetchBankAccounts } = useBanking()

const loadingDetails = ref(true)
const savingData = ref(false)

const period = computed(() => periodDetails.value?.period)
const advances = computed(() => periodDetails.value?.advances || [])

const localWorkers = ref<Array<{ id: string; labor_name: string; daily_wage: number; attendance: Record<string, string> }>>([])
const localExpenses = ref<Array<{ description: string; amount: number }>>([])

const dates = computed(() => {
  if (!period.value) return []
  return getDatesInRange(new Date(period.value.start_date), new Date(period.value.end_date))
})

// Load Details
const loadDetails = async () => {
  const id = route.params.id as string
  loadingDetails.value = true
  try {
    await Promise.all([
      fetchPeriodDetails(id),
      fetchBankAccounts()
    ])
    
    // Set local workers
    const rawWorkers = periodDetails.value?.workers || []
    const rawAttendance = periodDetails.value?.attendance || []
    
    localWorkers.value = rawWorkers.map((w: any) => {
      const attMap: { [date: string]: string } = {}
      rawAttendance
        .filter((a: any) => a.worker_id === w.id)
        .forEach((a: any) => {
          const dStr = new Date(a.attendance_date).toISOString().split('T')[0] || ''
          attMap[dStr] = mapDayValueToStatus(a.day_value)
        })
      
      return {
        id: w.id,
        labor_name: w.labor_name,
        daily_wage: Number(w.daily_wage),
        attendance: attMap
      }
    })

    // Fallback row if empty
    if (localWorkers.value.length === 0 && period.value?.status === 'Open') {
      addWorkerRow()
    }

    // Set local expenses
    localExpenses.value = (periodDetails.value?.expenses || []).map((e: any) => ({
      description: e.description,
      amount: Number(e.amount)
    }))
    
  } catch (err: any) {
    toast.add({ title: 'Failed to load details', description: err.message, color: 'error' })
  } finally {
    loadingDetails.value = false
  }
}

onMounted(loadDetails)

// Dates Helper
const getDatesInRange = (start: Date, end: Date) => {
  const list: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    list.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return list
}

const dateKey = (d: Date): string => d.toISOString().split('T')[0] || ''
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
const formatWeekday = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
const formatDate = (d: string) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

// Attendance mappings
const mapDayValueToStatus = (val: any) => {
  const v = parseFloat(val)
  if (isNaN(v) || v === 0) return 'L'
  if (v === 0.5) return '½'
  if (v === 1.0) return 'P'
  return String(v)
}

const getCellLabel = (status: string | undefined) => {
  if (!status || status === 'L') return '.'
  return status
}

const getCellClass = (status: string | undefined) => {
  if (status === 'P') return 'bg-emerald-500 text-white shadow-inner'
  if (status === 'L') return 'bg-rose-500 text-white shadow-inner'
  if (status === '½') return 'bg-amber-400 text-white shadow-inner'
  if (status && status !== 'L') return 'bg-indigo-500 text-white shadow-inner'
  return 'text-slate-300 dark:text-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800'
}

// Cell updates
const cycleCell = (wIdx: number, dateStr: string) => {
  const worker = localWorkers.value[wIdx]
  if (!worker) return
  const current = worker.attendance[dateStr] || 'L'
  let next = 'L'
  if (current === 'L') next = 'P'
  else if (current === 'P') next = '½'
  else if (current === '½') next = 'L'
  else next = 'L'
  
  worker.attendance[dateStr] = next
}

const setCellAttendance = (wIdx: number, dateStr: string, status: string, dIdx: number) => {
  const worker = localWorkers.value[wIdx]
  if (worker) {
    worker.attendance[dateStr] = status
  }
  // Move focus to next date automatically
  moveFocus(wIdx, dIdx + 1)
}

// Calculations
const calculateWorkerTotal = (w: any) => {
  let presentDays = 0
  dates.value.forEach(d => {
    const status = w.attendance[dateKey(d)] || 'L'
    if (status === 'P') presentDays += 1.0
    else if (status === '½') presentDays += 0.5
    else if (status === 'L') presentDays += 0.0
    else presentDays += parseFloat(status) || 0
  })
  return parseFloat((presentDays * (w.daily_wage || 0)).toFixed(2))
}

const sumWages = computed(() => {
  return localWorkers.value.reduce((acc: number, w) => acc + calculateWorkerTotal(w), 0)
})

const sumExpenses = computed(() => {
  return localExpenses.value.reduce((acc: number, e) => acc + (e.amount || 0), 0)
})

const sumAdvances = computed(() => {
  return advances.value.reduce((acc: number, a: any) => acc + Number(a.amount), 0)
})

const netPayable = computed(() => {
  return (sumWages.value + sumExpenses.value) - sumAdvances.value
})

// Manage Workers & Grid Focus
const inputRefs: { [key: string]: any } = {}
const cellRefs: { [key: string]: any } = {}

const setInputRef = (el: any, wIdx: number, field: string) => {
  if (el) inputRefs[`${wIdx}-${field}`] = el
}
const setCellRef = (el: any, wIdx: number, dIdx: number) => {
  if (el) cellRefs[`${wIdx}-${dIdx}`] = el
}

const moveFocus = (r: number, c: any) => {
  if (r < 0 || r >= localWorkers.value.length) return
  
  if (typeof c === 'string') {
    const el = inputRefs[`${r}-${c}`]
    if (el) el.focus()
  } else {
    // Clamping column
    if (c >= dates.value.length) {
      // Wrap to first col of next row
      if (r < localWorkers.value.length - 1) {
        moveFocus(r + 1, 0)
      }
    } else if (c < 0) {
      moveFocus(r, 'wage')
    } else {
      const el = cellRefs[`${r}-${c}`]
      if (el) el.focus()
    }
  }
}

const addWorkerRow = () => {
  localWorkers.value.push({
    id: 'temp-' + Date.now(),
    labor_name: '',
    daily_wage: 0,
    attendance: {}
  })
}

// Expenses Form
const newExpense = reactive({
  description: '',
  amount: undefined as number | undefined
})

const addExpense = () => {
  const amt = Number(newExpense.amount)
  if (newExpense.description && amt > 0) {
    localExpenses.value.push({
      description: newExpense.description,
      amount: amt
    })
    newExpense.description = ''
    newExpense.amount = undefined
  }
}

const removeExpense = (index: number) => {
  localExpenses.value.splice(index, 1)
}

// Save Data (Sync)
const handleSaveData = async () => {
  savingData.value = true
  const id = route.params.id as string
  const payload = {
    workers: localWorkers.value.map(w => ({
      id: w.id,
      labor_name: w.labor_name,
      daily_wage: w.daily_wage,
      attendance: dates.value.map(d => {
        const dStr = dateKey(d)
        return { date: dStr, status: w.attendance[dStr] || 'L' }
      })
    })),
    expenses: localExpenses.value
  }
  
  try {
    const res = await syncPeriodData(id, payload)
    if (res.success) {
      toast.add({ title: 'Success', description: 'Labor period details synced successfully', color: 'success' })
      loadDetails()
    }
  } catch (err: any) {
    toast.add({ title: 'Sync Failed', description: err.message, color: 'error' })
  } finally {
    savingData.value = false
  }
}

// Excel Export
const handleExportExcel = async () => {
  if (!period.value) return
  toast.add({ title: 'Generating Report', description: 'Building Excel spreadsheet...', color: 'primary' })
  try {
    await exportPeriodExcel(period.value.id, period.value.leader_name)
  } catch (err: any) {
    toast.add({ title: 'Export Failed', description: err.message, color: 'error' })
  }
}

// Bank dropdown options
const bankAccountSelectOptions = computed(() => {
  return bankAccounts.value
    .filter(acc => acc.status === 'ACTIVE')
    .map(acc => ({ label: `${acc.bank_name} - ${acc.account_number}`, value: acc._id }))
})

// Issue Advance Payment
const isAdvanceModalOpen = ref(false)
const savingPayment = ref(false)

const advanceForm = reactive({
  amount: undefined as number | undefined,
  payment_date: '',
  payment_mode: 'BANK',
  bank_account_id: ''
})

const openAdvanceModal = () => {
  advanceForm.amount = undefined
  advanceForm.payment_date = new Date().toISOString().split('T')[0] || ''
  advanceForm.payment_mode = 'BANK'
  advanceForm.bank_account_id = bankAccounts.value[0]?._id || ''
  isAdvanceModalOpen.value = true
}

const submitAdvance = async () => {
  if (!selectedFirmId.value || !period.value) return
  savingPayment.value = true
  try {
    const payload = {
      firm_id: selectedFirmId.value,
      period_id: period.value.id,
      amount: Number(advanceForm.amount),
      payment_date: advanceForm.payment_date,
      payment_mode: advanceForm.payment_mode,
      bank_account_id: advanceForm.payment_mode === 'BANK' ? advanceForm.bank_account_id : undefined,
      leader_name: period.value.leader_name,
      created_by: user.value?.name || user.value?.email || 'system'
    }
    
    const res = await payAdvance(payload)
    if (res.success) {
      toast.add({ title: 'Advance Paid', description: `Advance of ₹${payload.amount} issued successfully`, color: 'success' })
      isAdvanceModalOpen.value = false
      loadDetails()
    }
  } catch (err: any) {
    toast.add({ title: 'Payment Failed', description: err.message, color: 'error' })
  } finally {
    savingPayment.value = false
  }
}

// Final Settlement
const isSettlementModalOpen = ref(false)

const settlementForm = reactive({
  payment_date: '',
  payment_mode: 'BANK',
  bank_account_id: '',
  paid_amount: 0,
  adjustment_reason: ''
})

const openSettlementModal = () => {
  settlementForm.payment_date = new Date().toISOString().split('T')[0] || ''
  settlementForm.payment_mode = 'BANK'
  settlementForm.bank_account_id = bankAccounts.value[0]?._id || ''
  settlementForm.paid_amount = netPayable.value
  settlementForm.adjustment_reason = ''
  isSettlementModalOpen.value = true
}

const adjustmentDifference = computed(() => {
  return parseFloat((netPayable.value - settlementForm.paid_amount).toFixed(2))
})

const submitSettlement = async () => {
  if (!selectedFirmId.value || !period.value) return
  savingPayment.value = true
  try {
    const payload = {
      firm_id: selectedFirmId.value,
      period_id: period.value.id,
      total_wages: sumWages.value,
      total_expenses: sumExpenses.value,
      total_advances: sumAdvances.value,
      net_payable: netPayable.value,
      paid_amount: settlementForm.paid_amount,
      adjustment_reason: Math.abs(adjustmentDifference.value) > 0.01 ? settlementForm.adjustment_reason : undefined,
      payment_date: settlementForm.payment_date,
      payment_mode: settlementForm.payment_mode,
      bank_account_id: settlementForm.payment_mode === 'BANK' ? settlementForm.bank_account_id : undefined,
      leader_name: period.value.leader_name,
      created_by: user.value?.name || user.value?.email || 'system'
    }

    // First save any current unsaved grid updates to preserve consistency
    const id = route.params.id as string
    const syncPayload = {
      workers: localWorkers.value.map(w => ({
        id: w.id,
        labor_name: w.labor_name,
        daily_wage: w.daily_wage,
        attendance: dates.value.map(d => {
          const dStr = dateKey(d)
          return { date: dStr, status: w.attendance[dStr] || 'L' }
        })
      })),
      expenses: localExpenses.value
    }
    await syncPeriodData(id, syncPayload)

    const res = await settlePeriod(payload)
    if (res.success) {
      toast.add({ title: 'Batch Settled', description: `Work batch successfully finalized and closed`, color: 'success' })
      isSettlementModalOpen.value = false
      loadDetails()
    }
  } catch (err: any) {
    toast.add({ title: 'Settlement Failed', description: err.message, color: 'error' })
  } finally {
    savingPayment.value = false
  }
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
