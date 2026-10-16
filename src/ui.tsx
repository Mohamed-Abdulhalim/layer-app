import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { ComponentProps, ReactNode, useState } from 'react';
import { FlatList, Modal, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from './theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon(props: { name: IconName; size?: number; color?: string }) {
  return <Feather name={props.name} size={props.size ?? 18} color={props.color ?? colors.textDim} />;
}

export function tap() {
  Haptics.selectionAsync().catch(() => undefined);
}

export function Scale(props: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={
        props.onPress
          ? () => {
              tap();
              props.onPress?.();
            }
          : undefined
      }
      style={({ pressed }) => [props.style, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}
    >
      {props.children}
    </Pressable>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.eyebrow, style]}>{children}</Text>;
}

export function Serif({ children, size = 34, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.serif, { fontSize: size, lineHeight: size * 1.1 }, style]}>{children}</Text>;
}

export function Select(props: {
  label: string;
  hint?: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  icon: IconName;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ marginBottom: 18 }}>
      <Eyebrow style={{ marginBottom: 8, marginLeft: 2 }}>{props.label}</Eyebrow>
      <Scale onPress={() => setOpen(true)} style={s.field}>
        <Icon name={props.icon} size={16} color={colors.muted} />
        <Text style={s.fieldText}>{props.value}</Text>
        <Icon name="chevron-down" size={16} color={colors.muted} />
      </Scale>
      {props.hint && <Text style={s.hint}>{props.hint}</Text>}
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.handle} />
            <Eyebrow style={{ marginBottom: 12, marginLeft: 6 }}>{props.label}</Eyebrow>
            <FlatList
              data={props.options as string[]}
              keyExtractor={(o) => o}
              renderItem={({ item }) => {
                const active = item === props.value;
                return (
                  <Scale
                    style={[s.option, active && s.optionActive]}
                    onPress={() => {
                      props.onChange(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={[s.optionText, active && { color: colors.same }]}>{item}</Text>
                    {active && <Icon name="check" size={18} color={colors.same} />}
                  </Scale>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  eyebrow: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  serif: { color: colors.text, fontFamily: fonts.serif },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  fieldText: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 16, marginLeft: 12 },
  hint: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 8, marginLeft: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(3,4,7,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 10,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: colors.line,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  optionActive: { backgroundColor: 'rgba(201,185,143,0.12)' },
  optionText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
});
