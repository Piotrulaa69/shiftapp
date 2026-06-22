import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getOrCreateQrToken } from '../lib/db';
import type { DbProfile } from '../lib/supabase';
import { theme } from '../styles/theme';

const QR_REFRESH_MS = 15 * 60 * 1000;
const SUCCESS_RETURN_MS = 4000;

export default function KioskScreen() {
  const { rid } = useLocalSearchParams<{ rid: string }>();
  const [loggedIn, setLoggedIn] = useState<DbProfile | null>(null);
  const [countdown, setCountdown] = useState(Math.ceil(SUCCESS_RETURN_MS / 1000));
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrError, setQrError] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState(QR_REFRESH_MS / 1000);
  const qrTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrAutoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshQrToken = async () => {
    if (!rid) return;
    setQrLoading(true);
    setQrError('');
    try {
      const token = await getOrCreateQrToken(rid);
      if (!token) {
        setQrError('Nie można wygenerować kodu QR. Sprawdź czy migracja bazy danych została uruchomiona.');
        setQrLoading(false);
        return;
      }
      setQrToken(token);
    } catch {
      setQrError('Błąd połączenia z bazą danych.');
    }
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
    refreshQrToken();
    return () => {
      if (qrTickRef.current) clearInterval(qrTickRef.current);
      if (qrAutoRef.current) clearTimeout(qrAutoRef.current);
    };
  }, [rid]);

  useEffect(() => () => {
    if (cdRef.current) clearInterval(cdRef.current);
    if (returnRef.current) clearTimeout(returnRef.current);
  }, []);

  if (!rid) {
    return (
      <View style={s.center}>
        <Ionicons name="warning-outline" size={48} color={theme.colors.textMuted} />
        <Text style={s.errorText}>Brak identyfikatora restauracji.{'\n'}Otwórz kiosk z panelu Zarządzanie.</Text>
      </View>
    );
  }

  // ── SUCCESS ───────────────────────────────────────────
  if (loggedIn) {
    return (
      <View style={s.successScreen}>
        <View style={s.successCheckCircle}>
          <Ionicons name="checkmark" size={52} color="#fff" />
        </View>
        <Text style={s.successHeadline}>
          {loggedIn.first_name} {loggedIn.last_name},{'\n'}zalogowałeś się!
        </Text>
        <Text style={s.successJob}>{loggedIn.job_title}</Text>
        <View style={s.successCountdown}>
          <Text style={s.successCountdownText}>Powrót za {countdown}s</Text>
        </View>
      </View>
    );
  }

  // ── QR SCREEN (jedyny ekran kiosku) ──────────────────
  const mins = Math.floor(qrTimeLeft / 60);
  const secs = qrTimeLeft % 60;
  const qrValue = qrToken ? `reztro://kiosk?token=${qrToken}&rid=${rid}` : '';

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Ionicons name="qr-code" size={22} color="#059669" />
        <Text style={s.headerText}>Kiosk zameldowania</Text>
      </View>

      <View style={s.center}>
        <Text style={s.title}>Zeskanuj, aby się zameldować</Text>
        <Text style={s.sub}>Otwórz aplikację Reztro na telefonie i zeskanuj poniższy kod</Text>

        <View style={s.qrBox}>
          {qrLoading && (
            <ActivityIndicator color={theme.colors.primary} size="large" />
          )}
          {!qrLoading && qrError ? (
            <View style={{ alignItems: 'center', gap: 12, padding: 16 }}>
              <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
              <Text style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', lineHeight: 18 }}>{qrError}</Text>
              <TouchableOpacity onPress={refreshQrToken} style={s.retryBtn}>
                <Ionicons name="refresh" size={16} color={theme.colors.primary} />
                <Text style={s.retryText}>Spróbuj ponownie</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {!qrLoading && !qrError && qrToken ? (
            <Image
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(qrValue)}` }}
              style={{ width: 260, height: 260, borderRadius: 8 }}
            />
          ) : null}
        </View>

        {!qrError && !qrLoading && (
          <View style={s.timerRow}>
            <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
            <Text style={s.timerText}>
              Odświeży się za {mins}:{String(secs).padStart(2, '0')}
            </Text>
            <TouchableOpacity onPress={refreshQrToken} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12 },
  headerText: { fontSize: 15, fontWeight: '700', color: theme.colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 26, fontWeight: '900', color: theme.colors.text, textAlign: 'center' },
  sub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  qrBox: { width: 300, height: 300, backgroundColor: '#fff', borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  timerText: { fontSize: 12, color: theme.colors.textMuted },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EFF6FF', borderRadius: 10 },
  retryText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  errorText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 12 },

  successScreen: { flex: 1, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  successCheckCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successHeadline: { fontSize: 30, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 40 },
  successJob: { fontSize: 17, color: 'rgba(255,255,255,0.75)' },
  successCountdown: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  successCountdownText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
});
