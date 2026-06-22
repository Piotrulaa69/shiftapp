import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getOrCreateQrToken, kioskLoginByPin } from '../lib/db';
import type { DbProfile } from '../lib/supabase';
import { theme } from '../styles/theme';

const QR_REFRESH_MS = 15 * 60 * 1000;
const SUCCESS_RETURN_MS = 4000;

type KioskMode = 'choose' | 'pin' | 'qr';

export default function KioskScreen() {
  const { rid, mode: initMode } = useLocalSearchParams<{ rid: string; mode?: string }>();
  const [mode, setMode] = useState<KioskMode>((initMode as KioskMode) ?? 'choose');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState<DbProfile | null>(null);
  const [prevMode, setPrevMode] = useState<KioskMode>('qr');
  const [countdown, setCountdown] = useState(Math.ceil(SUCCESS_RETURN_MS / 1000));
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState(QR_REFRESH_MS / 1000);
  const qrTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrAutoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── QR token management ──────────────────────────────
  const refreshQrToken = async () => {
    if (!rid) return;
    setQrLoading(true);
    const token = await getOrCreateQrToken(rid);
    setQrToken(token);
    setQrLoading(false);
    setQrTimeLeft(QR_REFRESH_MS / 1000);
    if (qrTickRef.current) clearInterval(qrTickRef.current);
    if (qrAutoRef.current) clearTimeout(qrAutoRef.current);
    qrTickRef.current = setInterval(() => {
      setQrTimeLeft(prev => {
        if (prev <= 1) { clearInterval(qrTickRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    qrAutoRef.current = setTimeout(() => refreshQrToken(), QR_REFRESH_MS);
  };

  useEffect(() => {
    if (mode === 'qr') refreshQrToken();
    return () => {
      if (qrTickRef.current) clearInterval(qrTickRef.current);
      if (qrAutoRef.current) clearTimeout(qrAutoRef.current);
    };
  }, [mode]);

  // ── Success auto-return ──────────────────────────────
  const showSuccess = (emp: DbProfile, returnTo: KioskMode) => {
    setLoggedIn(emp);
    setPrevMode(returnTo);
    setCountdown(Math.ceil(SUCCESS_RETURN_MS / 1000));
    if (cdRef.current) clearInterval(cdRef.current);
    if (returnRef.current) clearTimeout(returnRef.current);
    cdRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    returnRef.current = setTimeout(() => {
      clearInterval(cdRef.current!);
      setLoggedIn(null);
      setMode(returnTo);
      setPin('');
      setPinError('');
    }, SUCCESS_RETURN_MS);
  };

  useEffect(() => () => {
    if (cdRef.current) clearInterval(cdRef.current);
    if (returnRef.current) clearTimeout(returnRef.current);
  }, []);

  // ── PIN logic ────────────────────────────────────────
  const handlePinDigit = (d: string) => {
    if (loading) return;
    if (d === '⌫') { setPin(p => p.slice(0, -1)); setPinError(''); return; }
    const next = pin + d;
    if (next.length > 6) return;
    setPin(next);
    setPinError('');
    if (next.length >= 4) attemptPinLogin(next);
  };

  const attemptPinLogin = async (p: string) => {
    if (!rid) return;
    setLoading(true);
    const emp = await kioskLoginByPin(rid, p);
    setLoading(false);
    if (emp) {
      showSuccess(emp, 'pin');
    } else {
      setPinError('Nieprawidłowy PIN. Spróbuj ponownie.');
      setTimeout(() => { setPin(''); setPinError(''); }, 1500);
    }
  };


  if (!rid) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Brak identyfikatora restauracji (?rid=...)</Text>
      </View>
    );
  }

  // ── SUCCESS SCREEN ───────────────────────────────────
  if (loggedIn) {
    return (
      <View style={s.successScreen}>
        <View style={s.successCheckCircle}>
          <Ionicons name="checkmark" size={52} color="#fff" />
        </View>
        <Text style={s.successHeadline}>
          {loggedIn.first_name} {loggedIn.last_name}, zalogowałeś się!
        </Text>
        <Text style={s.successJob}>{loggedIn.job_title}</Text>
        <View style={s.successCountdown}>
          <Text style={s.successCountdownText}>Powrót za {countdown}s</Text>
        </View>
      </View>
    );
  }

  // ── CHOOSE SCREEN ────────────────────────────────────
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
          <TouchableOpacity style={s.chooseCard} onPress={() => setMode('qr')} activeOpacity={0.85}>
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

  // ── PIN SCREEN ───────────────────────────────────────
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
        {loading && <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 8 }} />}
        <View style={s.numpad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[s.numKey, d === '' && { opacity: 0, pointerEvents: 'none' } as any]}
              onPress={() => handlePinDigit(d)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={d === '⌫' ? s.numKeyDel : s.numKeyText}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── QR SCREEN ────────────────────────────────────────
  if (mode === 'qr') {
    const mins = Math.floor(qrTimeLeft / 60);
    const secs = qrTimeLeft % 60;
    const qrValue = qrToken ? `reztro://kiosk?token=${qrToken}&rid=${rid}` : 'loading';

    return (
      <View style={s.qrFullScreen}>
        <TouchableOpacity style={s.backBtn} onPress={() => setMode('choose')} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.textMuted} />
          <Text style={s.backBtnText}>Wróć</Text>
        </TouchableOpacity>

        <View style={s.qrCenterContent}>
          <Text style={s.qrTitle}>Zeskanuj, aby się zameldować</Text>
          <Text style={s.qrSub}>Otwórz aplikację Reztro i zeskanuj kod aparatem</Text>

          <View style={s.qrBox}>
            {qrLoading || !qrToken
              ? <ActivityIndicator color={theme.colors.primary} size="large" />
              : <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(qrValue)}` }}
                  style={{ width: 240, height: 240, borderRadius: 8 }}
                />
            }
          </View>

          <View style={s.qrTimerRow}>
            <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
            <Text style={s.qrTimerText}>
              Odświeży się automatycznie za {mins}:{String(secs).padStart(2, '0')}
            </Text>
            <TouchableOpacity onPress={refreshQrToken} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', padding: 24 },

  // Choose
  chooseScreen: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  kioskTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: 6 },
  kioskSub: { fontSize: 15, color: theme.colors.textMuted, marginBottom: 40 },
  chooseRow: { flexDirection: 'row', gap: 16 },
  chooseCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  chooseIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chooseCardTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  chooseCardSub: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center' },

  // PIN
  pinScreen: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pinTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginBottom: 6 },
  pinSub: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 24 },
  pinDots: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: theme.colors.border, backgroundColor: 'transparent' },
  pinDotFilled: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pinError: { fontSize: 13, color: '#DC2626', marginBottom: 4, textAlign: 'center' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, width: 270, marginTop: 20, justifyContent: 'center' },
  numKey: { width: 74, height: 74, borderRadius: 18, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  numKeyText: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  numKeyDel: { fontSize: 22, fontWeight: '600', color: theme.colors.textMuted },
  backBtn: { position: 'absolute', top: 56, left: 24, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 },
  backBtnText: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '600' },

  // QR
  qrFullScreen: { flex: 1, backgroundColor: theme.colors.background },
  qrCenterContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  qrTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
  qrSub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
  qrBox: { width: 280, height: 280, backgroundColor: '#fff', borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 5, marginTop: 16, marginBottom: 8 },
  qrTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  qrTimerText: { fontSize: 12, color: theme.colors.textMuted },

  // Success
  successScreen: { flex: 1, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  successCheckCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successHeadline: { fontSize: 30, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 38 },
  successJob: { fontSize: 17, color: 'rgba(255,255,255,0.75)', marginTop: -4 },
  successCountdown: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  successCountdownText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
});
