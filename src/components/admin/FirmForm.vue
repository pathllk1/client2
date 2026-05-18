<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'

const props = defineProps<{
  firm?: any
}>()

const emit = defineEmits(['success', 'close'])
const api = useApi()
const toast = useToast()
const loading = ref(false)
const fetchingGst = ref<Record<number, boolean>>({})

const fetchGstDetails = async (index: number) => {
  const gstin = form.locations[index]?.gst_number
  
  if (!gstin || gstin.length !== 15) {
    toast.add({ title: 'Invalid GSTIN', description: 'Please enter a valid 15-character GST number', color: 'error' })
    return
  }

  fetchingGst.value[index] = true
  try {
    const res = await api.get(`/firms/lookup-gst?gstin=${gstin}`)
    
    if (res.success && res.data) {
      const data = res.data
      const loc = form.locations[index]!
      
      // Map business/legal names (Corrected for snake_case API response)
      const businessName = data.trade_name || data.bnm || data.tradeName || ''
      const legalName = data.legal_name || data.lgnm || data.legalName || businessName
      
      // Populate global firm fields if this is the default location or first fetch
      if (loc.is_default || !form.name) {
        form.name = businessName || form.name
        form.legal_name = legalName || form.legal_name
        form.pan_number = gstin.substring(2, 12) // Derive PAN from GSTIN
        
        // 1. Establishment Year (Extract from registration_date "DD/MM/YYYY")
        if (data.registration_date) {
          const parts = data.registration_date.split('/')
          const year = parts[parts.length - 1]
          if (year && !isNaN(Number(year))) {
            form.establishment_year = Number(year)
          }
        }

        // 2. Business Type (Map from business_constitution)
        form.business_type = data.business_constitution || form.business_type

        // 3. Industry (Map from business_activity_nature array)
        if (Array.isArray(data.business_activity_nature)) {
          form.industry_type = data.business_activity_nature.join(', ')
        }
      }

      // Address mapping (Corrected for place_of_business_principal.address structure)
      const addrObj = data.place_of_business_principal?.address || data.pradr?.addr || data.principalAddress || data.address || {}
      
      loc.state = addrObj.state || addrObj.stcd || data.state || loc.state
      loc.city = addrObj.district || addrObj.dst || data.city || loc.city
      loc.pincode = addrObj.pin_code || addrObj.pncd || data.pincode || loc.pincode
      
      // Update top-level fields
      if (loc.is_default) {
        form.state = loc.state
        form.city = loc.city
        form.pincode = loc.pincode
      }

      // Build a clean address string
      const addrParts = [
        addrObj.door_num || addrObj.bno, 
        addrObj.building_name || addrObj.bnm, 
        addrObj.street || addrObj.st,  
        addrObj.location || addrObj.loc, 
        addrObj.district || addrObj.dst, 
        addrObj.state || addrObj.stcd 
      ].filter(Boolean)

      if (addrParts.length > 0) {
        loc.address = addrParts.join(', ')
        if (loc.is_default) form.address = loc.address
      } else if (typeof addrObj === 'string') {
        loc.address = addrObj
        if (loc.is_default) form.address = loc.address
      }
      
      toast.add({ 
        title: 'GST Verified', 
        description: `Successfully populated details for ${legalName || businessName}.`, 
        color: 'success' 
      })
    } else {
      toast.add({ title: 'Fetch Problem', description: 'API returned success but no business data was found.', color: 'warning' })
    }
  } catch (err: any) {
    toast.add({ title: 'Lookup Failed', description: err.message, color: 'error' })
  } finally {
    fetchingGst.value[index] = false
  }
}

const form = reactive({
  name: '',
  legal_name: '',
  code: '',
  description: '',
  phone_number: '',
  secondary_phone: '',
  email: '',
  website: '',
  business_type: '',
  industry_type: '',
  establishment_year: new Date().getFullYear(),
  employee_count: 0,
  registration_number: '',
  registration_date: '',
  cin_number: '',
  pan_number: '',
  status: 'approved',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  enable_e_invoice: false,
  
  // Top-level fields for display/legacy
  city: '',
  state: '',
  pincode: '',
  address: '',

  // Banking
  bank_name: '',
  bank_account_number: '',
  bank_branch: '',
  ifsc_code: '',
  payment_terms: '',

  // Locations (GST)
  locations: [
    {
      gst_number: '',
      state: '',
      state_code: '',
      registration_type: 'PPOB',
      address: '',
      city: '',
      pincode: '',
      is_default: true
    }
  ],

  // Optional Admin Account (only for creation)
  admin_account: {
    name: '',
    email: '',
    password: ''
  }
})

onMounted(() => {
  if (props.firm) {
    Object.assign(form, props.firm)
    // Don't show admin account fields for existing firms
  }
})

const addLocation = () => {
  form.locations.push({
    gst_number: '',
    state: '',
    state_code: '',
    registration_type: 'APOB',
    address: '',
    city: '',
    pincode: '',
    is_default: false
  })
}

const removeLocation = (index: number) => {
  if (form.locations[index]?.is_default) {
    toast.add({ title: 'Error', description: 'Cannot remove the default location', color: 'error' })
    return
  }
  form.locations.splice(index, 1)
}

const setDefaultLocation = (index: number) => {
  form.locations.forEach((loc, i) => {
    loc.is_default = i === index
  })
}

const onSubmit = async () => {
  loading.value = true
  try {
    let res
    if (props.firm?._id) {
      res = await api.put(`/firms/admin/${props.firm._id}`, form)
    } else {
      res = await api.post('/firms/admin', form)
    }

    if (res.success) {
      toast.add({ title: 'Success', description: res.message, color: 'success' })
      emit('success')
      emit('close')
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="space-y-10 p-2">
    <!-- Section 1: Core Identity -->
    <div class="space-y-6">
      <div class="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
        <UIcon name="i-heroicons-building-office-2" class="w-5 h-5 text-primary" />
        <h3 class="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">Core Identity</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UFormField label="Firm Display Name" required>
          <UInput v-model="form.name" placeholder="Acme Corp" required class="w-full" />
        </UFormField>

        <UFormField label="Legal Name">
          <UInput v-model="form.legal_name" placeholder="Acme International Private Limited" class="w-full" />
        </UFormField>

        <UFormField label="Unique Code">
          <UInput v-model="form.code" placeholder="ACME01" class="w-full" />
        </UFormField>

        <UFormField label="Establishment Year">
          <UInput v-model="form.establishment_year" type="number" class="w-full" />
        </UFormField>

        <UFormField label="Business Type">
          <USelect v-model="form.business_type" :items="['Private Limited', 'Public Limited', 'Partnership', 'Proprietorship', 'LLP']" class="w-full" />
        </UFormField>

        <UFormField label="Industry">
          <UInput v-model="form.industry_type" placeholder="Manufacturing, Services, etc." class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Firm Description">
        <UTextarea v-model="form.description" placeholder="Brief overview of the business..." class="w-full" :rows="2" />
      </UFormField>
    </div>

    <!-- Section 2: Contact & Compliance -->
    <div class="space-y-6">
      <div class="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
        <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-primary" />
        <h3 class="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">Contact & Compliance</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UFormField label="Primary Phone" required>
          <UInput v-model="form.phone_number" placeholder="+91..." required class="w-full" />
        </UFormField>

        <UFormField label="Official Email" required>
          <UInput v-model="form.email" type="email" placeholder="contact@acme.com" required class="w-full" />
        </UFormField>

        <UFormField label="Website">
          <UInput v-model="form.website" placeholder="https://..." class="w-full" />
        </UFormField>

        <UFormField label="PAN Number">
          <UInput v-model="form.pan_number" placeholder="10 characters" class="w-full" />
        </UFormField>

        <UFormField label="CIN Number">
          <UInput v-model="form.cin_number" placeholder="21 characters" class="w-full" />
        </UFormField>

        <UFormField label="Registration No">
          <UInput v-model="form.registration_number" placeholder="Local registration ID" class="w-full" />
        </UFormField>
      </div>
    </div>

    <!-- Section 3: GST Locations -->
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-primary" />
          <h3 class="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">GST & Locations</h3>
        </div>
        <UButton size="xs" variant="outline" icon="i-heroicons-plus" label="Add GST Location" @click="addLocation" />
      </div>

      <div v-for="(loc, index) in form.locations" :key="index" 
           class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800 space-y-4 relative">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UBadge :color="loc.is_default ? 'primary' : 'neutral'" variant="subtle" size="sm">
              {{ loc.is_default ? 'Principal Place (PPOB)' : 'Additional Place (APOB)' }}
            </UBadge>
            <UButton v-if="!loc.is_default" size="xs" variant="ghost" label="Make Default" @click="setDefaultLocation(index)" />
          </div>
          <UButton v-if="form.locations.length > 1" size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="removeLocation(index)" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UFormField label="GSTIN">
            <UInput v-model="loc.gst_number" placeholder="07AAAAA0000A1Z5" class="w-full" :loading="fetchingGst[index]">
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-magnifying-glass"
                  :loading="fetchingGst[index]"
                  @click="fetchGstDetails(index)"
                />
              </template>
            </UInput>
          </UFormField>
          
          <UFormField label="State">
            <UInput v-model="loc.state" placeholder="Delhi" class="w-full" />
          </UFormField>

          <UFormField label="City">
            <UInput v-model="loc.city" placeholder="New Delhi" class="w-full" />
          </UFormField>

          <UFormField label="Pincode">
            <UInput v-model="loc.pincode" placeholder="110001" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Full Address">
          <UInput v-model="loc.address" placeholder="Building, Street, Area..." class="w-full" />
        </UFormField>
      </div>
    </div>

    <!-- Section 4: Banking & Finance -->
    <div class="space-y-6">
      <div class="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
        <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-primary" />
        <h3 class="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">Banking & Finance</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UFormField label="Bank Name">
          <UInput v-model="form.bank_name" class="w-full" />
        </UFormField>

        <UFormField label="Account No">
          <UInput v-model="form.bank_account_number" class="w-full" />
        </UFormField>

        <UFormField label="IFSC Code">
          <UInput v-model="form.ifsc_code" class="w-full" />
        </UFormField>

        <UFormField label="Currency">
          <USelect v-model="form.currency" :items="['INR', 'USD', 'EUR', 'GBP']" class="w-full" />
        </UFormField>
      </div>
    </div>

    <!-- Section 5: Initial Admin Account (Only for Create) -->
    <div v-if="!firm" class="space-y-6 bg-primary-50 dark:bg-primary-950/20 p-6 rounded-xl border border-primary-100 dark:border-primary-900">
      <div class="flex items-center gap-2 pb-2">
        <UIcon name="i-heroicons-user-plus" class="w-5 h-5 text-primary" />
        <h3 class="font-black text-sm uppercase tracking-widest text-primary">Initial Owner Account</h3>
      </div>
      <p class="text-xs text-primary-600 dark:text-primary-400">Create the first user account for this firm. This user will have Owner privileges.</p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <UFormField label="Admin Full Name">
          <UInput v-model="form.admin_account.name" placeholder="Firm Owner" class="w-full bg-white dark:bg-gray-900" />
        </UFormField>

        <UFormField label="Admin Email">
          <UInput v-model="form.admin_account.email" type="email" placeholder="owner@firm.com" class="w-full bg-white dark:bg-gray-900" />
        </UFormField>

        <UFormField label="Temporary Password">
          <UInput v-model="form.admin_account.password" type="password" placeholder="••••••••" class="w-full bg-white dark:bg-gray-900" />
        </UFormField>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex justify-end gap-3 pt-8 border-t border-gray-100 dark:border-gray-800">
      <UButton variant="ghost" color="neutral" size="lg" label="Cancel" @click="emit('close')" />
      <UButton type="submit" :loading="loading" size="lg" :label="firm ? 'Update Firm' : 'Register Firm'" class="px-12" />
    </div>
  </form>
</template>
