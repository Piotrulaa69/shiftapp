import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { theme } from '../styles/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!email.trim()) { setError('Podaj adres e-mail'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://shiftapp.vercel.app/reset-password',
    });
    setLoading(false);
    if (err) { setError('Wystąpił błąd. Spróbuj ponownie.'); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={40} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Sprawdź skrzynkę</Text>
          <Text style={styles.subtitle}>
            Jeśli konto z tym adresem istnieje, otrzymasz e-mail z linkiem do zresetowania hasła.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.btnText}>Wróć do logowania</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed-outline" size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>Resetuj hasło</Text>
        <Text style={styles.subtitle}>
          Podaj adres e-mail powiązany z Twoim kontem. Wyślemy link do ustawienia nowego hasła.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Adres e-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="jan@example.com"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.btn} onPress={handleReset} activeOpacity={0.85} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.btnText}>Wyślij link resetujący</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: 24, justifyContent: 'center', maxWidth: 400, alignSelf: 'center', width: '100%' },
  back: { position: 'absolute', top: 16, left: 0, padding: 8 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 14, fontSize: 15, color: theme.colors.text, marginBottom: 20,
  },
  btn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  btnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  error: { color: theme.colors.error, fontSize: 13, textAlign: 'center', marginBottom: 12 },
});
