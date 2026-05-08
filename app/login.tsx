import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
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
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

/* ── Feature highlights for desktop collage ── */
const FEATURES = [
  { icon: 'calendar', label: 'Grafik zmian', color: '#3B82F6' },
  { icon: 'checkmark-done', label: 'Zadania', color: '#22C55E' },
  { icon: 'people', label: 'Zarządzanie', color: '#8B5CF6' },
  { icon: 'stats-chart', label: 'Raporty', color: '#F97316' },
  { icon: 'school', label: 'Szkolenia', color: '#EC4899' },
  { icon: 'chatbubbles', label: 'Komunikacja', color: '#06B6D4' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, isLoading } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Brakujące dane', 'Wprowadź e-mail/telefon i hasło.');
      return;
    }
    const success = await login(email, password);
    if (success) {
      router.replace('/(tabs)/dashboard');
    } else {
      showAlert('Błąd logowania', 'Sprawdź swoje dane i spróbuj ponownie.');
    }
  };

  /* ── Form (shared mobile + desktop left) ── */
  const formContent = (
    <ScrollView
      contentContainerStyle={[styles.form, isDesktop && styles.formDesktop]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Zaloguj się do konta</Text>
      <Text style={styles.subtitle}>
        Wprowadź swoje dane, aby uzyskać dostęp do panelu.
      </Text>

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>E-mail lub Telefon</Text>
        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="jan.kowalski@firma.pl"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
      </View>

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Hasło</Text>
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Remember + Forgot */}
      <View style={styles.rememberRow}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setRemember((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
            {remember && <Ionicons name="checkmark" size={11} color={theme.colors.white} />}
          </View>
          <Text style={styles.rememberText}>Zapamiętaj mnie</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/forgot-password' as any)}>
          <Text style={styles.forgotText}>Nie pamiętam hasła</Text>
        </TouchableOpacity>
      </View>

      {/* Login button */}
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={isLoading}
        activeOpacity={0.88}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.white} />
        ) : (
          <Text style={styles.loginButtonText}>Zaloguj się</Text>
        )}
      </TouchableOpacity>

      {/* Join restaurant */}
      <View style={styles.joinSection}>
        <Text style={styles.joinTitle}>Masz kod od pracodawcy?</Text>
        <TouchableOpacity style={styles.joinBtn} onPress={() => router.push('/join' as any)} activeOpacity={0.8}>
          <Ionicons name="people" size={18} color={theme.colors.primary} />
          <Text style={styles.joinBtnText}>Dołącz do restauracji</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>© 2025 ShiftApp. Wszelkie prawa zastrzeżone.</Text>
      <View style={styles.footerLinks}>
        <TouchableOpacity><Text style={styles.footerLink}>Polityka prywatności</Text></TouchableOpacity>
        <Text style={styles.footerDot}>  ·  </Text>
        <TouchableOpacity><Text style={styles.footerLink}>Regulamin</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );

  /* ── Desktop: split layout ── */
  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        {/* Left — form */}
        <View style={styles.desktopLeft}>
          {formContent}
        </View>

        {/* Right — blue collage */}
        <View style={styles.desktopRight}>
          <View style={styles.collageInner}>
            {/* Mock app window */}
            <View style={styles.collageWindow}>
              <View style={styles.collageWindowBar}>
                <View style={[styles.collageDot, { backgroundColor: '#FF5F57' }]} />
                <View style={[styles.collageDot, { backgroundColor: '#FEBC2E' }]} />
                <View style={[styles.collageDot, { backgroundColor: '#28C840' }]} />
              </View>
              <View style={styles.collageWindowBody}>
                <View style={styles.collageRow}>
                  <View style={[styles.collageSkeleton, { width: '60%', height: 12 }]} />
                </View>
                <View style={styles.collageRow}>
                  <View style={[styles.collageSkeleton, { width: '80%', height: 10 }]} />
                </View>
                <View style={styles.collageRow}>
                  <View style={[styles.collageSkeleton, { width: '45%', height: 10 }]} />
                </View>
              </View>
            </View>

            {/* Feature badges floating around */}
            <View style={styles.featureGrid}>
              {FEATURES.map((f) => (
                <View key={f.label} style={styles.featureBadge}>
                  <View style={[styles.featureIcon, { backgroundColor: f.color + '22' }]}>  
                    <Ionicons name={`${f.icon}-outline` as any} size={20} color={f.color} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Bottom text */}
            <Text style={styles.collageTitle}>Wszystko w jednym miejscu.</Text>
            <Text style={styles.collageSub}>Grafik, zadania, szkolenia i zarządzanie zespołem — dostępne z każdego urządzenia.</Text>
          </View>
        </View>
      </View>
    );
  }

  /* ── Mobile ── */
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {formContent}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ── Mobile ── */
  safe: { flex: 1, backgroundColor: theme.colors.card },
  form: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: theme.colors.card,
    flexGrow: 1,
    justifyContent: 'center',
  },
  formDesktop: {
    paddingHorizontal: 48,
    paddingVertical: 40,
  },
  logo: {
    width: 180,
    height: 60,
    marginBottom: 32,
  },

  /* ── Desktop split ── */
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  desktopLeft: {
    flex: 1,
    maxWidth: 520,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
  },
  desktopRight: {
    flex: 1,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },

  /* ── Collage ── */
  collageInner: {
    alignItems: 'center',
    maxWidth: 420,
  },
  collageWindow: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  collageWindowBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  collageDot: { width: 10, height: 10, borderRadius: 5 },
  collageWindowBody: {
    padding: 20,
    gap: 12,
  },
  collageRow: {
    flexDirection: 'row',
  },
  collageSkeleton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 36,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  collageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  collageSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ── Form elements ── */
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: theme.colors.surface,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: theme.colors.text },
  eyeBtn: { padding: 4 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rememberText: { fontSize: 13, color: theme.colors.textSecondary },
  forgotText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  joinSection: {
    alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: 20, marginBottom: 20,
  },
  joinTitle: { fontSize: 13, color: theme.colors.textSecondary },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 20, height: 44,
  },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },

  footer: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
  footerDot: { fontSize: 11, color: theme.colors.textMuted },
});
