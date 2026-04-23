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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, isLoading } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

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

  const form = (
    <ScrollView
      contentContainerStyle={[styles.form, isDesktop && styles.formDesktop]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={require('../assets/images/logo.png')}
        style={[styles.logoMobile, isDesktop && styles.logoWeb]}
        resizeMode="contain"
      />

      <Text style={styles.title}>Witaj ponownie</Text>
      <Text style={styles.subtitle}>
        Wprowadź swój e-mail/telefon i hasło,{'\n'}aby uzyskać dostęp do konta.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>E-mail lub Telefon</Text>
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

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Hasło</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
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
        <TouchableOpacity>
          <Text style={styles.forgotText}>Nie pamiętam hasła?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={isLoading}
        activeOpacity={0.88}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.white} />
        ) : (
          <Text style={styles.loginButtonText}>Zaloguj</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Lub zaloguj przez</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialBtn}>
          <Text style={styles.socialBtnText}>G  Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialBtn}>
          <Text style={styles.socialBtnText}> Apple</Text>
        </TouchableOpacity>
      </View>

      {/* Join restaurant */}
      <View style={styles.joinSection}>
        <Text style={styles.joinTitle}>Masz kod od pracodawcy?</Text>
        <TouchableOpacity style={styles.joinBtn} onPress={() => router.push('/join' as any)} activeOpacity={0.8}>
          <Ionicons name="people" size={18} color={theme.colors.primary} />
          <Text style={styles.joinBtnText}>Dołącz do restauracji</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}> 2025 ShiftApp. Wszelkie prawa zastrzeżone.</Text>
      <View style={styles.footerLinks}>
        <TouchableOpacity><Text style={styles.footerLink}>Polityka prywatności</Text></TouchableOpacity>
        <Text style={styles.footerDot}>  ·  </Text>
        <TouchableOpacity><Text style={styles.footerLink}>Regulamin</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <View style={styles.desktopInner}>
          {form}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {form}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ── Mobile ── */
  safe: { flex: 1, backgroundColor: theme.colors.white },
  form: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: theme.colors.white,
  },
  formDesktop: {
    paddingHorizontal: 40,
    paddingTop: 16,
  },
  logoMobile: {
    width: 260,
    height: 86,
    alignSelf: 'center',
    marginBottom: 36,
    marginTop: 16,
  },

  /* ── Desktop layout ── */
  desktopRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopInner: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    alignSelf: 'center',
    marginVertical: 32,
    ...theme.shadows.card,
  },
  logoWeb: {
    width: 350,
    height: 116,
    marginBottom: 40,
    marginTop: 32,
  },

  /* ── Form elements (shared) ── */
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 32,
  },
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.white,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: theme.colors.white,
  },
  passwordInput: { flex: 1, fontSize: 15, color: theme.colors.text },
  eyeBtn: { padding: 4 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rememberText: { ...theme.typography.bodySmall, color: theme.colors.text },
  forgotText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    ...theme.shadows.medium,
  },
  loginButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.white },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  divider: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { ...theme.typography.caption, color: theme.colors.textMuted },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  socialBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.text,
  },
  footer: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLink: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
  footerDot: { ...theme.typography.caption, color: theme.colors.textMuted },

  joinSection: {
    alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: 20, marginTop: 4,
  },
  joinTitle: { fontSize: 13, color: theme.colors.textSecondary },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 20, height: 44,
  },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },

  demoBox: {
    backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md,
    padding: 14, gap: 6, marginTop: 8,
  },
  demoTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 2 },
  demoItem: { fontSize: 12, color: theme.colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
