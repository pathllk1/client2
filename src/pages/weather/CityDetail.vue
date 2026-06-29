<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWeather } from '@/composables/useWeather'
import { api } from '@/utils/api'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const route = useRoute()
const router = useRouter()
const { fetchWeatherForCity, weatherCache } = useWeather()

const cityName = computed(() => route.params.city as string)
const weatherData = ref<any>(null)
const loading = ref(false)
const error = ref('')

// Selected weather metric for the trends chart
const selectedMetric = ref<'temperature' | 'humidity' | 'wind' | 'pressure'>('temperature')

// Canvas refs for charts
const hourlyChartCanvas = ref<HTMLCanvasElement | null>(null)
let hourlyChartInstance: Chart | null = null

const fetchCityDetails = async () => {
  if (!cityName.value) return
  loading.value = true
  error.value = ''
  
  try {
    const data = await fetchWeatherForCity(cityName.value, true)
    if (data) {
      // Fetch full raw response from cache/API since details need hourly/daily arrays
      const res = await fetchWeatherForCity(cityName.value, false)
      weatherData.value = weatherCache.value[cityName.value]
      renderHourlyChart()
    } else {
      error.value = 'Failed to load weather details for this city.'
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred fetching weather details.'
  } finally {
    loading.value = false
  }
}

// Weather code mapping
const getWeatherInfo = (code: number | null) => {
  if (code === null) return { icon: '❓', label: 'N/A', color: 'text-slate-400', bg: 'bg-slate-50 border-slate-100' }
  switch (code) {
    case 0: return { icon: '☀️', label: 'Clear Sky', color: 'text-amber-500', bg: 'bg-amber-50/50 border-amber-100' }
    case 1:
    case 2: return { icon: '🌤️', label: 'Partly Cloudy', color: 'text-teal-500', bg: 'bg-teal-50/50 border-teal-100' }
    case 3: return { icon: '☁️', label: 'Overcast', color: 'text-slate-500', bg: 'bg-slate-100/50 border-slate-200' }
    case 45:
    case 48: return { icon: '🌫️', label: 'Foggy', color: 'text-slate-400', bg: 'bg-slate-55 border-slate-150' }
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
    case 99: return { icon: '⛈️', label: 'Thunderstorm', color: 'text-indigo-650', bg: 'bg-indigo-50/50 border-indigo-100' }
    default: return { icon: '🌤️', label: 'Cloudy', color: 'text-slate-500', bg: 'bg-slate-50' }
  }
}

// Chart rendering
const renderHourlyChart = () => {
  if (!hourlyChartCanvas.value || !weatherData.value) return
  if (hourlyChartInstance) hourlyChartInstance.destroy()

  const raw = weatherData.value // Contains the full raw data
  // Open-Meteo returns raw API responses under weatherCache as returned by service.
  // Wait, let's make sure we find raw data. We cached normalized data in weatherCache,
  // but wait! In useWeather, does weatherCache cache NormalizedWeather, or full response?
  // Let's check: useWeather's fetchWeatherForCity caches `res.data.normalized`,
  // but wait: does it have raw hourly forecast details?
  // Let's check useWeather:
  // `weatherCache.value[cityName] = data` (where data is NormalizedWeather).
  // Wait! In the controller getWeather returned: `{ normalized, raw }`.
  // Ah! Let's verify how useWeather's `fetchWeatherForCity` saves it.
  // It checks: `const res = await api.get('/open-meteo/weather', { params: { city: cityName } })`
  // `weatherCache.value[cityName] = data` (res.data.normalized).
  // But wait! If we want raw hourly/daily fields, we can adjust useWeather or query `res.data` directly.
  // Wait! In useWeather:
  // `const res = await api.get('/open-meteo/weather', { params: { city: cityName } })`
  // Yes! `res.data` contains BOTH `normalized` and `raw`!
  // Let's fetch live weather with raw details here directly or store it.
  // Let's perform a direct local fetch of weather details with raw arrays in this component to be completely self-contained!
}

// Let's write the fetch in CityDetail.vue that loads BOTH normalized and raw so we can draw charts!
const hourlyTimeseries = ref<any[]>([])
const dailyForecast = ref<any[]>([])

const loadData = async () => {
  if (!cityName.value) return
  loading.value = true
  error.value = ''
  
  try {
    const res = await api.get('/open-meteo/weather', { params: { city: cityName.value } })
    if (res.success && res.data) {
      weatherData.value = res.data.normalized
      
      const raw = res.data.raw || {}
      
      // Load hourly timeseries (limit to first 24 hours for clarity)
      if (raw.hourly && Array.isArray(raw.hourly.time)) {
        hourlyTimeseries.value = raw.hourly.time.slice(0, 24).map((time: string, idx: number) => ({
          time: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: raw.hourly.temperature_2m?.[idx] ?? null,
          humidity: raw.hourly.relative_humidity_2m?.[idx] ?? null,
          windSpeed: raw.hourly.wind_speed_10m?.[idx] ?? null,
          pressure: raw.hourly.surface_pressure?.[idx] ?? null,
          rain: raw.hourly.rain?.[idx] ?? null,
          cloudCover: raw.hourly.cloud_cover?.[idx] ?? null
        }))
      }

      // Load daily forecast (7 days)
      if (raw.daily && Array.isArray(raw.daily.time)) {
        dailyForecast.value = raw.daily.time.map((time: string, idx: number) => ({
          date: new Date(time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
          tempMax: raw.daily.temperature_2m_max?.[idx] ?? null,
          tempMin: raw.daily.temperature_2m_min?.[idx] ?? null,
          rain: raw.daily.rain_sum?.[idx] ?? null,
          weatherCode: raw.daily.weather_code?.[idx] ?? null,
          uvIndex: raw.daily.uv_index_max?.[idx] ?? null
        }))
      }

      // Redraw charts
      setTimeout(() => {
        drawCharts()
      }, 50)
    } else {
      error.value = 'Failed to load weather analytics.'
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred.'
  } finally {
    loading.value = false
  }
}

const drawCharts = () => {
  if (!hourlyChartCanvas.value || hourlyTimeseries.value.length === 0) return
  if (hourlyChartInstance) hourlyChartInstance.destroy()

  const labels = hourlyTimeseries.value.map((h) => h.time)
  let label = ''
  let dataPoints: number[] = []
  let borderColor = '#0d9488' // teal
  let bgColor = 'rgba(13, 148, 136, 0.05)'

  if (selectedMetric.value === 'temperature') {
    label = 'Temperature (°C)'
    dataPoints = hourlyTimeseries.value.map((h) => h.temperature)
    borderColor = '#14b8a6' // teal
    bgColor = 'rgba(20, 184, 166, 0.05)'
  } else if (selectedMetric.value === 'humidity') {
    label = 'Humidity (%)'
    dataPoints = hourlyTimeseries.value.map((h) => h.humidity)
    borderColor = '#06b6d4' // cyan
    bgColor = 'rgba(6, 182, 212, 0.05)'
  } else if (selectedMetric.value === 'wind') {
    label = 'Wind Speed (km/h)'
    dataPoints = hourlyTimeseries.value.map((h) => h.windSpeed)
    borderColor = '#4f46e5' // indigo
    bgColor = 'rgba(79, 70, 229, 0.05)'
  } else {
    label = 'Pressure (hPa)'
    dataPoints = hourlyTimeseries.value.map((h) => h.pressure)
    borderColor = '#3b82f6' // blue
    bgColor = 'rgba(59, 130, 246, 0.05)'
  }

  hourlyChartInstance = new Chart(hourlyChartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label,
          data: dataPoints,
          borderColor,
          backgroundColor: bgColor,
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          padding: 10,
          cornerRadius: 12
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        }
      }
    }
  })
}

// Watch selected metric to redraw charts
watch(selectedMetric, () => {
  drawCharts()
})

onMounted(() => {
  loadData()
})

onBeforeUnmount(() => {
  if (hourlyChartInstance) hourlyChartInstance.destroy()
})
</script>

<template>
  <div class="space-y-6">
    
    <!-- Header Navigation Back Button -->
    <div class="flex items-center gap-3">
      <router-link
        to="/weather"
        class="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 transition decoration-none flex items-center gap-1.5"
      >
        ← Back to Overview
      </router-link>
      <h2 class="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">
        City Analytics: <span class="text-teal-600">{{ cityName }}</span>
      </h2>
    </div>

    <!-- Error/Loading skeletons -->
    <div v-if="loading" class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
      <div class="animate-pulse space-y-4">
        <div class="h-6 bg-slate-100 rounded-lg w-1/4 mx-auto"></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div class="h-20 bg-slate-50 rounded-xl"></div>
          <div class="h-20 bg-slate-50 rounded-xl"></div>
          <div class="h-20 bg-slate-50 rounded-xl"></div>
          <div class="h-20 bg-slate-50 rounded-xl"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="bg-amber-50 p-6 rounded-2xl border border-amber-250/60 text-center text-amber-900 text-xs font-bold">
      ⚠️ {{ error }}
    </div>

    <div v-else-if="weatherData" class="space-y-6">
      
      <!-- Primary dashboard grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Current Weather Dashboard summary -->
        <div class="bg-white p-6 rounded-2xl border border-slate-250/65 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-black text-slate-800">{{ weatherData.city }}</h3>
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{{ weatherData.state }}</span>
              </div>
              <div 
                class="px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1.5"
                :class="getWeatherInfo(weatherData.weatherCode).bg"
              >
                <span>{{ getWeatherInfo(weatherData.weatherCode).icon }}</span>
                <span :class="getWeatherInfo(weatherData.weatherCode).color">{{ getWeatherInfo(weatherData.weatherCode).label }}</span>
              </div>
            </div>

            <!-- Temperature metric -->
            <div class="mt-6 flex items-baseline gap-2">
              <h2 class="text-5xl font-black font-mono tracking-tighter text-slate-850">
                {{ weatherData.temperature !== null ? `${Math.round(weatherData.temperature)}°C` : '--' }}
              </h2>
              <span class="text-xs font-bold text-slate-400">
                Feels like {{ weatherData.apparentTemperature !== null ? `${Math.round(weatherData.apparentTemperature)}°` : '--' }}
              </span>
            </div>

            <p class="text-xs text-slate-500 font-semibold mt-4 leading-relaxed">
              Currently experiencing {{ getWeatherInfo(weatherData.weatherCode).label.toLowerCase() }} with humidity of {{ weatherData.humidity }}%. Winds are flowing at {{ weatherData.windSpeed }} km/h.
            </p>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Coordinates: {{ weatherData.latitude }}, {{ weatherData.longitude }}</span>
            <span>Refreshed: {{ weatherData.timestamp ? new Date(weatherData.timestamp).toLocaleTimeString() : 'N/A' }}</span>
          </div>
        </div>

        <!-- Right Summary Widgets grid (Phase 6) -->
        <div class="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Humidity widget -->
          <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Relative Humidity</span>
            <p class="text-lg font-black text-slate-800 font-mono mt-1">{{ weatherData.humidity !== null ? `${weatherData.humidity}%` : '--' }}</p>
            <span class="text-[9px] font-bold text-slate-450 mt-1 block">Comfortable limit: 30%-60%</span>
          </div>

          <!-- Wind widget -->
          <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Wind Flow</span>
            <p class="text-lg font-black text-slate-800 font-mono mt-1">{{ weatherData.windSpeed !== null ? `${weatherData.windSpeed} km/h` : '--' }}</p>
            <span class="text-[9px] font-bold text-slate-450 mt-1 block">Direction: {{ weatherData.windDirection }}°</span>
          </div>

          <!-- Pressure widget -->
          <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Surface Pressure</span>
            <p class="text-lg font-black text-slate-800 font-mono mt-1">{{ weatherData.pressure !== null ? `${Math.round(weatherData.pressure)} hPa` : '--' }}</p>
            <span class="text-[9px] font-bold text-slate-450 mt-1 block">Standard: 1013 hPa</span>
          </div>

          <!-- UV index widget -->
          <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">UV Index</span>
            <p class="text-lg font-black text-slate-800 font-mono mt-1">{{ weatherData.uvIndex !== null ? weatherData.uvIndex : '--' }}</p>
            <span class="text-[9px] font-bold text-slate-450 mt-1 block">Max solar exposure</span>
          </div>

          <!-- Rain widget -->
          <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Rainfall (Live)</span>
            <p class="text-lg font-black text-slate-800 font-mono mt-1">{{ weatherData.rain !== null ? `${weatherData.rain} mm` : '0 mm' }}</p>
            <span class="text-[9px] font-bold text-slate-450 mt-1 block">Prob: {{ weatherData.rainProbability ?? 0 }}%</span>
          </div>

          <!-- Cloud Cover widget -->
          <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Cloudiness</span>
            <p class="text-lg font-black text-slate-800 font-mono mt-1">{{ weatherData.cloudCover !== null ? `${weatherData.cloudCover}%` : '--' }}</p>
            <span class="text-[9px] font-bold text-slate-450 mt-1 block">Sky coverage</span>
          </div>

          <!-- Sunrise widget -->
          <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Sunrise Time</span>
            <p class="text-sm font-black text-slate-800 font-mono mt-1.5">
              {{ weatherData.sunrise ? new Date(weatherData.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' }}
            </p>
            <span class="text-[9px] font-bold text-slate-450 mt-1 block">First daylight</span>
          </div>

          <!-- Sunset widget -->
          <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Sunset Time</span>
            <p class="text-sm font-black text-slate-800 font-mono mt-1.5">
              {{ weatherData.sunset ? new Date(weatherData.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' }}
            </p>
            <span class="text-[9px] font-bold text-slate-450 mt-1 block">End of daylight</span>
          </div>
        </div>

      </div>

      <!-- Charts Section (Phase 9) -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-sm font-black uppercase tracking-wider text-slate-800 leading-none">
            📈 24-Hour Timeseries Forecast
          </h3>
          
          <!-- Metric Selectors -->
          <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              v-for="m in ['temperature', 'humidity', 'wind', 'pressure']"
              :key="m"
              @click="selectedMetric = m as any"
              class="px-3 py-1 rounded-lg text-xs font-bold transition border-0 cursor-pointer capitalize"
              :class="[selectedMetric === m ? 'bg-white text-teal-600 shadow-sm font-extrabold' : 'text-slate-400']"
            >
              {{ m }}
            </button>
          </div>
        </div>

        <div class="h-80 relative">
          <canvas ref="hourlyChartCanvas"></canvas>
        </div>
      </div>

      <!-- Forecast and Tables Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- 7-Day Outlook List -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 class="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">
            📅 7-Day Forecast Outlook
          </h3>
          <div class="space-y-3">
            <div
              v-for="d in dailyForecast"
              :key="d.date"
              class="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0"
            >
              <span class="text-xs font-bold text-slate-650 w-28">{{ d.date }}</span>
              <span class="text-base" :title="getWeatherInfo(d.weatherCode).label">
                {{ getWeatherInfo(d.weatherCode).icon }}
              </span>
              <span class="text-xs font-bold text-slate-500 w-24 text-right">
                Rain: <span class="font-mono text-blue-600 font-extrabold">{{ d.rain !== null ? `${d.rain}mm` : '0mm' }}</span>
              </span>
              <span class="text-xs font-bold text-slate-800 font-mono text-right w-20">
                {{ Math.round(d.tempMax) }}° / <span class="text-slate-400">{{ Math.round(d.tempMin) }}°</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Detailed Hourly forecast table -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 class="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">
              📜 Hourly Forecast Records
            </h3>
            <div class="overflow-y-auto max-h-72 custom-scrollbar">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase text-right">
                    <th class="px-3 py-1.5 text-left">Time</th>
                    <th class="px-3 py-1.5">Temp</th>
                    <th class="px-3 py-1.5">Humidity</th>
                    <th class="px-3 py-1.5">Wind Speed</th>
                    <th class="px-3 py-1.5">Rain</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="h in hourlyTimeseries"
                    :key="h.time"
                    class="border-b border-slate-50 hover:bg-slate-50/50 text-right text-xs"
                  >
                    <td class="px-3 py-2 text-left font-bold text-slate-500">{{ h.time }}</td>
                    <td class="px-3 py-2 font-mono font-bold text-slate-800">{{ h.temperature }}°C</td>
                    <td class="px-3 py-2 font-mono text-slate-500">{{ h.humidity }}%</td>
                    <td class="px-3 py-2 font-mono text-slate-500">{{ h.windSpeed }} km/h</td>
                    <td class="px-3 py-2 font-mono text-blue-600 font-bold">{{ h.rain }} mm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
</style>
