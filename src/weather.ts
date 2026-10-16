import { getCachedForecast, Home, setCachedForecast, WindowName, windowHours } from './store';

export type Hour = {
  date: string;
  hour: number;
  feels: number;
  temp: number;
  rain: number;
  wind: number;
  code: number;
};

export type Forecast = { fetchedAt: number; hours: Hour[] };

export type DaySummary = {
  date: string;
  avgFeels: number;
  minFeels: number;
  maxFeels: number;
  maxRain: number;
  maxWind: number;
  code: number;
  hours: Hour[];
};

export type Tier = 'muchColder' | 'colder' | 'same' | 'warmer' | 'muchWarmer';

export type Verdict = {
  tier: Tier;
  delta: number;
  title: string;
  advice: string;
};

export function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function fetchForecast(home: Home): Promise<Forecast> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${home.latitude.toFixed(4)}&longitude=${home.longitude.toFixed(4)}` +
    '&hourly=apparent_temperature,temperature_2m,precipitation_probability,wind_speed_10m,weather_code' +
    '&past_days=1&forecast_days=3&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`);
  const json = await res.json();
  const h = json.hourly;
  const hours: Hour[] = (h.time as string[]).map((t, i) => ({
    date: t.slice(0, 10),
    hour: Number(t.slice(11, 13)),
    feels: h.apparent_temperature[i] ?? h.temperature_2m[i] ?? 0,
    temp: h.temperature_2m[i] ?? 0,
    rain: h.precipitation_probability[i] ?? 0,
    wind: h.wind_speed_10m[i] ?? 0,
    code: h.weather_code[i] ?? 0,
  }));
  const forecast = { fetchedAt: Date.now(), hours };
  await setCachedForecast(JSON.stringify(forecast));
  return forecast;
}

export async function cachedForecast(): Promise<Forecast | null> {
  const raw = await getCachedForecast();
  return raw ? (JSON.parse(raw) as Forecast) : null;
}

const SEVERITY: Record<number, number> = {};
[0, 1, 2, 3].forEach((c, i) => (SEVERITY[c] = i));
[45, 48].forEach((c) => (SEVERITY[c] = 4));
[51, 53, 55, 56, 57].forEach((c) => (SEVERITY[c] = 5));
[61, 63, 65, 66, 67, 80, 81, 82].forEach((c) => (SEVERITY[c] = 6));
[71, 73, 75, 77, 85, 86].forEach((c) => (SEVERITY[c] = 7));
[95, 96, 99].forEach((c) => (SEVERITY[c] = 8));

export function summarize(forecast: Forecast, date: string, window: WindowName): DaySummary | null {
  const [start, end] = windowHours(window);
  const day = forecast.hours.filter((h) => h.date === date);
  const inWindow = day.filter((h) => h.hour >= start && h.hour <= end);
  if (!inWindow.length) return null;
  const feels = inWindow.map((h) => h.feels);
  const worst = inWindow.reduce((a, h) => ((SEVERITY[h.code] ?? 0) > (SEVERITY[a.code] ?? 0) ? h : a), inWindow[0]);
  return {
    date,
    avgFeels: feels.reduce((a, b) => a + b, 0) / feels.length,
    minFeels: Math.min(...feels),
    maxFeels: Math.max(...feels),
    maxRain: Math.max(...inWindow.map((h) => h.rain)),
    maxWind: Math.max(...inWindow.map((h) => h.wind)),
    code: worst.code,
    hours: day.filter((h) => h.hour >= 6),
  };
}

export function compare(target: DaySummary, base: DaySummary, baseName: string): Verdict {
  const delta = target.avgFeels - base.avgFeels;
  if (delta <= -5) return { tier: 'muchColder', delta, title: 'Much colder', advice: 'Wear heavier clothes' };
  if (delta <= -2) return { tier: 'colder', delta, title: 'A bit colder', advice: 'Add a light layer' };
  if (delta < 2) return { tier: 'same', delta, title: `Same as ${baseName}`, advice: `Dress like ${baseName}` };
  if (delta < 5) return { tier: 'warmer', delta, title: 'A bit warmer', advice: 'Go one layer lighter' };
  return { tier: 'muchWarmer', delta, title: 'Much warmer', advice: 'Dress noticeably lighter' };
}

export function clothing(avgFeels: number): { label: string; detail: string } {
  if (avgFeels >= 30) return { label: 'Hot', detail: 'T-shirt, breathable fabric' };
  if (avgFeels >= 25) return { label: 'Warm', detail: 'T-shirt or light shirt' };
  if (avgFeels >= 20) return { label: 'Mild', detail: 'Long sleeves, no jacket needed' };
  if (avgFeels >= 15) return { label: 'Cool', detail: 'Light jacket or sweatshirt' };
  if (avgFeels >= 10) return { label: 'Cold', detail: 'Proper jacket' };
  return { label: 'Very cold', detail: 'Heavy coat and layers' };
}

export function describe(code: number): { label: string; icon: 'sun' | 'cloud' | 'cloud-drizzle' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning' | 'align-justify' } {
  if (code === 0) return { label: 'Clear', icon: 'sun' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'cloud' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'align-justify' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'cloud-drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Rain', icon: 'cloud-rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', icon: 'cloud-snow' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'cloud-lightning' };
  return { label: 'Mixed', icon: 'cloud' };
}

export function formatDelta(d: number): string {
  const r = Math.round(d);
  if (r === 0) return '±0°';
  return `${r > 0 ? '+' : '−'}${Math.abs(r)}°`;
}
