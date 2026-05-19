import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { clockIn, clockInWithPin, clockOut, getActiveClockIn, getTodayShift } from '../lib/db';
import type { DbClockIn, DbShift } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { theme } from '../styles/theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  zaplanowana: { label: 'Zaplanowana', color: '#F97316', bg: '#FFF4E5' },
  do_potwierdzenia: { label: 'Do potwierdzenia', color: theme.colors.primary, bg: '#E3F2FD' },
  potwierdzona: { label: 'Potwierdzona', color: '#22C55E', bg: '#E8F8ED' },
  urlop: { label: 'Urlop', color: '#A855F7', bg: '#F3E8FF' },
};

export default function ShiftDetailScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [shift, setShift] = useState<DbShift | null>(null);
  const [activeCI, setActiveCI] = useState<DbClockIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceType, setAbsenceType] = useState('l4');
  const [absenceDesc, setAbsenceDesc] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const loadData = useCallback(async () => {
    let resolvedShift: DbShift | null = null;
    if (shiftId) {
      const { data } = await supabase.from('shifts').select('*').eq('id', shiftId).single();
      resolvedShift = data as DbShift | null;
    } else if (rid && user) {
      resolvedShift = await getTodayShift(rid, user.id);
    }
    if (resolvedShift) {
      setShift(resolvedShift);
      const ci = await getActiveClockIn(resolvedShift.id);
      setActiveCI(ci);
    }
    setLoading(false);
  }, [shiftId, rid, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh when app comes back from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadData();
      }
    });
    return () => subscription.remove();
  }, [loadData]);

  // Timer for active clock-in
  useEffect(() => {
    if (!activeCI?.clock_in_at) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(activeCI.clock_in_at!).getTime()) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCI]);

  const handleClockIn = () => {
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handlePinClockIn = async () => {
    if (!shift || !user) return;
    setClockLoading(true);
    setPinError('');
    const result = await clockInWithPin(rid, shift.id, user.id, pin);
    if (result.success && result.clockIn) {
      setActiveCI(result.clockIn);
      setShowPinModal(false);
    } else {
      setPinError(result.error ?? 'Błąd clock-in');
    }
    setClockLoading(false);
  };

  const handleManualClockIn = async () => {
    if (!shift || !user) return;
    setClockLoading(true);
    const ci = await clockIn(rid, shift.id, user.id, 'manual');
    if (ci) { setActiveCI(ci); setShowPinModal(false); }
    setClockLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeCI) return;
    const doClockOut = async () => {
      setClockLoading(true);
      await clockOut(activeCI.id);
      setActiveCI(null);
      setClockLoading(false);
      await loadData();
    };
    if (Platform.OS === 'web') {
      if (confirm('Potwierdzasz zakończenie zmiany?')) doClockOut();
    } else {
      Alert.alert('Clock-out', 'Potwierdzasz zakończenie zmiany?', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Potwierdź', onPress: doClockOut },
      ]);
    }
  };

  const handleAbsence = async () => {
    if (!shift || !user) return;
    await supabase.from('absences').insert({
      restaurant_id: rid,
      shift_id: shift.id,
      employee_id: user.id,
      absence_type: absenceType,
      description: absenceDesc || null,
    });
    setShowAbsenceModal(false);
    router.back();
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  if (!shift) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Szczegóły zmiany</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 }}>
        <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>Brak zmiany</Text>
        <Text style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 19 }}>
          Nie masz zaplanowanej zmiany na dziś. Sprawdź swój grafik, aby zobaczyć nadchodzące zmiany.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 12, backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: theme.borderRadius.md }}
          onPress={() => router.push('/(tabs)/schedule' as any)}
          activeOpacity={0.85}
        >
          <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 14 }}>Zobacz grafik</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const st = STATUS_MAP[shift.status] ?? STATUS_MAP.zaplanowana;
  const dayLabel = new Date(shift.day).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const isMyShift = shift.employee_id === user?.id;
  const isUpcoming = shift.status === 'zaplanowana' || shift.status === 'do_potwierdzenia';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Szczegóły zmiany</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Status + Date */}
        <View style={styles.dateSection}>
          <Text style={styles.dayText}>{dayLabel}</Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <DetailRow icon="time-outline" label="Godziny" value={`${shift.start_time} — ${shift.end_time}`} />
          <DetailRow icon="location-outline" label="Lokalizacja" value={shift.location || 'Brak'} />
          <DetailRow icon="person-outline" label="Pracownik" value={shift.employee_name} />
          <DetailRow icon="briefcase-outline" label="Stanowisko" value={shift.job_title} />
        </View>

        {/* Clock-in Section */}
        {isMyShift && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rejestracja czasu pracy</Text>
            {activeCI ? (
              <>
                <View style={styles.timerBox}>
                  <Ionicons name="timer-outline" size={28} color={theme.colors.primary} />
                  <Text style={styles.timerText}>{elapsed}</Text>
                  <Text style={styles.timerLabel}>Czas pracy</Text>
                </View>
                <TouchableOpacity style={[styles.clockBtn, styles.clockOutBtn]} onPress={handleClockOut} disabled={clockLoading} activeOpacity={0.85}>
                  {clockLoading ? <ActivityIndicator color={theme.colors.white} /> : (
                    <><Ionicons name="log-out-outline" size={18} color={theme.colors.white} /><Text style={styles.clockBtnText}>Clock-out</Text></>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.clockBtn} onPress={handleClockIn} disabled={clockLoading} activeOpacity={0.85}>
                {clockLoading ? <ActivityIndicator color={theme.colors.white} /> : (
                  <><Ionicons name="log-in-outline" size={18} color={theme.colors.white} /><Text style={styles.clockBtnText}>Clock-in — Rozpocznij zmianę</Text></>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        {isMyShift && isUpcoming && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Akcje</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAbsenceModal(true)} activeOpacity={0.7}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
              <Text style={styles.actionBtnText}>Zgłoś nieobecność</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {}} activeOpacity={0.7}>
              <Ionicons name="swap-horizontal-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.actionBtnText}>Zaproponuj wymianę</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* PIN Clock-in Modal */}
      <Modal visible={showPinModal} animationType="fade" transparent onRequestClose={() => setShowPinModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Zameldowanie</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <View style={mStyles.body}>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>
                Wpisz PIN zmiany lub zamelduj się ręcznie
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ width: 48, height: 56, borderRadius: 12, borderWidth: 2, borderColor: pin.length > i ? theme.colors.primary : theme.colors.border, backgroundColor: pin.length > i ? theme.colors.primaryLight : theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.primary }}>{pin.length > i ? '●' : ''}</Text>
                  </View>
                ))}
              </View>
              {pinError ? <Text style={{ color: theme.colors.error, fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{pinError}</Text> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                {['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={{ width: 72, height: 52, borderRadius: 12, backgroundColor: k === '✓' ? theme.colors.primary : theme.colors.surface, alignItems: 'center', justifyContent: 'center', ...theme.shadows.card }}
                    onPress={() => {
                      if (k === '⌫') { setPin((p) => p.slice(0, -1)); setPinError(''); }
                      else if (k === '✓') { handlePinClockIn(); }
                      else if (pin.length < 6) { setPin((p) => p + k); setPinError(''); }
                    }}
                    activeOpacity={0.7}
                  >
                    {clockLoading && k === '✓' ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 18, fontWeight: '700', color: k === '✓' ? '#FFF' : theme.colors.text }}>{k}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: theme.colors.surface }]} onPress={handleManualClockIn} disabled={clockLoading} activeOpacity={0.8}>
                <Text style={[mStyles.saveBtnText, { color: theme.colors.textSecondary }]}>Zamelduj ręcznie (bez PIN)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Absence Modal */}
      <Modal visible={showAbsenceModal} animationType="fade" transparent onRequestClose={() => setShowAbsenceModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Zgłoś nieobecność</Text>
              <TouchableOpacity onPress={() => setShowAbsenceModal(false)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <View style={mStyles.body}>
              <Text style={mStyles.label}>Typ nieobecności</Text>
              {(['l4', 'child_care', 'force_majeure', 'other'] as const).map((t) => (
                <TouchableOpacity key={t} style={[mStyles.optionBtn, absenceType === t && mStyles.optionActive]} onPress={() => setAbsenceType(t)}>
                  <Text style={[mStyles.optionText, absenceType === t && mStyles.optionTextActive]}>
                    {{ l4: 'L4 — Zwolnienie lekarskie', child_care: 'Opieka nad dzieckiem', force_majeure: 'Siła wyższa', other: 'Inne' }[t]}
                  </Text>
                </TouchableOpacity>
              ))}
              {absenceType === 'other' && (
                <>
                  <Text style={mStyles.label}>Opis (wymagany)</Text>
                  <TextInput style={mStyles.input} value={absenceDesc} onChangeText={setAbsenceDesc} placeholder="Opisz powód..." placeholderTextColor={theme.colors.textMuted} multiline />
                </>
              )}
              <TouchableOpacity style={mStyles.saveBtn} onPress={handleAbsence} activeOpacity={0.85} disabled={absenceType === 'other' && !absenceDesc.trim()}>
                <Text style={mStyles.saveBtnText}>Wyślij zgłoszenie</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={18} color={theme.colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  dateSection: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  dayText: { fontSize: 20, fontWeight: '700', color: theme.colors.text, textTransform: 'capitalize' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: { marginHorizontal: 16, marginBottom: 16, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  timerBox: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  timerText: { fontSize: 36, fontWeight: '800', color: theme.colors.primary, fontVariant: ['tabular-nums'] },
  timerLabel: { fontSize: 12, color: theme.colors.textMuted },
  clockBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  clockOutBtn: { backgroundColor: theme.colors.error },
  clockBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actionBtnText: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.text },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text, minHeight: 80, textAlignVertical: 'top' },
  optionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 6 },
  optionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  optionText: { fontSize: 13, color: theme.colors.text },
  optionTextActive: { color: theme.colors.primary, fontWeight: '600' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});
