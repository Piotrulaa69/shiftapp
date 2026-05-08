import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../styles/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const STEPS = [
  {
    icon: 'people-outline',
    title: 'Witaj w zespole!',
    description: 'Zostałeś dodany do restauracji. Tutaj zarządzasz swoim grafikiem, zadaniami i szkoleniami.',
  },
  {
    icon: 'calendar-outline',
    title: 'Grafik',
    description: 'Zobacz swoje zmiany, potwierdź obecność i zgłoś dyspozycyjność. Wszystko w jednym miejscu.',
  },
  {
    icon: 'list-outline',
    title: 'Zadania',
    description: 'Otrzymuj zadania od managera, wykonuj je i potwierdzaj — zdjęciem, opisem lub wartościami.',
  },
  {
    icon: 'trophy-outline',
    title: 'Punkty i nagrody',
    description: 'Zbieraj punkty za terminowość, zadania i szkolenia. Rywalizuj z kolegami w rankingu!',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const handleFinish = async () => {
    if (user) {
      await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id);
    }
    router.replace('/(tabs)/dashboard' as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name={current.icon as any} size={48} color={theme.colors.primary} />
        </View>

        {/* Content */}
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.desc}>{current.description}</Text>

        {/* Dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>Wstecz</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, step === 0 && { flex: 1 }]}
            onPress={step < STEPS.length - 1 ? () => setStep(step + 1) : handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>{step < STEPS.length - 1 ? 'Dalej' : 'Zaczynajmy!'}</Text>
          </TouchableOpacity>
        </View>

        {step < STEPS.length - 1 && (
          <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Pomiń</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, maxWidth: 400, alignSelf: 'center', width: '100%' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  dotActive: { backgroundColor: theme.colors.primary, width: 24 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  backBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  backBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  nextBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  skipBtn: { marginTop: 20 },
  skipText: { fontSize: 13, color: theme.colors.textMuted },
});
