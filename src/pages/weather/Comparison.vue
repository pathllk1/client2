<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useWeather } from '@/composables/useWeather'
import { api } from '@/utils/api'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const { cities, fetchCities } = useWeather()

// Comparison Mode: 'cities' (City A vs City B) or 'dates' (Same City between Dates)
const comparisonMode = ref<'cities' | 'dates'>('cities')

// Selectors for City vs City Mode
const cityA = ref('')
const cityB = ref('')
const dataA = ref<any>(null)
const dataB = ref<any>(null)

// Selectors for Date vs Date Mode
const selectedCity = ref('')
const rangePreset = ref<'1week' | '2weeks' | '1month' | '2months' | 'custom'>('1week')
const dateAStr = ref(new Date().toISOString().substring(0, 10)) // default today
const dateBStr = ref(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)) // default 7 days ago

const dateDataA = ref<any>(null)
const dateDataB = ref<any>(null)

const loading = ref(false)
const error = ref('')

// Chart canvases
const compareChartCanvas = ref<HTMLCanvasElement | null>(null)
let compareChartInstance: Chart | null = null

// Load cities list on start
onMounted(async () => {
  await fetchCities()
  if (cities.value.length >= 2) {
    cityA.value = cities.value[0]!.city
    cityB.value = cities.value[1]!.city
    selectedCity.value = cities.value[0]!.city
    loadCitiesComparison()
  }
})

// ─── Preset date calculations ──────────────────────────────────────────────
watch(rangePreset, (preset) => {
  if (preset === 'custom') return
  
  const today = new Date()
  dateAStr.value = today.toISOString().substring(0, 10)
  
  let daysAgo = 7
  if (preset === '2weeks') daysAgo = 14
  else if (preset === '1month') daysAgo = 30
  else if (preset === '2months') daysAgo = 60
  
  const pastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  dateBStr.value = pastDate.toISOString().substring(0, 10)
  loadDatesComparison()
})

// Trigger loading on changes
watch([cityA, cityB], () => {
  if (comparisonMode.value === 'cities') {
    loadCitiesComparison()
  }
})

watch([selectedCity, dateAStr, dateBStr], () => {
  if (comparisonMode.value === 'dates') {
    loadDatesComparison()
  }
})

watch(comparisonMode, (mode) => {
  error.value = ''
  if (mode === 'cities') {
    loadCitiesComparison()
  } else {
    loadDatesComparison()
  }
})

// ─── Loader Methods ────────────────────────────────────────────────────────
const loadCitiesComparison = async () => {
  if (!cityA.value || !cityB.value) return
  loading.value = true
  error.value = ''
  
  try {
    const [resA, resB] = await Promise.all([
      api.get('/open-meteo/weather', { params: { city: cityA.value } }),
      api.get('/open-meteo/weather', { params: { city: cityB.value } })
    ])
    
    if (resA.success && resB.success) {
      dataA.value = resA.data.normalized
      dataB.value = resB.data.normalized
      setTimeout(() => drawCompareChart(), 50)
    } else {
      error.value = 'Failed to load weather data for comparison.'
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred.'
  } finally {
    loading.value = false
  }
}

const loadDatesComparison = async () => {
  if (!selectedCity.value || !dateAStr.value || !dateBStr.value) return
  loading.value = true
  error.value = ''
  
  try {
    const cityObj = cities.value.find(c => c.city === selectedCity.value)
    if (!cityObj) throw new Error('City not found in database.')

    // Calculate past_days difference to fetch timeline
    const dateA = new Date(dateAStr.value)
    const dateB = new Date(dateBStr.value)
    const oldestDate = dateA < dateB ? dateA : dateB
    const newestDate = dateA > dateB ? dateA : dateB
    
    const diffDays = Math.ceil(Math.abs(Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
    // Restrict max to 90 days for API constraints
    const pastDaysParam = Math.min(92, Math.max(0, diffDays + 1))

    const res = await api.get('/open-meteo/weather', { 
      params: { 
        city: selectedCity.value, 
        past_days: pastDaysParam 
      } 
    })

    if (res.success && res.data?.raw) {
      const raw = res.data.raw
      const hourly = raw.hourly || {}
      const daily = raw.daily || {}
      
      const currentHour = new Date().getHours()

      // Extract details for Date A & Date B
      const extractDateData = (dateStr: string) => {
        const targetDatePart = dateStr.substring(0, 10)
        
        let index = -1
        if (hourly.time && Array.isArray(hourly.time)) {
          // Find matching hour index
          const matchTimeStr = `${targetDatePart}T${currentHour < 10 ? '0' + currentHour : currentHour}:00`
          index = hourly.time.findIndex((t: string) => t.startsWith(matchTimeStr))
          if (index === -1) {
            // Fallback to first hour of that date
            index = hourly.time.findIndex((t: string) => t.startsWith(targetDatePart))
          }
        }

        const dailyIdx = daily.time?.findIndex((t: string) => t === targetDatePart) ?? -1

        if (index === -1) return null

        return {
          date: dateStr,
          temperature: hourly.temperature_2m?.[index] ?? null,
          apparentTemperature: hourly.apparent_temperature?.[index] ?? null,
          humidity: hourly.relative_humidity_2m?.[index] ?? null,
          pressure: hourly.surface_pressure?.[index] ?? null,
          rain: hourly.rain?.[index] ?? null,
          windSpeed: hourly.wind_speed_10m?.[index] ?? null,
          visibility: hourly.visibility?.[index] ?? null,
          cloudCover: hourly.cloud_cover?.[index] ?? null,
          uvIndex: hourly.uv_index?.[index] ?? daily.uv_index_max?.[dailyIdx] ?? null
        }
      }

      dateDataA.value = extractDateData(dateAStr.value)
      dateDataB.value = extractDateData(dateBStr.value)

      if (!dateDataA.value || !dateDataB.value) {
        throw new Error('Historical dates could not be resolved from raw API data.')
      }

      setTimeout(() => drawCompareChart(), 50)
    } else {
      error.value = 'Failed to load historical timeline from Open-Meteo.'
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred loading historical comparison.'
  } finally {
    loading.value = false
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────
const activeA = computed(() => comparisonMode.value === 'cities' ? dataA.value : dateDataA.value)
const activeB = computed(() => comparisonMode.value === 'cities' ? dataB.value : dateDataB.value)

const labelA = computed(() => comparisonMode.value === 'cities' ? cityA.value : dateAStr.value)
const labelB = computed(() => comparisonMode.value === 'cities' ? cityB.value : dateBStr.value)

const diffClass = (valA: number | null, valB: number | null, lowerIsBetter = false) => {
  if (valA === null || valB === null) return 'text-slate-400'
  const diff = valA - valB
  if (diff === 0) return 'text-slate-500 font-semibold'
  
  const isPositive = diff > 0
  const isGood = lowerIsBetter ? !isPositive : isPositive
  return isGood ? 'text-emerald-600 font-extrabold' : 'text-rose-650 font-extrabold'
}

const formatDiff = (valA: number | null, valB: number | null, suffix = '') => {
  if (valA === null || valB === null) return 'N/A'
  const diff = valA - valB
  const sign = diff > 0 ? '+' : ''
  return `${sign}${Math.round(diff * 10) / 10}${suffix}`
}

const formatPercent = (valA: number | null, valB: number | null) => {
  if (valA === null || valB === null || valB === 0) return 'N/A'
  const pct = ((valA - valB) / valB) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${Math.round(pct)}%`
}

// Smart Insights Generator
const insights = computed(() => {
  const a = activeA.value
  const b = activeB.value
  if (!a || !b) return []
  const list: string[] = []

  const entityA = labelA.value
  const entityB = labelB.value

  const isDateMode = comparisonMode.value === 'dates'
  
  // Temp insight
  if (a.temperature !== null && b.temperature !== null) {
    const diff = Math.round((a.temperature - b.temperature) * 10) / 10
    const absDiff = Math.abs(diff)
    if (absDiff >= 0.5) {
      if (isDateMode) {
        list.push(`🌡️ Temperature ${diff >= 0 ? 'increased' : 'decreased'} by ${absDiff}°C between ${entityB} and ${entityA}.`)
      } else {
        list.push(`🌡️ ${entityA} is ${absDiff}°C ${diff > 0 ? 'warmer' : 'cooler'} than ${entityB}.`)
      }
    }
  }

  // Humidity insight
  if (a.humidity !== null && b.humidity !== null) {
    const diff = a.humidity - b.humidity
    const absDiff = Math.abs(diff)
    if (absDiff >= 1) {
      if (isDateMode) {
        list.push(`💧 Humidity ${diff >= 0 ? 'increased' : 'decreased'} by ${absDiff}%.`)
      } else {
        list.push(`💧 Humidity is ${absDiff}% ${diff > 0 ? 'higher' : 'lower'} in ${entityA}.`)
      }
    }
  }

  // Wind speed insight
  if (a.windSpeed !== null && b.windSpeed !== null) {
    const ratio = a.windSpeed / (b.windSpeed || 1)
    if (ratio >= 1.8) {
      list.push(`💨 Wind speed ${isDateMode ? 'doubled' : `in ${entityA} is almost double compared to ${entityB}`}.`)
    } else if (ratio <= 0.5) {
      list.push(`💨 Wind speed ${isDateMode ? 'was cut in half' : `in ${entityB} is almost double compared to ${entityA}`}.`)
    }
  }

  // Rain insight
  if (a.rain > 0 && b.rain === 0) {
    list.push(`🌧️ Precipitation sum of ${a.rain}mm recorded on ${entityA}, while ${entityB} was dry.`)
  } else if (b.rain > 0 && a.rain === 0) {
    list.push(`🌧️ Precipitation sum of ${b.rain}mm recorded on ${entityB}, while ${entityA} was dry.`)
  }

  return list
})

// ─── Drawing Comparison Chart ──────────────────────────────────────────────
const drawCompareChart = () => {
  if (!compareChartCanvas.value || !activeA.value || !activeB.value) return
  if (compareChartInstance) compareChartInstance.destroy()

  const metrics = ['Temp (°C)', 'Feels Like (°C)', 'Humidity (%)', 'Cloud Cover (%)', 'Wind (km/h)', 'UV Index']
  const valuesA = [
    activeA.value.temperature ?? 0,
    activeA.value.apparentTemperature ?? 0,
    activeA.value.humidity ?? 0,
    activeA.value.cloudCover ?? 0,
    activeA.value.windSpeed ?? 0,
    activeA.value.uvIndex ?? 0
  ]
  const valuesB = [
    activeB.value.temperature ?? 0,
    activeB.value.apparentTemperature ?? 0,
    activeB.value.humidity ?? 0,
    activeB.value.cloudCover ?? 0,
    activeB.value.windSpeed ?? 0,
    activeB.value.uvIndex ?? 0
  ]

  compareChartInstance = new Chart(compareChartCanvas.value, {
    type: 'bar',
    data: {
      labels: metrics,
      datasets: [
        {
          label: labelA.value,
          backgroundColor: '#0d9488', // teal
          data: valuesA,
          borderRadius: 8
        },
        {
          label: labelB.value,
          backgroundColor: '#4f46e5', // indigo
          data: valuesB,
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          padding: 10,
          cornerRadius: 12
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' } }
      }
    }
  })
}

onBeforeUnmount(() => {
  if (compareChartInstance) compareChartInstance.destroy()
})
</script>

<template>
  <div class="space-y-6">
    
    <!-- Tab view selection (Cities vs Dates) -->
    <div class="bg-white p-2 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-center max-w-sm mx-auto">
      <button 
        @click="comparisonMode = 'cities'"
        class="flex-1 py-1.5 rounded-lg text-xs font-bold transition border-0 cursor-pointer text-center"
        :class="comparisonMode === 'cities' ? 'bg-teal-50 text-teal-600 font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-600'"
      >
        Compare Cities
      </button>
      <button 
        @click="comparisonMode = 'dates'"
        class="flex-1 py-1.5 rounded-lg text-xs font-bold transition border-0 cursor-pointer text-center"
        :class="comparisonMode === 'dates' ? 'bg-teal-50 text-teal-600 font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-600'"
      >
        Compare Dates (Same City)
      </button>
    </div>

    <!-- Mode 1: City vs City Selectors -->
    <div v-if="comparisonMode === 'cities'" class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm animate-fade-in">
      <h3 class="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-gray-100 pb-2">
        👥 City Weather Comparison Engine
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-center">
        <div class="flex flex-col gap-1 md:col-span-2">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Primary City A</label>
          <select
            v-model="cityA"
            class="px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-semibold bg-white"
          >
            <option v-for="c in cities" :key="c.city" :value="c.city" :disabled="c.city === cityB">{{ c.city }}</option>
          </select>
        </div>
        <div class="text-center font-black text-slate-400 text-sm py-2">VS</div>
        <div class="flex flex-col gap-1 md:col-span-2">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Comparison City B</label>
          <select
            v-model="cityB"
            class="px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-semibold bg-white"
          >
            <option v-for="c in cities" :key="c.city" :value="c.city" :disabled="c.city === cityA">{{ c.city }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Mode 2: Date vs Date Selectors -->
    <div v-else class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm animate-fade-in">
      <h3 class="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-gray-100 pb-2">
        📅 Same City Historical Comparison Engine
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
        <div class="flex flex-col gap-1 md:col-span-1.5">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Choose Target City</label>
          <select
            v-model="selectedCity"
            class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-semibold bg-white"
          >
            <option v-for="c in cities" :key="c.city" :value="c.city">{{ c.city }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1 md:col-span-1.5">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date Preset Interval</label>
          <select
            v-model="rangePreset"
            class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-semibold bg-white"
          >
            <option value="1week">1 Week Ago</option>
            <option value="2weeks">2 Weeks Ago</option>
            <option value="1month">1 Month Ago</option>
            <option value="2months">2 Months Ago</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        <div class="flex flex-col gap-1 md:col-span-1">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date A (Newest)</label>
          <input
            v-model="dateAStr"
            type="date"
            class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-mono font-semibold"
            :disabled="rangePreset !== 'custom'"
          />
        </div>

        <div class="text-center font-black text-slate-400 text-sm py-2">VS</div>

        <div class="flex flex-col gap-1 md:col-span-1">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date B (Oldest)</label>
          <input
            v-model="dateBStr"
            type="date"
            class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-teal-500 font-mono font-semibold"
            :disabled="rangePreset !== 'custom'"
          />
        </div>
      </div>
    </div>

    <!-- Error/Loading indicators -->
    <div v-if="loading" class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
      <div class="animate-pulse space-y-4">
        <div class="h-6 bg-slate-100 rounded-lg w-1/4 mx-auto"></div>
        <div class="h-40 bg-slate-50 rounded-xl mt-6"></div>
      </div>
    </div>

    <div v-else-if="error" class="bg-amber-50 p-6 rounded-2xl border border-amber-250/60 text-center text-amber-900 text-xs font-bold">
      ⚠️ {{ error }}
    </div>

    <div v-else-if="activeA && activeB" class="space-y-6">
      
      <!-- Metrics comparison table & Insights -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Comparison table list -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-250/60 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-150">
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 leading-none">
              📊 Core Meteorological Matrix
            </h4>
          </div>

          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase text-right">
                <th class="px-5 py-3 text-left">Metric Parameter</th>
                <th class="px-5 py-3">{{ labelA }}</th>
                <th class="px-5 py-3">{{ labelB }}</th>
                <th class="px-5 py-3">Diff</th>
                <th class="px-5 py-3">% Var</th>
              </tr>
            </thead>
            <tbody>
              <!-- Temperature row -->
              <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs">
                <td class="px-5 py-2.5 text-left font-bold text-slate-655">Temperature</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeA.temperature }}°C</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeB.temperature }}°C</td>
                <td class="px-5 py-2.5 font-mono" :class="diffClass(activeA.temperature, activeB.temperature)">
                  {{ formatDiff(activeA.temperature, activeB.temperature, '°C') }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-500">
                  {{ formatPercent(activeA.temperature, activeB.temperature) }}
                </td>
              </tr>
              <!-- Feels Like row -->
              <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs">
                <td class="px-5 py-2.5 text-left font-bold text-slate-655">Feels Like Temp</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeA.apparentTemperature }}°C</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeB.apparentTemperature }}°C</td>
                <td class="px-5 py-2.5 font-mono" :class="diffClass(activeA.apparentTemperature, activeB.apparentTemperature)">
                  {{ formatDiff(activeA.apparentTemperature, activeB.apparentTemperature, '°C') }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-500">
                  {{ formatPercent(activeA.apparentTemperature, activeB.apparentTemperature) }}
                </td>
              </tr>
              <!-- Humidity row -->
              <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs">
                <td class="px-5 py-2.5 text-left font-bold text-slate-655">Relative Humidity</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeA.humidity }}%</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeB.humidity }}%</td>
                <td class="px-5 py-2.5 font-mono" :class="diffClass(activeA.humidity, activeB.humidity, true)">
                  {{ formatDiff(activeA.humidity, activeB.humidity, '%') }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-500">
                  {{ formatPercent(activeA.humidity, activeB.humidity) }}
                </td>
              </tr>
              <!-- Wind Speed row -->
              <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs">
                <td class="px-5 py-2.5 text-left font-bold text-slate-655">Wind Speed</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeA.windSpeed }} km/h</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeB.windSpeed }} km/h</td>
                <td class="px-5 py-2.5 font-mono" :class="diffClass(activeA.windSpeed, activeB.windSpeed, true)">
                  {{ formatDiff(activeA.windSpeed, activeB.windSpeed, ' km/h') }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-500">
                  {{ formatPercent(activeA.windSpeed, activeB.windSpeed) }}
                </td>
              </tr>
              <!-- Rainfall row -->
              <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs">
                <td class="px-5 py-2.5 text-left font-bold text-slate-655">Precipitation Sum</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeA.rain }} mm</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeB.rain }} mm</td>
                <td class="px-5 py-2.5 font-mono" :class="diffClass(activeA.rain, activeB.rain)">
                  {{ formatDiff(activeA.rain, activeB.rain, ' mm') }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-500">
                  {{ formatPercent(activeA.rain, activeB.rain) }}
                </td>
              </tr>
              <!-- Cloud Cover row -->
              <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs">
                <td class="px-5 py-2.5 text-left font-bold text-slate-655">Cloudiness</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeA.cloudCover }}%</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeB.cloudCover }}%</td>
                <td class="px-5 py-2.5 font-mono" :class="diffClass(activeA.cloudCover, activeB.cloudCover, true)">
                  {{ formatDiff(activeA.cloudCover, activeB.cloudCover, '%') }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-500">
                  {{ formatPercent(activeA.cloudCover, activeB.cloudCover) }}
                </td>
              </tr>
              <!-- UV index row -->
              <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs">
                <td class="px-5 py-2.5 text-left font-bold text-slate-655">UV index</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeA.uvIndex }}</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">{{ activeB.uvIndex }}</td>
                <td class="px-5 py-2.5 font-mono" :class="diffClass(activeA.uvIndex, activeB.uvIndex, true)">
                  {{ formatDiff(activeA.uvIndex, activeB.uvIndex) }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-500">
                  {{ formatPercent(activeA.uvIndex, activeB.uvIndex) }}
                </td>
              </tr>
              <!-- Visibility row -->
              <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs">
                <td class="px-5 py-2.5 text-left font-bold text-slate-655">Visibility</td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">
                  {{ activeA.visibility ? Math.round(activeA.visibility / 1000) + ' km' : '--' }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-800">
                  {{ activeB.visibility ? Math.round(activeB.visibility / 1000) + ' km' : '--' }}
                </td>
                <td class="px-5 py-2.5 font-mono" :class="diffClass(activeA.visibility, activeB.visibility)">
                  {{ formatDiff(activeA.visibility ? activeA.visibility/1000 : null, activeB.visibility ? activeB.visibility/1000 : null, ' km') }}
                </td>
                <td class="px-5 py-2.5 font-mono font-bold text-slate-500">
                  {{ formatPercent(activeA.visibility, activeB.visibility) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Left AI/Smart Insights Sidebar cards -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 mb-4 border-b border-slate-100 pb-2">
              💡 Smart Analytical Insights
            </h4>
            
            <div v-if="insights.length > 0" class="space-y-3">
              <div 
                v-for="ins in insights" 
                :key="ins"
                class="bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs font-bold text-slate-600 leading-relaxed"
              >
                {{ ins }}
              </div>
            </div>
            <div v-else class="text-slate-400 text-xs text-center py-8 font-semibold">
              No remarkable statistical anomalies found.
            </div>
          </div>
          
          <div class="mt-4 pt-3 border-t border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            BizCore Weather Engine v1.0
          </div>
        </div>

      </div>

      <!-- Comparison Chart -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 mb-4 border-b border-slate-150 pb-2">
          📊 Side-by-Side Parameter Chart
        </h4>
        <div class="h-80 relative">
          <canvas ref="compareChartCanvas"></canvas>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.25s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
