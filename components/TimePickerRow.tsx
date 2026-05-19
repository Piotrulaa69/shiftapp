import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../styles/theme';

const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

export default function TimePickerRow({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={Platform.OS !== 'web'}
        style={[s.scroll, Platform.OS === 'web' && { overflowX: 'auto' } as any]}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
      >
        {TIME_SLOTS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.chip, value === t && s.chipActive]}
            onPress={() => onChange(t)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, value === t && s.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  scroll: { marginBottom: 4, height: 36 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, minWidth: 52, alignItems: 'center' },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
