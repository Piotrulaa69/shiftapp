import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { store } from '../../data/store';
import { theme } from '../../styles/theme';

type CheckItem = {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  icon: string;
  value: string;
};

const TEMP_ITEMS: CheckItem[] = [
  { id: 'f1', name: 'Lodówka 1 – nabiał', unit: '°C', min: 2, max: 4, icon: 'snow-outline', value: '' },
  { id: 'f2', name: 'Lodówka 2 – warzywa', unit: '°C', min: 2, max: 6, icon: 'snow-outline', value: '' },
  { id: 'f3', name: 'Witryna chłodnicza', unit: '°C', min: 0, max: 5, icon: 'snow-outline', value: '' },
  { id: 'z1', name: 'Zamrażarka 1', unit: '°C', min: -22, max: -18, icon: 'cube-outline', value: '' },
  { id: 'z2', name: 'Zamrażarka 2', unit: '°C', min: -22, max: -18, icon: 'cube-outline', value: '' },
  { id: 'w1', name: 'Podgrzewacz potraw', unit: '°C', min: 63, max: 80, icon: 'flame-outline', value: '' },
];

function getStatus(item: CheckItem): 'empty' | 'ok' | 'low' | 'high' {
  if (!item.value.trim()) return 'empty';
  const num = parseFloat(item.value.replace(',', '.'));
  if (isNaN(num)) return 'empty';
  if (num < item.min) return 'low';
  if (num > item.max) return 'high';
  return 'ok';
}

const STATUS_CONFIG = {
  empty: { color: theme.colors.border, bg: theme.colors.background, label: '–', icon: 'ellipse-outline' as const },
  ok: { color: theme.colors.green, bg: theme.colors.greenLight, label: 'OK', icon: 'checkmark-circle' as const },
  low: { color: theme.colors.primary, bg: theme.colors.primaryLight, label: 'Za niska', icon: 'arrow-down-circle' as const },
  high: { color: theme.colors.error, bg: '#FEF2F2', label: 'Za wysoka', icon: 'arrow-up-circle' as const },
};

export default function ConfirmValuesScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { showAlert, showSuccess, showConfirm } = useAlert();
  const task = store.tasks.find((t) => t.id === taskId) ?? store.tasks[2];
  const [items, setItems] = useState<CheckItem[]>(TEMP_ITEMS);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const filled = items.filter((i) => i.value.trim() !== '');
  const allOk = filled.length === items.length && filled.every((i) => getStatus(i) === 'ok');
  const hasWarnings = filled.some((i) => getStatus(i) !== 'ok' && getStatus(i) !== 'empty');
  const progress = filled.length / items.length;

  const updateValue = (id: string, value: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const handleConfirm = () => {
    const unfilled = items.filter((i) => !i.value.trim());
    if (unfilled.length > 0) {
      showAlert('Brak wartości', `Uzupełnij wszystkie pola (brakuje ${unfilled.length}).`);
      return;
    }
    const warnings = items.filter((i) => getStatus(i) !== 'ok');
    if (warnings.length > 0) {
      showConfirm(
        '⚠️ Wykryto odchylenia',
        `${warnings.length} urządzenie(a) poza normą. Czy potwierdzić i zgłosić do kierownika?`,
        () => showSuccess('Zgłoszono!', 'Wyniki zostały zapisane i przesłane do kierownika.', () => router.back()),
        'Potwierdź i zgłoś'
      );
    } else {
      showSuccess('Wszystkie temperatury w normie!', 'Wyniki zostały zapisane.', () => router.back());
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kontrola wartości</Text>
        <View style={s.headerBadge}>
          <Ionicons name="thermometer" size={13} color={theme.colors.orange} />
          <Text style={[s.headerBadgeText, { color: theme.colors.orange }]}>HACCP</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Task card */}
        <View style={s.taskCard}>
          <View style={s.taskCardRow}>
            <View style={s.priorityHigh}>
              <Text style={s.priorityHighText}>Wysoki priorytet</Text>
            </View>
            <View style={s.typeBadge}>
              <Ionicons name="thermometer-outline" size={12} color={theme.colors.orange} />
              <Text style={[s.typeBadgeText, { color: theme.colors.orange }]}>Kontrola wartości</Text>
            </View>
          </View>
          <Text style={s.taskTitle}>{task.title}</Text>
          <Text style={s.taskDesc}>{task.description}</Text>
          <View style={s.taskMeta}>
            <View style={s.taskMetaItem}>
              <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
              <Text style={s.taskMetaText}>{task.assignedTime}</Text>
            </View>
            <View style={s.taskMetaItem}>
              <Ionicons name="timer-outline" size={13} color={theme.colors.textMuted} />
              <Text style={s.taskMetaText}>{task.durationMin} min</Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>Uzupełnione</Text>
            <Text style={s.progressCount}>{filled.length}/{items.length}</Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progress * 100}%` as any },
              allOk && s.progressFillOk, hasWarnings && s.progressFillWarn]} />
          </View>
          {hasWarnings && (
            <View style={s.warningBanner}>
              <Ionicons name="warning-outline" size={14} color={theme.colors.orange} />
              <Text style={s.warningBannerText}>Wykryto wartości poza normą — zgłoś do kierownika</Text>
            </View>
          )}
          {allOk && (
            <View style={s.okBanner}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.green} />
              <Text style={s.okBannerText}>Wszystkie wartości w normie!</Text>
            </View>
          )}
        </View>

        {/* Measurement items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Pomiary urządzeń</Text>
          <Text style={s.sectionSub}>Wpisz aktualną temperaturę każdego urządzenia</Text>

          {items.map((item, idx) => {
            const status = getStatus(item);
            const cfg = STATUS_CONFIG[status];
            return (
              <View key={item.id} style={[s.measureRow, idx > 0 && s.measureRowBorder]}>
                <View style={[s.measureIconWrap, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={item.icon as any} size={18} color={cfg.color} />
                </View>
                <View style={s.measureInfo}>
                  <Text style={s.measureName}>{item.name}</Text>
                  <Text style={s.measureRange}>
                    Norma: {item.min} do {item.max}{item.unit}
                  </Text>
                </View>
                <View style={s.measureInputWrap}>
                  <TextInput
                    style={[s.measureInput, status === 'ok' && s.measureInputOk, (status === 'high' || status === 'low') && s.measureInputWarn]}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={item.value}
                    onChangeText={(v) => updateValue(item.id, v)}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <Text style={s.measureUnit}>{item.unit}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                  <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={s.legendCard}>
          <Text style={s.legendTitle}>Legenda statusów</Text>
          <View style={s.legendRow}>
            {(['ok', 'low', 'high'] as const).map((st) => (
              <View key={st} style={s.legendItem}>
                <Ionicons name={STATUS_CONFIG[st].icon} size={14} color={STATUS_CONFIG[st].color} />
                <Text style={[s.legendText, { color: STATUS_CONFIG[st].color }]}>{STATUS_CONFIG[st].label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Confirm */}
        <TouchableOpacity
          style={[s.confirmBtn, filled.length < items.length && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.white} />
          <Text style={s.confirmBtnText}>
            {filled.length < items.length
              ? `Uzupełnij brakujące (${items.length - filled.length})`
              : 'Zatwierdź pomiary'}
          </Text>
        </TouchableOpacity>

        <Text style={s.footerNote}>
          Wyniki zostaną zapisane z datą i godziną kontroli zgodnie z wymogami HACCP.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.white, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.orangeLight,
    borderRadius: theme.borderRadius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700' },

  content: { padding: 16, gap: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 700, alignSelf: 'center', width: '100%', paddingHorizontal: 32 },

  taskCard: {
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
    padding: 18, ...theme.shadows.card,
  },
  taskCardRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  priorityHigh: {
    backgroundColor: '#FEF2F2', borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  priorityHighText: { fontSize: 11, fontWeight: '700', color: theme.colors.error },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.orangeLight, borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  taskTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  taskDesc: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  taskMeta: { flexDirection: 'row', gap: 16 },
  taskMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMetaText: { fontSize: 12, color: theme.colors.textMuted },

  progressCard: {
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
    padding: 16, gap: 8, ...theme.shadows.card,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  progressCount: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  progressBg: { height: 8, backgroundColor: theme.colors.background, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  progressFillOk: { backgroundColor: theme.colors.green },
  progressFillWarn: { backgroundColor: theme.colors.orange },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.orangeLight, borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  warningBannerText: { fontSize: 12, color: theme.colors.orange, fontWeight: '600', flex: 1 },
  okBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.greenLight, borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  okBannerText: { fontSize: 12, color: theme.colors.green, fontWeight: '600' },

  section: {
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
    padding: 18, ...theme.shadows.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16 },

  measureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12,
  },
  measureRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  measureIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  measureInfo: { flex: 1 },
  measureName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  measureRange: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  measureInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  measureInput: {
    width: 56, height: 40, borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: theme.colors.text,
    backgroundColor: theme.colors.white,
  },
  measureInputOk: { borderColor: theme.colors.green, backgroundColor: theme.colors.greenLight },
  measureInputWarn: { borderColor: theme.colors.error, backgroundColor: '#FEF2F2' },
  measureUnit: { fontSize: 12, color: theme.colors.textMuted, width: 20 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: theme.borderRadius.full, paddingHorizontal: 8, paddingVertical: 4,
    minWidth: 72, justifyContent: 'center',
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  legendCard: {
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
    padding: 14, borderWidth: 1, borderColor: theme.colors.border,
  },
  legendTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 10 },
  legendRow: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 12, fontWeight: '600' },

  confirmBtn: {
    backgroundColor: theme.colors.navy, borderRadius: theme.borderRadius.md,
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, ...theme.shadows.medium,
  },
  confirmBtnDisabled: { backgroundColor: theme.colors.textMuted },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: theme.colors.white },
  footerNote: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
