import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
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
import QrScanner from '../components/QrScanner';
import { useAuth } from '../context/AuthContext';
import { clockIn, clockInWithPin, clockOut, getActiveClockIn, getTodayShift, validateAndConsumeQrToken } from '../lib/db';
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
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [clockOutReason, setClockOutReason] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanError, setQrScanError] = useState('');
  const [cameraPermission, setCameraPermission] = useState<{ granted: boolean } | null>(null);
  const qrScannedRef = useRef(false);
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
      let ci = await getActiveClockIn(resolvedShift.id);
      if (!ci && user) {
        // Fallback: search by employee_id for today in case shift_id mismatch
        const today = new Date().toISOString().slice(0, 10);
        const { data: fallbackCI } = await supabase
          .from('clock_ins')
          .select('*')
          .eq('employee_id', user.id)
          .in('status', ['active', 'pending'])
          .gte('clock_in_at', today + 'T00:00:00')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        ci = fallbackCI as typeof ci;
      }
      setActiveCI(ci);
    }
    setLoading(false);
  }, [shiftId, rid, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh when app comes back from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: string) => {
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

  const handleClockIn = async () => {
    if (!shift || !user) return;
    const { data: profile } = await supabase.from('profiles').select('login_method').eq('id', user.id).maybeSingle();
    if (profile?.login_method === 'qr') {
      qrScannedRef.current = false;
      setQrScanError('');
      setShowQrScanner(true);
      return;
    }
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleQrScanned = async (data: string) => {
    if (qrScannedRef.current || !shift || !user) return;
    qrScannedRef.current = true;
    let token: string | null = null;
    try {
      const url = new URL(data);
      token = url.searchParams.get('token');
    } catch {
      token = null;
    }
    if (!token) {
      setQrScanError('Nieprawidłowy kod QR. Zeskanuj kod z kiosku restauracji.');
      qrScannedRef.current = false;
      return;
    }
    const ok = await validateAndConsumeQrToken(token, user.id);
    if (!ok) {
      setQrScanError('Kod QR wygasł lub jest nieważny. Poproś o odświeżenie kiosku.');
      qrScannedRef.current = false;
      return;
    }
    setShowQrScanner(false);
    setClockLoading(true);
    const ci = await clockIn(rid, shift.id, user.id, 'qr');
    if (ci) setActiveCI(ci);
    setClockLoading(false);
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
      setPinError(result.error ?? 'Błąd zameldowania');
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

  const handleClockOut = () => {
    if (!activeCI || !shift) return;
    setClockOutReason('');
    setShowClockOutModal(true);
  };

  const doClockOut = async () => {
    if (!activeCI) return;
    setClockLoading(true);
    setShowClockOutModal(false);
    await clockOut(activeCI.id, clockOutReason.trim() || undefined);
    setActiveCI(null);
    setClockLoading(false);
    await loadData();
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
    router.push('/(tabs)/schedule');
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  if (!shift) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')} style={styles.backBtn}>
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
          <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')} style={styles.backBtn}>
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
                <TouchableOpacity
                  style={[styles.clockBtn, styles.clockOutBtn, clockLoading && { opacity: 0.7 }]}
                  onPress={() => {
                    if (clockLoading) return;
                    handleClockOut();
                  }}
                  activeOpacity={0.75}
                >
                  {clockLoading ? <ActivityIndicator color={theme.colors.white} /> : (
                    <><Ionicons name="log-out-outline" size={18} color={theme.colors.white} /><Text style={styles.clockBtnText}>Wymelduj się</Text></>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.clockBtn} onPress={handleClockIn} disabled={clockLoading} activeOpacity={0.85}>
                {clockLoading ? <ActivityIndicator color={theme.colors.white} /> : (
                  <><Ionicons name="log-in-outline" size={18} color={theme.colors.white} /><Text style={styles.clockBtnText}>Zamelduj się — Rozpocznij zmianę</Text></>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Confirm / Reject shift */}
        {isMyShift && shift.status === 'do_potwierdzenia' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Potwierdzenie zmiany</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 }}>
              Twój pracodawca prosi o potwierdzenie Twojej dostępności na tę zmianę.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: theme.colors.green, height: 44, borderRadius: theme.borderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                activeOpacity={0.85}
                onPress={async () => {
                  await supabase.from('shifts').update({ status: 'potwierdzona' }).eq('id', shift.id);
                  setShift({ ...shift, status: 'potwierdzona' });
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.white} />
                <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 14 }}>Potwierdź</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: theme.colors.error, height: 44, borderRadius: theme.borderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                activeOpacity={0.85}
                onPress={() => {
                  const doReject = async () => {
                    await supabase.from('shifts').update({ status: 'zaplanowana' }).eq('id', shift.id);
                    setShift({ ...shift, status: 'zaplanowana' });
                  };
                  if (Platform.OS === 'web') {
                    if (confirm('Czy na pewno chcesz odrzucić tę zmianę?')) doReject();
                  } else {
                    Alert.alert('Odrzuć zmianę', 'Czy na pewno chcesz odrzucić tę zmianę?', [
                      { text: 'Anuluj', style: 'cancel' },
                      { text: 'Odrzuć', style: 'destructive', onPress: doReject },
                    ]);
                  }
                }}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.white} />
                <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 14 }}>Odrzuć</Text>
              </TouchableOpacity>
            </View>
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
                Wpisz PIN zmiany, aby się zameldować
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
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal visible={showQrScanner} animationType="slide" onRequestClose={() => setShowQrScanner(false)}>
        <QrScanner
          onScanned={handleQrScanned}
          onClose={() => setShowQrScanner(false)}
          error={qrScanError}
          onRetry={() => { setQrScanError(''); qrScannedRef.current = false; }}
        />
      </Modal>

      {/* Clock-out reason modal */}
      {showClockOutModal && shift && activeCI && (() => {
        const [endH, endM] = shift.end_time.split(':').map(Number);
        const [y, mo, d] = shift.day.split('-').map(Number);
        const scheduledEnd = new Date(y, mo - 1, d, endH, endM, 0);
        const now = new Date();
        const diffMin = Math.round((now.getTime() - scheduledEnd.getTime()) / 60000);
        const isEarly = diffMin < -1;
        const isLate = diffMin > 1;
        return (
          <View style={[mStyles.overlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }]}>
            <View style={mStyles.sheet}>
              <View style={mStyles.mHeader}>
                <Text style={mStyles.mTitle}>Zakończenie zmiany</Text>
                <TouchableOpacity onPress={() => setShowClockOutModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <View style={mStyles.body}>
                {isEarly && (
                  <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <Ionicons name="warning-outline" size={18} color="#D97706" />
                    <Text style={{ flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 }}>
                      Twoja zmiana powinna się zakończyć za {Math.abs(diffMin)} min. Czy na pewno chcesz wyjść wcześniej?
                    </Text>
                  </View>
                )}
                {isLate && (
                  <View style={{ backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <Ionicons name="time-outline" size={18} color="#DC2626" />
                    <Text style={{ flex: 1, fontSize: 13, color: '#991B1B', lineHeight: 18 }}>
                      Twoja zmiana powinna się zakończyć {Math.abs(diffMin)} min temu ({shift.end_time}). Opisz powód przedłużenia.
                    </Text>
                  </View>
                )}
                {(isEarly || isLate) && (
                  <>
                    <Text style={mStyles.label}>Powód {isEarly ? 'wyjścia przed czasem' : 'nadgodzin'} (opcjonalnie):</Text>
                    <TextInput
                      style={[mStyles.input, { minHeight: 70 }]}
                      value={clockOutReason}
                      onChangeText={setClockOutReason}
                      placeholder={isEarly ? 'np. Goście wyszli wcześniej...' : 'np. Duże obłożenie, zostałem dłużej...'}
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                    />
                  </>
                )}
                {!isEarly && !isLate && (
                  <Text style={{ fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginVertical: 16 }}>
                    Zakończ zmianę zgodnie z harmonogramem ({shift.end_time}).
                  </Text>
                )}
                <TouchableOpacity
                  style={[mStyles.saveBtn, { backgroundColor: theme.colors.error }]}
                  onPress={doClockOut}
                  activeOpacity={0.85}
                >
                  {clockLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={mStyles.saveBtnText}>Potwierdź wymeldowanie</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}

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
