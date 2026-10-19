import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ALERTS,
  AlertName,
  clearHome,
  getAlert,
  getHome,
  getWindow,
  Home,
  setAlert,
  setHome,
  setWindow,
  WINDOWS,
  WindowName,
  windowHours,
} from './src/store';
import { runEveningCheck, syncBackgroundTask } from './src/task';
import { colors, fonts } from './src/theme';
import { Eyebrow, Icon, IconName, Scale, Select, Serif } from './src/ui';
import {
  cachedForecast,
  clothing,
  compare,
  describe,
  fetchForecast,
  Forecast,
  formatDelta,
  localDate,
  summarize,
  Tier,
} from './src/weather';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ fade: true, duration: 350 });

type Day = 'Today' | 'Tomorrow';
const STALE_MS = 30 * 60 * 1000;

const TIER_STYLE: Record<Tier, { accent: string; deep: string; icon: IconName }> = {
  muchColder: { accent: colors.cold, deep: colors.coldDeep, icon: 'chevrons-down' },
  colder: { accent: colors.cold, deep: colors.coldDeep, icon: 'chevron-down' },
  same: { accent: colors.same, deep: colors.sameDeep, icon: 'minus' },
  warmer: { accent: colors.warm, deep: colors.warmDeep, icon: 'chevron-up' },
  muchWarmer: { accent: colors.warm, deep: colors.warmDeep, icon: 'chevrons-up' },
};

function hourLabel(h: number) {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function Setup({ onDone }: { onDone: (home: Home) => void }) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Location needed', 'Layer needs your location once to know where home is. It is never used again after this.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let label = 'Home';
      try {
        const [place] = await Location.reverseGeocodeAsync(pos.coords);
        label = place?.district || place?.subregion || place?.city || place?.region || 'Home';
      } catch {}
      const home = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, label };
      await setHome(home);
      onDone(home);
    } catch (e) {
      Alert.alert('Could not get location', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.setup, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]}>
      <View style={{ alignItems: 'center' }}>
        <Image source={require('./assets/mark.png')} style={{ width: 150, height: 150 }} />
        <Serif size={46} style={{ marginTop: 8 }}>
          Layer
        </Serif>
        <Text style={styles.setupTag}>Heavier or lighter than yesterday. One glance.</Text>
      </View>
      <View>
        <View style={styles.setupCard}>
          <Icon name="home" size={20} color={colors.same} />
          <Text style={styles.setupText}>
            Open this while you are at home. Layer saves this exact spot once and uses it for every forecast.
          </Text>
        </View>
        <Scale onPress={busy ? undefined : capture} style={styles.primaryBtn}>
          <LinearGradient colors={['#EADFBF', colors.same, '#A08F63']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryInner}>
            {busy ? (
              <ActivityIndicator color="#1A160B" />
            ) : (
              <>
                <Icon name="map-pin" size={18} color="#1A160B" />
                <Text style={styles.primaryText}>Set this spot as home</Text>
              </>
            )}
          </LinearGradient>
        </Scale>
      </View>
    </View>
  );
}

function Settings(props: {
  visible: boolean;
  home: Home;
  window: WindowName;
  alert: AlertName;
  onWindow: (w: WindowName) => void;
  onAlert: (a: AlertName) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const test = async () => {
    try {
      const sent = await runEveningCheck(true);
      if (!sent) Alert.alert('Alerts are off', 'Pick an alert time first.');
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <Modal visible={props.visible} animationType="slide" statusBarTranslucent onRequestClose={props.onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.sheetHeader, { paddingTop: insets.top + 10 }]}>
          <Serif size={30}>Settings</Serif>
          <Scale onPress={props.onClose} style={styles.roundBtn}>
            <Icon name="x" size={20} color={colors.text} />
          </Scale>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          <Select
            label="Hours you're outside"
            icon="clock"
            value={props.window}
            options={WINDOWS}
            onChange={(v) => props.onWindow(v as WindowName)}
            hint="Comparisons only use these hours, so a hot 3 pm doesn't hide a cold morning commute."
          />
          <Select
            label="Evening alert"
            icon="bell"
            value={props.alert}
            options={ALERTS}
            onChange={(v) => props.onAlert(v as AlertName)}
            hint="Best effort. Your phone's battery saver may skip some evenings."
          />
          <Scale onPress={test} style={styles.ghostBtn}>
            <Icon name="send" size={16} color={colors.text} />
            <Text style={styles.ghostText}>Send tomorrow's alert now</Text>
          </Scale>
          <Eyebrow style={{ marginTop: 26, marginBottom: 8, marginLeft: 2 }}>Home</Eyebrow>
          <View style={styles.homeCard}>
            <Icon name="map-pin" size={18} color={colors.same} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.homeLabel}>{props.home.label}</Text>
              <Text style={styles.homeCoords}>
                {props.home.latitude.toFixed(4)}, {props.home.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
          <Scale
            onPress={() =>
              Alert.alert('Reset home?', 'You will set your location again next time you open the app.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: props.onReset },
              ])
            }
            style={[styles.ghostBtn, { borderColor: 'rgba(224,122,122,0.3)' }]}
          >
            <Icon name="refresh-ccw" size={16} color="#E07A7A" />
            <Text style={[styles.ghostText, { color: '#E07A7A' }]}>Reset home location</Text>
          </Scale>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Segmented({ value, onChange }: { value: Day; onChange: (d: Day) => void }) {
  const anim = useRef(new Animated.Value(value === 'Today' ? 0 : 1)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    Animated.timing(anim, { toValue: value === 'Today' ? 0 : 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [value, anim]);
  return (
    <View style={styles.segment} onLayout={(e) => setW((e.nativeEvent.layout.width - 8) / 2)}>
      {w > 0 && (
        <Animated.View
          style={[styles.segmentPill, { width: w, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, w] }) }] }]}
        />
      )}
      {(['Today', 'Tomorrow'] as Day[]).map((d) => (
        <Scale key={d} onPress={() => onChange(d)} style={styles.segmentItem}>
          <Text style={[styles.segmentText, value === d && { color: colors.text }]}>{d}</Text>
        </Scale>
      ))}
    </View>
  );
}

function Main(props: { home: Home; onReset: () => void }) {
  const insets = useSafeAreaInsets();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [day, setDay] = useState<Day>(new Date().getHours() < 15 ? 'Today' : 'Tomorrow');
  const [window, setWin] = useState<WindowName>('Daytime (8–18)');
  const [alert, setAl] = useState<AlertName>('After 8 pm');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setForecast(await fetchForecast(props.home));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No connection');
    } finally {
      setRefreshing(false);
    }
  }, [props.home]);

  useEffect(() => {
    (async () => {
      setWin(await getWindow());
      setAl(await getAlert());
      const cached = await cachedForecast();
      if (cached) setForecast(cached);
      if (!cached || Date.now() - cached.fetchedAt > STALE_MS) await refresh();
      syncBackgroundTask().catch(() => undefined);
    })();
    const sub = AppState.addEventListener('change', async (s) => {
      if (s !== 'active') return;
      const cached = await cachedForecast();
      if (!cached || Date.now() - cached.fetchedAt > STALE_MS) refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    if (forecast) Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [forecast, fade]);

  const data = useMemo(() => {
    if (!forecast) return null;
    const offset = day === 'Today' ? 0 : 1;
    const baseName = day === 'Today' ? 'yesterday' : 'today';
    const target = summarize(forecast, localDate(offset), window);
    const base = summarize(forecast, localDate(offset - 1), window);
    if (!target || !base) return null;
    const weekAgo = summarize(forecast, localDate(offset - 7), window);
    const verdict = compare(target, base, baseName, weekAgo);
    const shown = verdict.weekly && weekAgo ? weekAgo : base;
    const shownName = verdict.weekly ? 'last week' : baseName;
    return { target, base, baseName, shown, shownName, verdict };
  }, [forecast, day, window]);

  const [wStart, wEnd] = windowHours(window);
  const tier = data ? TIER_STYLE[data.verdict.tier] : TIER_STYLE.same;
  const wear = data ? clothing(data.target.avgFeels) : null;
  const sky = data ? describe(data.target.code) : null;
  const baseByHour = useMemo(() => {
    const m = new Map<number, number>();
    data?.base.hours.forEach((h) => m.set(h.hour, h.feels));
    return m;
  }, [data]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[`${tier.deep}66`, colors.bg]} style={styles.topGlow} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.same} colors={[colors.same]} progressBackgroundColor={colors.surface} />}
      >
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Icon name="map-pin" size={14} color={colors.same} />
            <Text style={styles.place} numberOfLines={1}>
              {props.home.label}
            </Text>
          </View>
          <Scale onPress={() => setSettingsOpen(true)} style={styles.roundBtn}>
            <Icon name="sliders" size={18} color={colors.text} />
          </Scale>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <Segmented value={day} onChange={setDay} />
        </View>

        {!data && (
          <View style={styles.loading}>
            {error ? (
              <>
                <Icon name="wifi-off" size={26} color={colors.muted} />
                <Text style={styles.loadingText}>{error}. Pull down to retry.</Text>
              </>
            ) : (
              <ActivityIndicator color={colors.same} />
            )}
          </View>
        )}

        {data && wear && sky && (
          <Animated.View style={{ opacity: fade, paddingHorizontal: 20 }}>
            <View style={[styles.hero, { borderColor: `${tier.accent}40` }]}>
              <LinearGradient colors={[`${tier.deep}AA`, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.heroInner}>
                <View style={[styles.heroIcon, { backgroundColor: `${tier.accent}22` }]}>
                  <Icon name={tier.icon} size={28} color={tier.accent} />
                </View>
                <Eyebrow style={{ color: tier.accent, marginTop: 18 }}>
                  {day} vs {data.shownName}
                </Eyebrow>
                <Serif size={50} style={{ marginTop: 6 }}>
                  {data.verdict.title}
                </Serif>
                <Text style={styles.advice}>{data.verdict.advice}.</Text>
                <View style={styles.compareRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compareLabel}>
                      {data.shownName === 'yesterday' ? 'Yesterday' : data.shownName === 'today' ? 'Today' : 'Last week'}
                    </Text>
                    <Text style={styles.compareNum}>{Math.round(data.shown.avgFeels)}°</Text>
                    <Text style={styles.compareRange}>
                      {Math.round(data.shown.minFeels)}° to {Math.round(data.shown.maxFeels)}°
                    </Text>
                  </View>
                  <View style={styles.deltaWrap}>
                    <Icon name="arrow-right" size={16} color={colors.muted} />
                    <Text style={[styles.delta, { color: tier.accent }]}>{formatDelta(data.verdict.delta)}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.compareLabel}>{day}</Text>
                    <Text style={[styles.compareNum, { color: tier.accent }]}>{Math.round(data.target.avgFeels)}°</Text>
                    <Text style={styles.compareRange}>
                      {Math.round(data.target.minFeels)}° to {Math.round(data.target.maxFeels)}°
                    </Text>
                  </View>
                </View>
                <Text style={styles.footnote}>
                  Average feels-like temperature, {hourLabel(wStart)} to {hourLabel(wEnd)}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.row}>
              <View style={[styles.tile, { marginRight: 10 }]}>
                <Icon name="user" size={18} color={colors.same} />
                <Text style={styles.tileTitle}>{wear.label}</Text>
                <Text style={styles.tileText}>{wear.detail}</Text>
              </View>
              <View style={styles.tile}>
                <Icon name={sky.icon} size={18} color={colors.same} />
                <Text style={styles.tileTitle}>{sky.label}</Text>
                <Text style={styles.tileText}>
                  Rain {Math.round(data.target.maxRain)}% · Wind {Math.round(data.target.maxWind)} km/h
                </Text>
              </View>
            </View>

            {(data.target.maxRain >= 40 || data.target.maxWind >= 30) && (
              <View style={styles.notes}>
                {data.target.maxRain >= 40 && (
                  <View style={[styles.note, { backgroundColor: 'rgba(108,195,201,0.12)' }]}>
                    <Icon name="umbrella" size={14} color={colors.rain} />
                    <Text style={[styles.noteText, { color: colors.rain }]}>Rain likely, take an umbrella</Text>
                  </View>
                )}
                {data.target.maxWind >= 30 && (
                  <View style={[styles.note, { backgroundColor: 'rgba(169,180,198,0.12)' }]}>
                    <Icon name="wind" size={14} color={colors.wind} />
                    <Text style={[styles.noteText, { color: colors.wind }]}>Windy, it will feel colder than it looks</Text>
                  </View>
                )}
              </View>
            )}

            <Eyebrow style={{ marginTop: 24, marginBottom: 10, marginLeft: 2 }}>
              Hour by hour · change vs {data.baseName}
            </Eyebrow>
          </Animated.View>
        )}

        {data && (
          <Animated.View style={{ opacity: fade }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {data.target.hours.map((h) => {
                const inWin = h.hour >= wStart && h.hour <= wEnd;
                const b = baseByHour.get(h.hour);
                const d = b === undefined ? null : h.feels - b;
                const dc = d === null || Math.abs(d) < 1 ? colors.muted : d < 0 ? colors.cold : colors.warm;
                return (
                  <View key={h.hour} style={[styles.hour, inWin && styles.hourIn]}>
                    <Text style={[styles.hourLabel, inWin && { color: colors.textDim }]}>{hourLabel(h.hour)}</Text>
                    <Icon name={describe(h.code).icon} size={16} color={inWin ? colors.text : colors.muted} />
                    <Text style={[styles.hourTemp, !inWin && { color: colors.textDim }]}>{Math.round(h.feels)}°</Text>
                    <Text style={[styles.hourDelta, { color: dc }]}>{d === null ? ' ' : formatDelta(d)}</Text>
                  </View>
                );
              })}
            </ScrollView>
            {forecast && <Text style={styles.updated}>Updated {ago(forecast.fetchedAt)} · Pull down to refresh</Text>}
          </Animated.View>
        )}
      </ScrollView>

      <Settings
        visible={settingsOpen}
        home={props.home}
        window={window}
        alert={alert}
        onWindow={async (w) => {
          setWin(w);
          await setWindow(w);
        }}
        onAlert={async (a) => {
          setAl(a);
          await setAlert(a);
          syncBackgroundTask().catch(() => undefined);
        }}
        onReset={async () => {
          setSettingsOpen(false);
          await clearHome();
          props.onReset();
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

function Shell() {
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [home, setHomeState] = useState<Home | null | undefined>(undefined);

  useEffect(() => {
    getHome().then(setHomeState);
  }, []);

  const ready = fontsLoaded && home !== undefined;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {home ? <Main home={home} onReset={() => setHomeState(null)} /> : <Setup onDone={setHomeState} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  setup: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', backgroundColor: colors.bg },
  setupTag: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, marginTop: 6, textAlign: 'center' },
  setupCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 16,
  },
  setupText: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, marginLeft: 12, flex: 1 },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  primaryInner: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  primaryText: { color: '#1A160B', fontFamily: fonts.bold, fontSize: 16, marginLeft: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  place: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginLeft: 8, flexShrink: 1 },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
  },
  segmentPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 14,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  segmentItem: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 15 },
  loading: { alignItems: 'center', paddingTop: 120 },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, marginTop: 12 },
  hero: { borderRadius: 26, borderWidth: 1, overflow: 'hidden', marginTop: 18 },
  heroInner: { padding: 22 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  advice: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 17, marginTop: 6 },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  compareLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  compareNum: { color: colors.text, fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, marginTop: 2 },
  compareRange: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  deltaWrap: { alignItems: 'center', paddingHorizontal: 10 },
  delta: { fontFamily: fonts.heavy, fontSize: 18, marginTop: 4 },
  footnote: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginTop: 14 },
  row: { flexDirection: 'row', marginTop: 12 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  tileTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginTop: 10 },
  tileText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, marginTop: 3, lineHeight: 18 },
  notes: { marginTop: 12 },
  note: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8 },
  noteText: { fontFamily: fonts.semibold, fontSize: 13, marginLeft: 10 },
  hour: {
    width: 62,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hourIn: { backgroundColor: colors.surface, borderColor: colors.line },
  hourLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12, marginBottom: 8 },
  hourTemp: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginTop: 8 },
  hourDelta: { fontFamily: fonts.bold, fontSize: 11, marginTop: 3 },
  updated: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, textAlign: 'center', marginTop: 18 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceHi,
    marginTop: 4,
  },
  ghostText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginLeft: 10 },
  homeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 12,
  },
  homeLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  homeCoords: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
});
