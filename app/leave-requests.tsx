import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createLeaveRequest, deleteLeaveRequest, getEmployees, getLeaveRequests, getLeaveTypes, reviewLeaveRequest, updateLeaveRequest } from '../lib/db';
import type { DbLeaveRequest, DbLeaveType, DbProfile } from '../lib/supabase';
import { theme } from '../styles/theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Oczekujący', color: '#F97316', bg: '#FFF4E5' },
  approved: { label: 'Zatwierdzony', color: '#22C55E', bg: '#E8F8ED' },
  rejected: { label: 'Odrzucony', color: '#EF4444', bg: '#FFF0EF' },
  cancelled: { label: 'Anulowany', color: '#6B7280', bg: '#F3F4F6' },
};

const calcDays = (from: string, to: string) => {
  const f = new Date(from), t = new Date(to);
  return Math.max(1, Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24)) + 1);
};

export default function LeaveRequestsScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const canManage = isOwner || isManager;
  const rid = user?.restaurantId ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [requests, setRequests] = useState<DbLeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<DbLeaveType[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [teamRequests, setTeamRequests] = useState<DbLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReq, setEditingReq] = useState<DbLeaveRequest | null>(null);
  const [selType, setSelType] = useState('');
  const [selEmployee, setSelEmployee] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [comment, setComment] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<DbLeaveRequest | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const load = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const [reqs, types] = await Promise.all([
      getLeaveRequests(rid, user.id),
      getLeaveTypes(rid),
    ]);
    setRequests(reqs);
    setLeaveTypes(types);
    if (canManage) {
      const [allReqs, emps] = await Promise.all([getLeaveRequests(rid), getEmployees(rid)]);
      setTeamRequests(allReqs);
      setEmployees(emps);
    }
    setLoading(false);
  }, [rid, user]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingReq(null);
    setSelType(leaveTypes[0]?.id ?? '');
    setSelEmployee(user?.id ?? '');
    setDateFrom('');
    setDateTo('');
    setComment('');
    setShowModal(true);
  };

  const openEdit = (r: DbLeaveRequest) => {
    setEditingReq(r);
    setSelType(r.leave_type_id);
    setSelEmployee(r.employee_id);
    setDateFrom(r.date_from);
    setDateTo(r.date_to);
    setComment(r.comment ?? '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!dateFrom || !dateTo || !selType) return;
    setFormLoading(true);
    const days = calcDays(dateFrom, dateTo);
    if (editingReq) {
      await updateLeaveRequest(editingReq.id, {
        leave_type_id: selType,
        date_from: dateFrom,
        date_to: dateTo,
        days_count: days,
        comment: comment || undefined,
      });
    } else {
      const empId = canManage && selEmployee ? selEmployee : user!.id;
      await createLeaveRequest(rid, empId, {
        leave_type_id: selType,
        date_from: dateFrom,
        date_to: dateTo,
        days_count: days,
        comment: comment || undefined,
      });
    }
    setFormLoading(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (r: DbLeaveRequest) => {
    await deleteLeaveRequest(r.id);
    load();
  };

  const handleApprove = async (r: DbLeaveRequest) => {
    await reviewLeaveRequest(r.id, user!.id, 'approved');
    load();
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    await reviewLeaveRequest(rejectTarget.id, user!.id, 'rejected', rejectComment || undefined);
    setRejectLoading(false);
    setRejectTarget(null);
    setRejectComment('');
    load();
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const displayList = viewMode === 'team'
    ? (filter === 'all' ? teamRequests : teamRequests.filter((r) => r.status === filter))
    : filtered;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wnioski urlopowe</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Ionicons name="add" size={20} color={theme.colors.white} />
          <Text style={styles.addBtnText}>Nowy</Text>
        </TouchableOpacity>
      </View>

      {canManage && (
        <View style={[styles.modeRow, isDesktop && styles.modeRowDesktop]}>
          {(['my', 'team'] as const).map((m) => (
            <TouchableOpacity key={m} style={[styles.modeBtn, viewMode === m && styles.modeBtnActive]} onPress={() => setViewMode(m)}>
              <Text style={[styles.modeBtnText, viewMode === m && styles.modeBtnTextActive]}>
                {m === 'my' ? 'Moje wnioski' : 'Zespół'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, isDesktop && styles.filtersDesktop]}>
        {[{ key: 'all', label: 'Wszystkie' }, { key: 'pending', label: 'Oczekujące' }, { key: 'approved', label: 'Zatwierdzone' }, { key: 'rejected', label: 'Odrzucone' }].map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterBtn, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} style={isDesktop ? { width: '100%' } : undefined}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : displayList.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>Brak wniosków</Text>
          </View>
        ) : displayList.map((r) => {
          const st = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
          const typeName = (r as any).leave_types?.name ?? leaveTypes.find((lt) => lt.id === r.leave_type_id)?.name ?? '—';
          const emp = employees.find((e) => e.id === r.employee_id);
          const empName = emp ? `${emp.first_name} ${emp.last_name}` : '';
          const isOwn = r.employee_id === user?.id;
          const canEdit = isOwn && r.status === 'pending';
          const canDelete = isOwn && (r.status === 'pending' || r.status === 'cancelled');
          return (
            <View key={r.id} style={styles.card}>
              {viewMode === 'team' && empName ? (
                <View style={styles.empRow}>
                  <View style={[styles.empAvatar, { backgroundColor: emp?.avatar_color ?? theme.colors.primary }]}>
                    <Text style={styles.empInitials}>{empName.split(' ').map((n) => n[0]).join('').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.empName}>{empName}</Text>
                </View>
              ) : null}
              <View style={styles.cardTop}>
                <Text style={styles.cardType}>{typeName}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <View style={styles.datesRow}>
                <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
                <Text style={styles.cardDates}>{r.date_from} → {r.date_to}</Text>
                <View style={styles.daysBadge}><Text style={styles.daysText}>{r.days_count} dni</Text></View>
              </View>
              {r.comment ? <Text style={styles.cardComment}>"{r.comment}"</Text> : null}
              {r.review_comment ? (
                <View style={styles.reviewRow}>
                  <Ionicons name="chatbubble-outline" size={12} color={theme.colors.primary} />
                  <Text style={styles.cardReview}>{r.review_comment}</Text>
                </View>
              ) : null}

              {/* Actions row */}
              <View style={styles.actionsRow}>
                {canEdit && (
                  <TouchableOpacity style={styles.actionEdit} onPress={() => openEdit(r)}>
                    <Ionicons name="pencil-outline" size={13} color={theme.colors.primary} />
                    <Text style={styles.actionEditText}>Edytuj</Text>
                  </TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity style={styles.actionDelete} onPress={() => handleDelete(r)}>
                    <Ionicons name="trash-outline" size={13} color={theme.colors.error} />
                    <Text style={styles.actionDeleteText}>Usuń</Text>
                  </TouchableOpacity>
                )}
                {canManage && r.status === 'pending' && (
                  <>
                    <TouchableOpacity style={styles.actionApprove} onPress={() => handleApprove(r)}>
                      <Ionicons name="checkmark" size={13} color={theme.colors.green} />
                      <Text style={styles.actionApproveText}>Zatwierdź</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionReject} onPress={() => { setRejectTarget(r); setRejectComment(''); }}>
                      <Ionicons name="close" size={13} color={theme.colors.error} />
                      <Text style={styles.actionRejectText}>Odrzuć</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={showModal} animationType="fade" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>{editingReq ? 'Edytuj wniosek' : 'Nowy wniosek'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled">

              {/* Employee picker — only for managers creating on behalf */}
              {canManage && !editingReq && employees.length > 0 && (
                <>
                  <Text style={mStyles.label}>PRACOWNIK</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {employees.map((e) => {
                      const active = selEmployee === e.id;
                      return (
                        <TouchableOpacity key={e.id} style={[mStyles.empChip, active && mStyles.empChipActive]} onPress={() => setSelEmployee(e.id)} activeOpacity={0.75}>
                          <View style={[mStyles.empAvatar, { backgroundColor: active ? theme.colors.primary : (e.avatar_color ?? theme.colors.primary) }]}>
                            <Text style={mStyles.empInitials}>{(e.first_name[0] + e.last_name[0]).toUpperCase()}</Text>
                          </View>
                          <View>
                            <Text style={[mStyles.empName, active && { color: theme.colors.primary }]}>{e.first_name}</Text>
                            <Text style={mStyles.empJob}>{e.job_title}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text style={mStyles.label}>TYP URLOPU</Text>
              {leaveTypes.length === 0 ? (
                <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 8 }}>Brak zdefiniowanych typów urlopu</Text>
              ) : leaveTypes.map((lt) => (
                <TouchableOpacity key={lt.id} style={[mStyles.optionBtn, selType === lt.id && mStyles.optionActive]} onPress={() => setSelType(lt.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[mStyles.optionText, selType === lt.id && mStyles.optionTextActive]}>{lt.name}</Text>
                    <Text style={mStyles.optionSub}>{lt.days_per_year} dni / rok</Text>
                  </View>
                  {selType === lt.id && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}

              <Text style={mStyles.label}>DATA OD</Text>
              <TextInput style={mStyles.input} value={dateFrom} onChangeText={setDateFrom} placeholder="2026-06-01" placeholderTextColor={theme.colors.textMuted} />

              <Text style={mStyles.label}>DATA DO</Text>
              <TextInput style={mStyles.input} value={dateTo} onChangeText={setDateTo} placeholder="2026-06-14" placeholderTextColor={theme.colors.textMuted} />

              {dateFrom && dateTo && new Date(dateTo) >= new Date(dateFrom) && (
                <View style={mStyles.daysPreview}>
                  <Ionicons name="information-circle-outline" size={14} color={theme.colors.primary} />
                  <Text style={mStyles.daysPreviewText}>{calcDays(dateFrom, dateTo)} dni urlopu</Text>
                </View>
              )}

              <Text style={mStyles.label}>KOMENTARZ (opcjonalnie)</Text>
              <TextInput style={[mStyles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={comment} onChangeText={setComment} placeholder="Dodaj notatkę..." placeholderTextColor={theme.colors.textMuted} multiline />

              <TouchableOpacity
                style={[mStyles.saveBtn, (!dateFrom || !dateTo || !selType) && { opacity: 0.5 }]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={formLoading || !dateFrom || !dateTo || !selType}
              >
                {formLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>{editingReq ? 'Zapisz zmiany' : 'Złóż wniosek'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject with comment Modal */}
      <Modal visible={!!rejectTarget} animationType="fade" transparent onRequestClose={() => setRejectTarget(null)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, { maxHeight: 400 }]}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Odrzuć wniosek</Text>
              <TouchableOpacity onPress={() => setRejectTarget(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 12 }}>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
                Możesz dodać komentarz wyjaśniający powód odrzucenia (opcjonalnie).
              </Text>
              <TextInput
                style={[mStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={rejectComment}
                onChangeText={setRejectComment}
                placeholder="Powód odrzucenia..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
              <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: theme.colors.error }]} onPress={handleReject} disabled={rejectLoading}>
                {rejectLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>Odrzuć wniosek</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.white },
  modeRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  modeRowDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  modeBtnActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  modeBtnTextActive: { color: theme.colors.primary },
  filters: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filtersDesktop: { paddingHorizontal: 32 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.white },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 12 },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  empAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 11, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardType: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardDates: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  daysBadge: { backgroundColor: theme.colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  daysText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  cardComment: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic', marginBottom: 4 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 4 },
  cardReview: { fontSize: 12, color: theme.colors.primary, flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionEdit: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.primaryLight },
  actionEditText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  actionDelete: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.errorLight },
  actionDeleteText: { fontSize: 12, fontWeight: '600', color: theme.colors.error },
  actionApprove: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.greenLight },
  actionApproveText: { fontSize: 12, fontWeight: '600', color: theme.colors.green },
  actionReject: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.errorLight },
  actionRejectText: { fontSize: 12, fontWeight: '600', color: theme.colors.error },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 6, marginTop: 16, letterSpacing: 0.5 },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text },
  optionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  optionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  optionText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  optionTextActive: { color: theme.colors.primary },
  optionSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  daysPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, borderRadius: 8, padding: 10, marginTop: 8 },
  daysPreviewText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  empChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: theme.colors.border },
  empChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  empAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  empJob: { fontSize: 11, color: theme.colors.textMuted },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});
