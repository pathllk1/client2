export interface CityData {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface NormalizedWeather {
  timestamp: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  pressure: number | null;
  rain: number | null;
  rainProbability: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGust: number | null;
  visibility: number | null;
  cloudCover: number | null;
  uvIndex: number | null;
  weatherCode: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface WeatherResponse {
  normalized: NormalizedWeather;
  raw: any;
}
