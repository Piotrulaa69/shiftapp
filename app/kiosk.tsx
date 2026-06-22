import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getKioskEmployees, getOrCreateQrToken, kioskLoginByPin } from '../lib/db';
import type { DbProfile } from '../lib/supabase';
import { theme } from '../styles/theme';

const QR_REFRESH_MS = 15 * 60 * 1000;
const PIN_DIGITS = 4;

type KioskMode = 'choose' | 'pin' | 'qr_list';

export default function KioskScreen() {
  const { rid } = useLocalSearchParams<{ rid: string }>();
  const [mode, setMode] = useState<KioskMode>('choose');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState<DbProfile | null>(null);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState(QR_REFRESH_MS / 1000);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rid) return;
    getKioskEmployees(rid).then(setEmployees);
  }, [rid]);

  const refreshQrToken = async () => {
    if (!rid) return;
    setQrLoading(true);
    setQrTimeLeft(QR_REFRESH_MS / 1000);
    const token = await getOrCreateQrToken(rid);
    setQrToken(token);
    setQrLoading(false);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    if (qrRefreshRef.current) clearTimeout(qrRefreshRef.current);
    qrTimerRef.current = setInterval(() => {
      setQrTimeLeft(prev => {
        if (prev <= 1) { clearInterval(qrTimerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    qrRefreshRef.current = setTimeout(() => { refreshQrToken(); }, QR_REFRESH_MS);
  };

  useEffect(() => {
    if (mode === 'qr_list') { refreshQrToken(); }
    return () => {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
      if (qrRefreshRef.current) clearTimeout(qrRefreshRef.current);
    };
  }, [mode]);

  const handlePinDigit = (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setPinError('');
    if (next.length >= PIN_DIGITS) { attemptPinLogin(next); }
  };

  const attemptPinLogin = async (p: string) => {
    if (!rid) return;
    setLoading(true);
    const emp = await kioskLoginByPin(rid, p);
    setLoading(false);
    if (emp) {
      setLoggedIn(emp);
      setPin('');
    } else {
      setPinError('Nieprawidłowy PIN. Spróbuj ponownie.');
      setTimeout(() => { setPin(''); setPinError(''); }, 1500);
    }
  };

  const handleQrEmployeeSelect = async (emp: DbProfile) => {
    setLoggedIn(emp);
    await refreshQrToken();
  };

  const handleLogout = () => {
    setLoggedIn(null);
    setMode('choose');
    setPin('');
    setPinError('');
  };

  if (!rid) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Brak identyfikatora restauracji (?rid=...)</Text>
      </View>
    );
  }

  if (loggedIn) {
    return (
      <View style={s.successScreen}>
        <View style={[s.avatarBig, { backgroundColor: loggedIn.avatar_color ?? theme.colors.primary }]}>
          <Text style={s.avatarBigText}>{loggedIn.first_name[0]}{loggedIn.last_name[0]}</Text>
        </View>
        <Text style={s.successName}>{loggedIn.first_name} {loggedIn.last_name}</Text>
        <Text style={s.successJob}>{loggedIn.job_title}</Text>
        <View style={s.successBadge}>
          <Ionicons name="checkmark-circle" size={22} color="#059669" />
          <Text style={s.successBadgeText}>Zalogowano pomyślnie</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="arrow-back-outline" size={18} color={theme.colors.text} />
          <Text style={s.logoutBtnText}>Powrót do kiosku</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'choose') {
    return (
      <View style={s.chooseScreen}>
        <Text style={s.kioskTitle}>Kiosk logowania</Text>
        <Text style={s.kioskSub}>Wybierz metodę logowania</Text>
        <View style={s.chooseRow}>
          <TouchableOpacity style={s.chooseCard} onPress={() => setMode('pin')} activeOpacity={0.85}>
            <View style={[s.chooseIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="keypad" size={36} color={theme.colors.primary} />
            </View>
            <Text style={s.chooseCardTitle}>PIN</Text>
            <Text style={s.chooseCardSub}>Wpisz swój indywidualny PIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.chooseCard} onPress={() => setMode('qr_list')} activeOpacity={0.85}>
            <View style={[s.chooseIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="qr-code" size={36} color="#059669" />
            </View>
            <Text style={s.chooseCardTitle}>QR Code</Text>
            <Text style={s.chooseCardSub}>Zeskanuj kod lub wybierz siebie</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'pin') {
    return (
      <View style={s.pinScreen}>
        <TouchableOpacity style={s.backBtn} onPress={() => { setMode('choose'); setPin(''); setPinError(''); }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.textMuted} />
          <Text style={s.backBtnText}>Wróć</Text>
        </TouchableOpacity>
        <Ionicons name="keypad-outline" size={48} color={theme.colors.primary} style={{ marginBottom: 12 }} />
        <Text style={s.pinTitle}>Wpisz PIN</Text>
        <Text style={s.pinSub}>Podaj swój 4–6 cyfrowy PIN</Text>
        <View style={s.pinDots}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[s.pinDot, i < pin.length && s.pinDotFilled]} />
          ))}
        </View>
        {!!pinError && <Text style={s.pinError}>{pinError}</Text>}
        {loading && <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />}
        <View style={s.numpad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[s.numKey, d === '' && { opacity: 0 }]}
              onPress={() => { if (d === '⌫') { setPin(p => p.slice(0,-1)); setPinError(''); } else if (d) { handlePinDigit(d); } }}
              activeOpacity={0.7}
              disabled={d === '' || loading}
            >
              <Text style={s.numKeyText}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (mode === 'qr_list') {
    const minutes = Math.floor(qrTimeLeft / 60);
    const seconds = qrTimeLeft % 60;
    const qrValue = qrToken ? `reztro://kiosk?token=${qrToken}&rid=${rid}` : 'loading';
    return (
      <ScrollView contentContainerStyle={s.qrScreen}>
        <TouchableOpacity style={s.backBtn} onPress={() => { setMode('choose'); }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.textMuted} />
          <Text style={s.backBtnText}>Wróć</Text>
        </TouchableOpacity>
        <View style={s.qrSection}>
          <Text style={s.qrTitle}>Kod QR restauracji</Text>
          <Text style={s.qrSub}>Wywieś ten kod na ścianie — pracownicy skanują go aparatem</Text>
          <View style={s.qrBox}>
            {qrLoading || !qrToken
              ? <ActivityIndicator color={theme.colors.primary} size="large" />
              : <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}` }} style={{ width: 200, height: 200, borderRadius: 8 }} />}
          </View>
          <View style={s.qrTimer}>
            <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
            <Text style={s.qrTimerText}>
              Odświeży się za {minutes}:{String(seconds).padStart(2,'0')}
            </Text>
            <TouchableOpacity onPress={refreshQrToken} activeOpacity={0.7} style={{ marginLeft: 8 }}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>lub wybierz pracownika z listy</Text>
          <View style={s.dividerLine} />
        </View>
        <View style={s.empList}>
          {employees.filter(e => e.login_method === 'qr').map((emp) => (
            <TouchableOpacity key={emp.id} style={s.empCard} onPress={() => handleQrEmployeeSelect(emp)} activeOpacity={0.8}>
              <View style={[s.empAvatar, { backgroundColor: emp.avatar_color ?? theme.colors.primary }]}>
                <Text style={s.empAvatarText}>{emp.first_name[0]}{emp.last_name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.empName}>{emp.first_name} {emp.last_name}</Text>
                <Text style={s.empJob}>{emp.job_title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
          {employees.filter(e => e.login_method === 'qr').length === 0 && (
            <Text style={s.emptyText}>Brak pracowników z metodą logowania QR</Text>
          )}
        </View>
      </ScrollView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', padding: 24 },

  chooseScreen: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  kioskTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: 6 },
  kioskSub: { fontSize: 15, color: theme.colors.textMuted, marginBottom: 40 },
  chooseRow: { flexDirection: 'row', gap: 16 },
  chooseCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  chooseIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chooseCardTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  chooseCardSub: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center' },

  pinScreen: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pinTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginBottom: 6 },
  pinSub: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 24 },
  pinDots: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: theme.colors.border, backgroundColor: 'transparent' },
  pinDotFilled: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pinError: { fontSize: 13, color: '#DC2626', marginBottom: 8, textAlign: 'center' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: 260, marginTop: 16 },
  numKey: { width: 72, height: 72, borderRadius: 16, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  numKeyText: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  backBtn: { position: 'absolute', top: 56, left: 24, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 },
  backBtnText: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '600' },

  qrScreen: { backgroundColor: theme.colors.background, padding: 24, paddingTop: 72, alignItems: 'center', gap: 24 },
  qrSection: { alignItems: 'center', width: '100%', gap: 8 },
  qrTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  qrSub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  qrBox: { width: 240, height: 240, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3, marginTop: 8 },
  qrTimer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  qrTimerText: { fontSize: 12, color: theme.colors.textMuted },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { fontSize: 12, color: theme.colors.textMuted, whiteSpace: 'nowrap' } as any,
  empList: { width: '100%', gap: 10 },
  empCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.card, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  empAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  empName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  empJob: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 13, padding: 16 },

  successScreen: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  avatarBig: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarBigText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  successName: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  successJob: { fontSize: 16, color: theme.colors.textMuted },
  successBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  successBadgeText: { fontSize: 15, fontWeight: '700', color: '#059669' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.colors.surface, borderRadius: 12 },
  logoutBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
});
