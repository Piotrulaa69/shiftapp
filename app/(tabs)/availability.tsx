import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import type { RestaurantSettings } from '../../lib/db';
import { approveAvailability, getAvailability, getAvailabilityAll, getEmployees, getRestaurantSettings, getShifts, setAvailability } from '../../lib/db';
import type { DbAvailability, DbProfile, DbShift } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'So', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
  available:   { bg: '#E8F8ED', border: '#22C55E', text: '#22C55E', label: 'Dostępny',     icon: 'checkmark-circle' },
  partial:     { bg: '#FFF4E5', border: '#F97316', text: '#F97316', label: 'Częściowo',    icon: 'time' },
  unavailable: { bg: '#FFF0EF', border: '#EF4444', text: '#EF4444', label: 'Niedostępny', icon: 'close-circle' },
  none:        { bg: theme.colors.card, border: theme.colors.border, text: theme.colors.textMuted, label: 'Nie zaznaczono', icon: 'ellipse-outline' },
};

type AvailStatus = 'available' | 'partial' | 'unavailable' | 'none';
const STATUS_CYCLE: AvailStatus[] = ['available', 'partial', 'unavailable', 'none'];

const fmt2 = (n: number) => String(n).padStart(2, '0');

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
  const [saving, setSaving] = useState(false);
  const [rs, setRs] = useState<RestaurantSettings | null>(null);

  // Pending changes: day -> status
  const [changes, setChanges] = useState<Record<string, AvailStatus>>({});

  // Slot modal for 'partial'
  const [slotModal, setSlotModal] = useState<{ day: string } | null>(null);
  const [slot1Start, setSlot1Start] = useState('');
  const [slot1End, setSlot1End] = useState('');

  // View mode
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
    setChanges({});
    setLoading(false);
  }, [rid, user, currentMonth, selEmpId]);

  useEffect(() => { loadData(); }, [loadData]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const getShiftsOnDay = (day: string, empId?: string): DbShift[] =>
    shifts.filter((s) => s.day === day && (!empId || s.employee_id === empId));

  const isAlwaysAvailable = (empId?: string): boolean => {
    if (!rs) return false;
    const targetId = empId ?? selEmpId;
    const emp = employees.find(e => e.id === targetId);
    const et: string = emp
      ? ((emp as any).employment_type ?? '')
      : (targetId === uid ? (user?.employmentType ?? '') : '');
    const isContract = et === 'full_time' || et === 'part_time';
    const isFreelance = et === 'contract' || et === 'freelance' || et === 'b2b' || et === 'zlecenie';
    if (isContract && rs.availability_contract_all_available) return true;
    if (isFreelance && rs.availability_freelance_all_available) return true;
    return false;
  };

  // Checks local changes FIRST so toggling always reflects immediately,
  // even for employees marked as always-available in settings.
  const getStatus = (day: string, empId?: string): AvailStatus => {
    if (!empId && changes[day]) return changes[day];
    if (isAlwaysAvailable(empId)) return 'available';
    const src = empId ? allData : data;
    const found = src.find((d) => d.day === day && (empId ? d.employee_id === empId : true));
    if (!found) return 'none';
    return found.status as AvailStatus;
  };

  const getApprovalStatus = (day: string): DbAvailability['approval_status'] | null => {
    const found = data.find((d) => d.day === day);
    return found?.approval_status ?? null;
  };

  const toggleDay = (dayStr: string) => {
    const current = getStatus(dayStr);
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    if (next === 'partial') {
      const found = data.find((d) => d.day === dayStr);
      setSlot1Start(found?.slot1_start ?? '08:00');
      setSlot1End(found?.slot1_end ?? '16:00');
      setSlotModal({ day: dayStr });
    }
    setChanges((prev) => ({ ...prev, [dayStr]: next }));
  };

  const savePartialSlots = () => {
    if (!slotModal) return;
    setSlotModal(null);
  };

  const requiresApproval = !!rs?.availability_require_manager_approval && !canManage;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const empId = canManage ? selEmpId : uid;
      // Managers saving for employees always mark as approved
      const approvalStatus = canManage ? 'approved' : (requiresApproval ? 'pending' : 'approved');
      for (const [day, status] of Object.entries(changes)) {
        const isPartial = status === 'partial';
        const ok = await setAvailability(
          rid, empId, day,
          status === 'none' ? 'unavailable' : status,
          isPartial ? { slot1_start: slot1Start || undefined, slot1_end: slot1End || undefined } : undefined,
          approvalStatus,
        );
        if (!ok) {
          Alert.alert('Błąd zapisu', 'Nie udało się zapisać dyspozycyjności. Sprawdź uprawnienia i spróbuj ponownie.');
          return;
        }
      }
      if (requiresApproval && Object.keys(changes).length > 0) {
        Alert.alert('Wysłano do zatwierdzenia', 'Twoja dyspozycyjność została wysłana do managera.');
      }
      loadData();
    } catch {
      Alert.alert('Błąd', 'Wystąpił nieoczekiwany błąd.');
    } finally {
      setSaving(false);
    }
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

  const selectedEmp = employees.find((e) => e.id === selEmpId);

  // Pending approvals for the current month
  const pendingApprovals = allData.filter(a => a.approval_status === 'pending');
  const pendingCount = pendingApprovals.length;

  const empName = (empId: string) => {
    const e = employees.find(e => e.id === empId);
    return e ? `${e.first_name} ${e.last_name}` : empId;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dyspozycyjność</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Manager view toggle */}
      {canManage && (
        <View style={[styles.modeRow, isDesktop && styles.modeRowDesktop]}>
          {(['calendar', 'team', 'pending'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, viewMode === m && styles.modeBtnActive]}
              onPress={() => setViewMode(m)}
            >
              <Ionicons
                name={m === 'calendar' ? 'calendar-outline' : m === 'team' ? 'people-outline' : 'checkmark-done-outline'}
                size={14}
                color={viewMode === m ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[styles.modeBtnText, viewMode === m && styles.modeBtnTextActive]}>
                {m === 'calendar' ? 'Edycja' : m === 'team' ? 'Zespół' : 'Do zatwierdzenia'}
              </Text>
              {m === 'pending' && pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Employee picker for managers (calendar mode) */}
      {canManage && viewMode === 'calendar' && employees.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.empScroll, isDesktop && styles.empScrollDesktop]}>
          {employees.map((e) => {
            const active = selEmpId === e.id;
            return (
              <TouchableOpacity key={e.id} style={[styles.empChip, active && styles.empChipActive]} onPress={() => setSelEmpId(e.id)} activeOpacity={0.75}>
                <View style={[styles.empAvatar, { backgroundColor: active ? theme.colors.primary : e.avatar_color }]}>
                  <Text style={styles.empInitials}>{(e.first_name[0] + e.last_name[0]).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[styles.empName, active && { color: theme.colors.primary }]}>{e.first_name}</Text>
                  <Text style={styles.empJob}>{e.job_title}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        style={isDesktop ? { width: '100%' } : undefined}
      >
        {/* ── Pending approvals tab ── */}
        {canManage && viewMode === 'pending' ? (
          <View>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{MONTHS[month - 1]} {year}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
            ) : pendingApprovals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>Brak oczekujących zatwierdzeń</Text>
              </View>
            ) : (
              pendingApprovals.map((avail) => {
                const statusColor = STATUS_COLORS[avail.status] ?? STATUS_COLORS.none;
                return (
                  <View key={avail.id} style={styles.pendingCard}>
                    <View style={styles.pendingCardLeft}>
                      <Text style={styles.pendingEmpName}>{empName(avail.employee_id)}</Text>
                      <Text style={styles.pendingDay}>{avail.day}</Text>
                      <View style={[styles.statusPill, { backgroundColor: statusColor.bg, borderColor: statusColor.border }]}>
                        <Ionicons name={statusColor.icon as any} size={12} color={statusColor.text} />
                        <Text style={[styles.statusPillText, { color: statusColor.text }]}>{statusColor.label}</Text>
                        {avail.slot1_start && avail.slot1_end && (
                          <Text style={[styles.statusPillText, { color: statusColor.text }]}>
                            {' '}· {avail.slot1_start}–{avail.slot1_end}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.pendingActions}>
                      <TouchableOpacity
                        style={[styles.approveBtn, { backgroundColor: '#22C55E' }]}
                        onPress={() => handleApprove(avail, true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.approveBtnText}>Zatwierdź</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.approveBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleApprove(avail, false)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.approveBtnText}>Odrzuć</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <>
            {/* Month nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{MONTHS[month - 1]} {year}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {[...Object.entries(STATUS_COLORS).filter(([k]) => k !== 'none'), ['shift', { text: theme.colors.primary, label: 'Zaplanowana zmiana' }]].map(([key, val]: any) => (
                <View key={key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: val.text }]} />
                  <Text style={styles.legendText}>{val.label}</Text>
                </View>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
            ) : viewMode === 'team' && canManage ? (
              /* ── Team overview table ── */
              <View>
                <View style={styles.teamHeaderRow}>
                  <View style={styles.teamNameCol} />
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const dayStr = `${year}-${fmt2(month)}-${fmt2(d)}`;
                    const isToday = dayStr === todayStr;
                    return (
                      <View key={d} style={[styles.teamDayCol, isToday && styles.teamDayColToday]}>
                        <Text style={[styles.teamDayNum, isToday && { color: theme.colors.primary }]}>{d}</Text>
                      </View>
                    );
                  })}
                </View>
                {employees.map((emp) => (
                  <View key={emp.id} style={styles.teamRow}>
                    <View style={styles.teamNameCol}>
                      <View style={[styles.empAvatarSm, { backgroundColor: emp.avatar_color }]}>
                        <Text style={styles.empInitialsSm}>{emp.first_name[0]}</Text>
                      </View>
                      <Text style={styles.teamEmpName} numberOfLines={1}>{emp.first_name}</Text>
                    </View>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                      const dayStr = `${year}-${fmt2(month)}-${fmt2(d)}`;
                      const st = getStatus(dayStr, emp.id);
                      const c = STATUS_COLORS[st];
                      const dayAvail = allData.find(a => a.employee_id === emp.id && a.day === dayStr);
                      const isPending = dayAvail?.approval_status === 'pending';
                      return (
                        <View key={d} style={[styles.teamDayCol, { backgroundColor: c.bg }]}>
                          <View style={[styles.teamDot, { backgroundColor: isPending ? '#F97316' : c.text }]} />
                          {isPending && <View style={styles.teamPendingDot} />}
                          {getShiftsOnDay(dayStr, emp.id).length > 0 && (
                            <View style={styles.teamShiftDot} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
                {employees.length === 0 && (
                  <Text style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 30 }}>Brak pracowników</Text>
                )}
              </View>
            ) : (
              /* ── Calendar edit mode ── */
              <>
                {canManage && selectedEmp && (
                  <View style={styles.editingBanner}>
                    <Ionicons name="person-circle-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.editingBannerText}>Edytujesz: {selectedEmp.first_name} {selectedEmp.last_name}</Text>
                  </View>
                )}

                {/* Info for employees when approval is required */}
                {!canManage && requiresApproval && (
                  <View style={styles.approvalInfoBanner}>
                    <Ionicons name="information-circle-outline" size={15} color="#D97706" />
                    <Text style={styles.approvalInfoText}>Twoja dyspozycyjność wymaga zatwierdzenia przez managera</Text>
                  </View>
                )}

                <View style={styles.weekRow}>
                  {DAY_NAMES.map((d) => <Text key={d} style={styles.dayHeader}>{d}</Text>)}
                </View>

                {Array.from({ length: cells.length / 7 }, (_, week) => (
                  <View key={week} style={styles.weekRow}>
                    {cells.slice(week * 7, week * 7 + 7).map((day, idx) => {
                      if (day === null) return <View key={idx} style={styles.dayCell} />;
                      const dayStr = `${year}-${fmt2(month)}-${fmt2(day)}`;
                      const st = getStatus(dayStr);
                      const colors = STATUS_COLORS[st];
                      const isToday = dayStr === todayStr;
                      const approvalSt = changes[dayStr] ? null : getApprovalStatus(dayStr);
                      const isPending = approvalSt === 'pending';
                      const isRejected = approvalSt === 'rejected';
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.dayCell,
                            {
                              backgroundColor: colors.bg,
                              borderWidth: isToday ? 2 : 1,
                              borderColor: isPending ? '#F97316' : isRejected ? '#EF4444' : isToday ? theme.colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => toggleDay(dayStr)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dayNum, { color: colors.text }, isToday && { fontWeight: '800' }]}>{day}</Text>
                          {st !== 'none' && (
                            <View style={[styles.statusDot, { backgroundColor: colors.text }]} />
                          )}
                          {isPending && <Text style={styles.pendingLabel}>⏳</Text>}
                          {isRejected && <Text style={styles.pendingLabel}>✗</Text>}
                          {getShiftsOnDay(dayStr, canManage ? selEmpId : uid).map((s) => (
                            <View key={s.id} style={styles.shiftChip}>
                              <Text style={styles.shiftChipText} numberOfLines={1}>{s.start_time.slice(0, 5)}</Text>
                            </View>
                          ))}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                <View style={styles.tapHint}>
                  <Ionicons name="information-circle-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.tapHintText}>Klikaj w dzień, aby cyklicznie zmieniać status</Text>
                </View>

                {Object.keys(changes).length > 0 && (
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
                    {saving
                      ? <ActivityIndicator color={theme.colors.white} />
                      : <Text style={styles.saveBtnText}>
                          {requiresApproval
                            ? `Wyślij do zatwierdzenia (${Object.keys(changes).length})`
                            : `Zapisz zmiany (${Object.keys(changes).length})`}
                        </Text>
                    }
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Slot modal for partial */}
      <Modal visible={!!slotModal} animationType="fade" transparent onRequestClose={() => setSlotModal(null)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Dostępność częściowa</Text>
              <TouchableOpacity onPress={() => setSlotModal(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>{slotModal?.day}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.label}>OD</Text>
                  <TextInput style={mStyles.input} value={slot1Start} onChangeText={setSlot1Start} placeholder="08:00" placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.label}>DO</Text>
                  <TextInput style={mStyles.input} value={slot1End} onChangeText={setSlot1End} placeholder="16:00" placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>
              <TouchableOpacity style={mStyles.saveBtn} onPress={savePartialSlots}>
                <Text style={mStyles.saveBtnText}>Zatwierdź godziny</Text>
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
  modeRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, gap: 8, flexWrap: 'wrap' },
  modeRowDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  modeBtnActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  modeBtnTextActive: { color: theme.colors.primary },
  pendingBadge: { backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  pendingBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
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
  legend: { flexDirection: 'row', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, color: theme.colors.textSecondary },
  editingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  editingBannerText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  approvalInfoBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF4E5', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#F97316' },
  approvalInfoText: { fontSize: 12, fontWeight: '600', color: '#D97706', flex: 1 },
  weekRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, paddingVertical: 4 },
  dayCell: { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayNum: { fontSize: 13, fontWeight: '600' },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  pendingLabel: { fontSize: 8 },
  shiftChip: { backgroundColor: theme.colors.primary + '22', borderRadius: 3, paddingHorizontal: 2, paddingVertical: 1, marginTop: 1, width: '90%' },
  shiftChipText: { fontSize: 7, fontWeight: '700', color: theme.colors.primary, textAlign: 'center' },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, marginBottom: 4 },
  tapHintText: { fontSize: 11, color: theme.colors.textMuted },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  // Team view
  teamHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  teamRow: { flexDirection: 'row', marginBottom: 3, alignItems: 'center' },
  teamNameCol: { width: 60, flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4 },
  teamDayCol: { flex: 1, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 3, marginHorizontal: 1 },
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
  pendingCardLeft: { flex: 1, gap: 4 },
  pendingEmpName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  pendingDay: { fontSize: 12, color: theme.colors.textMuted },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  pendingActions: { flexDirection: 'column', gap: 6, marginLeft: 10 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
});
