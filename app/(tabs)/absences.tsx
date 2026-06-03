import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getAbsences, getEmployees, reviewAbsence } from '../../lib/db';
import type { DbAbsence, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const ABSENCE_ICONS: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  l4:           { icon: 'medkit-outline',      color: '#EF4444', bg: '#FEF2F2', label: 'L4' },
  child_care:   { icon: 'heart-outline',        color: '#A855F7', bg: '#F5F3FF', label: 'Opieka nad dzieckiem' },
  force_majeure:{ icon: 'thunderstorm-outline', color: '#F97316', bg: '#FFF4E5', label: 'Siła wyższa' },
  other:        { icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280', bg: '#F3F4F6', label: 'Inne' },
};

const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const DAY_NAMES = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'];
const pad = (n: number) => String(n).padStart(2, '0');

function CalendarPicker({ value, onChange, minDate }: { value: string; onChange: (d: string) => void; minDate?: string }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const initDate = value ? new Date(value) : today;
  const [vy, setVy] = useState(initDate.getFullYear());
  const [vm, setVm] = useState(initDate.getMonth());

  useEffect(() => {
    if (value) { const d = new Date(value); setVy(d.getFullYear()); setVm(d.getMonth()); }
  }, [value]);

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const firstDay = new Date(vy, vm, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const toISO = (d: number) => `${vy}-${pad(vm + 1)}-${pad(d)}`;
  const todayISO = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const prevM = () => { if (vm === 0) { setVy(y => y-1); setVm(11); } else setVm(m => m-1); };
  const nextM = () => { if (vm === 11) { setVy(y => y+1); setVm(0); } else setVm(m => m+1); };
  const displayVal = value ? value.split('-').reverse().join('.') : 'Wybierz datę';

  return (
    <View>
      <TouchableOpacity style={[mSt.input, { flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={{ fontSize:14, color: value ? theme.colors.text : theme.colors.textMuted }}>{displayVal}</Text>
        <Ionicons name={open ? 'chevron-up' : 'calendar-outline'} size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={calSt.wrap}>
          <View style={calSt.header}>
            <TouchableOpacity onPress={prevM} style={calSt.nav}><Ionicons name="chevron-back" size={20} color={theme.colors.text} /></TouchableOpacity>
            <Text style={calSt.month}>{MONTHS[vm]} {vy}</Text>
            <TouchableOpacity onPress={nextM} style={calSt.nav}><Ionicons name="chevron-forward" size={20} color={theme.colors.text} /></TouchableOpacity>
          </View>
          <View style={{ flexDirection:'row', marginBottom:4 }}>
            {DAY_NAMES.map(d => <Text key={d} style={calSt.dayName}>{d}</Text>)}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection:'row' }}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={calSt.cell} />;
                const iso = toISO(day);
                const isSel = value === iso;
                const isToday = iso === todayISO;
                const isDisabled = !!(minDate && iso < minDate);
                return (
                  <TouchableOpacity key={di} style={[calSt.cell, isSel && calSt.cellSel, isToday && !isSel && calSt.cellToday, isDisabled && calSt.cellDisabled]}
                    onPress={() => { if (!isDisabled) { onChange(iso); setOpen(false); } }} disabled={isDisabled}>
                    <Text style={[calSt.cellText, isSel && calSt.cellTextSel, isToday && !isSel && calSt.cellTextToday, isDisabled && calSt.cellTextDisabled]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <TouchableOpacity onPress={() => { onChange(todayISO); setOpen(false); }} style={calSt.todayBtn}>
            <Text style={calSt.todayBtnText}>Dzisiaj</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Oczekuje',    color: '#F97316', bg: '#FFF4E5' },
  approved: { label: 'Zatwierdzona', color: '#22C55E', bg: '#E8F8ED' },
  rejected: { label: 'Odrzucona',   color: '#EF4444', bg: '#FFF0EF' },
};

export default function AbsencesScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  const [absences, setAbsences]   = useState<DbAbsence[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [actionMenu, setActionMenu] = useState<DbAbsence | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DbAbsence | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const [ab, em] = await Promise.all([getAbsences(rid), getEmployees(rid)]);
    setAbsences(ab);
    setEmployees(em);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  if (!canManage) { router.replace('/(tabs)/dashboard' as any); return null; }

  const handleApprove = async (id: string) => {
    if (!user?.id) return;
    await reviewAbsence(id, user.id, 'approved');
    load();
  };

  const handleReject = async () => {
    if (!rejectTarget || !user?.id) return;
    setRejectLoading(true);
    await reviewAbsence(rejectTarget.id, user.id, 'rejected');
    setRejectLoading(false);
    setRejectTarget(null);
    setRejectComment('');
    load();
  };

  const filtered = absences.filter(ab => {
    if (filter !== 'all' && ab.status !== filter) return false;
    if (dateFrom && ab.created_at < dateFrom) return false;
    if (dateTo && ab.created_at > dateTo + 'T23:59:59') return false;
    return true;
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.headerInner, isDesktop && s.headerInnerDesktop]}>
          <TouchableOpacity onPress={() => router.push('/work-hub' as any)} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Zarządzanie nieobecnościami</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      {/* Date range filter bar */}
      <View style={[s.filterBar, isDesktop && s.filterBarDesktop]}>
        <TouchableOpacity style={s.dateRangeBtn} onPress={() => setShowDateFilter(v => !v)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={s.dateRangeBtnText}>
            {dateFrom || dateTo ? `${dateFrom || '...'} – ${dateTo || '...'}` : 'Filtruj po dacie'}
          </Text>
          <Ionicons name={showDateFilter ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textMuted} />
        </TouchableOpacity>
        {(dateFrom || dateTo) && (
          <TouchableOpacity onPress={() => { setDateFrom(''); setDateTo(''); }} style={s.clearDateBtn}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={s.filterChips}>
          {[{ k: 'all', l: 'Wszystkie' }, { k: 'pending', l: 'Oczekujące' }, { k: 'approved', l: 'Zatwierdzone' }, { k: 'rejected', l: 'Odrzucone' }].map(f => (
            <TouchableOpacity key={f.k} style={[s.chip, filter === f.k && s.chipActive]} onPress={() => setFilter(f.k)}>
              <Text style={[s.chipText, filter === f.k && s.chipTextActive]}>{f.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showDateFilter && (
        <View style={[s.dateExpandedRow, isDesktop && s.filterBarDesktop]}>
          <View style={{ flex: 1 }}>
            <Text style={s.dateLabel}>Od</Text>
            <CalendarPicker value={dateFrom} onChange={setDateFrom} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.dateLabel}>Do</Text>
            <CalendarPicker value={dateTo} onChange={setDateTo} minDate={dateFrom || undefined} />
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.colors.border} />
            <Text style={s.emptyText}>Brak nieobecności</Text>
          </View>
        ) : filtered.map((ab) => {
          const emp = employees.find(e => e.id === ab.employee_id);
          const empName = emp ? `${emp.first_name} ${emp.last_name}` : '—';
          const empInitials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '?';
          const st = STATUS_MAP[ab.status] ?? STATUS_MAP.pending;
          const ico = ABSENCE_ICONS[ab.absence_type] ?? ABSENCE_ICONS.other;
          const reviewer = employees.find(e => e.id === ab.reviewed_by);
          const reviewerName = reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : null;
          const submittedAt = ab.created_at
            ? new Date(ab.created_at).toLocaleString('pl-PL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
            : null;

          return (
            <View key={ab.id} style={s.card}>
              {/* Card header: avatar + name + status + menu */}
              <View style={s.cardTop}>
                <View style={[s.avatar, { backgroundColor: emp?.avatar_color ?? theme.colors.primary }]}>
                  <Text style={s.avatarText}>{empInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.empName}>{empName}</Text>
                  <Text style={s.empSub}>{ico.label}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                <TouchableOpacity onPress={() => setActionMenu(ab)} style={s.menuBtn} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
                  <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Absence type + period row */}
              <View style={s.infoRow}>
                <View style={s.infoLeft}>
                  <Text style={s.infoLabel}>Rodzaj nieobecności</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:3 }}>
                    <View style={[s.typeIconBox, { backgroundColor: ico.bg }]}>
                      <Ionicons name={ico.icon as any} size={13} color={ico.color} />
                    </View>
                    <Text style={s.typeText}>{ico.label}</Text>
                  </View>
                </View>
                <View style={s.infoRight}>
                  <Text style={s.infoLabel}>Data zgłoszenia</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:3 }}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} />
                    <Text style={s.dateText}>{ab.created_at ? new Date(ab.created_at).toLocaleDateString('pl-PL') : '—'}</Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              {ab.description ? (
                <View style={s.descRow}>
                  <Ionicons name="chatbubble-outline" size={12} color={theme.colors.primary} />
                  <Text style={s.descText}>{ab.description}</Text>
                </View>
              ) : null}

              {/* Submitted at */}
              {submittedAt && <Text style={s.submittedAt}>Zgłoszono: {submittedAt}</Text>}

              {/* Reviewer */}
              {ab.status === 'approved' && reviewerName && (
                <Text style={s.reviewerInfo}>Zatwierdził: {reviewerName}</Text>
              )}
              {ab.status === 'rejected' && reviewerName && (
                <Text style={[s.reviewerInfo, { color: theme.colors.error }]}>Odrzucił: {reviewerName}</Text>
              )}

              {/* Approve / reject for pending */}
              {ab.status === 'pending' && canManage && (
                <View style={s.actionsRow}>
                  <TouchableOpacity style={s.approveBtn} onPress={() => handleApprove(ab.id)} activeOpacity={0.7}>
                    <Ionicons name="checkmark" size={13} color={theme.colors.green} />
                    <Text style={s.approveBtnText}>Zatwierdź</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => { setRejectTarget(ab); setRejectComment(''); }} activeOpacity={0.7}>
                    <Ionicons name="close" size={13} color={theme.colors.error} />
                    <Text style={s.rejectBtnText}>Odrzuć</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Action menu */}
      <Modal visible={!!actionMenu} animationType="fade" transparent onRequestClose={() => setActionMenu(null)}>
        <TouchableOpacity style={mSt.overlay} activeOpacity={1} onPress={() => setActionMenu(null)}>
          <View style={[mSt.sheet, isDesktop && { maxWidth: 360, alignSelf: 'center' as const }]}>
            <Text style={mSt.sheetTitle}>{actionMenu ? (ABSENCE_ICONS[actionMenu.absence_type]?.label ?? 'Nieobecność') : ''}</Text>
            {actionMenu && (() => {
              const ab = actionMenu;
              return (
                <>
                  <TouchableOpacity style={mSt.menuItem} onPress={() => setActionMenu(null)} activeOpacity={0.7}>
                    <Ionicons name="eye-outline" size={18} color={theme.colors.text} />
                    <Text style={mSt.menuItemText}>Podgląd</Text>
                  </TouchableOpacity>
                  {ab.status === 'pending' && (
                    <>
                      <TouchableOpacity style={mSt.menuItem} onPress={() => { setActionMenu(null); handleApprove(ab.id); }} activeOpacity={0.7}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.green} />
                        <Text style={[mSt.menuItemText, { color: theme.colors.green }]}>Zatwierdź</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={mSt.menuItem} onPress={() => { setActionMenu(null); setRejectTarget(ab); setRejectComment(''); }} activeOpacity={0.7}>
                        <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
                        <Text style={[mSt.menuItemText, { color: theme.colors.error }]}>Odrzuć</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reject with comment modal */}
      <Modal visible={!!rejectTarget} animationType="fade" transparent onRequestClose={() => setRejectTarget(null)}>
        <View style={mSt.centeredOverlay}>
          <View style={mSt.dialog}>
            <View style={mSt.dialogHeader}>
              <Text style={mSt.dialogTitle}>Odrzuć nieobecność</Text>
              <TouchableOpacity onPress={() => setRejectTarget(null)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize:13, color:theme.colors.textSecondary, marginBottom:12 }}>
              Możesz dodać komentarz wyjaśniający powód odrzucenia (opcjonalnie).
            </Text>
            <TextInput
              style={mSt.input}
              value={rejectComment}
              onChangeText={setRejectComment}
              placeholder="Powód odrzucenia..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
            />
            <TouchableOpacity style={[mSt.saveBtn, { backgroundColor: theme.colors.error }]} onPress={handleReject} disabled={rejectLoading}>
              {rejectLoading ? <ActivityIndicator color="#fff" /> : <Text style={mSt.saveBtnText}>Odrzuć nieobecność</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerInnerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },

  filterBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterBarDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  dateRangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border, alignSelf: 'flex-start' as const },
  dateRangeBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  clearDateBtn: { position: 'absolute', right: 0, top: 0, padding: 4 },
  filterChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' as const, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.white },
  dateExpandedRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  dateLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 },

  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },

  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 12, ...theme.shadows.card },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 13, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  menuBtn: { padding: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  infoLeft: { flex: 1 },
  infoRight: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  typeIconBox: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  typeText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  dateText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  descRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 4 },
  descText: { fontSize: 12, color: theme.colors.primary, flex: 1 },
  submittedAt: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 3 },
  reviewerInfo: { fontSize: 11, fontWeight: '600', color: theme.colors.green, marginBottom: 3 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 8, backgroundColor: theme.colors.greenLight },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.green },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 8, backgroundColor: theme.colors.errorLight },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.error },
});

const calSt = StyleSheet.create({
  wrap: { backgroundColor: theme.colors.card, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginTop: 4, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  nav: { padding: 6, borderRadius: 8, backgroundColor: theme.colors.surface },
  month: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  dayName: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, margin: 1 },
  cellSel: { backgroundColor: theme.colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: theme.colors.primary },
  cellDisabled: { opacity: 0.3 },
  cellText: { fontSize: 13, fontWeight: '500', color: theme.colors.text },
  cellTextSel: { color: '#fff', fontWeight: '700' },
  cellTextToday: { color: theme.colors.primary, fontWeight: '700' },
  cellTextDisabled: { color: theme.colors.textMuted },
  todayBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  todayBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
});

const mSt = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12, paddingHorizontal: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuItemText: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  dialog: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 500, padding: 20 },
  dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dialogTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  saveBtn: { borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
