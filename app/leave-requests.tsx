import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createLeaveRequest, getEmployees, getLeaveRequests, getLeaveTypes, reviewLeaveRequest } from '../lib/db';
import type { DbLeaveRequest, DbLeaveType, DbProfile } from '../lib/supabase';
import { theme } from '../styles/theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Oczekujący', color: '#F97316', bg: '#FFF4E5' },
  approved: { label: 'Zatwierdzony', color: '#22C55E', bg: '#E8F8ED' },
  rejected: { label: 'Odrzucony', color: '#EF4444', bg: '#FFF0EF' },
  cancelled: { label: 'Anulowany', color: '#6B7280', bg: '#F3F4F6' },
};

export default function LeaveRequestsScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const canManage = isOwner || isManager;
  const rid = user?.restaurantId ?? '';

  const [requests, setRequests] = useState<DbLeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<DbLeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Form
  const [selType, setSelType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [comment, setComment] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [teamRequests, setTeamRequests] = useState<DbLeaveRequest[]>([]);
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');

  const load = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const [reqs, types] = await Promise.all([
      getLeaveRequests(rid, user.id),
      getLeaveTypes(rid),
    ]);
    setRequests(reqs);
    setLeaveTypes(types);
    if (types.length > 0 && !selType) setSelType(types[0].id);
    if (canManage) {
      const [allReqs, emps] = await Promise.all([getLeaveRequests(rid), getEmployees(rid)]);
      setTeamRequests(allReqs.filter((r) => r.employee_id !== user.id));
      setEmployees(emps);
    }
    setLoading(false);
  }, [rid, user]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const handleCreate = async () => {
    if (!user || !dateFrom || !dateTo) return;
    setFormLoading(true);
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    await createLeaveRequest(rid, user.id, {
      leave_type_id: selType,
      date_from: dateFrom,
      date_to: dateTo,
      days_count: days,
      comment: comment || undefined,
    });
    setFormLoading(false);
    setShowModal(false);
    setDateFrom(''); setDateTo(''); setComment('');
    load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Wnioski urlopowe</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}><Ionicons name="add-circle" size={28} color={theme.colors.primary} /></TouchableOpacity>
      </View>

      {/* Manager Toggle */}
      {canManage && (
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterBtn, viewMode === 'my' && styles.filterActive]}
            onPress={() => setViewMode('my')}
          >
            <Text style={[styles.filterText, viewMode === 'my' && styles.filterTextActive]}>Moje wnioski</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, viewMode === 'team' && styles.filterActive]}
            onPress={() => setViewMode('team')}
          >
            <Text style={[styles.filterText, viewMode === 'team' && styles.filterTextActive]}>Zespół</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {[{ key: 'all', label: 'Wszystkie' }, { key: 'pending', label: 'Oczekujące' }, { key: 'approved', label: 'Zatwierdzone' }, { key: 'rejected', label: 'Odrzucone' }].map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterBtn, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} /> : (() => {
          const displayList = viewMode === 'team' ? (filter === 'all' ? teamRequests : teamRequests.filter((r) => r.status === filter)) : filtered;
          if (displayList.length === 0) return (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>Brak wniosków</Text>
            </View>
          );
          return displayList.map((r) => {
            const st = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
            const typeName = (r as any).leave_types?.name ?? '—';
            const emp = employees.find((e) => e.id === r.employee_id);
            const empName = emp ? `${emp.first_name} ${emp.last_name}` : '';
            return (
              <View key={r.id} style={styles.card}>
                {viewMode === 'team' && empName ? <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 }}>{empName}</Text> : null}
                <View style={styles.cardTop}>
                  <Text style={styles.cardType}>{typeName}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text></View>
                </View>
                <Text style={styles.cardDates}>{r.date_from} → {r.date_to} ({r.days_count} dni)</Text>
                {r.comment && <Text style={styles.cardComment}>{r.comment}</Text>}
                {r.review_comment && <Text style={styles.cardReview}>Manager: {r.review_comment}</Text>}
                {viewMode === 'team' && canManage && r.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.greenLight, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                      onPress={async () => { await reviewLeaveRequest(r.id, user!.id, 'approved'); load(); }}
                    >
                      <Ionicons name="checkmark" size={14} color={theme.colors.green} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.green }}>Zatwierdź</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.errorLight, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                      onPress={async () => { await reviewLeaveRequest(r.id, user!.id, 'rejected'); load(); }}
                    >
                      <Ionicons name="close" size={14} color={theme.colors.error} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.error }}>Odrzuć</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          });
        })()}
      </ScrollView>

      {/* New Leave Request Modal */}
      <Modal visible={showModal} animationType="fade" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Nowy wniosek</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={mStyles.body}>
              <Text style={mStyles.label}>Typ urlopu</Text>
              {leaveTypes.map((lt) => (
                <TouchableOpacity key={lt.id} style={[mStyles.optionBtn, selType === lt.id && mStyles.optionActive]} onPress={() => setSelType(lt.id)}>
                  <Text style={[mStyles.optionText, selType === lt.id && mStyles.optionTextActive]}>{lt.name} ({lt.days_per_year} dni/rok)</Text>
                </TouchableOpacity>
              ))}

              <Text style={mStyles.label}>Data od (RRRR-MM-DD)</Text>
              <TextInput style={mStyles.input} value={dateFrom} onChangeText={setDateFrom} placeholder="2026-06-01" placeholderTextColor={theme.colors.textMuted} />

              <Text style={mStyles.label}>Data do (RRRR-MM-DD)</Text>
              <TextInput style={mStyles.input} value={dateTo} onChangeText={setDateTo} placeholder="2026-06-14" placeholderTextColor={theme.colors.textMuted} />

              <Text style={mStyles.label}>Komentarz (opcjonalnie)</Text>
              <TextInput style={[mStyles.input, { minHeight: 60 }]} value={comment} onChangeText={setComment} placeholder="..." placeholderTextColor={theme.colors.textMuted} multiline />

              <TouchableOpacity style={mStyles.saveBtn} onPress={handleCreate} activeOpacity={0.85} disabled={formLoading || !dateFrom || !dateTo}>
                {formLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>Złóż wniosek</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  filters: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.white },
  content: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardType: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDates: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },
  cardComment: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
  cardReview: { fontSize: 12, color: theme.colors.primary, marginTop: 4 },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '85%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text },
  optionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 6 },
  optionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  optionText: { fontSize: 13, color: theme.colors.text },
  optionTextActive: { color: theme.colors.primary, fontWeight: '600' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});
