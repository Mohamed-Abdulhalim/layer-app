import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { alertHour, getAlert, getHome, getLastAlerted, getWindow, setLastAlerted } from './store';
import { compare, fetchForecast, formatDelta, localDate, summarize } from './weather';

export const TASK = 'layer-evening-check';
const CHANNEL = 'daily';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function runEveningCheck(force = false): Promise<boolean> {
  const [home, alert, last, window] = await Promise.all([getHome(), getAlert(), getLastAlerted(), getWindow()]);
  const hour = alertHour(alert);
  if (!home || hour === null) return false;
  const today = localDate(0);
  if (!force && (new Date().getHours() < hour || last === today)) return false;
  const forecast = await fetchForecast(home);
  const base = summarize(forecast, today, window);
  const target = summarize(forecast, localDate(1), window);
  if (!base || !target) return false;
  const v = compare(target, base, 'today');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Tomorrow: ${v.title}`,
      body: `${v.advice}. Feels like ${Math.round(target.avgFeels)}° (${formatDelta(v.delta)} vs today).`,
    },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
  await setLastAlerted(today);
  return true;
}

TaskManager.defineTask(TASK, async () => {
  try {
    await runEveningCheck();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function syncBackgroundTask(): Promise<void> {
  const alert = await getAlert();
  const registered = await TaskManager.isTaskRegisteredAsync(TASK);
  if (alert === 'Off') {
    if (registered) await BackgroundTask.unregisterTaskAsync(TASK);
    return;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Evening outlook',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) await Notifications.requestPermissionsAsync();
  if (!registered) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 30 });
}
