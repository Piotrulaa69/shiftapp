import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TeamSkeleton } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { getEmployees, getPointsForEmployee, updateProfile } from '../../lib/db';
import type { DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const ROLE_LABELS: Record<string, string> = { owner: 'Właściciel', manager: 'Manager', employee: 'Pracownik' };
const EMP_TYPE_LABELS: Record<string, string> = { full_time: 'Pełny etat', part_time: 'Część etatu', contract: 'Umowa zlecenie' };

export default function TeamScreen() {
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';
  const isManager = user?.role === 'owner' || user?.role === 'manager';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<DbProfile | null>(null);
  const [empPoints, setEmpPoints] = useState<number>(0);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmpType, setEditEmpType] = useState<'full_time' | 'part_time' | 'contract'>('full_time');
  const [editMinWeekly, setEditMinWeekly] = useState('');
  const [editMaxWeekly, setEditMaxWeekly] = useState('');
  const [editMinMonthly, setEditMinMonthly] = useState('');
  const [editMaxMonthly, setEditMaxMonthly] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // Leave quota state
  const [leaveTypes, setLeaveTypes] = useState<DbLeaveType[]>([]);
  const [leaveSettings, setLeaveSettings] = useState<DbEmployeeLeaveTypeSetting[]>([]);
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);
  // local editable leave config: { [leaveTypeId]: { days: string, periodStart: string, periodEnd: string } }
  const [leaveEdits, setLeaveEdits] = useState<Record<string, { days: string; periodStart: string; periodEnd: string }>>({});

  const loadTeam = useCallback(async () => {
    if (!rid) return;
    const data = await getEmployees(rid);
    setEmployees(data);
  }, [rid]);

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    loadTeam().then(() => setLoading(false));
  }, [rid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTeam();
    setRefreshing(false);
  }, [loadTeam]);

  const openProfile = async (emp: DbProfile) => {
    setSelectedEmp(emp);
    setEditing(false);
    setEditJobTitle(emp.job_title ?? '');
    setEditPhone(emp.phone ?? '');
    setEditEmpType((emp.employment_type as any) ?? 'full_time');
    setEditMinWeekly((emp as any).min_hours_weekly != null ? String((emp as any).min_hours_weekly) : '');
    setEditMaxWeekly(emp.max_hours_weekly != null ? String(emp.max_hours_weekly) : '');
    setEditMinMonthly((emp as any).min_hours_monthly != null ? String((emp as any).min_hours_monthly) : '');
    setEditMaxMonthly(emp.max_hours_monthly != null ? String(emp.max_hours_monthly) : '');
    setEditActive(emp.is_active);
    setEmpPoints(0);
    getPointsForEmployee(rid, emp.id).then((pts) => setEmpPoints(pts.reduce((s, p) => s + p.points, 0)));
    // Load leave types and settings
    setLoadingLeave(true);
    const [types, settings] = await Promise.all([
      ensureDefaultLeaveTypes(rid),
      getEmployeeLeaveTypeSettings(emp.id),
    ]);
    setLeaveTypes(types);
    setLeaveSettings(settings);
    // Build initial edits map
    const edits: Record<string, { days: string; periodStart: string; periodEnd: string }> = {};
    types.forEach((lt) => {
      const s = settings.find((x) => x.leave_type_id === lt.id);
      edits[lt.id] = {
        days: s?.custom_days_per_year != null ? String(s.custom_days_per_year) : String(lt.days_per_year),
        periodStart: (s as any)?.period_start ?? `${new Date().getFullYear()}-01-01`,
        periodEnd: (s as any)?.period_end ?? `${new Date().getFullYear()}-12-31`,
      };
    });
    setLeaveEdits(edits);
    setLoadingLeave(false);
  };

  const saveLeaveQuota = async () => {
    if (!selectedEmp) return;
    setSavingLeave(true);
    const results = await Promise.all(
      leaveTypes.map((lt) => {
        const edit = leaveEdits[lt.id];
        if (!edit) return Promise.resolve(true);
        return setEmployeeLeaveTypeSetting(selectedEmp.id, lt.id, {
          is_enabled: true,
          custom_days_per_year: edit.days !== '' ? parseInt(edit.days) || 0 : null,
        });
      })
    );
    setSavingLeave(false);
    if (results.every(Boolean)) {
      Alert.alert('Zapisano', 'Wymiar urlopu został zaktualizowany.');
    }
  };

  const saveEdit = async () => {
    if (!selectedEmp) return;
    setSaving(true);
    const ok = await updateProfile(selectedEmp.id, {
      job_title: editJobTitle,
      phone: editPhone || undefined,
      employment_type: editEmpType,
      min_hours_weekly: editMinWeekly ? parseInt(editMinWeekly) : null,
      max_hours_weekly: editMaxWeekly ? parseInt(editMaxWeekly) : null,
      min_hours_monthly: editMinMonthly ? parseInt(editMinMonthly) : null,
      max_hours_monthly: editMaxMonthly ? parseInt(editMaxMonthly) : null,
      is_active: editActive,
    });
    if (ok) {
      setEmployees((prev) => prev.map((e) => e.id === selectedEmp.id ? { ...e, job_title: editJobTitle, phone: editPhone, employment_type: editEmpType, min_hours_weekly: editMinWeekly ? parseInt(editMinWeekly) : null, max_hours_weekly: editMaxWeekly ? parseInt(editMaxWeekly) : null, min_hours_monthly: editMinMonthly ? parseInt(editMinMonthly) : null, max_hours_monthly: editMaxMonthly ? parseInt(editMaxMonthly) : null, is_active: editActive } : e));
      setSelectedEmp((prev) => prev ? { ...prev, job_title: editJobTitle } : prev);
    }
    setSaving(false);
    setEditing(false);
  };

  if (loading) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TeamSkeleton />
    </SafeAreaView>
  );

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) || (e.job_title ?? '').toLowerCase().includes(q);
  });

  const groups = Array.from(new Set(filtered.map((e) => e.job_title ?? 'Inne')));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Zespół</Text>
          <Text style={styles.headerSub}>{employees.length} pracowników</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj po imieniu lub stanowisku..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.list, isDesktop && styles.listDesktop]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>Brak wyników dla "{search}"</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group}>
              <Text style={styles.groupTitle}>{group}</Text>
              {filtered.filter((e) => (e.job_title ?? 'Inne') === group).map((emp) => {
                const initials = `${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`.toUpperCase();
                return (
                  <TouchableOpacity key={emp.id} style={styles.empRow} onPress={() => openProfile(emp)} activeOpacity={0.75}>
                    <View style={[styles.avatar, { backgroundColor: emp.avatar_color || theme.colors.primary }]}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.empInfo}>
                      <Text style={styles.empName}>{emp.first_name} {emp.last_name}</Text>
                      <Text style={styles.empRole}>{emp.job_title}</Text>
                    </View>
                    <View style={styles.empMeta}>
                      {!emp.is_active && (
                        <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Nieaktywny</Text></View>
                      )}
                      <View style={[styles.rolePill, { backgroundColor: emp.role === 'owner' ? '#FEF3C7' : emp.role === 'manager' ? '#EFF6FF' : theme.colors.surface }]}>
                        <Text style={[styles.rolePillText, { color: emp.role === 'owner' ? '#D97706' : emp.role === 'manager' ? theme.colors.primary : theme.colors.textSecondary }]}>{ROLE_LABELS[emp.role] ?? emp.role}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Employee Profile Modal */}
      <Modal visible={!!selectedEmp} animationType="slide" transparent onRequestClose={() => setSelectedEmp(null)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Profile Header */}
              <View style={mStyles.profileHeader}>
                <TouchableOpacity onPress={() => setSelectedEmp(null)} style={mStyles.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={[mStyles.bigAvatar, { backgroundColor: selectedEmp?.avatar_color || theme.colors.primary }]}>
                  <Text style={mStyles.bigAvatarText}>{selectedEmp ? `${selectedEmp.first_name?.[0] ?? ''}${selectedEmp.last_name?.[0] ?? ''}`.toUpperCase() : ''}</Text>
                </View>
                <Text style={mStyles.profileName}>{selectedEmp?.first_name} {selectedEmp?.last_name}</Text>
                <Text style={mStyles.profileTitle}>{selectedEmp?.job_title}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={[mStyles.rolePill, { backgroundColor: selectedEmp?.role === 'owner' ? '#FEF3C7' : selectedEmp?.role === 'manager' ? '#EFF6FF' : theme.colors.surface }]}>
                    <Text style={[mStyles.rolePillText, { color: selectedEmp?.role === 'owner' ? '#D97706' : selectedEmp?.role === 'manager' ? theme.colors.primary : theme.colors.textSecondary }]}>{ROLE_LABELS[selectedEmp?.role ?? ''] ?? selectedEmp?.role}</Text>
                  </View>
                  <View style={[mStyles.rolePill, { backgroundColor: empPoints > 0 ? '#F5F3FF' : theme.colors.surface }]}>
                    <Ionicons name="trophy-outline" size={12} color="#7C3AED" />
                    <Text style={[mStyles.rolePillText, { color: '#7C3AED' }]}>{empPoints} pkt</Text>
                  </View>
                </View>
              </View>

              {/* Info Section */}
              <View style={mStyles.section}>
                <View style={mStyles.sectionTitleRow}>
                  <Text style={mStyles.sectionTitle}>Dane pracownika</Text>
                  {isManager && !editing && (
                    <TouchableOpacity onPress={() => setEditing(true)} style={mStyles.editBtn}>
                      <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                      <Text style={mStyles.editBtnText}>Edytuj</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {editing ? (
                  <>
                    <Text style={mStyles.fieldLabel}>Stanowisko</Text>
                    <TextInput style={mStyles.input} value={editJobTitle} onChangeText={setEditJobTitle} placeholder="np. Kelner" placeholderTextColor={theme.colors.textMuted} />
                    <Text style={mStyles.fieldLabel}>Telefon</Text>
                    <TextInput style={mStyles.input} value={editPhone} onChangeText={setEditPhone} placeholder="+48 000 000 000" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" />
                    <Text style={mStyles.fieldLabel}>Typ zatrudnienia</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      {(['full_time', 'part_time', 'contract'] as const).map((t) => (
                        <TouchableOpacity key={t} style={[mStyles.chip, editEmpType === t && mStyles.chipActive]} onPress={() => setEditEmpType(t)} activeOpacity={0.7}>
                          <Text style={[mStyles.chipText, editEmpType === t && mStyles.chipTextActive]}>{EMP_TYPE_LABELS[t]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={mStyles.fieldLabel}>Limit godzin tygodniowych</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={mStyles.subLabel}>Min</Text>
                        <TextInput style={mStyles.input} value={editMinWeekly} onChangeText={setEditMinWeekly} keyboardType="numeric" placeholder="np. 180" placeholderTextColor={theme.colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={mStyles.subLabel}>Max</Text>
                        <TextInput style={mStyles.input} value={editMaxWeekly} onChangeText={setEditMaxWeekly} keyboardType="numeric" placeholder="np. 220" placeholderTextColor={theme.colors.textMuted} />
                      </View>
                    </View>
                    <Text style={mStyles.fieldLabel}>Limit godzin miesięcznych</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={mStyles.subLabel}>Min</Text>
                        <TextInput style={mStyles.input} value={editMinMonthly} onChangeText={setEditMinMonthly} keyboardType="numeric" placeholder="np. 720" placeholderTextColor={theme.colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={mStyles.subLabel}>Max</Text>
                        <TextInput style={mStyles.input} value={editMaxMonthly} onChangeText={setEditMaxMonthly} keyboardType="numeric" placeholder="np. 880" placeholderTextColor={theme.colors.textMuted} />
                      </View>
                    </View>
                    <TouchableOpacity style={[mStyles.chip, editActive && mStyles.chipActive, { alignSelf: 'flex-start', marginBottom: 16 }]} onPress={() => setEditActive(!editActive)} activeOpacity={0.7}>
                      <Text style={[mStyles.chipText, editActive && mStyles.chipTextActive]}>{editActive ? '✓ Aktywny' : 'Nieaktywny'}</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[mStyles.saveBtn, { flex: 1 }]} onPress={saveEdit} disabled={saving} activeOpacity={0.85}>
                        {saving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>Zapisz</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[mStyles.saveBtn, { flex: 1, backgroundColor: theme.colors.surface }]} onPress={() => setEditing(false)} activeOpacity={0.85}>
                        <Text style={[mStyles.saveBtnText, { color: theme.colors.textSecondary }]}>Anuluj</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={mStyles.infoRow}><Ionicons name="mail-outline" size={16} color={theme.colors.textMuted} /><Text style={mStyles.infoLabel}>ID konta</Text><Text style={mStyles.infoValue}>{selectedEmp?.id?.slice(0, 8)}...</Text></View>
                    <View style={mStyles.infoRow}><Ionicons name="call-outline" size={16} color={theme.colors.textMuted} /><Text style={mStyles.infoLabel}>Telefon</Text><Text style={mStyles.infoValue}>{selectedEmp?.phone ?? '—'}</Text></View>
                    <View style={mStyles.infoRow}><Ionicons name="briefcase-outline" size={16} color={theme.colors.textMuted} /><Text style={mStyles.infoLabel}>Zatrudnienie</Text><Text style={mStyles.infoValue}>{EMP_TYPE_LABELS[(selectedEmp as any)?.employment_type] ?? '—'}</Text></View>
                    <View style={mStyles.infoRow}><Ionicons name="time-outline" size={16} color={theme.colors.textMuted} /><Text style={mStyles.infoLabel}>H/tydzień</Text><Text style={mStyles.infoValue}>{(selectedEmp as any)?.min_hours_weekly ?? '—'} - {(selectedEmp as any)?.max_hours_weekly ?? '—'}</Text></View>
                    <View style={mStyles.infoRow}><Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} /><Text style={mStyles.infoLabel}>H/miesiąc</Text><Text style={mStyles.infoValue}>{(selectedEmp as any)?.min_hours_monthly ?? '—'} - {(selectedEmp as any)?.max_hours_monthly ?? '—'}</Text></View>
                    <View style={mStyles.infoRow}><Ionicons name="person-outline" size={16} color={theme.colors.textMuted} /><Text style={mStyles.infoLabel}>Status</Text>
                      <View style={[styles.inactiveBadge, { backgroundColor: selectedEmp?.is_active ? theme.colors.greenLight : theme.colors.errorLight }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: selectedEmp?.is_active ? theme.colors.green : theme.colors.error }}>{selectedEmp?.is_active ? 'Aktywny' : 'Nieaktywny'}</Text>
                      </View>
                    </View>
                    <View style={mStyles.infoRow}><Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} /><Text style={mStyles.infoLabel}>Dołączył/a</Text><Text style={mStyles.infoValue}>{selectedEmp?.created_at?.slice(0, 10)}</Text></View>
                  </>
                )}
              </View>

              {/* ─── Vacation Quota Section ─── */}
              {isManager && (
                <View style={mStyles.section}>
                  <View style={mStyles.sectionTitleRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="umbrella-outline" size={16} color={theme.colors.primary} />
                      <Text style={mStyles.sectionTitle}>Wymiar urlopu</Text>
                    </View>
                    <TouchableOpacity
                      style={[mStyles.editBtn, { backgroundColor: theme.colors.greenLight }]}
                      onPress={saveLeaveQuota}
                      disabled={savingLeave || loadingLeave}
                      activeOpacity={0.8}
                    >
                      {savingLeave
                        ? <ActivityIndicator size="small" color={theme.colors.green} />
                        : <>
                            <Ionicons name="save-outline" size={14} color={theme.colors.green} />
                            <Text style={[mStyles.editBtnText, { color: theme.colors.green }]}>Zapisz urlopy</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </View>

                  {loadingLeave ? (
                    <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
                  ) : leaveTypes.length === 0 ? (
                    <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontStyle: 'italic' }}>Brak typów urlopu</Text>
                  ) : (
                    <>
                      {leaveTypes.map((lt) => {
                        const LEAVE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
                          standard: { icon: 'sunny-outline', color: '#2563EB', bg: '#EFF6FF' },
                          special: { icon: 'heart-outline', color: '#A855F7', bg: '#F5F3FF' },
                          parental: { icon: 'people-outline', color: '#F97316', bg: '#FFF4E5' },
                        };
                        const cat = lt.category ?? 'standard';
                        const ico = LEAVE_ICONS[cat] ?? LEAVE_ICONS.standard;
                        const edit = leaveEdits[lt.id] ?? { days: String(lt.days_per_year), periodStart: '', periodEnd: '' };
                        return (
                          <View key={lt.id} style={leaveStyles.row}>
                            <View style={[leaveStyles.iconBox, { backgroundColor: ico.bg }]}>
                              <Ionicons name={ico.icon as any} size={18} color={ico.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={leaveStyles.typeName}>{lt.name}</Text>
                              <Text style={leaveStyles.typeSub}>
                                {lt.payment_rate === 0 ? 'Bezpłatny' : lt.payment_rate === 100 ? 'Płatny' : `${lt.payment_rate}% płatny`}
                              </Text>
                            </View>
                            <View style={leaveStyles.daysRow}>
                              <TextInput
                                style={leaveStyles.daysInput}
                                value={edit.days}
                                onChangeText={(v) => setLeaveEdits((prev) => ({ ...prev, [lt.id]: { ...prev[lt.id], days: v } }))}
                                keyboardType="numeric"
                                selectTextOnFocus
                              />
                              <Text style={leaveStyles.daysLabel}>dni</Text>
                            </View>
                          </View>
                        );
                      })}
                      <View style={leaveStyles.periodRow}>
                        <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
                        <Text style={leaveStyles.periodLabel}>Okres naliczania:</Text>
                        <Text style={leaveStyles.periodValue}>
                          {`01.01.${new Date().getFullYear()} – 31.12.${new Date().getFullYear()}`}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10,
    backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  headerSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.card, borderRadius: 12,
    paddingHorizontal: 14, height: 44,
    marginHorizontal: 16, marginVertical: 12,
    ...theme.shadows.card,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  listDesktop: { maxWidth: 700, alignSelf: 'center' as const, width: '100%' },
  groupTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg,
    padding: 14, marginBottom: 8, ...theme.shadows.card,
  },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empRole: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  empMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rolePill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  inactiveBadge: { backgroundColor: theme.colors.errorLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', color: theme.colors.error },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', overflow: 'hidden' },
  sheetDesktop: { maxWidth: 560, alignSelf: 'center' as const, width: '100%', borderRadius: 20, marginVertical: 40 },
  profileHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 24, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
  bigAvatar: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  bigAvatarText: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  profileName: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  profileTitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  section: { padding: 20 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { flex: 1, fontSize: 13, color: theme.colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 12 },
  subLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10, padding: 11, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface },
  chip: { borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.primary },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
});

const leaveStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  typeSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  daysInput: {
    width: 52,
    height: 36,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  daysLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 10,
  },
  periodLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  periodValue: { fontSize: 12, color: theme.colors.text, fontWeight: '700', flex: 1 },
});
