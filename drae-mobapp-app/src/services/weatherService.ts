/**
 * OpenWeatherMap (free tier) — current weather + 5-day / 3-hour forecast.
 * https://openweathermap.org/api
 *
 * Set EXPO_PUBLIC_OPENWEATHER_API_KEY in .env (optional lat/lon for your area).
 */

const OPENWEATHER_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const DEFAULT_LAT = Number(process.env.EXPO_PUBLIC_WEATHER_LAT ?? '14.3294');
const DEFAULT_LON = Number(process.env.EXPO_PUBLIC_WEATHER_LON ?? '120.9367');

export const isWeatherApiConfigured = Boolean(OPENWEATHER_KEY && OPENWEATHER_KEY.length > 8);

export type WeatherCurrent = {
  tempC: number;
  feelsLikeC: number;
  description: string;
  iconCode: string;
  humidity: number;
  windSpeedMs: number;
  locationName: string;
  country: string;
  fetchedAt: string;
};

export type ForecastSlot = {
  id: string;
  timeLabel: string;
  tempC: number;
  description: string;
  iconCode: string;
  popPercent: number;
};

type OwmCurrentResponse = {
  name: string;
  sys?: { country?: string };
  main: { temp: number; feels_like: number; humidity: number };
  weather: { description: string; icon: string }[];
  wind: { speed: number };
};

type OwmForecastResponse = {
  list: {
    dt: number;
    dt_txt: string;
    main: { temp: number };
    weather: { description: string; icon: string }[];
    pop: number;
  }[];
};

function buildCoordsQuery(): string {
  const lat = Number.isFinite(DEFAULT_LAT) ? DEFAULT_LAT : 14.3294;
  const lon = Number.isFinite(DEFAULT_LON) ? DEFAULT_LON : 120.9367;
  return `lat=${lat}&lon=${lon}`;
}

export async function fetchCurrentWeather(): Promise<WeatherCurrent> {
  if (!OPENWEATHER_KEY) {
    throw new Error('Missing EXPO_PUBLIC_OPENWEATHER_API_KEY');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?${buildCoordsQuery()}&appid=${encodeURIComponent(OPENWEATHER_KEY)}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Weather HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as OwmCurrentResponse;
  const w = data.weather[0];

  return {
    tempC: Math.round(data.main.temp * 10) / 10,
    feelsLikeC: Math.round(data.main.feels_like * 10) / 10,
    description: w?.description ?? '',
    iconCode: w?.icon ?? '01d',
    humidity: data.main.humidity,
    windSpeedMs: data.wind?.speed ?? 0,
    locationName: data.name || 'Area',
    country: data.sys?.country ?? 'PH',
    fetchedAt: new Date().toISOString(),
  };
}

/** Next 24 hours: 3-hour steps from OWM 5-day forecast (8 slots). */
export async function fetchForecast24h(): Promise<ForecastSlot[]> {
  if (!OPENWEATHER_KEY) {
    throw new Error('Missing EXPO_PUBLIC_OPENWEATHER_API_KEY');
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?${buildCoordsQuery()}&appid=${encodeURIComponent(OPENWEATHER_KEY)}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Forecast HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as OwmForecastResponse;
  const slice = (data.list ?? []).slice(0, 8);

  return slice.map((item) => {
    const w = item.weather[0];
    const d = new Date(item.dt * 1000);
    return {
      id: String(item.dt),
      timeLabel: d.toLocaleString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      tempC: Math.round(item.main.temp * 10) / 10,
      description: w?.description ?? '',
      iconCode: w?.icon ?? '01d',
      popPercent: Math.round((item.pop ?? 0) * 100),
    };
  });
}

export function weatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}
