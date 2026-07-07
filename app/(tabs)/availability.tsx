import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import type { RestaurantSettings } from '../../lib/db';
import {
  approveAvailability, getAvailability, getAvailabilityAll,
  getEmployees, getRestaurantSettings, getShifts, setAvailability,
} from '../../lib/db';
import type { DbAvailability, DbProfile, DbShift } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'So', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec',
  'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

type AvailStatus = 'available' | 'partial' | 'unavailable';

const STATUS_CFG: Record<AvailStatus, { bg: string; border: string; text: string; label: string; icon: string }> = {
  available:   { bg: '#E8F8ED', border: '#22C55E', text: '#22C55E', label: 'Dostępny',     icon: 'checkmark-circle' },
  partial:     { bg: '#FFF4E5', border: '#F97316', text: '#F97316', label: 'Częściowo',    icon: 'time' },
  unavailable: { bg: '#FFF0EF', border: '#EF4444', text: '#EF4444', label: 'Niedostępny', icon: 'close-circle' },
};
const EMPTY_CFG = { bg: theme.colors.card, border: theme.colors.border, text: theme.colors.textMuted };

const fmt2 = (n: number) => String(n).padStart(2, '0');

// "10" → "10:00"  |  "830" → "08:30"  |  "1030" → "10:30"  |  "8:0" → "08:00"
function formatTimeInput(raw: string): string {
  const clean = raw.replace(/[^0-9:]/g, '');
  if (clean.includes(':')) {
    const [hPart, mPart] = clean.split(':');
    const h = Math.min(23, parseInt(hPart || '0', 10));
    const m = Math.min(59, parseInt(mPart || '0', 10));
    return `${fmt2(h)}:${fmt2(m)}`;
  }
  const digits = clean.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 2) {
    const h = Math.min(23, parseInt(digits, 10));
    return `${fmt2(h)}:00`;
  }
  if (digits.length === 3) {
    const h = Math.min(23, parseInt(digits[0], 10));
    const m = Math.min(59, parseInt(digits.slice(1), 10));
    return `0${h}:${fmt2(m)}`;
  }
  const h = Math.min(23, parseInt(digits.slice(0, 2), 10));
  const m = Math.min(59, parseInt(digits.slice(2, 4), 10));
  return `${fmt2(h)}:${fmt2(m)}`;
}

const DAY_LABELS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
function formatDayLabel(dayStr: string): string {
  const d = new Date(dayStr + 'T12:00:00');
  const dow = DAY_LABELS[d.getDay()];
  const [, , day] = dayStr.split('-');
  return `${parseInt(day, 10)} — ${dow}`;
}

export default function AvailabilityScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const canManage = isOwner || isManager;
  const rid = user?.restaurantId ?? '';
  const uid = user?.id ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`;
  });
  const [year, month] = currentMonth.split('-').map(Number);

  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [selEmpId, setSelEmpId] = useState(uid);

  const [data, setData] = useState<DbAvailability[]>([]);
  const [allData, setAllData] = useState<DbAvailability[]>([]);
  const [shifts, setShifts] = useState<DbShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [rs, setRs] = useState<RestaurantSettings | null>(null);

  // Day modal state
  const [dayModal, setDayModal] = useState<{ day: string } | null>(null);
  const [modalStatus, setModalStatus] = useState<AvailStatus>('available');
  const [modalStart, setModalStart] = useState('08:00');
  const [modalEnd, setModalEnd] = useState('16:00');
  const [modalSaving, setModalSaving] = useState(false);

  const [viewMode, setViewMode] = useState<'calendar' | 'team' | 'pending'>('calendar');

  const loadData = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const empId = canManage ? selEmpId : uid;
    const [avail, emps, allAvail, allShifts, settings] = await Promise.all([
      getAvailability(rid, empId, currentMonth),
      canManage ? getEmployees(rid) : Promise.resolve([]),
      canManage ? getAvailabilityAll(rid, currentMonth) : Promise.resolve([]),
      getShifts(rid),
      getRestaurantSettings(rid),
    ]);
    setData(avail);
    setShifts(allShifts);
    setRs(settings);
    if (canManage) { setEmployees(emps); setAllData(allAvail); }
    setLoading(false);
  }, [rid, user, currentMonth, selEmpId]);

  useEffect(() => { loadData(); }, [loadData]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const getShiftsOnDay = (day: string, empId?: string): DbShift[] =>
    shifts.filter(s => s.day === day && (!empId || s.employee_id === empId));

  const isAlwaysAvailable = (empId?: string): boolean => {
    if (!rs) return false;
    const targetId = empId ?? selEmpId;
    const emp = employees.find(e => e.id === targetId);
    const et: string = emp
      ? ((emp as any).employment_type ?? '')
      : (targetId === uid ? (user?.employmentType ?? '') : '');
    if ((et === 'full_time' || et === 'part_time') && rs.availability_contract_all_available) return true;
    if ((et === 'contract' || et === 'freelance' || et === 'b2b' || et === 'zlecenie') && rs.availability_freelance_all_available) return true;
    return false;
  };

  const getDayRecord = (day: string, empId?: string): DbAvailability | undefined => {
    const src = empId ? allData : data;
    return src.find(d => d.day === day && (empId ? d.employee_id === empId : true));
  };

  const getStatus = (day: string, empId?: string): AvailStatus | null => {
    // Explicit DB record always wins — even for "always available" employees
    const rec = getDayRecord(day, empId);
    if (rec) return rec.status as AvailStatus;
    // No record: fall back to the always-available default
    if (isAlwaysAvailable(empId)) return 'available';
    return null;
  };

  const openDayModal = (dayStr: string) => {
    const rec = getDayRecord(dayStr);
    const st = getStatus(dayStr);
    setModalStatus(st ?? 'available');
    setModalStart(rec?.slot1_start ?? '08:00');
    setModalEnd(rec?.slot1_end ?? '16:00');
    setDayModal({ day: dayStr });
  };

  const handleModalSave = async () => {
    if (!dayModal) return;
    const empId = canManage ? selEmpId : uid;
    const requiresApproval = !!rs?.availability_require_manager_approval && !canManage;
    const approvalStatus = canManage ? 'approved' : (requiresApproval ? 'pending' : 'approved');
    setModalSaving(true);
    const slots = modalStatus === 'partial'
      ? { slot1_start: formatTimeInput(modalStart), slot1_end: formatTimeInput(modalEnd) }
      : {};
    const ok = await setAvailability(rid, empId, dayModal.day, modalStatus, slots, approvalStatus);
    setModalSaving(false);
    if (!ok) {
      Alert.alert('Błąd', 'Nie udało się zapisać dyspozycyjności. Sprawdź połączenie i spróbuj ponownie.');
      return;
    }
    if (requiresApproval) {
      Alert.alert('Wysłano', 'Dyspozycyjność wysłana do zatwierdzenia przez managera.');
    }
    setDayModal(null);
    loadData();
  };

  const handleDeleteDay = async () => {
    if (!dayModal) return;
    const empId = canManage ? selEmpId : uid;
    setModalSaving(true);
    // Save as unavailable to clear the record
    const ok = await setAvailability(rid, empId, dayModal.day, 'unavailable', {}, 'approved');
    setModalSaving(false);
    if (!ok) {
      Alert.alert('Błąd', 'Nie udało się usunąć dyspozycyjności.');
      return;
    }
    setDayModal(null);
    loadData();
  };

  const handleApprove = async (avail: DbAvailability, approved: boolean) => {
    const ok = await approveAvailability(avail.id, approved);
    if (ok) {
      loadData();
    } else {
      Alert.alert('Błąd', 'Nie udało się zaktualizować statusu zatwierdzenia.');
    }
  };

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${fmt2(today.getMonth() + 1)}-${fmt2(today.getDate())}`;

  const selectedEmp = employees.find(e => e.id === selEmpId);
  const pendingApprovals = allData.filter(a => a.approval_status === 'pending');

  const empName = (empId: string) => {
    const e = employees.find(e => e.id === empId);
    return e ? `${e.first_name} ${e.last_name}` : empId;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dyspozycyjność</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Manager tabs */}
      {canManage && (
        <View style={[s.tabRow, isDesktop && s.tabRowDesktop]}>
          {(['calendar', 'team', 'pending'] as const).map(m => (
            <TouchableOpacity key={m} style={[s.tab, viewMode === m && s.tabActive]} onPress={() => setViewMode(m)}>
              <Ionicons
                name={m === 'calendar' ? 'calendar-outline' : m === 'team' ? 'people-outline' : 'checkmark-done-outline'}
                size={14}
                color={viewMode === m ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[s.tabText, viewMode === m && s.tabTextActive]}>
                {m === 'calendar' ? 'Edycja' : m === 'team' ? 'Zespół' : 'Do zatwierdzenia'}
              </Text>
              {m === 'pending' && pendingApprovals.length > 0 && (
                <View style={s.badge}><Text style={s.badgeText}>{pendingApprovals.length}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Employee picker (calendar mode, managers) */}
      {canManage && viewMode === 'calendar' && employees.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.empScroll, isDesktop && s.empScrollDesktop]}>
          {employees.map(e => {
            const active = selEmpId === e.id;
            return (
              <TouchableOpacity key={e.id} style={[s.empChip, active && s.empChipActive]} onPress={() => setSelEmpId(e.id)} activeOpacity={0.75}>
                <View style={[s.empAvatar, { backgroundColor: active ? theme.colors.primary : e.avatar_color }]}>
                  <Text style={s.empInitials}>{(e.first_name[0] + e.last_name[0]).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[s.empName, active && { color: theme.colors.primary }]}>{e.first_name}</Text>
                  <Text style={s.empJob}>{e.job_title}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}
      >
        {/* Month nav */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.monthArrow}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.monthArrow}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ── PENDING APPROVALS TAB ── */}
        {canManage && viewMode === 'pending' ? (
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
          ) : pendingApprovals.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.textMuted} />
              <Text style={s.emptyText}>Brak oczekujących zatwierdzeń</Text>
            </View>
          ) : (
            pendingApprovals.map(avail => {
              const cfg = STATUS_CFG[avail.status as AvailStatus] ?? STATUS_CFG.available;
              return (
                <View key={avail.id} style={s.pendingCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.pendingEmp}>{empName(avail.employee_id)}</Text>
                    <Text style={s.pendingDay}>{formatDayLabel(avail.day)}</Text>
                    <View style={[s.pill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                      <Ionicons name={cfg.icon as any} size={12} color={cfg.text} />
                      <Text style={[s.pillText, { color: cfg.text }]}>{cfg.label}</Text>
                      {avail.slot1_start && avail.slot1_end && (
                        <Text style={[s.pillText, { color: cfg.text }]}> · {avail.slot1_start}–{avail.slot1_end}</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#22C55E' }]} onPress={() => handleApprove(avail, true)} activeOpacity={0.8}>
                      <Ionicons name="checkmark" size={15} color="#fff" />
                      <Text style={s.approveBtnText}>Zatwierdź</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleApprove(avail, false)} activeOpacity={0.8}>
                      <Ionicons name="close" size={15} color="#fff" />
                      <Text style={s.approveBtnText}>Odrzuć</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )

        ) : canManage && viewMode === 'team' ? (
          /* ── TEAM OVERVIEW TABLE ── */
          loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} /> : (
            <View>
              <View style={s.teamHeaderRow}>
                <View style={s.teamNameCol} />
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const dayStr = `${year}-${fmt2(month)}-${fmt2(d)}`;
                  return (
                    <View key={d} style={[s.teamDayCol, dayStr === todayStr && s.teamDayColToday]}>
                      <Text style={[s.teamDayNum, dayStr === todayStr && { color: theme.colors.primary }]}>{d}</Text>
                    </View>
                  );
                })}
              </View>
              {employees.map(emp => (
                <View key={emp.id} style={s.teamRow}>
                  <View style={s.teamNameCol}>
                    <View style={[s.empAvatarSm, { backgroundColor: emp.avatar_color }]}>
                      <Text style={s.empInitialsSm}>{emp.first_name[0]}</Text>
                    </View>
                    <Text style={s.teamEmpName} numberOfLines={1}>{emp.first_name}</Text>
                  </View>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                    const dayStr = `${year}-${fmt2(month)}-${fmt2(d)}`;
                    const st = getStatus(dayStr, emp.id);
                    const cfg = st ? STATUS_CFG[st] : EMPTY_CFG;
                    const dayAvail = allData.find(a => a.employee_id === emp.id && a.day === dayStr);
                    const isPending = dayAvail?.approval_status === 'pending';
                    return (
                      <View key={d} style={[s.teamDayCol, { backgroundColor: (cfg as any).bg ?? theme.colors.card }]}>
                        <View style={[s.teamDot, { backgroundColor: isPending ? '#F97316' : (cfg as any).text }]} />
                        {isPending && <View style={s.teamPendingDot} />}
                        {getShiftsOnDay(dayStr, emp.id).length > 0 && <View style={s.teamShiftDot} />}
                      </View>
                    );
                  })}
                </View>
              ))}
              {employees.length === 0 && (
                <Text style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 30 }}>Brak pracowników</Text>
              )}
            </View>
          )

        ) : (
          /* ── CALENDAR EDIT MODE ── */
          <>
            {/* Legend */}
            <View style={s.legend}>
              {(Object.entries(STATUS_CFG) as [AvailStatus, typeof STATUS_CFG[AvailStatus]][]).map(([key, cfg]) => (
                <View key={key} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: cfg.text }]} />
                  <Text style={s.legendText}>{cfg.label}</Text>
                </View>
              ))}
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={s.legendText}>Zmiana</Text>
              </View>
            </View>

            {canManage && selectedEmp && (
              <View style={s.editingBanner}>
                <Ionicons name="person-circle-outline" size={16} color={theme.colors.primary} />
                <Text style={s.editingBannerText}>Edytujesz: {selectedEmp.first_name} {selectedEmp.last_name}</Text>
              </View>
            )}

            {!canManage && rs?.availability_require_manager_approval && (
              <View style={s.infoBanner}>
                <Ionicons name="information-circle-outline" size={15} color="#D97706" />
                <Text style={s.infoText}>Dyspozycyjność wymaga zatwierdzenia przez managera</Text>
              </View>
            )}

            {loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
            ) : (
              <>
                <View style={s.weekRow}>
                  {DAY_NAMES.map(d => <Text key={d} style={s.dayHeader}>{d}</Text>)}
                </View>

                {Array.from({ length: cells.length / 7 }, (_, week) => (
                  <View key={week} style={s.weekRow}>
                    {cells.slice(week * 7, week * 7 + 7).map((day, idx) => {
                      if (day === null) return <View key={idx} style={s.dayCell} />;
                      const dayStr = `${year}-${fmt2(month)}-${fmt2(day)}`;
                      const st = getStatus(dayStr);
                      const rec = getDayRecord(dayStr);
                      const cfg = st ? STATUS_CFG[st] : null;
                      const isToday = dayStr === todayStr;
                      const isPending = rec?.approval_status === 'pending';
                      const isRejected = rec?.approval_status === 'rejected';
                      const bg = cfg?.bg ?? EMPTY_CFG.bg;
                      const border = isPending ? '#F97316' : isRejected ? '#EF4444' : isToday ? theme.colors.primary : (cfg?.border ?? EMPTY_CFG.border);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[s.dayCell, { backgroundColor: bg, borderWidth: isToday ? 2 : 1, borderColor: border }]}
                          onPress={() => openDayModal(dayStr)}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.dayNum, { color: cfg?.text ?? EMPTY_CFG.text }, isToday && s.dayNumToday]}>{day}</Text>
                          {st && <View style={[s.statusDot, { backgroundColor: cfg!.text }]} />}
                          {isPending && <Text style={s.miniLabel}>⏳</Text>}
                          {isRejected && <Text style={[s.miniLabel, { color: '#EF4444' }]}>✗</Text>}
                          {getShiftsOnDay(dayStr, canManage ? selEmpId : uid).map(sh => (
                            <View key={sh.id} style={s.shiftChip}>
                              <Text style={s.shiftChipText} numberOfLines={1}>{sh.start_time.slice(0, 5)}</Text>
                            </View>
                          ))}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                <View style={s.tapHint}>
                  <Ionicons name="hand-left-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={s.tapHintText}>Kliknij dzień, aby ustawić dyspozycyjność</Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ── DAY MODAL ── */}
      <Modal visible={!!dayModal} animationType="slide" transparent onRequestClose={() => setDayModal(null)}>
        <View style={m.overlay}>
          <View style={m.sheet}>
            {/* Header */}
            <View style={m.mHeader}>
              <Text style={m.mTitle}>Dyspozycyjność</Text>
              <TouchableOpacity onPress={() => setDayModal(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
              {/* Date label */}
              <Text style={m.dateLabel}>{dayModal ? formatDayLabel(dayModal.day) : ''}</Text>

              {/* Status selection */}
              <Text style={m.sectionLabel}>STATUS</Text>
              <View style={m.statusRow}>
                {(Object.entries(STATUS_CFG) as [AvailStatus, typeof STATUS_CFG[AvailStatus]][]).map(([key, cfg]) => {
                  const active = modalStatus === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[m.statusCard, { borderColor: active ? cfg.border : theme.colors.border, backgroundColor: active ? cfg.bg : theme.colors.background }]}
                      onPress={() => setModalStatus(key)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={cfg.icon as any} size={22} color={active ? cfg.text : theme.colors.textMuted} />
                      <Text style={[m.statusCardText, { color: active ? cfg.text : theme.colors.textMuted }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time inputs — only for partial */}
              {modalStatus === 'partial' && (
                <>
                  <Text style={m.sectionLabel}>GODZINY</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={m.inputLabel}>OD</Text>
                      <TextInput
                        style={m.input}
                        value={modalStart}
                        onChangeText={setModalStart}
                        onBlur={() => setModalStart(formatTimeInput(modalStart) || '08:00')}
                        placeholder="08:00"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="numeric"
                        returnKeyType="next"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={m.inputLabel}>DO</Text>
                      <TextInput
                        style={m.input}
                        value={modalEnd}
                        onChangeText={setModalEnd}
                        onBlur={() => setModalEnd(formatTimeInput(modalEnd) || '16:00')}
                        placeholder="16:00"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                  <Text style={m.inputHint}>Wpisz np. "8" → 08:00, "1030" → 10:30</Text>
                </>
              )}

              {/* Save */}
              <TouchableOpacity style={m.saveBtn} onPress={handleModalSave} disabled={modalSaving} activeOpacity={0.85}>
                {modalSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={m.saveBtnText}>
                      {(!canManage && rs?.availability_require_manager_approval) ? 'Wyślij do zatwierdzenia' : 'Zapisz'}
                    </Text>
                }
              </TouchableOpacity>

              {/* Clear button */}
              {getDayRecord(dayModal?.day ?? '') && (
                <TouchableOpacity style={m.clearBtn} onPress={handleDeleteDay} disabled={modalSaving} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={14} color={theme.colors.textMuted} />
                  <Text style={m.clearBtnText}>Usuń dyspozycyjność</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },

  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, gap: 8, flexWrap: 'wrap' },
  tabRowDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  tabActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary },
  badge: { backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  empScroll: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  empScrollDesktop: { paddingHorizontal: 32 },
  empChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card, borderRadius: 10, padding: 8, borderWidth: 1.5, borderColor: theme.colors.border },
  empChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  empAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 11, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  empJob: { fontSize: 10, color: theme.colors.textMuted },

  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12 },
  monthArrow: { padding: 6 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: theme.colors.text },

  legend: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, color: theme.colors.textSecondary },

  editingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  editingBannerText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF4E5', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#F97316' },
  infoText: { fontSize: 12, fontWeight: '600', color: '#D97706', flex: 1 },

  weekRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, paddingVertical: 4 },
  dayCell: { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden' },
  dayNum: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  dayNumToday: { fontWeight: '800' },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  miniLabel: { fontSize: 8 },
  shiftChip: { backgroundColor: theme.colors.primary + '22', borderRadius: 3, paddingHorizontal: 2, paddingVertical: 1, width: '90%' },
  shiftChipText: { fontSize: 7, fontWeight: '700', color: theme.colors.primary, textAlign: 'center' },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  tapHintText: { fontSize: 11, color: theme.colors.textMuted },

  // Team view
  teamHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  teamRow: { flexDirection: 'row', marginBottom: 3, alignItems: 'center' },
  teamNameCol: { width: 60, flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4 },
  teamDayCol: { flex: 1, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 3, marginHorizontal: 1, backgroundColor: theme.colors.card },
  teamDayColToday: { borderWidth: 1.5, borderColor: theme.colors.primary },
  teamDayNum: { fontSize: 9, fontWeight: '700', color: theme.colors.textMuted },
  teamDot: { width: 6, height: 6, borderRadius: 3 },
  teamPendingDot: { position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#F97316' },
  teamShiftDot: { position: 'absolute', bottom: 2, right: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.primary },
  teamEmpName: { fontSize: 10, fontWeight: '600', color: theme.colors.text, flex: 1 },
  empAvatarSm: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  empInitialsSm: { fontSize: 8, fontWeight: '700', color: theme.colors.white },

  // Pending approvals
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: theme.colors.textMuted },
  pendingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F97316' },
  pendingEmp: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  pendingDay: { fontSize: 12, color: theme.colors.textMuted },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2 },
  pillText: { fontSize: 11, fontWeight: '600' },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },

  dateLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text, textTransform: 'capitalize' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.8, marginBottom: -8 },

  statusRow: { flexDirection: 'row', gap: 8 },
  statusCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 2, paddingVertical: 14 },
  statusCardText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  inputLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 14,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  inputHint: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: -8 },

  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  clearBtnText: { fontSize: 13, color: theme.colors.textMuted },
});
