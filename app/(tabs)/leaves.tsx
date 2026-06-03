import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { getEmployees, getLeaveRequests, reviewLeaveRequestWithNotes } from '../../lib/db';
import type { DbLeaveRequest, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

export default function LeavesScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert, showConfirm } = useAlert();
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  const [leaveRequests, setLeaveRequests] = useState<DbLeaveRequest[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Review state
  const [reviewingRequest, setReviewingRequest] = useState<DbLeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const [lr, em] = await Promise.all([getLeaveRequests(rid), getEmployees(rid)]);
    setLeaveRequests(lr);
    setEmployees(em);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async () => {
    if (!reviewingRequest || !reviewAction || !user?.id) return;
    setReviewing(true);
    const success = await reviewLeaveRequestWithNotes(reviewingRequest.id, user.id, reviewAction as 'approved' | 'rejected', reviewNote);
    setReviewing(false);
    if (success) {
      setReviewingRequest(null);
      setReviewNote('');
      load();
    } else {
      showAlert('Błąd', 'Nie udało się zaktualizować wniosku');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Zarządzanie urlopami</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : leaveRequests.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="umbrella-outline" size={48} color={theme.colors.border} />
            <Text style={s.emptyText}>Brak wniosków urlopowych</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {leaveRequests.map((lr) => {
              const emp = employees.find((e) => e.id === lr.employee_id);
              const isPending = lr.status === 'pending';
              return (
                <View key={lr.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <View style={[s.empAvatar, { backgroundColor: emp?.avatar_color ?? theme.colors.surface }]}>
                      <Text style={s.empInitials}>{emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.empName}>{emp ? `${emp.first_name} ${emp.last_name}` : lr.employee_id.slice(0, 8)}</Text>
                      <Text style={s.empRole}>{lr.date_from} — {lr.date_to} ({lr.days_count} dni)</Text>
                      {lr.comment ? <Text style={s.comment} numberOfLines={2}>{lr.comment}</Text> : null}
                    </View>
                    <View style={[s.statusChip, { backgroundColor: lr.status === 'approved' ? theme.colors.greenLight : lr.status === 'rejected' ? theme.colors.errorLight : theme.colors.primaryLight }]}>
                      <Text style={[s.statusChipText, { color: lr.status === 'approved' ? theme.colors.green : lr.status === 'rejected' ? theme.colors.error : theme.colors.primary }]}>
                        {lr.status === 'approved' ? 'Zatwierdzony' : lr.status === 'rejected' ? 'Odrzucony' : 'Oczekuje'}
                      </Text>
                    </View>
                  </View>
                  {isPending && canManage && (
                    <View style={s.actions}>
                      <TouchableOpacity style={s.approveBtn} onPress={() => { setReviewingRequest(lr); setReviewAction('approved'); setReviewNote(''); }} activeOpacity={0.7}>
                        <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                        <Text style={s.btnText}>Zatwierdź</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.rejectBtn} onPress={() => { setReviewingRequest(lr); setReviewAction('rejected'); setReviewNote(''); }} activeOpacity={0.7}>
                        <Ionicons name="close" size={14} color={theme.colors.white} />
                        <Text style={s.btnText}>Odrzuć</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={!!reviewingRequest} animationType="fade" transparent onRequestClose={() => setReviewingRequest(null)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.header}>
              <Text style={mStyles.title}>{reviewAction === 'approved' ? 'Zatwierdź wniosek' : 'Odrzuć wniosek'}</Text>
              <TouchableOpacity onPress={() => setReviewingRequest(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={mStyles.body}>
              <Text style={mStyles.label}>Notatka (opcjonalnie)</Text>
              <TextInput
                style={mStyles.input}
                value={reviewNote}
                onChangeText={setReviewNote}
                placeholder="Dodaj notatkę do decyzji..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
              />
              <View style={mStyles.actions}>
                <TouchableOpacity style={[mStyles.btn, { backgroundColor: theme.colors.surface }]} onPress={() => setReviewingRequest(null)} activeOpacity={0.7}>
                  <Text style={[mStyles.btnText, { color: theme.colors.text }]}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[mStyles.btn, { backgroundColor: reviewAction === 'approved' ? theme.colors.green : theme.colors.error }]} onPress={handleReview} disabled={reviewing} activeOpacity={0.7}>
                  {reviewing ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.btnText}>{reviewAction === 'approved' ? 'Zatwierdź' : 'Odrzuć'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, ...theme.shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  empAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empRole: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  comment: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, backgroundColor: theme.colors.greenLight, borderRadius: 8, paddingVertical: 8, justifyContent: 'center' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, backgroundColor: theme.colors.errorLight, borderRadius: 8, paddingVertical: 8, justifyContent: 'center' },
  btnText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface, minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
});
