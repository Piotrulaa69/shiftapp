import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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
import { useAlert } from '../../context/AlertContext';
import { store } from '../../data/store';
import { theme } from '../../styles/theme';

type ChecklistItem = { id: string; label: string; checked: boolean };

const CHECKLIST: ChecklistItem[] = [
  { id: 'c1', label: 'Potwierdziłem termin dostawy', checked: false },
  { id: 'c2', label: 'Uzgodniłem ilości zamówionych produktów', checked: false },
  { id: 'c3', label: 'Uzyskałem potwierdzenie mailowe lub SMS', checked: false },
  { id: 'c4', label: 'Zgłosiłem ewentualne zmiany kierownikowi', checked: false },
];

export default function ConfirmDescriptionScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { showAlert, showSuccess } = useAlert();
  const task = store.tasks.find((t) => t.id === taskId) ?? store.tasks[4];
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(CHECKLIST);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const checkedCount = checklist.filter((c) => c.checked).length;
  const isReady = description.trim().length >= 20 && checkedCount >= 2;

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
  };

  const handleConfirm = () => {
    if (description.trim().length < 20) {
      showAlert('Za krótki opis', 'Opisz szczegółowo przebieg zadania (minimum 20 znaków).');
      return;
    }
    showSuccess('Zadanie potwierdzone!', 'Opis został zapisany. Kierownik zmiany zostanie powiadomiony.', () => router.back());
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Potwierdź z opisem</Text>
        <View style={s.headerBadge}>
          <Ionicons name="document-text" size={13} color={theme.colors.purple} />
          <Text style={[s.headerBadgeText, { color: theme.colors.purple }]}>Opis</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Task card */}
        <View style={s.taskCard}>
          <View style={s.taskCardRow}>
            <View style={s.priorityNormal}>
              <Text style={s.priorityNormalText}>Normalny priorytet</Text>
            </View>
            <View style={s.typeBadge}>
              <Ionicons name="document-text-outline" size={12} color={theme.colors.purple} />
              <Text style={[s.typeBadgeText, { color: theme.colors.purple }]}>Wymagany opis</Text>
            </View>
          </View>
          <Text style={s.taskTitle}>{task.title}</Text>
          <Text style={s.taskDesc}>{task.description}</Text>
          <View style={s.taskMeta}>
            <View style={s.taskMetaItem}>
              <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
              <Text style={s.taskMetaText}>{task.assignedTime}</Text>
            </View>
            <View style={s.taskMetaItem}>
              <Ionicons name="timer-outline" size={13} color={theme.colors.textMuted} />
              <Text style={s.taskMetaText}>{task.durationMin} min</Text>
            </View>
          </View>
        </View>

        {/* Description section */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Opis przebiegu zadania</Text>
            <View style={s.requiredBadge}>
              <Text style={s.requiredText}>Wymagane</Text>
            </View>
          </View>
          <Text style={s.sectionSub}>
            Opisz szczegółowo jak wykonałeś/aś zadanie, co ustalono i jakie informacje są istotne dla zespołu
          </Text>

          {/* Hints */}
          <View style={s.hintsBox}>
            <Text style={s.hintsTitle}>Podpowiedź — warto opisać:</Text>
            {['Z kim rozmawiałeś/aś i kiedy?', 'Co zostało ustalone?', 'Czy są jakieś zmiany vs. plan?'].map((hint) => (
              <View key={hint} style={s.hintRow}>
                <View style={s.hintDot} />
                <Text style={s.hintText}>{hint}</Text>
              </View>
            ))}
          </View>

          <TextInput
            style={[s.descInput, description.length >= 20 && s.descInputOk]}
            placeholder={
              'np. Skontaktowałam się z Panem Markiem z firmy FreshWeg o godz. 13:45.\n' +
              'Potwierdzono dostawę na poniedziałek 7:00, ilości zgodne z zamówieniem.\n' +
              'Brak zmian w asortymencie — wszystko OK.'
            }
            placeholderTextColor={theme.colors.textMuted}
            value={description}
            onChangeText={(t) => t.length <= 500 && setDescription(t)}
            multiline
            numberOfLines={7}
            textAlignVertical="top"
          />
          <View style={s.descFooter}>
            <Text style={description.trim().length < 20 ? s.charCountWarn : s.charCountOk}>
              {description.trim().length < 20
                ? `Minimum 20 znaków (brakuje ${20 - description.trim().length})`
                : `${description.length}/500 znaków ✓`}
            </Text>
          </View>
        </View>

        {/* Checklist */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Lista kontrolna</Text>
          <Text style={s.sectionSub}>
            Zaznacz co zostało wykonane ({checkedCount}/{checklist.length})
          </Text>
          {checklist.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.checkRow}
              onPress={() => toggleCheck(item.id)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, item.checked && s.checkboxChecked]}>
                {item.checked && <Ionicons name="checkmark" size={13} color={theme.colors.white} />}
              </View>
              <Text style={[s.checkLabel, item.checked && s.checkLabelDone]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Readiness summary */}
        <View style={[s.readinessCard, isReady && s.readinessCardOk]}>
          <View style={s.readinessRow}>
            <Ionicons
              name={isReady ? 'checkmark-circle' : 'alert-circle-outline'}
              size={20}
              color={isReady ? theme.colors.green : theme.colors.orange}
            />
            <Text style={[s.readinessText, isReady && s.readinessTextOk]}>
              {isReady
                ? 'Gotowe do potwierdzenia!'
                : 'Uzupełnij opis i zaznacz minimum 2 punkty listy'}
            </Text>
          </View>
          <View style={s.readinessMeta}>
            <View style={s.readinessItem}>
              <Ionicons
                name={description.trim().length >= 20 ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={description.trim().length >= 20 ? theme.colors.green : theme.colors.textMuted}
              />
              <Text style={s.readinessMetaText}>Opis zadania</Text>
            </View>
            <View style={s.readinessItem}>
              <Ionicons
                name={checkedCount >= 2 ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={checkedCount >= 2 ? theme.colors.green : theme.colors.textMuted}
              />
              <Text style={s.readinessMetaText}>Lista kontrolna ({checkedCount}/4)</Text>
            </View>
          </View>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[s.confirmBtn, !isReady && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.white} />
          <Text style={s.confirmBtnText}>Potwierdź wykonanie zadania</Text>
        </TouchableOpacity>

        <Text style={s.footerNote}>
          Opis zostanie dołączony do raportu zmiany i jest widoczny dla kierownika.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.white, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.purpleLight,
    borderRadius: theme.borderRadius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700' },

  content: { padding: 16, gap: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 680, alignSelf: 'center', width: '100%', paddingHorizontal: 32 },

  taskCard: {
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
    padding: 18, ...theme.shadows.card,
  },
  taskCardRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  priorityNormal: {
    backgroundColor: theme.colors.orangeLight, borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  priorityNormalText: { fontSize: 11, fontWeight: '700', color: theme.colors.orange },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.purpleLight, borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  taskTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  taskDesc: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  taskMeta: { flexDirection: 'row', gap: 16 },
  taskMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMetaText: { fontSize: 12, color: theme.colors.textMuted },

  section: {
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
    padding: 18, ...theme.shadows.card,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  sectionSub: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 14 },
  requiredBadge: {
    backgroundColor: '#FEF2F2', borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  requiredText: { fontSize: 11, fontWeight: '700', color: theme.colors.error },

  hintsBox: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md,
    padding: 12, marginBottom: 12, gap: 6,
  },
  hintsTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  hintDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.colors.primary, marginTop: 5 },
  hintText: { fontSize: 12, color: theme.colors.navy, flex: 1, lineHeight: 18 },

  descInput: {
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: theme.colors.text,
    backgroundColor: theme.colors.background,
    minHeight: 140, lineHeight: 22,
  },
  descInputOk: { borderColor: theme.colors.green },
  descFooter: { marginTop: 6 },
  charCountWarn: { fontSize: 12, color: theme.colors.orange, fontWeight: '500' },
  charCountOk: { fontSize: 12, color: theme.colors.green, fontWeight: '600' },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  checkboxChecked: { backgroundColor: theme.colors.purple, borderColor: theme.colors.purple },
  checkLabel: { flex: 1, fontSize: 14, color: theme.colors.text },
  checkLabelDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },

  readinessCard: {
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
    padding: 16, borderWidth: 1.5, borderColor: theme.colors.border, gap: 10,
  },
  readinessCardOk: { borderColor: theme.colors.green, backgroundColor: theme.colors.greenLight },
  readinessRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readinessText: { fontSize: 14, fontWeight: '600', color: theme.colors.orange, flex: 1 },
  readinessTextOk: { color: theme.colors.green },
  readinessMeta: { flexDirection: 'row', gap: 20, paddingLeft: 4 },
  readinessItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  readinessMetaText: { fontSize: 12, color: theme.colors.textSecondary },

  confirmBtn: {
    backgroundColor: theme.colors.navy, borderRadius: theme.borderRadius.md,
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, ...theme.shadows.medium,
  },
  confirmBtnDisabled: { backgroundColor: theme.colors.textMuted },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: theme.colors.white },

  footerNote: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
