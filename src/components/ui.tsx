import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, radius, space } from '../lib/theme';

export function Screen({
  children,
  refreshing,
  onRefresh,
  padded = true,
  footer,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  footer?: ReactNode;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[padded && styles.padded, { paddingBottom: 32 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} /> : undefined
        }
      >
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}
export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}
export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

type ButtonKind = 'primary' | 'ghost' | 'money' | 'danger';
export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: colors.brand, ghost: 'transparent', money: colors.accent, danger: 'transparent' }[kind];
  const fg = { primary: colors.onBrand, ghost: colors.ink, money: '#1D1404', danger: colors.bad }[kind];
  const border = kind === 'ghost' ? colors.line : kind === 'danger' ? colors.bad : bg;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor="#94A3A5" style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'plain',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'plain' | 'brand' | 'accent' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    plain: [colors.sunk, colors.ink],
    brand: [colors.brandSoft, colors.brand],
    accent: [colors.accentSoft, colors.warn],
    good: [colors.goodSoft, colors.good],
    warn: [colors.warnSoft, colors.warn],
    bad: [colors.badSoft, colors.bad],
  } as const;
  const [bg, fg] = selected ? [colors.brand, colors.onBrand] : tones[tone];
  const content = <Text style={[styles.chipText, { color: fg }]}>{label}</Text>;
  if (!onPress) return <View style={[styles.chip, { backgroundColor: bg }]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, styles.chipTap, { backgroundColor: bg }]}
    >
      {content}
    </Pressable>
  );
}

export function ChipScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Stat({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, money && { color: colors.warn }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

export function ErrorText({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text style={{ color: colors.bad, fontSize: 14 }}>{text}</Text>;
}

export const styles = StyleSheet.create({
  padded: { padding: space.lg, gap: space.lg },
  h1: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', color: colors.muted },
  btn: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnSmall: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.sm },
  btnText: { fontSize: 15, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  chipTap: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 2,
  },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.ink },
});
