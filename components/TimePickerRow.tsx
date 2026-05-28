import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../styles/theme';

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function Column({ value, onUp, onDown }: { value: string; onUp: () => void; onDown: () => void }) {
  return (
    <View style={s.col}>
      <TouchableOpacity style={s.arrow} onPress={onUp} activeOpacity={0.6}>
        <Ionicons name="chevron-up" size={22} color={theme.colors.primary} />
      </TouchableOpacity>
      <View style={s.valueBox}>
        <Text style={s.valueText}>{value}</Text>
      </View>
      <TouchableOpacity style={s.arrow} onPress={onDown} activeOpacity={0.6}>
        <Ionicons name="chevron-down" size={22} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default function TimePickerRow({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const parts = value.split(':');
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;

  const changeH = (delta: number) => {
    const newH = ((h + delta) % 24 + 24) % 24;
    onChange(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const changeM = (delta: number) => {
    const nearest = MINUTES.reduce((prev, curr) => Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev);
    const idx = MINUTES.indexOf(nearest);
    const newIdx = ((idx + delta) % MINUTES.length + MINUTES.length) % MINUTES.length;
    onChange(`${String(h).padStart(2, '0')}:${String(MINUTES[newIdx]).padStart(2, '0')}`);
  };

  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.picker}>
        <Column value={String(h).padStart(2, '0')} onUp={() => changeH(1)} onDown={() => changeH(-1)} />
        <Text style={s.colon}>:</Text>
        <Column value={String(m).padStart(2, '0')} onUp={() => changeM(1)} onDown={() => changeM(-1)} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 10 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 24,
    gap: 8,
  },
  col: { alignItems: 'center', gap: 2 },
  arrow: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  valueBox: {
    width: 68,
    height: 60,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.card,
  },
  valueText: { fontSize: 30, fontWeight: '700', color: theme.colors.text },
  colon: { fontSize: 30, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
});
