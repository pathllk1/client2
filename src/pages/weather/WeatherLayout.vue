<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="space-y-4 max-w-[1600px] mx-auto">
    <!-- Inner sub-navigation banner -->
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-250/60 flex flex-wrap gap-4 items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-0.5">
          <span class="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
          <span class="text-[9px] font-black text-teal-650 uppercase tracking-widest leading-none">Weather Analytics Console</span>
        </div>
        <h1 class="text-lg font-black uppercase tracking-wider text-gray-900 mt-1 leading-none">Indian Cities Weather Dashboard</h1>
      </div>
      
      <!-- Sub-tabs navigation links -->
      <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
        <router-link
          to="/weather"
          class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 uppercase tracking-wider text-slate-500 hover:text-slate-800 decoration-none"
          active-class="bg-white text-teal-600 font-extrabold shadow-sm border border-slate-200/20"
          exact-active-class="bg-white text-teal-600 font-extrabold shadow-sm border border-slate-200/20"
        >
          Overview
        </router-link>
        <router-link
          to="/weather/compare"
          class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 uppercase tracking-wider text-slate-500 hover:text-slate-800 decoration-none"
          active-class="bg-white text-teal-600 font-extrabold shadow-sm border border-slate-200/20"
          exact-active-class="bg-white text-teal-600 font-extrabold shadow-sm border border-slate-200/20"
        >
          Comparison
        </router-link>
      </div>
    </div>

    <!-- Inner page router view -->
    <router-view />
  </div>
</template>

<style scoped>
.router-link-active {
  background-color: white !important;
  color: #0d9488 !important; /* Teal 600 */
}
</style>
