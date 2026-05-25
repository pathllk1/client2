<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/utils/api'

const emit = defineEmits(['close'])

const searchQuery = ref('')
const searchResults = ref<any[]>([])
const showResults = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const weatherData = ref<any>(null)
const cityName = ref('New Delhi')

const WMO_ICONS: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'Clear' },
  1: { icon: '🌤️', label: 'Mostly Clear' },
  2: { icon: '⛅', label: 'Partly Cloudy' },
  3: { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Foggy' },
  48: { icon: '🌫️', label: 'Foggy' },
  51: { icon: '🌧️', label: 'Light Drizzle' },
  53: { icon: '🌧️', label: 'Moderate Drizzle' },
  55: { icon: '🌧️', label: 'Heavy Drizzle' },
  61: { icon: '🌧️', label: 'Slight Rain' },
  63: { icon: '🌧️', label: 'Moderate Rain' },
  65: { icon: '⛈️', label: 'Heavy Rain' },
  71: { icon: '❄️', label: 'Slight Snow' },
  73: { icon: '❄️', label: 'Moderate Snow' },
  75: { icon: '❄️', label: 'Heavy Snow' },
  77: { icon: '❄️', label: 'Snow Grains' },
  80: { icon: '🌧️', label: 'Slight Rain Showers' },
  81: { icon: '🌧️', label: 'Moderate Rain Showers' },
  82: { icon: '⛈️', label: 'Violent Rain Showers' },
  85: { icon: '❄️', label: 'Slight Snow Showers' },
  86: { icon: '❄️', label: 'Heavy Snow Showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm with Hail' },
  99: { icon: '⛈️', label: 'Thunderstorm with Hail' }
}

const getWeatherIcon = (code: number, isDay = 1) => {
  return WMO_ICONS[code] || { icon: '🌡️', label: 'Unknown' }
}

const getWindDirection = (degrees: number) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

const getAQIInfo = (val: number) => {
  if (val <= 50) return { label: 'Good', color: 'bg-emerald-500', textColor: 'text-emerald-400' }
  if (val <= 100) return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-400' }
  if (val <= 150) return { label: 'Moderate', color: 'bg-orange-500', textColor: 'text-orange-400' }
  if (val <= 200) return { label: 'Poor', color: 'bg-red-500', textColor: 'text-red-400' }
  return { label: 'Very Poor', color: 'bg-purple-600', textColor: 'text-purple-400' }
}

const fetchWeather = async (lat: number, lon: number, name: string) => {
  loading.value = true
  error.value = null
  cityName.value = name

  try {
    const result = await api.get('/tools/weather', { params: { latitude: lat, longitude: lon } })
    if (result.success) {
      weatherData.value = result.data
      
      // Save last city details
      localStorage.setItem(
        'global-tools-weather-last-city',
        JSON.stringify({ lat, lon, name })
      )
    } else {
      throw new Error(result.message || 'Failed to fetch weather')
    }
  } catch (e: any) {
    error.value = e.message
    console.error('Weather load error', e)
  } finally {
    loading.value = false
  }
}

const triggerSearch = async () => {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    showResults.value = false
    return
  }

  try {
    const result = await api.get('/tools/weather/geocode', { params: { query: q } })
    if (result.success && result.data.results) {
      searchResults.value = result.data.results.slice(0, 10)
      showResults.value = true
    } else {
      searchResults.value = []
      showResults.value = false
    }
  } catch (e) {
    console.error('Geocoding error', e)
    searchResults.value = []
    showResults.value = false
  }
}

const handleSelectLocation = async (loc: any) => {
  const label = `${loc.name}, ${loc.country || ''}`
  searchQuery.value = ''
  showResults.value = false
  searchResults.value = []
  await fetchWeather(loc.latitude, loc.longitude, label)
}

const handleInputBlur = () => {
  // Delay slightly so click events on drop-down trigger before it closes
  setTimeout(() => {
    showResults.value = false
  }, 250)
}

onMounted(async () => {
  const saved = localStorage.getItem('global-tools-weather-last-city')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      await fetchWeather(parsed.lat, parsed.lon, parsed.name)
      return
    } catch {}
  }
  // Default to New Delhi
  await fetchWeather(28.6139, 77.2090, 'New Delhi, India')
})
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" style="z-index: 100000;">
    <div
      class="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
    >
      <!-- Header with Search -->
      <div class="border-b border-slate-800 p-6 bg-slate-950/40 shrink-0">
        <div class="flex justify-between items-center mb-4">
          <div>
            <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Weather Dashboard</p>
            <h2 class="text-2xl font-black text-white mt-0.5 tracking-tight">{{ cityName }}</h2>
          </div>
          <button
            type="button"
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <!-- Search input with results drop-down -->
        <div class="relative">
          <form @submit.prevent="triggerSearch" class="flex gap-2">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search location (e.g. London, Tokyo)..."
              class="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition"
              autocomplete="off"
              @input="triggerSearch"
              @focus="showResults = searchResults.length > 0"
              @blur="handleInputBlur"
            />
            <button
              type="submit"
              class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs px-5 transition cursor-pointer"
            >
              Search
            </button>
          </form>

          <!-- Autocomplete results dropdown -->
          <div
            v-if="showResults && searchResults.length > 0"
            class="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto"
          >
            <button
              v-for="loc in searchResults"
              :key="loc.id"
              type="button"
              class="w-full text-left px-4 py-2.5 hover:bg-slate-800 border-b border-slate-900 last:border-b-0 transition flex flex-col gap-0.5 cursor-pointer"
              @mousedown="handleSelectLocation(loc)"
            >
              <span class="font-bold text-xs text-white">{{ loc.name }}</span>
              <span class="text-[10px] text-slate-500">{{ loc.admin1 || '' }}, {{ loc.country }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Scroll Area -->
      <div class="flex-1 overflow-y-auto p-6 bg-slate-900 min-h-0">
        <div v-if="loading" class="flex flex-col items-center justify-center py-16 gap-3">
          <div class="inline-block w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p class="text-xs font-bold text-slate-400">Fetching live conditions...</p>
        </div>

        <div v-else-if="error" class="bg-rose-950/20 border border-rose-950/40 rounded-xl p-6 text-center text-rose-500 text-xs font-bold">
          ⚠️ {{ error }}
        </div>

        <div v-else-if="weatherData" class="space-y-6">
          <!-- Current Weather Card -->
          <div class="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p class="text-[10px] font-black opacity-80 uppercase tracking-widest">Current Conditions</p>
              <h3 class="text-5xl font-black mt-2 font-mono tracking-tighter">{{ Math.round(weatherData.current.temperature_2m) }}°C</h3>
              <p class="text-sm font-bold opacity-90 mt-1 uppercase tracking-wider">
                {{ getWeatherIcon(weatherData.current.weather_code, weatherData.current.is_day).label }}
              </p>
            </div>
            
            <!-- Icon -->
            <div class="text-6xl md:text-7xl">
              {{ getWeatherIcon(weatherData.current.weather_code, weatherData.current.is_day).icon }}
            </div>
            
            <!-- Indicators -->
            <div class="grid grid-cols-2 gap-x-8 gap-y-3 bg-white/10 p-4 rounded-2xl border border-white/10 text-xs shrink-0">
              <div>
                <p class="opacity-70 text-[9px] font-black uppercase">Feels Like</p>
                <p class="font-mono font-bold mt-0.5 text-sm">{{ Math.round(weatherData.current.apparent_temperature) }}°C</p>
              </div>
              <div>
                <p class="opacity-70 text-[9px] font-black uppercase">Humidity</p>
                <p class="font-mono font-bold mt-0.5 text-sm">{{ weatherData.current.relative_humidity_2m }}%</p>
              </div>
              <div>
                <p class="opacity-70 text-[9px] font-black uppercase">Wind Speed</p>
                <p class="font-mono font-bold mt-0.5 text-sm">{{ Math.round(weatherData.current.wind_speed_10m) }} km/h</p>
              </div>
              <div>
                <p class="opacity-70 text-[9px] font-black uppercase">Wind Dir</p>
                <p class="font-mono font-bold mt-0.5 text-sm">{{ getWindDirection(weatherData.current.wind_direction_10m) }}</p>
              </div>
            </div>
          </div>

          <!-- Air Quality Index -->
          <div v-if="weatherData.air_quality && weatherData.air_quality.current" class="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl flex items-center gap-5">
            <div
              class="w-14 h-14 rounded-full flex items-center justify-center font-black font-mono text-lg shrink-0 text-white"
              :class="[getAQIInfo(weatherData.air_quality.current.us_aqi).color]"
            >
              {{ Math.round(weatherData.air_quality.current.us_aqi) }}
            </div>
            <div>
              <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Air Quality Index (US)</p>
              <h4 class="text-sm font-black text-white mt-0.5">
                {{ getAQIInfo(weatherData.air_quality.current.us_aqi).label }}
              </h4>
              <div class="flex gap-4 text-[10px] text-slate-400 mt-1 font-mono">
                <span>PM2.5: {{ weatherData.air_quality.current.pm2_5.toFixed(1) }} µg/m³</span>
                <span>PM10: {{ weatherData.air_quality.current.pm10.toFixed(1) }} µg/m³</span>
              </div>
            </div>
          </div>

          <!-- 7-Day Forecast Grid -->
          <div class="space-y-3">
            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">7-Day Forecast</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="(time, idx) in weatherData.daily.time"
                :key="idx"
                class="bg-slate-950/20 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div>
                  <p class="text-xs font-black text-white">
                    {{ new Date(time).toLocaleDateString('en-US', { weekday: 'short' }) }}
                  </p>
                  <p class="text-[10px] text-slate-500 font-mono mt-0.5">
                    {{ new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                  </p>
                </div>
                <div class="text-3xl">
                  {{ getWeatherIcon(weatherData.daily.weather_code[idx]).icon }}
                </div>
                <div class="text-right">
                  <div class="flex gap-2.5 justify-end font-mono text-xs">
                    <span class="text-white font-bold">{{ Math.round(weatherData.daily.temperature_2m_max[idx]) }}°</span>
                    <span class="text-slate-500">{{ Math.round(weatherData.daily.temperature_2m_min[idx]) }}°</span>
                  </div>
                  <p class="text-[9px] text-slate-500 mt-1 font-mono">Rain: {{ weatherData.daily.precipitation_sum[idx].toFixed(1) }}mm</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
