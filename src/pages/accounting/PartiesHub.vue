<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-slate-900 border-b border-indigo-700/30 shadow-lg sticky top-0 z-30">
      <div class="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-7xl mx-auto">
        <div>
          <h1 class="text-2xl font-black text-white">Parties Hub</h1>
          <p class="text-sm text-indigo-200 mt-1">Manage suppliers, customers, and business partners</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-bold text-white">
              {{ parties.length }} Total
            </span>
          </div>
          <button @click="showCreateModal = true" class="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-all shadow-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            Create Party
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Search & Filters -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div class="relative flex-1">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input type="text" v-model="searchQuery" placeholder="Search by name, GSTIN, or PAN..." class="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
        </div>
        <select v-model="typeFilter" class="px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:border-indigo-400 outline-none transition">
          <option value="">📊 All Types</option>
          <option value="CUSTOMER">📌 Customers</option>
          <option value="SUPPLIER">🏢 Suppliers</option>
          <option value="BOTH">🔄 Both</option>
        </select>
      </div>

      <!-- Parties Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="party in filteredParties" :key="party._id" class="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col">
          <!-- Card Top -->
          <div :class="getAvatarColor(party.name)" class="p-5 text-white bg-gradient-to-br">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 font-bold text-xl backdrop-blur-md">
                {{ party.name[0]?.toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-base truncate">{{ party.name }}</h3>
                <p class="text-xs text-white/70 truncate mt-0.5">{{ party.address || 'No address' }}</p>
              </div>
            </div>
          </div>

          <!-- Card Body -->
          <div class="p-5 flex-1 space-y-4 text-sm">
             <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">GSTIN / Status</p>
                <div class="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                   <p class="font-bold text-slate-700 text-xs">{{ party.gstin || 'UNREGISTERED' }}</p>
                   <p class="text-[10px] text-slate-500 mt-0.5">{{ party.partyType }}</p>
                </div>
             </div>

             <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                   <p class="text-[10px] font-bold uppercase text-slate-400 mb-1">State</p>
                   <p class="font-bold text-slate-700">{{ party.state || '—' }}</p>
                </div>
                <div class="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                   <p class="text-[10px] font-bold uppercase text-slate-400 mb-1">PAN</p>
                   <p class="font-mono text-slate-600 uppercase">{{ party.pan || '—' }}</p>
                </div>
             </div>
          </div>

          <!-- Card Footer -->
          <div class="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
             <button class="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md">Edit Details</button>
             <button class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
             </button>
          </div>
        </div>

        <div v-if="filteredParties.length === 0" class="col-span-full py-20 text-center">
           <div class="flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              <h3 class="text-xl font-bold text-slate-400">No parties found</h3>
              <p class="text-slate-400 mt-1">Try adjusting your search or filters</p>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBilling } from '../../composables/useBilling';

const { parties, fetchParties } = useBilling();

const searchQuery = ref('');
const typeFilter = ref('');
const showCreateModal = ref(false);

onMounted(() => {
  fetchParties();
});

const filteredParties = computed(() => {
  return parties.value.filter(p => {
    const matchesSearch = !searchQuery.value || 
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.gstin?.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesType = !typeFilter.value || p.partyType === typeFilter.value;
    
    return matchesSearch && matchesType;
  });
});

const colors = [
  'from-indigo-500 to-indigo-600',
  'from-emerald-500 to-emerald-600',
  'from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600',
  'from-sky-500 to-sky-600',
  'from-violet-500 to-violet-600',
  'from-teal-500 to-teal-600'
];

function getAvatarColor(name: string) {
  const index = (name.charCodeAt(0) || 0) % colors.length;
  return colors[index];
}
</script>
