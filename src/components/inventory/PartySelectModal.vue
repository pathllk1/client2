<script setup lang="ts">
import { ref, computed } from 'vue';

interface Party {
  _id: string;
  firm: string;
  gstin: string;
  addr: string;
  state: string;
  state_code: string;
  contact?: string;
}

const props = defineProps<{
  parties: Party[];
}>();

const emit = defineEmits(['select', 'create']);

const isOpen = ref(false);
const searchQuery = ref('');

const filteredParties = computed(() => {
  if (!searchQuery.value) return props.parties;
  const q = searchQuery.value.toLowerCase();
  return props.parties.filter(p => 
    p.firm.toLowerCase().includes(q) || 
    p.gstin?.toLowerCase().includes(q)
  );
});

const selectParty = (party: Party) => {
  emit('select', party);
  isOpen.value = false;
};

const open = () => {
  isOpen.value = true;
};

defineExpose({ open });
</script>

<template>
  <UModal v-model:open="isOpen" title="Select Party" description="Search and select a supplier or customer from the list.">
    <template #body>
      <div class="space-y-4">
        <div class="flex gap-2">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search by firm name or GSTIN..."
            autofocus
            class="flex-1"
          />
          <UButton icon="i-lucide-plus" color="primary" @click="emit('create')" />
        </div>
        
        <div class="max-h-[50vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="party in filteredParties"
            :key="party._id"
            class="p-3 hover:bg-primary-50 dark:hover:bg-primary-950/20 cursor-pointer transition-colors group rounded-lg"
            @click="selectParty(party)"
          >
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-bold group-hover:text-primary transition-colors">{{ party.firm }}</h4>
                <div class="text-xs text-gray-500 mt-0.5 flex gap-2">
                  <span class="font-mono">{{ party.gstin || 'UNREGISTERED' }}</span>
                  <span>•</span>
                  <span>{{ party.state }} ({{ party.state_code }})</span>
                </div>
                <p class="text-xs text-gray-400 mt-1 line-clamp-1 italic">{{ party.addr }}</p>
              </div>
              <UIcon name="i-lucide-chevron-right" class="text-gray-300 group-hover:text-primary" />
            </div>
          </div>
          
          <div v-if="filteredParties.length === 0" class="py-12 text-center text-gray-500">
            <UIcon name="i-lucide-user-x" class="text-4xl opacity-20 mb-2" />
            <p>No parties found matching your search.</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
