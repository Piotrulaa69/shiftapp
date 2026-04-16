import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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
import { store } from '../data/store';
import { theme } from '../styles/theme';

type Step = 'code' | 'register';

export default function JoinScreen() {
  const router = useRouter();
  const { joinWithCode, isLoading } = useAuth();
  const { showAlert } = useAlert();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleVerifyCode = () => {
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 4) {
      showAlert('Nieprawidłowy kod', 'Wpisz kod aktywacyjny otrzymany od pracodawcy.');
      return;
    }
    const inv = store.findInvitation(cleaned);
    if (!inv) {
      showAlert('Kod nieważny', 'Kod nie istnieje lub wygasł. Poproś pracodawcę o nowy kod.');
      return;
    }
    const rest = store.getRestaurant(inv.restaurantId);
    setRestaurantName(rest?.name ?? '');
    setJobTitle(inv.jobTitle);
    setStep('register');
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      showAlert('Uzupełnij dane', 'Wszystkie pola są wymagane.');
      return;
    }
    const success = await joinWithCode(code.trim().toUpperCase(), {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password: password.trim(),
    });
    if (success) {
      router.replace('/(tabs)/dashboard');
    } else {
      showAlert('Błąd', 'Nie udało się dołączyć. Sprawdź dane i spróbuj ponownie.');
    }
  };

  const content = (
    <ScrollView
      contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={s.backBtn} onPress={() => step === 'register' ? setStep('code') : router.back()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        <Text style={s.backText}>{step === 'register' ? 'Zmień kod' : 'Powrót'}</Text>
      </TouchableOpacity>

      <Image
        source={require('../assets/images/logo.png')}
        style={[s.logo, isDesktop && s.logoDesktop]}
        resizeMode="contain"
      />

      {step === 'code' && (
        <>
          <Text style={s.title}>Dołącz do restauracji</Text>
          <Text style={s.subtitle}>
            Wpisz kod aktywacyjny, który otrzymałeś{'\n'}od swojego pracodawcy
          </Text>

          <View style={s.codeInputWrap}>
            <TextInput
              style={s.codeInput}
              placeholder="np. CAFE47"
              placeholderTextColor={theme.colors.textMuted}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, !code.trim() && s.primaryBtnDisabled]}
            onPress={handleVerifyCode}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>Sprawdź kod</Text>
            <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
          </TouchableOpacity>

          <View style={s.helpBox}>
            <Ionicons name="help-circle-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={s.helpText}>
              Kod aktywacyjny otrzymujesz od właściciela lub kierownika restauracji.
              Składa się z 6 znaków (np. CAFE47).
            </Text>
          </View>
        </>
      )}

      {step === 'register' && (
        <>
          {/* Restaurant info */}
          <View style={s.restaurantCard}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.green} />
            <View style={s.restaurantInfo}>
              <Text style={s.restaurantName}>{restaurantName}</Text>
              <Text style={s.restaurantRole}>Stanowisko: {jobTitle}</Text>
            </View>
          </View>

          <Text style={s.title}>Utwórz konto</Text>
          <Text style={s.subtitle}>
            Uzupełnij swoje dane, aby dołączyć do zespołu
          </Text>

          <View style={s.inputRow}>
            <View style={s.inputHalf}>
              <Text style={s.inputLabel}>Imię</Text>
              <TextInput
                style={s.input}
                placeholder="Anna"
                placeholderTextColor={theme.colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={s.inputHalf}>
              <Text style={s.inputLabel}>Nazwisko</Text>
              <TextInput
                style={s.input}
                placeholder="Nowak"
                placeholderTextColor={theme.colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>E-mail</Text>
            <TextInput
              style={s.input}
              placeholder="anna@email.pl"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Hasło</Text>
            <TextInput
              style={s.input}
              placeholder="Minimum 6 znaków"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, isLoading && s.primaryBtnDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <Text style={s.primaryBtnText}>Dołączanie...</Text>
            ) : (
              <>
                <Text style={s.primaryBtnText}>Dołącz do {restaurantName}</Text>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.white} />
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        <View style={s.desktopInner}>{content}</View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.white },
  desktopRoot: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  desktopInner: {
    width: '100%', maxWidth: 520, backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl, overflow: 'hidden', ...theme.shadows.card,
  },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 16 },
  scrollDesktop: { paddingHorizontal: 32, paddingTop: 24 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },

  logo: { width: 200, height: 66, alignSelf: 'center', marginBottom: 16 },
  logoDesktop: { width: 260, height: 86 },

  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },

  codeInputWrap: { marginTop: 8 },
  codeInput: {
    height: 64, borderWidth: 2, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg, paddingHorizontal: 20,
    fontSize: 28, fontWeight: '800', color: theme.colors.navy,
    textAlign: 'center', letterSpacing: 6, backgroundColor: theme.colors.background,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  primaryBtn: {
    backgroundColor: theme.colors.navy, borderRadius: theme.borderRadius.md,
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryBtnDisabled: { backgroundColor: theme.colors.textMuted },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: theme.colors.white },

  helpBox: {
    flexDirection: 'row', gap: 10, backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md, padding: 14,
  },
  helpText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20 },

  restaurantCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.greenLight, borderRadius: theme.borderRadius.lg,
    padding: 16, borderWidth: 1, borderColor: theme.colors.green,
  },
  restaurantInfo: { flex: 1 },
  restaurantName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  restaurantRole: { fontSize: 13, color: theme.colors.green, fontWeight: '600', marginTop: 2 },

  inputRow: { flexDirection: 'row', gap: 12 },
  inputHalf: { flex: 1 },
  inputGroup: {},
  inputLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  input: {
    height: 48, borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md, paddingHorizontal: 14,
    fontSize: 15, color: theme.colors.text, backgroundColor: theme.colors.background,
  },
});
