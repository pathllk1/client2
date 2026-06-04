<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
    <!-- Hero Section -->
    <section class="relative overflow-hidden py-20 lg:py-32 border-b border-slate-200/50 dark:border-slate-800/50">
      <!-- Decorative background blur gradients -->
      <div class="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-10 left-1/3 w-[400px] h-[200px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-5xl mx-auto px-6 text-center space-y-6">
        <span class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 uppercase tracking-widest leading-none">
          Unified Business Suite
        </span>
        <h1 class="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
          Antigravity ERP
        </h1>
        <p class="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">
          The unified operations and compliance platform built for modern industrial contractors, manufacturers, and growing corporate enterprises.
        </p>
        <div class="pt-4 flex flex-wrap items-center justify-center gap-4">
          <UButton 
            v-if="isAuthenticated" 
            size="xl" 
            color="primary" 
            class="font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
            to="/dashboard"
          >
            Enter Console
          </UButton>
          <UButton 
            v-else 
            size="xl" 
            color="primary" 
            class="font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
            to="/auth/login"
          >
            Access Portal
          </UButton>
          <UButton 
            size="xl" 
            variant="outline" 
            color="neutral" 
            class="font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl bg-white dark:bg-slate-900"
            to="/auth/signup"
            v-if="!isAuthenticated"
          >
            Create Free Account
          </UButton>
        </div>
      </div>
    </section>

    <!-- Core ERP Pillars/Modules Showcase -->
    <section class="py-16 max-w-6xl mx-auto px-6">
      <div class="text-center space-y-2 mb-12">
        <h2 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Built for Operations</h2>
        <h3 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Core Capabilities</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- accounting & Financials -->
        <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 hover:shadow-lg transition-all flex gap-5 group">
          <div class="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <UIcon name="i-heroicons-banknotes" class="w-6 h-6" />
          </div>
          <div class="space-y-3">
            <h4 class="text-[11px] font-black text-blue-600 uppercase tracking-widest leading-none">Financial Module</h4>
            <h3 class="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">General Ledger & GST Compliance</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Maintain a robust Double-Entry Ledger, Chart of Accounts, and trial balances. Complete compliance with automated GSTR-1 and GSTR-3B tax returns direct from invoices.
            </p>
            <div class="pt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>• Sales Invoicing</span>
              <span>• Purchase Bills</span>
              <span>• Returns & Credits</span>
            </div>
          </div>
        </div>

        <!-- Supply Chain & Inventory -->
        <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 hover:shadow-lg transition-all flex gap-5 group">
          <div class="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <UIcon name="i-heroicons-cube" class="w-6 h-6" />
          </div>
          <div class="space-y-3">
            <h4 class="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none">Logistics Module</h4>
            <h3 class="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">Inventory & Multi-Batch Control</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Track stock item batches, expiry dates, and MRP profiles. Dynamic valuation calculations (FIFO) ensure accurate financial statements and real-time ledger sync.
            </p>
            <div class="pt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>• Batch tracking</span>
              <span>• Expiry Alerts</span>
              <span>• Movement Ledger</span>
            </div>
          </div>
        </div>

        <!-- Human Resource Management -->
        <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 hover:shadow-lg transition-all flex gap-5 group">
          <div class="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <UIcon name="i-heroicons-users" class="w-6 h-6" />
          </div>
          <div class="space-y-3">
            <h4 class="text-[11px] font-black text-amber-600 uppercase tracking-widest leading-none">HRM Module</h4>
            <h3 class="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">Workforce Registry & Onboarding</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Maintain a robust employee master roll registry. Track custom category notice periods, onboarding metadata, and generate official appointment letters instantly.
            </p>
            <div class="pt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>• Spreadsheet Import</span>
              <span>• Word Document Gen</span>
              <span>• Identity Cards</span>
            </div>
          </div>
        </div>

        <!-- Wages & Statutory Compliance -->
        <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 hover:shadow-lg transition-all flex gap-5 group">
          <div class="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <UIcon name="i-heroicons-chart-bar" class="w-6 h-6" />
          </div>
          <div class="space-y-3">
            <h4 class="text-[11px] font-black text-rose-600 uppercase tracking-widest leading-none">Payroll Module</h4>
            <h3 class="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">Wages & Statutory Deductions</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Calculate wages dynamically by site or project. Handle employer and employee statutory contributions (EPF and ESIC) seamlessly with interactive cost analytics.
            </p>
            <div class="pt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>• EPF/ESIC Rules</span>
              <span>• Project Costing</span>
              <span>• Trend Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Antigravity (Value Proposition) -->
    <section class="py-16 bg-slate-100 dark:bg-slate-900/40 border-y border-slate-200/50 dark:border-slate-800/50">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center space-y-2 mb-12">
          <h2 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Enterprise Advantage</h2>
          <h3 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Key Value Propositions</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <UIcon name="i-heroicons-building-office-2" class="w-5 h-5" />
            </div>
            <h4 class="font-black text-sm uppercase text-slate-900 dark:text-white leading-tight">Multi-Tenant Subsidiary Control</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Manage multiple independent corporate firms or contract subsidiaries from a single platform. Switch context dynamically to load local assets, ledger states, and settings.
            </p>
          </div>

          <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <UIcon name="i-heroicons-shield-check" class="w-5 h-5" />
            </div>
            <h4 class="font-black text-sm uppercase text-slate-900 dark:text-white leading-tight">Granular Audit Logging & Security</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Full system integration audit logger tracks operational access and revisions. Real-time session protection with secure cryptographic verification.
            </p>
          </div>

          <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
            </div>
            <h4 class="font-black text-sm uppercase text-slate-900 dark:text-white leading-tight">Unified Data Integrity</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              All modules talk to each other seamlessly. Inventory sales automatically record double-entry accounting ledger entries, and master roll syncs directly to wages.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Call-To-Action Banner -->
    <section class="py-16 md:py-24 max-w-5xl mx-auto px-6 text-center space-y-6">
      <h2 class="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
        Streamline your operations today
      </h2>
      <p class="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm font-semibold leading-relaxed">
        Start managing your accounts, logistics, and payroll inside a secure, compliant enterprise environment. Setup takes only a few minutes.
      </p>
      <div class="pt-4 flex justify-center gap-4">
        <UButton 
          v-if="isAuthenticated" 
          size="lg" 
          color="primary" 
          class="font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg"
          to="/dashboard"
        >
          Go to Dashboard
        </UButton>
        <UButton 
          v-else 
          size="lg" 
          color="primary" 
          class="font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg"
          to="/auth/signup"
        >
          Get Started Now
        </UButton>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-slate-200/50 dark:border-slate-800/50 py-8 bg-white dark:bg-slate-950 text-center text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
      <div class="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>© 2026 Antigravity Enterprise Solutions. All Rights Reserved.</span>
        <div class="flex gap-4">
          <RouterLink to="/terms" class="hover:text-indigo-600 transition-colors">Terms of Service</RouterLink>
          <RouterLink to="/privacy" class="hover:text-indigo-600 transition-colors">Privacy Policy</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>
