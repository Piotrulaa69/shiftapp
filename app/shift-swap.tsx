import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createShiftSwap, getEmployees, getShifts, getShiftSwaps, updateSwapStatus } from '../lib/db';
import type { DbProfile, DbShift, DbShiftSwap } from '../lib/supabase';
import { theme } from '../styles/theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending_responder: { label: 'Oczekuje na odpowiedź', color: '#F97316', bg: '#FFF4E5' },
  pending_manager: { label: 'Czeka na managera', color: theme.colors.primary, bg: '#E3F2FD' },
  approved: { label: 'Zatwierdzone', color: '#22C55E', bg: '#E8F8ED' },
  rejected_responder: { label: 'Odrzucone', color: '#EF4444', bg: '#FFF0EF' },
  rejected_manager: { label: 'Odrzucone przez managera', color: '#EF4444', bg: '#FFF0EF' },
};

const FILTERS = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'pending_responder', label: 'Oczekujące' },
  { key: 'pending_manager', label: 'Do zatwierdzenia' },
  { key: 'approved', label: 'Zatwierdzone' },
  { key: 'rejected_responder', label: 'Odrzucone' },
];

export default function ShiftSwapScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;
  const uid = user?.id ?? '';

  const [swaps, setSwaps] = useState<DbShiftSwap[]>([]);
  const [shifts, setShifts] = useState<DbShift[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [swapType, setSwapType] = useState<'swap' | 'give'>('swap');
  const [myShift, setMyShift] = useState('');
  const [selResponder, setSelResponder] = useState('');
  const [responderShift, setResponderShift] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const [sw, sh, em] = await Promise.all([getShiftSwaps(rid), getShifts(rid), getEmployees(rid)]);
    setSwaps(sw);
    setShifts(sh);
    setEmployees(em);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  const getEmp = (id: string) => employees.find((e) => e.id === id);
  const getName = (id: string) => { const e = getEmp(id); return e ? `${e.first_name} ${e.last_name}` : 'Nieznany'; };
  const getShiftInfo = (id: string | null) => {
    if (!id) return null;
    const s = shifts.find((sh) => sh.id === id);
    return s ? { date: s.day, time: `${s.start_time}–${s.end_time}`, loc: s.location } : null;
  };

  const myShifts = shifts.filter((s) => s.employee_id === uid);
  const responderShifts = selResponder ? shifts.filter((s) => s.employee_id === selResponder) : [];
  const otherEmployees = employees.filter((e) => e.id !== uid);

  const openCreate = () => {
    setSwapType('swap');
    setMyShift(myShifts[0]?.id ?? '');
    setSelResponder(otherEmployees[0]?.id ?? '');
    setResponderShift('');
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!myShift || !selResponder) return;
    setSaving(true);
    await createShiftSwap(rid, {
      requester_id: uid,
      responder_id: selResponder,
      requester_shift: myShift,
      responder_shift: swapType === 'swap' ? (responderShift || undefined) : undefined,
      swap_type: swapType,
    });
    setSaving(false);
    setShowModal(false);
    load();
  };

  // Responder actions
  const handleResponderAccept = async (sw: DbShiftSwap) => {
    await updateSwapStatus(sw.id, 'pending_manager');
    load();
  };
  const handleResponderReject = async (sw: DbShiftSwap) => {
    await updateSwapStatus(sw.id, 'rejected_responder');
    load();
  };

  // Manager actions
  const handleManagerApprove = async (sw: DbShiftSwap) => {
    await updateSwapStatus(sw.id, 'approved', uid);
    load();
  };
  const handleManagerReject = async (sw: DbShiftSwap) => {
    await updateSwapStatus(sw.id, 'rejected_manager', uid);
    load();
  };

  // Cancel (requester)
  const handleCancel = async (sw: DbShiftSwap) => {
    await updateSwapStatus(sw.id, 'rejected_responder');
    load();
  };

  const allFiltered = swaps.filter((sw) => filter === 'all' || sw.status === filter || (filter === 'rejected_responder' && sw.status === 'rejected_manager'));
  const myFiltered = allFiltered.filter((sw) => sw.requester_id === uid || sw.responder_id === uid);
  const displayList = viewMode === 'my' ? myFiltered : allFiltered;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wymiana zmian</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Ionicons name="add" size={20} color={theme.colors.white} />
          <Text style={styles.addBtnText}>Nowa</Text>
        </TouchableOpacity>
      </View>

      {canManage && (
        <View style={[styles.modeRow, isDesktop && styles.modeRowDesktop]}>
          {(['my', 'all'] as const).map((m) => (
            <TouchableOpacity key={m} style={[styles.modeBtn, viewMode === m && styles.modeBtnActive]} onPress={() => setViewMode(m)}>
              <Text style={[styles.modeBtnText, viewMode === m && styles.modeBtnTextActive]}>
                {m === 'my' ? 'Moje' : 'Wszystkie'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, isDesktop && styles.filtersDesktop]}>
        {FILTERS.map((f) => (
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
            <Ionicons name="swap-horizontal-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>Brak wniosków o wymianę</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
              <Text style={styles.emptyBtnText}>Złóż wniosek</Text>
            </TouchableOpacity>
          </View>
        ) : displayList.map((sw) => {
          const st = STATUS_MAP[sw.status] ?? STATUS_MAP.pending_responder;
          const reqEmp = getEmp(sw.requester_id);
          const resEmp = getEmp(sw.responder_id);
          const reqShift = getShiftInfo(sw.requester_shift);
          const resShift = getShiftInfo(sw.responder_shift);
          const isRequester = sw.requester_id === uid;
          const isResponder = sw.responder_id === uid;
          const canRespond = isResponder && sw.status === 'pending_responder';
          const canManagerAct = canManage && sw.status === 'pending_manager';
          const canCancel = isRequester && sw.status === 'pending_responder';

          return (
            <View key={sw.id} style={styles.card}>
              {/* Header row */}
              <View style={styles.cardTop}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                <View style={[styles.typePill, { backgroundColor: sw.swap_type === 'swap' ? theme.colors.primaryLight : '#F0FFF4' }]}>
                  <Ionicons name={sw.swap_type === 'swap' ? 'swap-horizontal' : 'arrow-forward'} size={11} color={sw.swap_type === 'swap' ? theme.colors.primary : '#22C55E'} />
                  <Text style={[styles.typePillText, { color: sw.swap_type === 'swap' ? theme.colors.primary : '#22C55E' }]}>
                    {sw.swap_type === 'swap' ? 'Wymiana' : 'Oddanie'}
                  </Text>
                </View>
              </View>

              {/* Swap sides */}
              <View style={styles.swapRow}>
                <View style={styles.swapSide}>
                  <View style={styles.empMini}>
                    <View style={[styles.empDot, { backgroundColor: reqEmp?.avatar_color ?? theme.colors.primary }]}>
                      <Text style={styles.empDotTxt}>{getName(sw.requester_id).split(' ').map((n) => n[0]).join('')}</Text>
                    </View>
                    <View>
                      <Text style={styles.swapName}>{getName(sw.requester_id)}</Text>
                      <Text style={styles.empRole}>{reqEmp?.job_title ?? ''}</Text>
                    </View>
                  </View>
                  {reqShift && (
                    <View style={styles.shiftBubble}>
                      <Text style={styles.shiftDate}>{reqShift.date}</Text>
                      <Text style={styles.shiftTime}>{reqShift.time}</Text>
                      {reqShift.loc ? <Text style={styles.shiftLoc}>{reqShift.loc}</Text> : null}
                    </View>
                  )}
                </View>

                <View style={styles.arrowBox}>
                  <Ionicons name={sw.swap_type === 'swap' ? 'swap-horizontal' : 'arrow-forward'} size={20} color={theme.colors.primary} />
                </View>

                <View style={styles.swapSide}>
                  <View style={styles.empMini}>
                    <View style={[styles.empDot, { backgroundColor: resEmp?.avatar_color ?? '#6B7280' }]}>
                      <Text style={styles.empDotTxt}>{getName(sw.responder_id).split(' ').map((n) => n[0]).join('')}</Text>
                    </View>
                    <View>
                      <Text style={styles.swapName}>{getName(sw.responder_id)}</Text>
                      <Text style={styles.empRole}>{resEmp?.job_title ?? ''}</Text>
                    </View>
                  </View>
                  {resShift && (
                    <View style={styles.shiftBubble}>
                      <Text style={styles.shiftDate}>{resShift.date}</Text>
                      <Text style={styles.shiftTime}>{resShift.time}</Text>
                      {resShift.loc ? <Text style={styles.shiftLoc}>{resShift.loc}</Text> : null}
                    </View>
                  )}
                </View>
              </View>

              {/* Action buttons */}
              {(canRespond || canManagerAct || canCancel) && (
                <View style={styles.actionRow}>
                  {canRespond && (
                    <>
                      <TouchableOpacity style={styles.btnApprove} onPress={() => handleResponderAccept(sw)}>
                        <Ionicons name="checkmark" size={14} color={theme.colors.green} />
                        <Text style={styles.btnApproveText}>Akceptuj</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnReject} onPress={() => handleResponderReject(sw)}>
                        <Ionicons name="close" size={14} color={theme.colors.error} />
                        <Text style={styles.btnRejectText}>Odrzuć</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {canManagerAct && (
                    <>
                      <TouchableOpacity style={styles.btnApprove} onPress={() => handleManagerApprove(sw)}>
                        <Ionicons name="checkmark-circle" size={14} color={theme.colors.green} />
                        <Text style={styles.btnApproveText}>Zatwierdź</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnReject} onPress={() => handleManagerReject(sw)}>
                        <Ionicons name="close-circle" size={14} color={theme.colors.error} />
                        <Text style={styles.btnRejectText}>Odrzuć</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {canCancel && (
                    <TouchableOpacity style={styles.btnCancel} onPress={() => handleCancel(sw)}>
                      <Ionicons name="trash-outline" size={13} color={theme.colors.textMuted} />
                      <Text style={styles.btnCancelText}>Anuluj wniosek</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showModal} animationType="fade" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Nowy wniosek o wymianę</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled">

              {/* Swap type */}
              <Text style={mStyles.label}>TYP WNIOSKU</Text>
              <View style={mStyles.typeRow}>
                <TouchableOpacity style={[mStyles.typeBtn, swapType === 'swap' && mStyles.typeBtnActive]} onPress={() => setSwapType('swap')}>
                  <Ionicons name="swap-horizontal" size={18} color={swapType === 'swap' ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[mStyles.typeBtnText, swapType === 'swap' && mStyles.typeBtnTextActive]}>Wymiana</Text>
                  <Text style={mStyles.typeBtnSub}>Zamieniamy się zmianami</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[mStyles.typeBtn, swapType === 'give' && mStyles.typeBtnActive]} onPress={() => setSwapType('give')}>
                  <Ionicons name="arrow-forward" size={18} color={swapType === 'give' ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[mStyles.typeBtnText, swapType === 'give' && mStyles.typeBtnTextActive]}>Oddanie</Text>
                  <Text style={mStyles.typeBtnSub}>Oddaję zmianę komuś</Text>
                </TouchableOpacity>
              </View>

              {/* My shift */}
              <Text style={mStyles.label}>MOJA ZMIANA</Text>
              {myShifts.length === 0 ? (
                <Text style={mStyles.noShifts}>Brak zaplanowanych zmian</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {myShifts.map((s) => (
                    <TouchableOpacity key={s.id} style={[mStyles.shiftChip, myShift === s.id && mStyles.shiftChipActive]} onPress={() => setMyShift(s.id)}>
                      <Text style={[mStyles.shiftChipDate, myShift === s.id && { color: theme.colors.primary }]}>{s.day}</Text>
                      <Text style={[mStyles.shiftChipTime, myShift === s.id && { color: theme.colors.primary }]}>{s.start_time}–{s.end_time}</Text>
                      {s.location ? <Text style={mStyles.shiftChipLoc}>{s.location}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Responder */}
              <Text style={mStyles.label}>PRACOWNIK DO WYMIANY</Text>
              {otherEmployees.length === 0 ? (
                <Text style={mStyles.noShifts}>Brak innych pracowników</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {otherEmployees.map((e) => {
                    const active = selResponder === e.id;
                    return (
                      <TouchableOpacity key={e.id} style={[mStyles.empChip, active && mStyles.empChipActive]} onPress={() => { setSelResponder(e.id); setResponderShift(''); }}>
                        <View style={[mStyles.empAvatar, { backgroundColor: active ? theme.colors.primary : e.avatar_color }]}>
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
              )}

              {/* Responder shift (only for swap) */}
              {swapType === 'swap' && selResponder && (
                <>
                  <Text style={mStyles.label}>ZMIANA DO WYMIANY</Text>
                  {responderShifts.length === 0 ? (
                    <Text style={mStyles.noShifts}>Ten pracownik nie ma zaplanowanych zmian</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                      {responderShifts.map((s) => (
                        <TouchableOpacity key={s.id} style={[mStyles.shiftChip, responderShift === s.id && mStyles.shiftChipActive]} onPress={() => setResponderShift(s.id)}>
                          <Text style={[mStyles.shiftChipDate, responderShift === s.id && { color: theme.colors.primary }]}>{s.day}</Text>
                          <Text style={[mStyles.shiftChipTime, responderShift === s.id && { color: theme.colors.primary }]}>{s.start_time}–{s.end_time}</Text>
                          {s.location ? <Text style={mStyles.shiftChipLoc}>{s.location}</Text> : null}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              <TouchableOpacity
                style={[mStyles.saveBtn, (!myShift || !selResponder) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={saving || !myShift || !selResponder}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>Złóż wniosek</Text>}
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
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  emptyBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  typePillText: { fontSize: 11, fontWeight: '700' },
  swapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  swapSide: { flex: 1 },
  empMini: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  empDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empDotTxt: { fontSize: 10, fontWeight: '700', color: theme.colors.white },
  swapName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  empRole: { fontSize: 10, color: theme.colors.textMuted },
  shiftBubble: { backgroundColor: theme.colors.background, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: theme.colors.border },
  shiftDate: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
  shiftTime: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  shiftLoc: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  arrowBox: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  btnApprove: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.greenLight },
  btnApproveText: { fontSize: 12, fontWeight: '700', color: theme.colors.green },
  btnReject: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.errorLight },
  btnRejectText: { fontSize: 12, fontWeight: '700', color: theme.colors.error },
  btnCancel: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  btnCancelText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '92%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  noShifts: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 8, fontStyle: 'italic' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, padding: 14, alignItems: 'center', gap: 4, backgroundColor: theme.colors.background },
  typeBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  typeBtnTextActive: { color: theme.colors.primary },
  typeBtnSub: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center' },
  shiftChip: { borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.border, padding: 10, minWidth: 90, backgroundColor: theme.colors.background },
  shiftChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  shiftChipDate: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
  shiftChipTime: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  shiftChipLoc: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  empChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: theme.colors.border },
  empChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  empAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  empJob: { fontSize: 11, color: theme.colors.textMuted },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 30 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});
