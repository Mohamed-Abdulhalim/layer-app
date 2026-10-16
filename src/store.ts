import Storage from 'expo-sqlite/kv-store';

export type Home = { latitude: number; longitude: number; label: string };

export const WINDOWS = ['Morning (6–11)', 'Daytime (8–18)', 'Afternoon (12–18)', 'Evening (17–23)', 'All day (6–23)'] as const;
export type WindowName = (typeof WINDOWS)[number];

export const ALERTS = ['Off', 'After 7 pm', 'After 8 pm', 'After 9 pm', 'After 10 pm'] as const;
export type AlertName = (typeof ALERTS)[number];

export function windowHours(w: WindowName): [number, number] {
  const m = w.match(/\((\d+)–(\d+)\)/);
  return m ? [Number(m[1]), Number(m[2])] : [8, 18];
}

export function alertHour(a: AlertName): number | null {
  const m = a.match(/(\d+) pm/);
  return m ? Number(m[1]) + 12 : null;
}

export async function getHome(): Promise<Home | null> {
  const raw = await Storage.getItem('home');
  return raw ? (JSON.parse(raw) as Home) : null;
}

export async function setHome(home: Home): Promise<void> {
  await Storage.setItem('home', JSON.stringify(home));
}

export async function clearHome(): Promise<void> {
  await Storage.removeItem('home');
  await Storage.removeItem('forecast');
}

export async function getWindow(): Promise<WindowName> {
  const v = (await Storage.getItem('window')) as WindowName | null;
  return v && (WINDOWS as readonly string[]).includes(v) ? v : 'Daytime (8–18)';
}

export async function setWindow(w: WindowName): Promise<void> {
  await Storage.setItem('window', w);
}

export async function getAlert(): Promise<AlertName> {
  const v = (await Storage.getItem('alert')) as AlertName | null;
  return v && (ALERTS as readonly string[]).includes(v) ? v : 'After 8 pm';
}

export async function setAlert(a: AlertName): Promise<void> {
  await Storage.setItem('alert', a);
}

export async function getLastAlerted(): Promise<string | null> {
  return Storage.getItem('lastAlerted');
}

export async function setLastAlerted(date: string): Promise<void> {
  await Storage.setItem('lastAlerted', date);
}

export async function getCachedForecast(): Promise<string | null> {
  return Storage.getItem('forecast');
}

export async function setCachedForecast(json: string): Promise<void> {
  await Storage.setItem('forecast', json);
}
