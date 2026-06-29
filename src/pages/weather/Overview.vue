<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useWeather } from '@/composables/useWeather'
import type { NormalizedWeather } from '@/types/weather'
import * as XLSX from 'xlsx'

const {
  cities,
  weatherCache,
  loadingWeather,
  syncProgress,
  fetchCities,
  fetchWeatherForCity,
  fetchAllWeather,
  activeWeatherData,
  averageTemperature,
  highestTemperature,
  lowestTemperature,
  highestWindSpeed,
  rainfallSummary
} = useWeather()

// UI state
const viewMode = ref<'grid' | 'table'>('grid')
const searchQuery = ref('')
const selectedState = ref('')
const minTempFilter = ref<number>(-10)
const maxTempFilter = ref<number>(55)
const minWindFilter = ref<number>(0)
const maxWindFilter = ref<number>(150)
const page = ref(1)
const limit = ref(12)

// Column Toggle selection (for data table)
const visibleColumns = ref<Record<string, boolean>>({
  apparentTemperature: true,
  humidity: true,
  pressure: true,
  windSpeed: true,
  rain: true,
  cloudCover: true,
  uvIndex: true
})

// Sort State
const sortColumn = ref<keyof NormalizedWeather | ''>('')
const sortDirection = ref<'asc' | 'desc'>('asc')

const handleSort = (col: keyof NormalizedWeather) => {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col
    sortDirection.value = 'asc'
  }
}

// Load initial data
onMounted(async () => {
  await fetchCities()
  loadFilters()
  // Trigger fetch of first batch of weather data if empty
  if (activeWeatherData.value.length === 0) {
    await fetchAllWeather(false)
  }
})

// Weather code visual helpers
const getWeatherInfo = (code: number | null) => {
  if (code === null) return { icon: '❓', label: 'N/A', color: 'text-slate-400', bg: 'bg-slate-50' }
  switch (code) {
    case 0: return { icon: '☀️', label: 'Clear Sky', color: 'text-amber-500', bg: 'bg-amber-50/50 border-amber-100' }
    case 1:
    case 2: return { icon: '🌤️', label: 'Partly Cloudy', color: 'text-teal-500', bg: 'bg-teal-50/50 border-teal-100' }
    case 3: return { icon: '☁️', label: 'Overcast', color: 'text-slate-500', bg: 'bg-slate-100/50 border-slate-200' }
    case 45:
    case 48: return { icon: '🌫️', label: 'Foggy', color: 'text-slate-400', bg: 'bg-slate-50 border-slate-150' }
    case 51:
    case 53:
    case 55: return { icon: '🌧️', label: 'Drizzle', color: 'text-cyan-500', bg: 'bg-cyan-50/50 border-cyan-100' }
    case 61:
    case 63:
    case 65: return { icon: '🌧️', label: 'Rainy', color: 'text-blue-500', bg: 'bg-blue-50/50 border-blue-100' }
    case 71:
    case 73:
    case 75: return { icon: '❄️', label: 'Snowy', color: 'text-sky-400', bg: 'bg-sky-50/50 border-sky-100' }
    case 80:
    case 81:
    case 82: return { icon: '🌦️', label: 'Showers', color: 'text-teal-600', bg: 'bg-teal-50/50 border-teal-100' }
    case 95:
    case 96:
    case 99: return { icon: '⛈️', label: 'Thunderstorm', color: 'text-indigo-600', bg: 'bg-indigo-50/50 border-indigo-100' }
    default: return { icon: '🌤️', label: 'Cloudy', color: 'text-slate-500', bg: 'bg-slate-50' }
  }
}

// State List
const uniqueStates = computed(() => {
  const states = cities.value.map((c) => c.state)
  return Array.from(new Set(states)).sort()
})

// Filter and Sort logic
const filteredCities = computed(() => {
  let list = cities.value.map((city) => {
    const weather = weatherCache.value[city.city]
    return weather || {
      timestamp: '',
      city: city.city,
      state: city.state,
      latitude: city.latitude,
      longitude: city.longitude,
      temperature: null,
      apparentTemperature: null,
      humidity: null,
      pressure: null,
      rain: null,
      rainProbability: null,
      windSpeed: null,
      windDirection: null,
      windGust: null,
      visibility: null,
      cloudCover: null,
      uvIndex: null,
      weatherCode: null,
      sunrise: null,
      sunset: null
    }
  })

  // 1. Text Search Filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter((c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
  }

  // 2. State Filter
  if (selectedState.value) {
    list = list.filter((c) => c.state === selectedState.value)
  }

  // 3. Temperature Range Filter
  list = list.filter((c) => {
    if (c.temperature === null) return true // Let un-fetched pass filters
    return c.temperature >= minTempFilter.value && c.temperature <= maxTempFilter.value
  })

  // 4. Wind Speed Range Filter
  list = list.filter((c) => {
    if (c.windSpeed === null) return true
    return c.windSpeed >= minWindFilter.value && c.windSpeed <= maxWindFilter.value
  })

  // 5. Sorting
  if (sortColumn.value) {
    list.sort((a, b) => {
      const valA = a[sortColumn.value as keyof NormalizedWeather]
      const valB = b[sortColumn.value as keyof NormalizedWeather]

      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1

      let comp = 0
      if (typeof valA === 'string' && typeof valB === 'string') {
        comp = valA.localeCompare(valB)
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comp = valA - valB
      }

      return sortDirection.value === 'asc' ? comp : -comp
    })
  }

  return list
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredCities.value.length / limit.value))

const paginatedCities = computed(() => {
  const start = (page.value - 1) * limit.value
  return filteredCities.value.slice(start, start + limit.value)
})

watch([searchQuery, selectedState, minTempFilter, maxTempFilter, minWindFilter, maxWindFilter], () => {
  page.value = 1 // Reset to page 1 on filter changes
})

// Export to Excel using xlsx dependency
const handleExcelExport = () => {
  const exportData = filteredCities.value.map((c) => ({
    City: c.city,
    State: c.state,
    'Temperature (°C)': c.temperature ?? 'N/A',
    'Feels Like (°C)': c.apparentTemperature ?? 'N/A',
    'Humidity (%)': c.humidity ?? 'N/A',
    'Pressure (hPa)': c.pressure ?? 'N/A',
    'Wind Speed (km/h)': c.windSpeed ?? 'N/A',
    'Wind Direction (°)': c.windDirection ?? 'N/A',
    'Rain (mm)': c.rain ?? 'N/A',
    'Rain Probability (%)': c.rainProbability ?? 'N/A',
    'Cloud Cover (%)': c.cloudCover ?? 'N/A',
    'UV Index': c.uvIndex ?? 'N/A',
    'Sunrise': c.sunrise ?? 'N/A',
    'Sunset': c.sunset ?? 'N/A',
    'Timestamp': c.timestamp ? new Date(c.timestamp).toLocaleString() : 'N/A'
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Indian Cities Weather')
  XLSX.writeFile(workbook, 'bizcore_weather_report.xlsx')
}

// Export to CSV
const handleCSVExport = () => {
  const headers = [
    'City', 'State', 'Temperature', 'Feels Like', 'Humidity', 
    'Pressure', 'Wind Speed', 'Rain', 'Cloud Cover', 'UV Index', 'Last Updated'
  ]
  
  const csvRows = [headers.join(',')]
  
  for (const c of filteredCities.value) {
    const values = [
      `"${c.city}"`,
      `"${c.state}"`,
      c.temperature ?? 'N/A',
      c.apparentTemperature ?? 'N/A',
      c.humidity ?? 'N/A',
      c.pressure ?? 'N/A',
      c.windSpeed ?? 'N/A',
      c.rain ?? 'N/A',
      c.cloudCover ?? 'N/A',
      c.uvIndex ?? 'N/A',
      c.timestamp ? `"${new Date(c.timestamp).toLocaleString()}"` : 'N/A'
    ]
    csvRows.push(values.join(','))
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', 'bizcore_weather_report.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Save & Load filters from localStorage
const saveFilters = () => {
  const filterState = {
    searchQuery: searchQuery.value,
    selectedState: selectedState.value,
    minTempFilter: minTempFilter.value,
    maxTempFilter: maxTempFilter.value,
    minWindFilter: minWindFilter.value,
    maxWindFilter: maxWindFilter.value
  }
  localStorage.setItem('weather-dashboard-filters', JSON.stringify(filterState))
}

const loadFilters = () => {
  const raw = localStorage.getItem('weather-dashboard-filters')
  if (raw) {
    try {
      const data = JSON.parse(raw)
      searchQuery.value = data.searchQuery ?? ''
      selectedState.value = data.selectedState ?? ''
      minTempFilter.value = data.minTempFilter ?? -10
      maxTempFilter.value = data.maxTempFilter ?? 55
      minWindFilter.value = data.minWindFilter ?? 0
      maxWindFilter.value = data.maxWindFilter ?? 150
    } catch (e) {
      console.warn('Error reading saved filters:', e)
    }
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedState.value = ''
  minTempFilter.value = -10
  maxTempFilter.value = 55
  minWindFilter.value = 0
  maxWindFilter.value = 150
  localStorage.removeItem('weather-dashboard-filters')
}
</script>

<template>
  <div class="space-y-6">
    
    <!-- 1. Header Summaries Section (Phase 5) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- Total Cities Card -->
      <div class="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">🏢</div>
        <div>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Cities</p>
          <p class="text-base font-black text-slate-800 font-mono mt-0.5">{{ cities.length }}</p>
        </div>
      </div>

      <!-- Sync Status Card -->
      <div class="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">⏳</div>
        <div>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cached Status</p>
          <button 
            @click="fetchAllWeather(true)" 
            :disabled="loadingWeather"
            class="px-2 py-0.5 text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded transition-all cursor-pointer border-0 mt-1"
          >
            {{ loadingWeather ? `Loading (${syncProgress}%)` : 'Sync Live' }}
          </button>
        </div>
      </div>

      <!-- Avg Temp Card -->
      <div class="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg font-mono">🌡️</div>
        <div>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Avg Temp</p>
          <p class="text-base font-black text-slate-800 font-mono mt-0.5">{{ averageTemperature }}°C</p>
        </div>
      </div>

      <!-- Highest Temp Card -->
      <div class="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg font-mono">🔥</div>
        <div>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Highest Temp</p>
          <p v-if="highestTemperature" class="text-xs font-black text-slate-800 font-mono mt-0.5 leading-tight">
            {{ highestTemperature.temperature }}°C <span class="text-[9px] font-bold text-gray-400 font-sans block truncate">{{ highestTemperature.city }}</span>
          </p>
          <p v-else class="text-xs font-black text-slate-400 font-mono mt-0.5">N/A</p>
        </div>
      </div>

      <!-- Lowest Temp Card -->
      <div class="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-sky-55 text-sky-600 flex items-center justify-center font-bold text-lg font-mono">❄️</div>
        <div>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Lowest Temp</p>
          <p v-if="lowestTemperature" class="text-xs font-black text-slate-800 font-mono mt-0.5 leading-tight">
            {{ lowestTemperature.temperature }}°C <span class="text-[9px] font-bold text-gray-400 font-sans block truncate">{{ lowestTemperature.city }}</span>
          </p>
          <p v-else class="text-xs font-black text-slate-400 font-mono mt-0.5">N/A</p>
        </div>
      </div>

      <!-- Rain Summary Card -->
      <div class="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg font-mono">🌧️</div>
        <div>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Rain Summary</p>
          <p class="text-xs font-black text-slate-800 font-mono mt-0.5 leading-tight">
            {{ rainfallSummary.count }} cities <span class="text-[9px] font-bold text-gray-400 font-sans block truncate">Total: {{ rainfallSummary.total }} mm</span>
          </p>
        </div>
      </div>
    </div>

    <!-- 2. Global Filters Panel (Phase 10) -->
    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
      <div class="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
        <h3 class="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 leading-none">
          ⚙️ Search & Filters
        </h3>
        <div class="flex items-center gap-2">
          <button @click="saveFilters" class="px-3 py-1 text-[10px] font-bold bg-slate-100 text-slate-650 rounded-lg hover:bg-slate-200 transition border-0 cursor-pointer">Save Filter</button>
          <button @click="resetFilters" class="px-3 py-1 text-[10px] font-bold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition border-0 cursor-pointer">Reset</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Text Search -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">City or State Name</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search city/state..."
            class="px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-semibold"
          />
        </div>

        <!-- State Dropdown -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">State Region</label>
          <select
            v-model="selectedState"
            class="px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-semibold bg-white"
          >
            <option value="">All States</option>
            <option v-for="st in uniqueStates" :key="st" :value="st">{{ st }}</option>
          </select>
        </div>

        <!-- Temperature Slider range (simulated using dual inputs) -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Temperature range (°C)</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="minTempFilter"
              type="number"
              placeholder="Min"
              class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-mono font-semibold"
            />
            <span class="text-xs text-slate-400">-</span>
            <input
              v-model.number="maxTempFilter"
              type="number"
              placeholder="Max"
              class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-mono font-semibold"
            />
          </div>
        </div>

        <!-- Wind Range -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Wind Speed range (km/h)</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="minWindFilter"
              type="number"
              placeholder="Min"
              class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-mono font-semibold"
            />
            <span class="text-xs text-slate-400">-</span>
            <input
              v-model.number="maxWindFilter"
              type="number"
              placeholder="Max"
              class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-mono font-semibold"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Actions Toolbar & View Switcher (Phase 7) -->
    <div class="bg-white px-5 py-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-extrabold text-slate-650">{{ filteredCities.length }} Cities Found</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Exports -->
        <div class="flex items-center gap-1.5 border-r border-gray-200 pr-3 mr-1">
          <button @click="handleExcelExport" class="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition rounded-xl flex items-center gap-1 border-0 cursor-pointer">
            📥 Excel
          </button>
          <button @click="handleCSVExport" class="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-55 hover:bg-teal-100 transition rounded-xl flex items-center gap-1 border-0 cursor-pointer">
            📥 CSV
          </button>
        </div>

        <!-- Layout toggle -->
        <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
          <button
            @click="viewMode = 'grid'"
            class="px-3 py-1 rounded-lg text-xs font-bold transition border-0 cursor-pointer"
            :class="[viewMode === 'grid' ? 'bg-white text-teal-600 shadow-sm font-extrabold' : 'text-slate-400']"
          >
            Grid
          </button>
          <button
            @click="viewMode = 'table'"
            class="px-3 py-1 rounded-lg text-xs font-bold transition border-0 cursor-pointer"
            :class="[viewMode === 'table' ? 'bg-white text-teal-600 shadow-sm font-extrabold' : 'text-slate-400']"
          >
            Table
          </button>
        </div>
      </div>
    </div>

    <!-- 4. Grid View Mode (Phase 5) -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="c in paginatedCities"
        :key="c.city"
        class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col justify-between"
      >
        <div>
          <!-- Card Header -->
          <div class="flex justify-between items-start">
            <div>
              <router-link :to="`/weather/city/${c.city}`" class="text-sm font-black text-slate-800 hover:text-teal-600 tracking-tight transition decoration-none block">
                {{ c.city }}
              </router-link>
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">{{ c.state }}</span>
            </div>
            
            <!-- Weather Code Badge -->
            <div 
              class="px-2 py-1 rounded-lg border text-[10px] font-black uppercase flex items-center gap-1.5"
              :class="getWeatherInfo(c.weatherCode).bg"
            >
              <span>{{ getWeatherInfo(c.weatherCode).icon }}</span>
              <span :class="getWeatherInfo(c.weatherCode).color">{{ getWeatherInfo(c.weatherCode).label }}</span>
            </div>
          </div>

          <!-- Temperature Metric -->
          <div class="mt-4 flex items-baseline gap-2">
            <h3 class="text-3xl font-black font-mono tracking-tighter text-slate-850">
              {{ c.temperature !== null ? `${Math.round(c.temperature)}°C` : '--' }}
            </h3>
            <span v-if="c.apparentTemperature !== null" class="text-[10px] font-bold text-slate-400 font-sans">
              Feels like {{ Math.round(c.apparentTemperature) }}°
            </span>
          </div>

          <!-- Sub-metrics Grid (High Density) -->
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 border-t border-slate-100 pt-3">
            <div>
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Humidity</span>
              <span class="text-xs font-extrabold text-slate-700 font-mono mt-0.5 block">
                {{ c.humidity !== null ? `${c.humidity}%` : '--' }}
              </span>
            </div>
            <div>
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Wind Speed</span>
              <span class="text-xs font-extrabold text-slate-700 font-mono mt-0.5 block">
                {{ c.windSpeed !== null ? `${c.windSpeed} km/h` : '--' }}
              </span>
            </div>
            <div>
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Rainfall</span>
              <span class="text-xs font-extrabold text-slate-700 font-mono mt-0.5 block">
                {{ c.rain !== null ? `${c.rain} mm` : '--' }}
              </span>
            </div>
            <div>
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">UV Index</span>
              <span class="text-xs font-extrabold text-slate-700 font-mono mt-0.5 block">
                {{ c.uvIndex !== null ? c.uvIndex : '--' }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            {{ c.timestamp ? `Updated ${new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Sync Pending' }}
          </span>
          <router-link :to="`/weather/city/${c.city}`" class="text-[9px] font-extrabold text-teal-600 hover:text-teal-700 uppercase tracking-wider decoration-none">
            Details →
          </router-link>
        </div>
      </div>
    </div>

    <!-- 5. Table View Mode (Phase 11) -->
    <div v-else class="bg-white rounded-2xl border border-gray-250/60 shadow-sm overflow-hidden">
      <!-- Table Settings toolbar -->
      <div class="p-3.5 bg-slate-50 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <span class="text-xs font-bold text-slate-500">Column visibility:</span>
        <div class="flex flex-wrap gap-2">
          <button 
            v-for="(val, col) in visibleColumns" 
            :key="col" 
            @click="visibleColumns[col] = !val"
            class="px-2 py-1 rounded text-[10px] font-bold transition border cursor-pointer"
            :class="[val ? 'bg-white border-teal-200 text-teal-600 font-extrabold' : 'bg-slate-100 border-slate-200 text-slate-400']"
          >
            {{ col.replace(/([A-Z])/g, ' $1').trim() }}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-gray-200 select-none">
              <th @click="handleSort('city')" class="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition">
                City <span v-if="sortColumn === 'city'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="handleSort('state')" class="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition">
                State <span v-if="sortColumn === 'state'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="handleSort('temperature')" class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition">
                Temp <span v-if="sortColumn === 'temperature'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th v-if="visibleColumns.apparentTemperature" class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500">Feels Like</th>
              <th v-if="visibleColumns.humidity" @click="handleSort('humidity')" class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition">
                Humidity <span v-if="sortColumn === 'humidity'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th v-if="visibleColumns.pressure" class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500">Pressure</th>
              <th v-if="visibleColumns.windSpeed" @click="handleSort('windSpeed')" class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition">
                Wind Speed <span v-if="sortColumn === 'windSpeed'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th v-if="visibleColumns.rain" @click="handleSort('rain')" class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition">
                Rain <span v-if="sortColumn === 'rain'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th v-if="visibleColumns.cloudCover" class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500">Cloud Cover</th>
              <th v-if="visibleColumns.uvIndex" class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500">UV Index</th>
              <th class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500">WMO State</th>
              <th class="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in paginatedCities"
              :key="c.city"
              class="border-b border-gray-150/70 hover:bg-slate-50/50 transition duration-150"
            >
              <td class="px-5 py-3 text-xs font-extrabold text-slate-800">{{ c.city }}</td>
              <td class="px-5 py-3 text-xs font-bold text-slate-500">{{ c.state }}</td>
              <td class="px-5 py-3 text-xs font-bold text-right font-mono text-slate-800">
                {{ c.temperature !== null ? `${Math.round(c.temperature)}°C` : '--' }}
              </td>
              <td v-if="visibleColumns.apparentTemperature" class="px-5 py-3 text-xs font-bold text-right font-mono text-slate-500">
                {{ c.apparentTemperature !== null ? `${Math.round(c.apparentTemperature)}°C` : '--' }}
              </td>
              <td v-if="visibleColumns.humidity" class="px-5 py-3 text-xs font-bold text-right font-mono text-slate-700">
                {{ c.humidity !== null ? `${c.humidity}%` : '--' }}
              </td>
              <td v-if="visibleColumns.pressure" class="px-5 py-3 text-xs font-bold text-right font-mono text-slate-500">
                {{ c.pressure !== null ? `${Math.round(c.pressure)} hPa` : '--' }}
              </td>
              <td v-if="visibleColumns.windSpeed" class="px-5 py-3 text-xs font-bold text-right font-mono text-slate-750">
                {{ c.windSpeed !== null ? `${c.windSpeed} km/h` : '--' }}
              </td>
              <td v-if="visibleColumns.rain" class="px-5 py-3 text-xs font-bold text-right font-mono text-blue-600">
                {{ c.rain !== null ? `${c.rain} mm` : '--' }}
              </td>
              <td v-if="visibleColumns.cloudCover" class="px-5 py-3 text-xs font-bold text-right font-mono text-slate-550">
                {{ c.cloudCover !== null ? `${c.cloudCover}%` : '--' }}
              </td>
              <td v-if="visibleColumns.uvIndex" class="px-5 py-3 text-xs font-bold text-right font-mono text-amber-600">
                {{ c.uvIndex !== null ? c.uvIndex : '--' }}
              </td>
              <td class="px-5 py-3 text-xs font-bold text-right">
                <span class="inline-flex items-center gap-1">
                  <span>{{ getWeatherInfo(c.weatherCode).icon }}</span>
                  <span class="text-[10px] text-slate-500 font-sans font-semibold">{{ getWeatherInfo(c.weatherCode).label }}</span>
                </span>
              </td>
              <td class="px-5 py-3 text-xs font-black text-right">
                <router-link :to="`/weather/city/${c.city}`" class="text-teal-650 hover:text-teal-700 uppercase tracking-wider text-[10px] decoration-none">
                  Analytics
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 6. Pagination Footer -->
    <div class="bg-white px-5 py-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
      <span class="text-xs font-bold text-slate-500">
        Showing {{ Math.min(filteredCities.length, (page - 1) * limit + 1) }}-{{ Math.min(filteredCities.length, page * limit) }} of {{ filteredCities.length }} cities
      </span>
      <div class="flex items-center gap-2">
        <button
          @click="page = Math.max(1, page - 1)"
          :disabled="page === 1"
          class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 transition border-0 cursor-pointer"
        >
          Previous
        </button>
        <span class="text-xs font-mono font-bold text-slate-700">{{ page }} / {{ totalPages }}</span>
        <button
          @click="page = Math.min(totalPages, page + 1)"
          :disabled="page === totalPages || totalPages === 0"
          class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 transition border-0 cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>

  </div>
</template>
