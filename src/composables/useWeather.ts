import { ref, computed } from 'vue'
import { api } from '@/utils/api'
import type { CityData, NormalizedWeather } from '@/types/weather'

const cities = ref<CityData[]>([])
const weatherCache = ref<Record<string, NormalizedWeather>>({})
const loadingCities = ref(false)
const loadingWeather = ref(false)
const syncProgress = ref(0) // 0 to 100

export const useWeather = () => {
  /**
   * Load the list of cities from the backend
   */
  const fetchCities = async (): Promise<CityData[]> => {
    if (cities.value.length > 0) return cities.value
    loadingCities.value = true
    try {
      const res = await api.get('/open-meteo/cities')
      if (res.success && Array.isArray(res.data)) {
        cities.value = res.data
      }
      return cities.value
    } catch (err) {
      console.error('[useWeather] Error fetching cities:', err)
      return []
    } finally {
      loadingCities.value = false
    }
  }

  /**
   * Fetch weather for a single city (using geocoding or cached data)
   */
  const fetchWeatherForCity = async (cityName: string, force = false): Promise<NormalizedWeather | null> => {
    if (!force && weatherCache.value[cityName]) {
      return weatherCache.value[cityName]
    }

    try {
      const res = await api.get('/open-meteo/weather', { params: { city: cityName } })
      if (res.success && res.data?.normalized) {
        const data = res.data.normalized as NormalizedWeather
        weatherCache.value[cityName] = data
        return data
      }
      return null
    } catch (err) {
      console.error(`[useWeather] Error fetching weather for ${cityName}:`, err)
      return null
    }
  }

  const fetchAllWeather = async (force = false) => {
    loadingWeather.value = true
    syncProgress.value = 0
    
    try {
      if (force) {
        // Trigger server-side Google Sheets synchronization
        try {
          await api.post('/open-meteo/sync', {})
        } catch (syncErr) {
          console.warn('[useWeather] Google Sheets sync failed:', syncErr)
        }
      }

      const citiesList = await fetchCities()
      if (citiesList.length === 0) return

      let completed = 0
      const batchSize = 5

      for (let i = 0; i < citiesList.length; i += batchSize) {
        const batch = citiesList.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (city) => {
            try {
              // Get the cached/newly synced values
              await fetchWeatherForCity(city.city, false)
            } catch (err) {
              console.error(`Failed to load weather for ${city.city}:`, err)
            } finally {
              completed++
              syncProgress.value = Math.round((completed / citiesList.length) * 100)
            }
          })
        )
      }
    } catch (error) {
      console.error('[useWeather] Error in bulk weather sync:', error)
    } finally {
      loadingWeather.value = false
    }
  }

  // ─── Computed Statistics ──────────────────────────────────────────────────
  const activeWeatherData = computed<NormalizedWeather[]>(() => {
    return Object.values(weatherCache.value)
  })

  const averageTemperature = computed(() => {
    const data = activeWeatherData.value.filter((d) => d.temperature !== null)
    if (data.length === 0) return 0
    const sum = data.reduce((acc, curr) => acc + (curr.temperature || 0), 0)
    return Math.round((sum / data.length) * 10) / 10
  })

  const highestTemperature = computed(() => {
    const data = activeWeatherData.value.filter((d) => d.temperature !== null)
    if (data.length === 0) return null
    let max = data[0]!
    for (const curr of data) {
      if ((curr.temperature ?? 0) > (max.temperature ?? 0)) {
        max = curr
      }
    }
    return max
  })

  const lowestTemperature = computed(() => {
    const data = activeWeatherData.value.filter((d) => d.temperature !== null)
    if (data.length === 0) return null
    let min = data[0]!
    for (const curr of data) {
      if ((curr.temperature ?? 0) < (min.temperature ?? 0)) {
        min = curr
      }
    }
    return min
  })

  const highestWindSpeed = computed(() => {
    const data = activeWeatherData.value.filter((d) => d.windSpeed !== null)
    if (data.length === 0) return null
    let max = data[0]!
    for (const curr of data) {
      if ((curr.windSpeed ?? 0) > (max.windSpeed ?? 0)) {
        max = curr
      }
    }
    return max
  })

  const rainfallSummary = computed(() => {
    const data = activeWeatherData.value
    const rainingCities = data.filter((d) => d.rain !== null && d.rain > 0).length
    const totalRain = data.reduce((sum, curr) => sum + (curr.rain || 0), 0)
    return {
      count: rainingCities,
      total: Math.round(totalRain * 10) / 10
    }
  })

  return {
    cities,
    weatherCache,
    loadingCities,
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
  }
}
