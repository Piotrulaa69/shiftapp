import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createAbsence, getAbsences, getShiftsForDate } from '../lib/db';
import { theme } from '../styles/theme';

const ABSENCE_TYPES = [
  { value: 'l4', label: 'L4 — Zwolnienie lekarskie' },
  { value: 'child_care', label: 'Opieka nad dzieckiem' },
  { value: 'force_majeure', label: 'Siła wyższa' },
  { value: 'other', label: 'Inne' },
] as const;

export default function AbsenceRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';
  const uid = user?.id ?? '';

  const [absenceType, setAbsenceType] = useState<'l4' | 'child_care' | 'force_majeure' | 'other'>('l4');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.date) {
      setSelectedDate(params.date as string);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, [params.date]);

  useEffect(() => {
    if (rid && selectedDate) {
      loadShifts();
    }
  }, [rid, selectedDate]);

  const loadShifts = async () => {
    if (!rid || !selectedDate) return;
    setLoading(true);
    const shiftsData = await getShiftsForDate(rid, selectedDate);
    const myShifts = shiftsData.filter((s) => s.employee_id === uid);
    setShifts(myShifts);
    if (myShifts.length === 1) {
      setSelectedShiftId(myShifts[0].id);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called', { rid, uid, absenceType, selectedShiftId, description });
    if (!rid || !uid) {
      Alert.alert('Błąd', 'Brak danych użytkownika');
      return;
    }
    if (absenceType === 'other' && !description.trim()) {
      Alert.alert('Błąd', 'Podaj opis nieobecności');
      return;
    }
    if (!selectedShiftId && shifts.length > 0) {
      Alert.alert('Błąd', 'Wybierz zmianę do której dotyczy nieobecność');
      return;
    }

    // Check if absence already exists for this shift
    if (selectedShiftId) {
      const existingAbsences = await getAbsences(rid);
      const alreadyExists = existingAbsences.some(
        (a: any) => a.shift_id === selectedShiftId && a.employee_id === uid && a.status !== 'rejected'
      );
      if (alreadyExists) {
        Alert.alert('Błąd', 'Nieobecność dla tej zmiany została już zgłoszona');
        return;
      }
    }

    setSaving(true);
    try {
      const result = await createAbsence(rid, {
        shift_id: selectedShiftId || '',
        employee_id: uid,
        absence_type: absenceType,
        description: description.trim() || undefined,
      });
      console.log('createAbsence result:', result);
      setSaving(false);
      if (result) {
        console.log('About to show success alert');
        // Use window.alert for web as fallback
        if (Platform.OS === 'web') {
          window.alert('Sukces: Zgłoszenie nieobecności zostało wysłane');
          router.back();
        } else {
          Alert.alert('Sukces', 'Zgłoszenie nieobecności zostało wysłane', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      } else {
        console.log('About to show error alert');
        if (Platform.OS === 'web') {
          window.alert('Błąd: Nie udało się wysłać zgłoszenia. Sprawdź konsolę.');
        } else {
          Alert.alert('Błąd', 'Nie udało się wysłać zgłoszenia. Sprawdź konsolę.');
        }
      }
    } catch (error) {
      console.error('Error submitting absence:', error);
      setSaving(false);
      if (Platform.OS === 'web') {
        window.alert('Błąd: Wystąpił błąd podczas wysyłania zgłoszenia');
      } else {
        Alert.alert('Błąd', 'Wystąpił błąd podczas wysyłania zgłoszenia');
      }
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Zgłoś nieobecność</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Data</Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => { /* TODO: Add date picker */ }} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={s.dateText}>{selectedDate || 'Wybierz datę'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} size="large" color={theme.colors.primary} />
        ) : shifts.length > 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Zmiana</Text>
            {shifts.map((shift) => (
              <TouchableOpacity
                key={shift.id}
                style={[s.shiftOption, selectedShiftId === shift.id && s.shiftOptionActive]}
                onPress={() => setSelectedShiftId(shift.id)}
                activeOpacity={0.7}
              >
                <View style={s.shiftInfo}>
                  <Text style={s.shiftTime}>{shift.start_time} – {shift.end_time}</Text>
                  <Text style={s.shiftLoc}>{shift.location}</Text>
                </View>
                {selectedShiftId === shift.id && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : selectedDate ? (
          <View style={s.card}>
            <Text style={s.emptyText}>Brak zaplanowanej zmiany na ten dzień</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.cardTitle}>Typ nieobecności</Text>
          <View style={{ gap: 8 }}>
            {ABSENCE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[s.optionBtn, absenceType === t.value && s.optionActive]}
                onPress={() => setAbsenceType(t.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.optionText, absenceType === t.value && s.optionTextActive]}>{t.label}</Text>
                {absenceType === t.value && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {absenceType === 'other' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Opis *</Text>
            <TextInput
              style={s.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Opisz powód nieobecności..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        <TouchableOpacity
          style={[s.submitBtn, (absenceType === 'other' && !description.trim()) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={saving || (absenceType === 'other' && !description.trim())}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.submitBtnText}>Wyślij zgłoszenie</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { paddingHorizontal: 20 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { padding: 20, paddingBottom: 48, maxWidth: 600, marginHorizontal: 'auto', width: '100%' },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 16, ...theme.shadows.card },
  cardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  dateText: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  shiftOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  shiftOptionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  shiftInfo: { flex: 1 },
  shiftTime: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  shiftLoc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 8 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  optionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  optionText: { fontSize: 14, color: theme.colors.text },
  optionTextActive: { color: theme.colors.primary, fontWeight: '600' },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text, minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 16, alignItems: 'center', marginTop: 8, ...theme.shadows.fab },
  submitBtnDisabled: { backgroundColor: theme.colors.border },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
