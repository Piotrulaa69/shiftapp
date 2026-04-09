import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tasks } from '../../data/mockData';
import { theme } from '../../styles/theme';

const PRIORITY_LABEL: Record<string, string> = {
  wysoki: 'Wysoki priorytet',
  normalny: 'Normalny',
  niski: 'Niski',
};

export default function ConfirmPhotoScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const task = tasks.find((t) => t.id === taskId) ?? tasks[0];
  const [hasPhoto, setHasPhoto] = useState(false);
  const [notes, setNotes] = useState('');
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const photoFilename = `foto_${task.id}_${new Date().toISOString().split('T')[0]}.jpg`;

  const handleConfirm = () => {
    if (!hasPhoto) {
      Alert.alert('Brak zdjęcia', 'Dodaj zdjęcie potwierdzające wykonanie zadania.');
      return;
    }
    Alert.alert(
      '✅ Zadanie potwierdzone!',
      'Świetna robota! Kierownik zmiany zostanie powiadomiony.',
      [{ text: 'Wróć do zadań', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Potwierdź zadanie</Text>
        <View style={s.headerBadge}>
          <Ionicons name="camera" size={13} color={theme.colors.primary} />
          <Text style={s.headerBadgeText}>Zdjęcie</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Task card */}
        <View style={s.taskCard}>
          <View style={s.taskCardRow}>
            <View style={[
              s.priorityBadge,
              task.priority === 'wysoki' && s.priorityHigh,
              task.priority === 'normalny' && s.priorityNormal,
              task.priority === 'niski' && s.priorityLow,
            ]}>
              <Text style={[
                s.priorityText,
                task.priority === 'wysoki' && s.priorityHighText,
              ]}>
                {PRIORITY_LABEL[task.priority]}
              </Text>
            </View>
            <View style={s.typeBadge}>
              <Ionicons name="camera-outline" size={12} color={theme.colors.primary} />
              <Text style={s.typeBadgeText}>Wymagane zdjęcie</Text>
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

        {/* Photo section */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Zdjęcie potwierdzające</Text>
            <View style={s.requiredBadge}>
              <Text style={s.requiredText}>Wymagane</Text>
            </View>
          </View>
          <Text style={s.sectionSub}>Zrób zdjęcie dokumentujące wykonanie zadania</Text>

          {!hasPhoto ? (
            <TouchableOpacity style={s.photoArea} onPress={() => setHasPhoto(true)} activeOpacity={0.7}>
              <View style={s.photoAreaIcon}>
                <Ionicons name="camera" size={40} color={theme.colors.primary} />
              </View>
              <Text style={s.photoAreaTitle}>Dotknij, aby dodać zdjęcie</Text>
              <Text style={s.photoAreaSub}>Zrób zdjęcie lub wybierz z galerii</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.photoPreview}>
              <View style={s.photoPreviewInner}>
                <Ionicons name="checkmark-circle" size={52} color={theme.colors.green} />
                <Text style={s.photoPreviewTitle}>Zdjęcie dodane</Text>
                <Text style={s.photoPreviewFilename}>{photoFilename}</Text>
                <View style={s.photoPreviewMeta}>
                  <Ionicons name="checkmark" size={12} color={theme.colors.green} />
                  <Text style={s.photoPreviewMetaText}>Weryfikacja OK · {(Math.random() * 2 + 0.8).toFixed(1)} MB</Text>
                </View>
              </View>
              <TouchableOpacity style={s.removeBtn} onPress={() => setHasPhoto(false)} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
                <Text style={s.removeBtnText}>Usuń i zrób nowe</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.photoButtons}>
            <TouchableOpacity style={s.photoBtn} onPress={() => setHasPhoto(true)} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={18} color={theme.colors.primary} />
              <Text style={s.photoBtnText}>Aparat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoBtn} onPress={() => setHasPhoto(true)} activeOpacity={0.7}>
              <Ionicons name="images-outline" size={18} color={theme.colors.primary} />
              <Text style={s.photoBtnText}>Galeria</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes section */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Uwagi do zadania</Text>
            <Text style={s.optionalLabel}>Opcjonalne</Text>
          </View>
          <Text style={s.sectionSub}>Opisz co zostało wykonane lub dodaj istotne informacje</Text>
          <TextInput
            style={s.notesInput}
            placeholder="np. Ekspres skalibrowany, wszystkie dysze wyczyszczone, ciśnienie 9 bar..."
            placeholderTextColor={theme.colors.textMuted}
            value={notes}
            onChangeText={(t) => t.length <= 300 && setNotes(t)}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={[s.charCount, notes.length > 250 && s.charCountWarn]}>
            {notes.length}/300
          </Text>
        </View>

        {/* Status summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={[s.summaryDot, hasPhoto && s.summaryDotOk]} />
            <Text style={s.summaryText}>Zdjęcie potwierdzające</Text>
            <Text style={[s.summaryStatus, hasPhoto && s.summaryStatusOk]}>
              {hasPhoto ? 'Dodane ✓' : 'Brakuje'}
            </Text>
          </View>
          <View style={s.summaryRow}>
            <View style={[s.summaryDot, s.summaryDotOptional]} />
            <Text style={s.summaryText}>Uwagi tekstowe</Text>
            <Text style={s.summaryStatusOptional}>
              {notes.length > 0 ? `${notes.length} znaków ✓` : 'Pominięte'}
            </Text>
          </View>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[s.confirmBtn, !hasPhoto && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.white} />
          <Text style={s.confirmBtnText}>Potwierdź wykonanie zadania</Text>
        </TouchableOpacity>

        <Text style={s.footerNote}>
          Po potwierdzeniu, kierownik zmiany zostanie powiadomiony o wykonaniu zadania.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  content: { padding: 16, gap: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 680, alignSelf: 'center', width: '100%', paddingHorizontal: 32 },

  taskCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    ...theme.shadows.card,
  },
  taskCardRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  priorityBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: theme.colors.background,
  },
  priorityHigh: { backgroundColor: '#FEF2F2' },
  priorityNormal: { backgroundColor: theme.colors.orangeLight },
  priorityLow: { backgroundColor: theme.colors.greenLight },
  priorityText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  priorityHighText: { color: theme.colors.error },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },
  taskTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  taskDesc: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  taskMeta: { flexDirection: 'row', gap: 16 },
  taskMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMetaText: { fontSize: 12, color: theme.colors.textMuted },

  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    ...theme.shadows.card,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  sectionSub: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16 },
  requiredBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  requiredText: { fontSize: 11, fontWeight: '700', color: theme.colors.error },
  optionalLabel: { fontSize: 12, color: theme.colors.textMuted },

  photoArea: {
    borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed',
    borderRadius: theme.borderRadius.lg,
    padding: 32, alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.primaryLight,
    marginBottom: 14,
  },
  photoAreaIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.card,
  },
  photoAreaTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.navy },
  photoAreaSub: { fontSize: 13, color: theme.colors.textSecondary },

  photoPreview: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5, borderColor: theme.colors.green,
    backgroundColor: theme.colors.greenLight,
    padding: 20, alignItems: 'center', gap: 8,
    marginBottom: 14,
  },
  photoPreviewInner: { alignItems: 'center', gap: 6 },
  photoPreviewTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  photoPreviewFilename: { fontSize: 12, color: theme.colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  photoPreviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  photoPreviewMetaText: { fontSize: 12, color: theme.colors.green, fontWeight: '600' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  removeBtnText: { fontSize: 13, color: theme.colors.error, fontWeight: '600' },

  photoButtons: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 44, borderRadius: theme.borderRadius.md,
    borderWidth: 1.5, borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
  },
  photoBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },

  notesInput: {
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: theme.colors.text,
    backgroundColor: theme.colors.background,
    minHeight: 110,
  },
  charCount: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'right', marginTop: 6 },
  charCountWarn: { color: theme.colors.orange },

  summaryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: 16, gap: 10,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.textMuted },
  summaryDotOk: { backgroundColor: theme.colors.green },
  summaryDotOptional: { backgroundColor: theme.colors.yellow },
  summaryText: { flex: 1, fontSize: 14, color: theme.colors.text },
  summaryStatus: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  summaryStatusOk: { color: theme.colors.green },
  summaryStatusOptional: { fontSize: 13, fontWeight: '600', color: theme.colors.yellow },

  confirmBtn: {
    backgroundColor: theme.colors.navy,
    borderRadius: theme.borderRadius.md,
    height: 56, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    ...theme.shadows.medium,
  },
  confirmBtnDisabled: { backgroundColor: theme.colors.textMuted },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: theme.colors.white },

  footerNote: {
    fontSize: 12, color: theme.colors.textMuted,
    textAlign: 'center', lineHeight: 18,
  },
});
