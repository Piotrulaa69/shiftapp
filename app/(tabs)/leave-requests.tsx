import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { createLeaveRequest, deleteLeaveRequest, ensureDefaultLeaveTypes, getEmployees, getLeaveRequests, reviewLeaveRequest, updateLeaveRequest } from '../../lib/db';
import type { DbLeaveRequest, DbLeaveType, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const LEAVE_TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  standard: { icon: 'sunny-outline', color: '#2563EB', bg: '#EFF6FF' },
  special: { icon: 'heart-outline', color: '#A855F7', bg: '#F5F3FF' },
  parental: { icon: 'people-outline', color: '#F97316', bg: '#FFF4E5' },
};

const getLeaveIcon = (category?: string) => LEAVE_TYPE_ICONS[category ?? 'standard'] ?? LEAVE_TYPE_ICONS.standard;

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
      <TouchableOpacity style={[mStyles.input, { flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
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
                    onPress={() => { if (!isDisabled) { onChange(iso); setOpen(false); } }} activeOpacity={0.7} disabled={isDisabled}>
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
  const [leaveTypes, setLeaveTypes] = useState<DbLeaveType[]>([]); // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = useMemo(() => null, []);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [teamRequests, setTeamRequests] = useState<DbLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');

  // Date range filter
  const today = new Date();
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const lastOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}`;
  const [dateRangeFrom, setDateRangeFrom] = useState('');
  const [dateRangeTo, setDateRangeTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Action menu
  const [actionMenuReq, setActionMenuReq] = useState<DbLeaveRequest | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReq, setEditingReq] = useState<DbLeaveRequest | null>(null);
  const [selType, setSelType] = useState('');
  const [selEmployee, setSelEmployee] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [comment, setComment] = useState('');
  const [expectedHours, setExpectedHours] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const hasChildren = user?.hasChildren ?? false;
  const LEAVE_CATEGORIES: [string, string][] = [['standard', 'Standardowe'], ['special', 'Okolicznościowe'], ['parental', 'Rodzicielskie']];

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<DbLeaveRequest | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const load = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const [reqs, types] = await Promise.all([
      getLeaveRequests(rid, user.id),
      ensureDefaultLeaveTypes(rid),
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
    const firstStandard = leaveTypes.find((lt) => lt.category !== 'parental' || hasChildren || canManage);
    setSelType(firstStandard?.id ?? leaveTypes[0]?.id ?? '');
    setSelEmployee(user?.id ?? '');
    setDateFrom('');
    setDateTo('');
    setComment('');
    setExpectedHours('');
    setShowModal(true);
  };

  const openEdit = (r: DbLeaveRequest) => {
    setEditingReq(r);
    setSelType(r.leave_type_id);
    setSelEmployee(r.employee_id);
    setDateFrom(r.date_from);
    setDateTo(r.date_to);
    setComment(r.comment ?? '');
    setExpectedHours(r.expected_hours != null ? String(r.expected_hours) : '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!dateFrom || !dateTo || !selType) return;
    setFormLoading(true);
    try {
      const days = calcDays(dateFrom, dateTo);
      let ok = false;
      const hours = expectedHours ? parseFloat(expectedHours) : undefined;
      if (editingReq) {
        ok = await updateLeaveRequest(editingReq.id, {
          leave_type_id: selType,
          date_from: dateFrom,
          date_to: dateTo,
          days_count: days,
          comment: comment || undefined,
          expected_hours: hours,
        });
      } else {
        const empId = canManage && selEmployee ? selEmployee : user!.id;
        const created = await createLeaveRequest(rid, empId, {
          leave_type_id: selType,
          date_from: dateFrom,
          date_to: dateTo,
          days_count: days,
          comment: comment || undefined,
          expected_hours: hours,
        });
        ok = !!created;
      }
      if (!ok) {
        Alert.alert('Błąd zapisu', 'Nie udało się złożyć wniosku. Sprawdź uprawnienia i spróbuj ponownie.');
        return;
      }
      setShowModal(false);
      load();
    } catch (e) {
      Alert.alert('Błąd', 'Wystąpił nieoczekiwany błąd.');
    } finally {
      setFormLoading(false);
    }
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

  const applyDateFilter = (list: DbLeaveRequest[]) => {
    if (!dateRangeFrom && !dateRangeTo) return list;
    return list.filter((r) => {
      const from = dateRangeFrom ? r.date_from >= dateRangeFrom : true;
      const to = dateRangeTo ? r.date_to <= dateRangeTo : true;
      return from && to;
    });
  };

  const base = viewMode === 'team' ? teamRequests : requests;
  const statusFiltered = filter === 'all' ? base : base.filter((r) => r.status === filter);
  const displayList = applyDateFilter(statusFiltered);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')} style={styles.backBtn}>
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

      {/* Date range filter bar */}
      <View style={[styles.dateFilterBar, isDesktop && styles.dateFilterBarDesktop]}>
        <TouchableOpacity style={styles.dateRangeBtn} onPress={() => setShowDateFilter((v) => !v)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.dateRangeBtnText}>
            {dateRangeFrom || dateRangeTo
              ? `${dateRangeFrom || '...'} – ${dateRangeTo || '...'}`
              : 'Filtruj po dacie'}
          </Text>
          <Ionicons name={showDateFilter ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textMuted} />
        </TouchableOpacity>
        {(dateRangeFrom || dateRangeTo) && (
          <TouchableOpacity onPress={() => { setDateRangeFrom(''); setDateRangeTo(''); }} style={styles.clearDateBtn}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.filtersInline}>
          {[{ key: 'all', label: 'Wszystkie' }, { key: 'pending', label: 'Oczekujące' }, { key: 'approved', label: 'Zatwierdzone' }, { key: 'rejected', label: 'Odrzucone' }].map((f) => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showDateFilter && (
        <View style={[styles.dateExpandedRow, isDesktop && styles.dateFilterBarDesktop]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateRangeLabel}>Od</Text>
            <CalendarPicker value={dateRangeFrom} onChange={setDateRangeFrom} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateRangeLabel}>Do</Text>
            <CalendarPicker value={dateRangeTo} onChange={setDateRangeTo} minDate={dateRangeFrom || undefined} />
          </View>
        </View>
      )}

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
          const typeObj = leaveTypes.find((lt) => lt.id === r.leave_type_id);
          const leaveIcon = getLeaveIcon(typeObj?.category);
          const reviewerEmp = employees.find((e) => e.id === r.reviewed_by);
          const reviewerName = reviewerEmp ? `${reviewerEmp.first_name} ${reviewerEmp.last_name}` : null;
          const submittedAt = r.created_at ? new Date(r.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

          return (
            <View key={r.id} style={styles.card}>
              {/* Card Header: Avatar + Name + Status + Menu */}
              <View style={styles.cardHeader}>
                <View style={[styles.empAvatar, { backgroundColor: emp?.avatar_color ?? theme.colors.primary }]}>
                  <Text style={styles.empInitials}>
                    {(viewMode === 'team' && empName ? empName : (user?.name ?? ''))
                      .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.empNameBold}>
                    {viewMode === 'team' && empName ? empName : user?.name ?? ''}
                  </Text>
                  <Text style={styles.empJobSub}>{typeObj?.category === 'parental' ? 'Urlop rodzicielski' : typeObj?.category === 'special' ? 'Urlop okolicznościowy' : 'Pracownik'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                <TouchableOpacity onPress={() => setActionMenuReq(r)} style={styles.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Leave type row */}
              <View style={styles.leaveTypeRow}>
                <View style={styles.leaveTypeLeft}>
                  <Text style={styles.leaveTypeLabel}>Rodzaj nieobecności</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={[styles.leaveIconBadge, { backgroundColor: leaveIcon.bg }]}>
                      <Ionicons name={leaveIcon.icon as any} size={13} color={leaveIcon.color} />
                    </View>
                    <Text style={styles.leaveTypeName}>{typeName}</Text>
                  </View>
                </View>
                <View style={styles.leaveTypeRight}>
                  <Text style={styles.leaveTypeLabel}>Okres nieobecności</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} />
                    <Text style={styles.leaveDatesText}>
                      {r.date_from?.split('-').reverse().join('.')} – {r.date_to?.split('-').reverse().join('.')}
                    </Text>
                  </View>
                  <Text style={styles.leaveDayCount}>({r.days_count} {r.days_count === 1 ? 'dzień' : 'dni'})</Text>
                </View>
              </View>

              {/* Submitted at */}
              {submittedAt && (
                <Text style={styles.submittedAt}>Zgłoszono: {submittedAt}</Text>
              )}

              {/* Reviewer info */}
              {r.status === 'approved' && reviewerName && (
                <Text style={styles.reviewerInfo}>Zatwierdził: {reviewerName}</Text>
              )}
              {r.status === 'rejected' && reviewerName && (
                <Text style={[styles.reviewerInfo, { color: theme.colors.error }]}>Odrzucił: {reviewerName}</Text>
              )}

              {r.review_comment ? (
                <View style={styles.reviewRow}>
                  <Ionicons name="chatbubble-outline" size={12} color={theme.colors.primary} />
                  <Text style={styles.cardReview}>{r.review_comment}</Text>
                </View>
              ) : null}

              {/* Approve/Reject actions for managers */}
              {canManage && r.status === 'pending' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionApprove} onPress={() => handleApprove(r)}>
                    <Ionicons name="checkmark" size={13} color={theme.colors.green} />
                    <Text style={styles.actionApproveText}>Zatwierdź</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionReject} onPress={() => { setRejectTarget(r); setRejectComment(''); }}>
                    <Ionicons name="close" size={13} color={theme.colors.error} />
                    <Text style={styles.actionRejectText}>Odrzuć</Text>
                  </TouchableOpacity>
                </View>
              )}
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
              ) : (
                LEAVE_CATEGORIES.map(([cat, catLabel]) => {
                  const items = leaveTypes.filter((lt) => (lt.category ?? 'standard') === cat);
                  if (items.length === 0) return null;
                  const isParental = cat === 'parental';
                  const isLocked = isParental && !hasChildren && !canManage;
                  return (
                    <View key={cat}>
                      <View style={mStyles.catHeader}>
                        <Ionicons
                          name={isParental ? 'people-outline' : cat === 'special' ? 'star-outline' : 'briefcase-outline'}
                          size={13} color={isLocked ? theme.colors.textMuted : theme.colors.primary}
                        />
                        <Text style={[mStyles.catLabel, isLocked && { color: theme.colors.textMuted }]}>{catLabel}</Text>
                        {isLocked && <View style={mStyles.lockBadge}><Ionicons name="lock-closed" size={11} color={theme.colors.textMuted} /><Text style={mStyles.lockText}>Odblokuj w profilu</Text></View>}
                      </View>
                      {items.map((lt) => {
                        const disabled = isLocked;
                        const active = selType === lt.id;
                        const payRate = lt.payment_rate ?? 100;
                        const payColor = payRate === 0 ? '#EF4444' : payRate < 100 ? '#F97316' : '#22C55E';
                        return (
                          <TouchableOpacity
                            key={lt.id}
                            style={[mStyles.optionBtn, active && mStyles.optionActive, disabled && { opacity: 0.4 }]}
                            onPress={() => !disabled && setSelType(lt.id)}
                            disabled={disabled}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[mStyles.optionText, active && mStyles.optionTextActive]}>{lt.name}</Text>
                              <Text style={mStyles.optionSub}>{lt.days_per_year > 0 ? `${lt.days_per_year} dni / rok` : 'Bez limitu'}</Text>
                            </View>
                            <View style={[mStyles.payBadge, { backgroundColor: payColor + '20' }]}>
                              <Text style={[mStyles.payBadgeText, { color: payColor }]}>
                                {payRate === 0 ? 'Bezpłatny' : payRate === 100 ? 'Płatny' : `${payRate}% płatny`}
                              </Text>
                            </View>
                            {active && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} style={{ marginLeft: 6 }} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })
              )}

              <Text style={mStyles.label}>DATA OD</Text>
              <CalendarPicker value={dateFrom} onChange={setDateFrom} />

              <Text style={mStyles.label}>DATA DO</Text>
              <CalendarPicker value={dateTo} onChange={setDateTo} minDate={dateFrom || undefined} />

              {dateFrom && dateTo && new Date(dateTo) >= new Date(dateFrom) && (
                <View style={mStyles.daysPreview}>
                  <Ionicons name="information-circle-outline" size={14} color={theme.colors.primary} />
                  <Text style={mStyles.daysPreviewText}>{calcDays(dateFrom, dateTo)} dni urlopu</Text>
                </View>
              )}

              <Text style={mStyles.label}>OCZEKIWANE GODZINY (opcjonalnie)</Text>
              <TextInput
                style={mStyles.input}
                value={expectedHours}
                onChangeText={setExpectedHours}
                placeholder="np. 8 (godziny odjete z bilansu)"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
              />

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

      {/* Action Menu Modal (⋮) */}
      <Modal visible={!!actionMenuReq} animationType="fade" transparent onRequestClose={() => setActionMenuReq(null)}>
        <TouchableOpacity style={mStyles.overlay} activeOpacity={1} onPress={() => setActionMenuReq(null)}>
          <View style={[mStyles.actionMenuSheet, isDesktop && { maxWidth: 360, alignSelf: 'center' as const }]}>
            <Text style={mStyles.actionMenuTitle}>
              {actionMenuReq ? (leaveTypes.find((lt) => lt.id === actionMenuReq.leave_type_id)?.name ?? 'Wniosek') : ''}
            </Text>
            {actionMenuReq && (() => {
              const r = actionMenuReq;
              const isOwn = r.employee_id === user?.id;
              const canEdit2 = isOwn && r.status === 'pending';
              const canDelete2 = isOwn && (r.status === 'pending' || r.status === 'cancelled');
              return (
                <>
                  <TouchableOpacity style={mStyles.actionMenuItem} onPress={() => { setActionMenuReq(null); }} activeOpacity={0.7}>
                    <Ionicons name="eye-outline" size={18} color={theme.colors.text} />
                    <Text style={mStyles.actionMenuItemText}>Podgląd</Text>
                  </TouchableOpacity>
                  {canEdit2 && (
                    <TouchableOpacity style={mStyles.actionMenuItem} onPress={() => { setActionMenuReq(null); openEdit(r); }} activeOpacity={0.7}>
                      <Ionicons name="pencil-outline" size={18} color={theme.colors.primary} />
                      <Text style={[mStyles.actionMenuItemText, { color: theme.colors.primary }]}>Edytuj</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete2 && (
                    <TouchableOpacity style={mStyles.actionMenuItem} onPress={() => { setActionMenuReq(null); handleDelete(r); }} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      <Text style={[mStyles.actionMenuItemText, { color: theme.colors.error }]}>Usuń</Text>
                    </TouchableOpacity>
                  )}
                  {canManage && r.status === 'pending' && (
                    <>
                      <TouchableOpacity style={mStyles.actionMenuItem} onPress={() => { setActionMenuReq(null); handleApprove(r); }} activeOpacity={0.7}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.green} />
                        <Text style={[mStyles.actionMenuItemText, { color: theme.colors.green }]}>Zatwierdź</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={mStyles.actionMenuItem} onPress={() => { setActionMenuReq(null); setRejectTarget(r); setRejectComment(''); }} activeOpacity={0.7}>
                        <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
                        <Text style={[mStyles.actionMenuItemText, { color: theme.colors.error }]}>Odrzuć</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
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
  // Date filter bar
  dateFilterBar: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  dateFilterBarDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  dateRangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border, alignSelf: 'flex-start' as const },
  dateRangeBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  clearDateBtn: { position: 'absolute', right: 0, top: 0, padding: 4 },
  filtersInline: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' as const, marginTop: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterChipTextActive: { color: theme.colors.white },
  dateExpandedRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  dateRangeLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  // Card redesign
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 12, ...theme.shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  empAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  empInitials: { fontSize: 13, fontWeight: '700', color: theme.colors.white },
  empNameBold: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empJobSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  menuBtn: { padding: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  leaveTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  leaveTypeLeft: { flex: 1 },
  leaveTypeRight: { flex: 1 },
  leaveTypeLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  leaveIconBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  leaveTypeName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  leaveDatesText: { fontSize: 12, color: theme.colors.text, fontWeight: '600' },
  leaveDayCount: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  submittedAt: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 },
  reviewerInfo: { fontSize: 11, fontWeight: '600', color: theme.colors.green, marginBottom: 4 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 4 },
  cardReview: { fontSize: 12, color: theme.colors.primary, flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' as const },
  actionApprove: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 8, backgroundColor: theme.colors.greenLight },
  actionApproveText: { fontSize: 13, fontWeight: '700', color: theme.colors.green },
  actionReject: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 8, backgroundColor: theme.colors.errorLight },
  actionRejectText: { fontSize: 13, fontWeight: '700', color: theme.colors.error },
  // legacy - keep for compatibility
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  empName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardType: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardDates: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  daysBadge: { backgroundColor: theme.colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  daysText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  cardComment: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic', marginBottom: 4 },
  filters: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filtersDesktop: { paddingHorizontal: 32 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.white },
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
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 6 },
  catLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, flex: 1 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: theme.colors.surface, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  lockText: { fontSize: 10, color: theme.colors.textMuted },
  payBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 4 },
  payBadgeText: { fontSize: 10, fontWeight: '700' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  actionMenuSheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  actionMenuTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12, paddingHorizontal: 4 },
  actionMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actionMenuItemText: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
});
