<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccounting } from '@/composables/useAccounting';

const router = useRouter();
const { trialBalance, fetchTrialBalance, exportProfitLossPdf, exportBalanceSheetPdf, loading, error } = useAccounting();

const exportLoading = ref(false);
const onExportPDF = async () => {
  exportLoading.value = true;
  try {
    const params: { fromDate?: string; toDate?: string } = {};
    if (fromDate.value) params.fromDate = fromDate.value;
    if (toDate.value) params.toDate = toDate.value;
    
    if (activeTab.value === 'pl') {
      await exportProfitLossPdf(params);
    } else {
      await exportBalanceSheetPdf(params);
    }
  } catch (err: any) {
    console.error('Failed to export PDF:', err);
  } finally {
    exportLoading.value = false;
  }
};

const activeTab = ref('pl'); // 'pl' or 'bs'
const fromDate = ref('');
const toDate = ref(new Date().toISOString().split('T')[0]);

const loadData = async () => {
  const params: { fromDate?: string; toDate?: string } = {};
  if (fromDate.value) params.fromDate = fromDate.value;
  if (toDate.value) params.toDate = toDate.value;
  await fetchTrialBalance(params);
};

const clearFilters = async () => {
  fromDate.value = '';
  toDate.value = new Date().toISOString().split('T')[0];
  await loadData();
};

const formatINR = (n: number) => {
  const frac = Math.abs(n) >= 100000 ? 0 : 2;
  return '₹ ' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac
  }).format(n);
};

const formatPercent = (v: number) => {
  return `${(Number.isFinite(v) ? Math.abs(v) : 0).toFixed(1)}%`;
};

// ─── Classification helpers ───
const isCOGS = (head: string, type: string) => {
  if (type === 'COGS') return true;
  const h = head.toLowerCase();
  return ['cogs', 'cost of goods', 'purchase', 'inventory'].some(k => h.includes(k)) && (type === 'EXPENSE' || type === 'COGS');
};

const isStock = (head: string) => {
  const h = head.toLowerCase();
  return ['inventory', 'stock'].some(k => h.includes(k));
};

const isGSTRec = (head: string) => {
  const h = head.toLowerCase();
  return ['gst', 'cgst', 'sgst', 'igst', 'tax receivable', 'input credit', 'input tax'].some(k => h.includes(k));
};

// ─── Computed P&L Model ───
const plModel = computed(() => {
  const plAccounts = trialBalance.value.filter(a => 
    ['INCOME', 'EXPENSE', 'COGS', 'GENERAL'].includes(a.accountType)
  ).map(a => {
    const netDr = a.totalDebit - a.totalCredit;
    const netCr = a.totalCredit - a.totalDebit;
    return {
      head: a.accountHead,
      type: a.accountType,
      netDr,
      netCr
    };
  });

  const income = plAccounts.filter(a => a.type === 'INCOME');
  const expense = plAccounts.filter(a => a.type === 'EXPENSE' || a.type === 'COGS');
  const general = plAccounts.filter(a => a.type === 'GENERAL');

  const cogs = expense.filter(a => isCOGS(a.head, a.type));
  const opex = expense.filter(a => !isCOGS(a.head, a.type));

  const crIncome = income.filter(a => a.netCr >= 0);
  const drContraIncome = income.filter(a => a.netCr < 0);
  const drCOGS = cogs.filter(a => a.netCr <= 0);
  const crCOGS = cogs.filter(a => a.netCr > 0);
  const drOpex = opex.filter(a => a.netCr <= 0);
  const crOpex = opex.filter(a => a.netCr > 0);
  const crGeneral = general.filter(a => a.netCr >= 0);
  const drGeneral = general.filter(a => a.netCr < 0);

  const totalRevenueCr = crIncome.reduce((s, a) => s + a.netCr, 0);
  const totalContraInc = drContraIncome.reduce((s, a) => s + Math.abs(a.netCr), 0);
  const totalCOGS = drCOGS.reduce((s, a) => s + Math.abs(a.netCr), 0) - crCOGS.reduce((s, a) => s + a.netCr, 0);
  const totalOpex = drOpex.reduce((s, a) => s + Math.abs(a.netCr), 0) - crOpex.reduce((s, a) => s + a.netCr, 0);
  const totalGeneralNet = general.reduce((s, a) => s + a.netCr, 0);

  const effectiveRevenue = totalRevenueCr - totalContraInc;
  const grossProfit = effectiveRevenue - totalCOGS;
  const netProfit = grossProfit - totalOpex + totalGeneralNet;
  const gpMargin = effectiveRevenue ? (grossProfit / effectiveRevenue) * 100 : 0;
  const npMargin = effectiveRevenue ? (netProfit / effectiveRevenue) * 100 : 0;

  // Balancing and Grand totals
  const drItems = totalCOGS + totalContraInc + totalOpex + 
                  drGeneral.reduce((s, a) => s + Math.abs(a.netCr), 0) - 
                  crCOGS.reduce((s, a) => s + a.netCr, 0) - 
                  crOpex.reduce((s, a) => s + a.netCr, 0);
  const crItems = totalRevenueCr + 
                  crGeneral.reduce((s, a) => s + a.netCr, 0) + 
                  crCOGS.reduce((s, a) => s + a.netCr, 0) + 
                  crOpex.reduce((s, a) => s + a.netCr, 0);
  const drGrand = drItems + Math.max(netProfit, 0);
  const crGrand = crItems + Math.max(-netProfit, 0);

  return {
    crIncome, drContraIncome, drCOGS, crCOGS, drOpex, crOpex, crGeneral, drGeneral,
    totalRevenueCr, totalContraInc, effectiveRevenue,
    totalCOGS, totalOpex, totalGeneralNet,
    grossProfit, netProfit, gpMargin, npMargin,
    drGrand, crGrand,
    isEmpty: plAccounts.length === 0
  };
});

// ─── Computed Balance Sheet Model ───
const bsModel = computed(() => {
  const bsAccounts = trialBalance.value.filter(a => 
    ['ASSET', 'LIABILITY', 'DEBTOR', 'CREDITOR', 'CASH', 'BANK', 'PAYABLE', 'CAPITAL', 'LABOR_LEADER'].includes(a.accountType)
  ).map(a => {
    const netDr = a.totalDebit - a.totalCredit;
    const netCr = a.totalCredit - a.totalDebit;
    return {
      head: a.accountHead,
      type: a.accountType,
      netDr,
      netCr
    };
  });

  const assetsRaw = bsAccounts.filter(a => ['ASSET', 'CASH', 'BANK', 'DEBTOR'].includes(a.type));
  const liabilitiesRaw = bsAccounts.filter(a => ['LIABILITY', 'PAYABLE', 'CREDITOR', 'LABOR_LEADER'].includes(a.type));

  // Asset side subdivisions (where netDr > 0)
  const stockAssets = assetsRaw.filter(a => isStock(a.head) && a.netDr > 0);
  const gstAssets = assetsRaw.filter(a => !isStock(a.head) && isGSTRec(a.head) && a.netDr > 0);
  const otherAssets = assetsRaw.filter(a => !isStock(a.head) && !isGSTRec(a.head) && a.type === 'ASSET' && a.netDr > 0);
  const debtors = assetsRaw.filter(a => a.type === 'DEBTOR' && a.netDr > 0);
  const cashBank = assetsRaw.filter(a => ['CASH', 'BANK'].includes(a.type) && a.netDr > 0);
  const liabilityDebitBalances = liabilitiesRaw.filter(a => a.netDr > 0);

  const totalStock = stockAssets.reduce((s, a) => s + a.netDr, 0);
  const totalGST = gstAssets.reduce((s, a) => s + a.netDr, 0);
  const totalOtherA = otherAssets.reduce((s, a) => s + a.netDr, 0);
  const totalDebtors = debtors.reduce((s, a) => s + a.netDr, 0);
  const totalCashBank = cashBank.reduce((s, a) => s + a.netDr, 0);
  const totalLiabilityDebitBalances = liabilityDebitBalances.reduce((s, a) => s + a.netDr, 0);

  const totalAssets = totalStock + totalGST + totalOtherA + totalDebtors + totalCashBank + totalLiabilityDebitBalances;

  // Liabilities side subdivisions (where netCr > 0)
  const liabilities = liabilitiesRaw.filter(a => ['LIABILITY', 'PAYABLE', 'LABOR_LEADER'].includes(a.type) && a.netCr > 0);
  const creditors = liabilitiesRaw.filter(a => a.type === 'CREDITOR' && a.netCr > 0);
  const assetCreditBalances = assetsRaw.filter(a => a.type === 'ASSET' && a.netCr > 0);
  const debtorCreditBalances = assetsRaw.filter(a => a.type === 'DEBTOR' && a.netCr > 0);
  const cashBankCreditBalances = assetsRaw.filter(a => ['CASH', 'BANK'].includes(a.type) && a.netCr > 0);

  const totalLiab = liabilities.reduce((s, a) => s + a.netCr, 0);
  const totalCred = creditors.reduce((s, a) => s + a.netCr, 0);
  const totalAssetCreditBalances = assetCreditBalances.reduce((s, a) => s + a.netCr, 0);
  const totalDebtorCreditBalances = debtorCreditBalances.reduce((s, a) => s + a.netCr, 0);
  const totalCashBankCreditBalances = cashBankCreditBalances.reduce((s, a) => s + a.netCr, 0);

  const totalExtLib = totalLiab + totalCred + totalAssetCreditBalances + totalDebtorCreditBalances + totalCashBankCreditBalances;

  // Capital (computed as balancing figure: Assets - External Liabilities - Current Net Profit)
  const netProfit = plModel.value.netProfit;
  const capital = totalAssets - totalExtLib - netProfit;
  const totalLiabSide = totalExtLib + capital + netProfit;

  const balanced = Math.abs(totalAssets - totalLiabSide) < 0.02;

  const assetSideCount = stockAssets.length + gstAssets.length + otherAssets.length + debtors.length + cashBank.length + liabilityDebitBalances.length;
  const liabilitySideCount = liabilities.length + creditors.length + assetCreditBalances.length + debtorCreditBalances.length + cashBankCreditBalances.length;

  return {
    stockAssets, gstAssets, otherAssets, debtors, cashBank, liabilityDebitBalances,
    totalStock, totalGST, totalOtherA, totalDebtors, totalCashBank, totalLiabilityDebitBalances, totalAssets,
    liabilities, creditors, assetCreditBalances, debtorCreditBalances, cashBankCreditBalances,
    totalLiab, totalCred, totalAssetCreditBalances, totalDebtorCreditBalances, totalCashBankCreditBalances, totalExtLib,
    capital, netProfit,
    assetSideCount, liabilitySideCount,
    totalLiabSide, balanced,
    isEmpty: bsAccounts.length === 0
  };
});

const triggerPrint = () => {
  window.print();
};

const viewLedger = (head: string) => {
  router.push({ path: '/accounting/ledger-view', query: { head } });
};

onMounted(loadData);
</script>

<template>
  <div class="p-6 max-w-[1600px] mx-auto space-y-6 print:p-0 print:space-y-4">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0">
      <div class="space-y-1">
        <p class="text-[10px] font-black text-violet-600 uppercase tracking-widest print:hidden">Accounting Reports</p>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Financial Statements</h1>
        <p class="text-sm text-slate-500 font-medium">Profit & Loss Statement and Balance Sheet</p>
        <p v-if="fromDate || toDate" class="text-xs text-violet-600 font-bold hidden print:block">
          Period: {{ fromDate ? fromDate : 'Beginning' }} to {{ toDate }}
        </p>
      </div>
      
      <!-- Date Filters & Actions -->
      <div class="flex flex-wrap items-center gap-3 print:hidden">
        <!-- Date fields inside header -->
        <div class="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
          <input type="date" v-model="fromDate" class="bg-transparent text-xs text-slate-700 outline-none w-28 font-bold" />
          <span class="text-xs text-slate-400">–</span>
          <input type="date" v-model="toDate" class="bg-transparent text-xs text-slate-700 outline-none w-28 font-bold" />
        </div>
        <button @click="loadData" class="px-5 py-2.5 bg-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all">Apply</button>
        <button @click="clearFilters" class="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Reset</button>
        <button 
          @click="onExportPDF"
          :disabled="exportLoading"
          class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {{ exportLoading ? 'Exporting...' : 'Export PDF' }}
        </button>
        <button @click="triggerPrint" class="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Print
        </button>
        <button @click="router.push('/accounting/ledger')" class="px-5 py-2.5 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Dashboard</button>
      </div>
    </header>

    <!-- Tab Selection -->
    <div class="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit print:hidden">
      <button 
        @click="activeTab = 'pl'"
        :class="activeTab === 'pl' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'"
        class="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
      >
        Profit &amp; Loss
      </button>
      <button 
        @click="activeTab = 'bs'"
        :class="activeTab === 'bs' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'"
        class="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
      >
        Balance Sheet
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="p-6 bg-rose-50 border border-rose-100 text-rose-800 rounded-3xl flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <p class="text-sm font-bold">{{ error }}</p>
      </div>
      <button @click="loadData" class="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase hover:bg-rose-700 transition-all">Retry</button>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-[2.5rem] border border-slate-100">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
      <p class="text-xs font-black uppercase tracking-widest text-slate-400">Loading statements...</p>
    </div>

    <!-- MAIN PANELS -->
    <div v-else-if="!loading">
      
      <!-- 1. PROFIT & LOSS TAB -->
      <div v-show="activeTab === 'pl'" class="space-y-6 print-tab-content">
        
        <!-- KPI Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-2">
          <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between border-l-4 border-l-emerald-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Revenue</p>
            <p class="text-xl font-black text-slate-900 font-mono mt-1">{{ formatINR(plModel.totalRevenueCr) }}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase">{{ plModel.crIncome.length }} account(s)</p>
          </div>
          <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between border-l-4 border-l-sky-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gross Profit</p>
            <p class="text-xl font-black text-slate-900 font-mono mt-1" :class="plModel.grossProfit >= 0 ? 'text-sky-600' : 'text-rose-600'">{{ formatINR(Math.abs(plModel.grossProfit)) }}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase">{{ formatPercent(plModel.gpMargin) }} GP Margin</p>
          </div>
          <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between border-l-4 border-l-amber-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total OpEx</p>
            <p class="text-xl font-black text-slate-900 font-mono mt-1">{{ formatINR(plModel.totalOpex) }}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase">{{ plModel.drOpex.length }} account(s)</p>
          </div>
          <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between border-l-4 border-l-violet-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Profit</p>
            <p class="text-xl font-black font-mono mt-1" :class="plModel.netProfit >= 0 ? 'text-violet-600' : 'text-rose-600'">{{ formatINR(Math.abs(plModel.netProfit)) }}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase">{{ formatPercent(plModel.npMargin) }} NP Margin</p>
          </div>
        </div>

        <div v-if="plModel.isEmpty" class="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center text-slate-400">
          No Income/Expense transactions to generate Profit &amp; Loss.
        </div>

        <!-- Statement T-Table -->
        <div v-else class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <header class="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 text-white">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trading &amp; Profit &amp; Loss Statement</p>
              <p class="text-xs text-slate-300 font-medium">Point-in-time calculation</p>
            </div>
            <div class="flex items-center gap-6 text-xs font-mono font-black">
              <div class="text-right">
                <span class="text-slate-400 text-[10px] uppercase mr-2">Dr:</span>
                <span class="text-rose-300">{{ formatINR(plModel.drGrand) }}</span>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div class="text-right">
                <span class="text-slate-400 text-[10px] uppercase mr-2">Cr:</span>
                <span class="text-emerald-300">{{ formatINR(plModel.crGrand) }}</span>
              </div>
            </div>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <!-- DEBIT SIDE (EXPENSES) -->
            <div class="flex flex-col">
              <div class="px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span> Debit Side (Dr)
              </div>
              
              <!-- COGS Segment -->
              <div>
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>To Cost of Goods Sold</span>
                  <span>{{ plModel.drCOGS.length }} A/Cs</span>
                </div>
                <div v-for="a in plModel.drCOGS" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(Math.abs(a.netCr)) }}</span>
                </div>
                <div v-if="plModel.drCOGS.length === 0" class="px-5 py-3 text-center text-[10px] text-slate-400 border-b border-slate-50">No COGS accounts</div>
                <div class="px-5 py-2.5 bg-amber-50/40 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Cost of Sales</span>
                  <span class="font-mono text-amber-700">{{ formatINR(plModel.totalCOGS) }}</span>
                </div>
              </div>

              <!-- Contra Income Segment -->
              <div v-if="plModel.drContraIncome.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>To Returns / Contra Income</span>
                  <span>{{ plModel.drContraIncome.length }} A/Cs</span>
                </div>
                <div v-for="a in plModel.drContraIncome" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(Math.abs(a.netCr)) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-orange-50/40 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Contra Income</span>
                  <span class="font-mono text-orange-700">{{ formatINR(plModel.totalContraInc) }}</span>
                </div>
              </div>

              <!-- Operating Expenses Segment -->
              <div>
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>To Operating Expenses</span>
                  <span>{{ plModel.drOpex.length }} A/Cs</span>
                </div>
                <div v-for="a in plModel.drOpex" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(Math.abs(a.netCr)) }}</span>
                </div>
                <div v-if="plModel.drOpex.length === 0" class="px-5 py-3 text-center text-[10px] text-slate-400 border-b border-slate-50">No operating expenses</div>
                <div class="px-5 py-2.5 bg-rose-50/40 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Operating Expenses</span>
                  <span class="font-mono text-rose-700">{{ formatINR(plModel.totalOpex) }}</span>
                </div>
              </div>

              <!-- General net debit Segment -->
              <div v-if="plModel.drGeneral.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">To Miscellaneous Expenses</div>
                <div v-for="a in plModel.drGeneral" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(Math.abs(a.netCr)) }}</span>
                </div>
              </div>

              <!-- Balancing figure Net Profit -->
              <div v-if="plModel.netProfit >= 0" class="px-5 py-4 mt-auto bg-violet-50/60 border-t border-violet-100 flex justify-between text-sm font-black text-violet-800">
                <div>
                  <p class="text-xs uppercase tracking-wider font-black">To Net Profit</p>
                  <p class="text-[9px] text-slate-400 font-bold uppercase font-sans tracking-wide">Transferred to Capital</p>
                </div>
                <span class="font-mono text-base font-black">{{ formatINR(plModel.netProfit) }}</span>
              </div>
            </div>

            <!-- CREDIT SIDE (REVENUES) -->
            <div class="flex flex-col">
              <div class="px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Credit Side (Cr)
              </div>

              <!-- Revenue Sales Segment -->
              <div>
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>By Revenue / Sales</span>
                  <span>{{ plModel.crIncome.length }} A/Cs</span>
                </div>
                <div v-for="a in plModel.crIncome" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netCr) }}</span>
                </div>
                <div v-if="plModel.crIncome.length === 0" class="px-5 py-3 text-center text-[10px] text-slate-400 border-b border-slate-50">No income accounts</div>
                <div class="px-5 py-2.5 bg-emerald-50/40 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Revenue</span>
                  <span class="font-mono text-emerald-700">{{ formatINR(plModel.totalRevenueCr) }}</span>
                </div>
              </div>

              <!-- General net credit Segment -->
              <div v-if="plModel.crGeneral.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>By Miscellaneous Income</span>
                  <span>{{ plModel.crGeneral.length }} A/Cs</span>
                </div>
                <div v-for="a in plModel.crGeneral" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netCr) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-teal-50/40 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Misc Income</span>
                  <span class="font-mono text-teal-700">{{ formatINR(plModel.crGeneral.reduce((s,a)=>s+a.netCr,0)) }}</span>
                </div>
              </div>

              <!-- Contra Expense Segment -->
              <div v-if="plModel.crCOGS.length + plModel.crOpex.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">By Contra Expense</div>
                <div v-for="a in [...plModel.crCOGS, ...plModel.crOpex]" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netCr) }}</span>
                </div>
              </div>

              <!-- Balancing figure Net Loss -->
              <div v-if="plModel.netProfit < 0" class="px-5 py-4 mt-auto bg-rose-50/60 border-t border-rose-100 flex justify-between text-sm font-black text-rose-800">
                <div>
                  <p class="text-xs uppercase tracking-wider font-black">By Net Loss</p>
                  <p class="text-[9px] text-slate-400 font-bold uppercase font-sans tracking-wide">Transferred to Capital</p>
                </div>
                <span class="font-mono text-base font-black">{{ formatINR(Math.abs(plModel.netProfit)) }}</span>
              </div>
              <div v-else class="flex-1 min-h-[36px]"></div>
            </div>
          </div>

          <!-- Statement Footer Totals -->
          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 text-white font-black" :class="plModel.netProfit >= 0 ? 'bg-gradient-to-br from-violet-600 to-indigo-700' : 'bg-gradient-to-br from-rose-600 to-pink-800'">
            <div class="flex items-center justify-between px-6 py-4">
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Dr Total</span>
              <span class="text-lg font-black font-mono tabular-nums">{{ formatINR(plModel.drGrand) }}</span>
            </div>
            <div class="flex items-center justify-between px-6 py-4">
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Cr Total</span>
              <span class="text-lg font-black font-mono tabular-nums">{{ formatINR(plModel.crGrand) }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- 2. BALANCE SHEET TAB -->
      <div v-show="activeTab === 'bs'" class="space-y-6 print-tab-content">
        
        <!-- BS KPI Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-2">
          <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between border-l-4 border-l-sky-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Assets</p>
            <p class="text-xl font-black text-slate-900 font-mono mt-1">{{ formatINR(bsModel.totalAssets) }}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase">{{ bsModel.assetSideCount }} asset A/Cs</p>
          </div>
          <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between border-l-4 border-l-rose-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">External Liabilities</p>
            <p class="text-xl font-black text-slate-900 font-mono mt-1">{{ formatINR(bsModel.totalExtLib) }}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase">{{ bsModel.liabilitySideCount }} liability A/Cs</p>
          </div>
          <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between border-l-4 border-l-emerald-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Capital (Equity)</p>
            <p class="text-xl font-black font-mono mt-1" :class="bsModel.capital >= 0 ? 'text-emerald-600' : 'text-rose-600'">{{ formatINR(Math.abs(bsModel.capital)) }}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase">{{ bsModel.capital >= 0 ? 'Owner Equity' : 'Equity Deficit' }}</p>
          </div>
          <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between border-l-4 border-l-violet-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Profit / (Loss)</p>
            <p class="text-xl font-black font-mono mt-1" :class="bsModel.netProfit >= 0 ? 'text-violet-600' : 'text-rose-600'">{{ formatINR(Math.abs(bsModel.netProfit)) }}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase">Period Income</p>
          </div>
        </div>

        <!-- Balance sheet warning/balanced tag -->
        <div class="flex items-center gap-2 print:hidden">
          <span class="inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-black" :class="bsModel.balanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'">
            <svg v-if="bsModel.balanced" class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            <svg v-else class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
            {{ bsModel.balanced ? 'Balanced' : `Imbalanced — ${formatINR(Math.abs(bsModel.totalAssets - bsModel.totalLiabSide))} difference` }}
          </span>
          <span class="text-[10px] text-slate-400 font-bold uppercase">Capital is computed dynamically as: Total Assets - Liabilities - Net Profit</span>
        </div>

        <div v-if="bsModel.isEmpty" class="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center text-slate-400">
          No Asset/Liability transactions to generate Balance Sheet.
        </div>

        <!-- Balance Sheet T-Table -->
        <div v-else class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <header class="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 text-white">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Balance Sheet</p>
              <p class="text-xs text-slate-300 font-medium">Double-entry balancing statement</p>
            </div>
            <div class="flex items-center gap-6 text-xs font-mono font-black">
              <div class="text-right">
                <span class="text-slate-400 text-[10px] uppercase mr-2">Liabilities Total:</span>
                <span class="text-rose-300">{{ formatINR(bsModel.totalLiabSide) }}</span>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div class="text-right">
                <span class="text-slate-400 text-[10px] uppercase mr-2">Assets Total:</span>
                <span class="text-emerald-300">{{ formatINR(bsModel.totalAssets) }}</span>
              </div>
            </div>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <!-- LIABILITIES & CAPITAL SIDE (L) -->
            <div class="flex flex-col">
              <div class="px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span> Liabilities &amp; Capital
              </div>

              <!-- Capital account details -->
              <div class="border-b border-slate-50">
                <div class="px-4 py-2 bg-emerald-50/50 text-[9px] font-black text-emerald-800 uppercase tracking-wider flex justify-between">
                  <span>Capital Account</span>
                  <span>Computed</span>
                </div>
                <div class="px-5 py-2 flex justify-between text-xs font-medium text-slate-700">
                  <div class="flex flex-col">
                    <span class="font-bold">Capital / Owner's Equity</span>
                    <span class="text-[9px] text-slate-400 uppercase">Assets – Liabilities – Net Profit</span>
                  </div>
                  <span class="font-mono font-bold" :class="bsModel.capital >= 0 ? 'text-emerald-700' : 'text-rose-600'">{{ formatINR(Math.abs(bsModel.capital)) }}</span>
                </div>
                <div class="px-5 py-2 flex justify-between text-xs font-medium text-slate-700 border-t border-slate-50">
                  <div class="flex flex-col">
                    <span class="font-bold">{{ bsModel.netProfit >= 0 ? 'Add: Net Profit' : 'Less: Net Loss' }}</span>
                    <span class="text-[9px] text-slate-400 uppercase">From current period P&amp;L</span>
                  </div>
                  <span class="font-mono font-bold text-violet-700">{{ formatINR(Math.abs(bsModel.netProfit)) }}</span>
                </div>
                <div class="px-5 py-2 bg-slate-50/30 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-t border-slate-100">
                  <span>Total Capital Pool</span>
                  <span class="font-mono text-slate-700 font-black">{{ formatINR(bsModel.capital + bsModel.netProfit) }}</span>
                </div>
              </div>

              <!-- Loans & Liabilities -->
              <div v-if="bsModel.liabilities.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>Loans &amp; Liabilities</span>
                  <span>{{ bsModel.liabilities.length }} A/Cs</span>
                </div>
                <div v-for="a in bsModel.liabilities" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netCr) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-rose-50/30 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Liabilities</span>
                  <span class="font-mono text-rose-700">{{ formatINR(bsModel.totalLiab) }}</span>
                </div>
              </div>

              <!-- Creditors -->
              <div v-if="bsModel.creditors.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>Sundry Creditors</span>
                  <span>{{ bsModel.creditors.length }} A/Cs</span>
                </div>
                <div v-for="a in bsModel.creditors" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netCr) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-amber-50/30 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Creditors</span>
                  <span class="font-mono text-amber-700">{{ formatINR(bsModel.totalCred) }}</span>
                </div>
              </div>

              <!-- Debtor Credit Balances -->
              <div v-if="bsModel.debtorCreditBalances.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Debtor Accounts (Credit Balance)</div>
                <div v-for="a in bsModel.debtorCreditBalances" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netCr) }}</span>
                </div>
              </div>

              <!-- Cash & Bank Credit Balances -->
              <div v-if="bsModel.cashBankCreditBalances.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Cash &amp; Bank (Overdraft)</div>
                <div v-for="a in bsModel.cashBankCreditBalances" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netCr) }}</span>
                </div>
              </div>

              <!-- Asset Credit Balances -->
              <div v-if="bsModel.assetCreditBalances.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Asset Accounts (Credit Balance)</div>
                <div v-for="a in bsModel.assetCreditBalances" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netCr) }}</span>
                </div>
              </div>

              <div class="flex-1 min-h-[24px]"></div>
            </div>

            <!-- ASSETS SIDE (A) -->
            <div class="flex flex-col">
              <div class="px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Asset Side (As)
              </div>

              <!-- Fixed / Other Assets -->
              <div v-if="bsModel.otherAssets.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>Fixed &amp; Other Assets</span>
                  <span>{{ bsModel.otherAssets.length }} A/Cs</span>
                </div>
                <div v-for="a in bsModel.otherAssets" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netDr) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-sky-50/30 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Fixed Assets</span>
                  <span class="font-mono text-sky-700">{{ formatINR(bsModel.totalOtherA) }}</span>
                </div>
              </div>

              <!-- Stock & Inventory -->
              <div v-if="bsModel.stockAssets.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>Stock &amp; Inventory</span>
                  <span>{{ bsModel.stockAssets.length }} A/Cs</span>
                </div>
                <div v-for="a in bsModel.stockAssets" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netDr) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-teal-50/30 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Stock Pool</span>
                  <span class="font-mono text-teal-700">{{ formatINR(bsModel.totalStock) }}</span>
                </div>
              </div>

              <!-- Tax Receivables -->
              <div v-if="bsModel.gstAssets.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>Tax Receivables (GST Input Credit)</span>
                  <span>{{ bsModel.gstAssets.length }} A/Cs</span>
                </div>
                <div v-for="a in bsModel.gstAssets" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netDr) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-violet-50/30 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Tax Receivables</span>
                  <span class="font-mono text-violet-700">{{ formatINR(bsModel.totalGST) }}</span>
                </div>
              </div>

              <!-- Sundry Debtors -->
              <div v-if="bsModel.debtors.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>Sundry Debtors</span>
                  <span>{{ bsModel.debtors.length }} A/Cs</span>
                </div>
                <div v-for="a in bsModel.debtors" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netDr) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-blue-50/30 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Debtors</span>
                  <span class="font-mono text-blue-700">{{ formatINR(bsModel.totalDebtors) }}</span>
                </div>
              </div>

              <!-- Cash & Bank -->
              <div v-if="bsModel.cashBank.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                  <span>Cash &amp; Bank Balances</span>
                  <span>{{ bsModel.cashBank.length }} A/Cs</span>
                </div>
                <div v-for="a in bsModel.cashBank" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netDr) }}</span>
                </div>
                <div class="px-5 py-2.5 bg-emerald-50/30 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between border-b border-slate-100">
                  <span>Total Cash &amp; Bank</span>
                  <span class="font-mono text-emerald-700">{{ formatINR(bsModel.totalCashBank) }}</span>
                </div>
              </div>

              <!-- Liability Debit Balances -->
              <div v-if="bsModel.liabilityDebitBalances.length > 0">
                <div class="px-4 py-2 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Liability Accounts (Debit Balance)</div>
                <div v-for="a in bsModel.liabilityDebitBalances" :key="a.head" class="px-5 py-2 hover:bg-slate-50/50 flex justify-between text-xs font-medium text-slate-700 border-b border-slate-50">
                  <span @click="viewLedger(a.head)" class="hover:text-indigo-600 cursor-pointer font-bold">{{ a.head }}</span>
                  <span class="font-mono font-bold">{{ formatINR(a.netDr) }}</span>
                </div>
              </div>

              <div class="flex-1 min-h-[24px]"></div>
            </div>
          </div>

          <!-- Statement Footer Totals -->
          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 text-white font-black" :class="bsModel.balanced ? 'bg-slate-800' : 'bg-gradient-to-br from-rose-600 to-pink-800'">
            <div class="flex items-center justify-between px-6 py-4">
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Total Capital &amp; Liabilities</span>
              <span class="text-lg font-black font-mono tabular-nums">{{ formatINR(bsModel.totalLiabSide) }}</span>
            </div>
            <div class="flex items-center justify-between px-6 py-4">
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Total Assets</span>
              <span class="text-lg font-black font-mono tabular-nums">{{ formatINR(bsModel.totalAssets) }}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  .print\:hidden {
    display: none !important;
  }
  .print\:block {
    display: block !important;
  }
  .print\:shadow-none {
    box-shadow: none !important;
  }
  .print\:border-none {
    border: none !important;
  }
  .print\:p-0 {
    padding: 0 !important;
  }
  .print\:space-y-4 > :not([class*="hidden"]) ~ :not([class*="hidden"]) {
    margin-top: 1rem !important;
  }
  /* Make both tabs visible when printing */
  .print-tab-content {
    display: block !important;
    page-break-after: always;
  }
}
</style>
