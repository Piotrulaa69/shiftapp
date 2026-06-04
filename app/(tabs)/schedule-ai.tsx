import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text,
    TouchableOpacity, useWindowDimensions, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { createShift, getEmployees, getRestaurantSettings } from '../../lib/db';
import {
    DEFAULT_PREFS, EmpAvail,
    GeneratedShift,
    generateSchedule,
    GenerationResult,
    getApprovedLeaves, getEmployeeAvailability, getSchedulePrefs,
    SchedulePrefs, upsertEmployeeAvailability,
} from '../../lib/schedule';
import type { DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

function getWeekStart(offset = 0): Date {
  const d = new Date();
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - day + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(weekStart)} – ${fmt(end)}.${end.getFullYear()}`;
}

export default function ScheduleAIScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStart(weekOffset);

  const [activeTab, setActiveTab] = useState<'grafik' | 'dostepnosc'>('grafik');

  // Data
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [prefs, setPrefs] = useState<SchedulePrefs | null>(null);
  const [availability, setAvailability] = useState<EmpAvail[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [editableShifts, setEditableShifts] = useState<GeneratedShift[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const dragRef = useRef<{ empId: string; dayIdx: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ empId: string; dayIdx: number } | null>(null);
  const [dragging, setDragging] = useState<{ empId: string; dayIdx: number } | null>(null);

  const rid = user?.restaurantId ?? '';

  const loadData = useCallback(async () => {
    if (!rid) return;
    setDataLoading(true);
    const [emps, p, avail, rs] = await Promise.all([
      getEmployees(rid),
      getSchedulePrefs(rid),
      getEmployeeAvailability(rid),
      getRestaurantSettings(rid),
    ]);
    setEmployees(emps as DbProfile[]);
    const base = p ?? DEFAULT_PREFS(rid);
    // Merge extended AI prefs from RestaurantSettings into SchedulePrefs
    const resolvedPrefs: SchedulePrefs = {
      ...base,
      shift_start: rs.ai_default_shift_start || base.shift_start,
      shift_end: rs.ai_default_shift_end || base.shift_end,
      max_consecutive_days: rs.ai_max_consecutive_days || base.max_consecutive_days,
      ai_balance_weekends: rs.ai_balance_weekends,
      ai_avoid_single_day_gaps: rs.ai_avoid_single_day_gaps,
      ai_respect_day_off_requests: rs.ai_respect_day_off_requests,
      ai_min_hours_per_employee: rs.ai_min_hours_per_employee,
      ai_priority_equal_hours: rs.ai_priority_equal_hours,
      ai_priority_preferences: rs.ai_priority_preferences,
    };
    setPrefs(resolvedPrefs);
    setAvailability(avail);
    setDataLoading(false);
  }, [rid]);

  useEffect(() => { loadData(); }, [loadData]);

  const draftKey = `schedule_draft_${rid}_${weekStart.toISOString().slice(0, 10)}`;

  // Load persisted draft when week changes
  useEffect(() => {
    if (!rid || Platform.OS !== 'web') return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const shifts = JSON.parse(saved) as GeneratedShift[];
        setEditableShifts(shifts);
        setResult({ shifts, warnings: [], stats: { totalHours: 0, coveredDays: 0, staffPerDay: [] } });
      } else {
        setEditableShifts([]);
        setResult(null);
      }
    } catch {}
  }, [draftKey, rid]);

  const handleGenerate = async () => {
    if (!prefs || employees.length === 0) return;
    setGenerating(true);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const leaves = await getApprovedLeaves(rid, weekStart, weekEnd);
    const res = generateSchedule(employees, availability, leaves as any, prefs, weekStart);
    setResult(res);
    if (Platform.OS === 'web') {
      try { localStorage.setItem(draftKey, JSON.stringify(res.shifts)); } catch {}
    }
    setGenerating(false);
  };

  useEffect(() => {
    setEditableShifts(result?.shifts ?? []);
  }, [result]);

  const moveShift = (fromEmpId: string, fromDay: number, toEmpId: string, toDay: number) => {
    if (fromEmpId === toEmpId && fromDay === toDay) return;
    setEditableShifts(prev => {
      const updated = prev.map(sh => {
        if (sh.employee_id === fromEmpId && sh.day_of_week === fromDay)
          return { ...sh, employee_id: toEmpId, day_of_week: toDay };
        if (sh.employee_id === toEmpId && sh.day_of_week === toDay)
          return { ...sh, employee_id: fromEmpId, day_of_week: fromDay };
        return sh;
      });
      if (Platform.OS === 'web') { try { localStorage.setItem(draftKey, JSON.stringify(updated)); } catch {} }
      return updated;
    });
  };

  const handlePublish = () => {
    if (!editableShifts.length) return;
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Opublikować ${editableShifts.length} zmian na tydzień ${weekLabel(weekStart)}?\n\nPracownicy zobaczą je w swoim grafiku. Jeśli istnieją już zmiany na ten tydzień, zostaną dodane duplikaty.`
      );
      if (confirmed) doPublish();
    } else {
      Alert.alert(
        'Opublikować grafik?',
        `Zapisać ${editableShifts.length} zmian na tydzień ${weekLabel(weekStart)}? Pracownicy zobaczą je w grafiku.`,
        [{ text: 'Anuluj', style: 'cancel' }, { text: 'Opublikuj', onPress: doPublish }]
      );
    }
  };

  const doPublish = async () => {
    setPublishing(true);
    const pad = (n: number) => String(n).padStart(2, '0');
    let ok = 0;
    for (const sh of editableShifts) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + sh.day_of_week);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const emp = employees.find(e => e.id === sh.employee_id);
      const created = await createShift(rid, {
        employee_id: sh.employee_id,
        employee_name: sh.employee_name,
        job_title: emp?.job_title ?? '',
        day: dateStr,
        start_time: sh.start_time,
        end_time: sh.end_time,
        status: 'zaplanowana',
        location: 'Restauracja',
      });
      if (created) ok++;
    }
    setPublishing(false);
    if (Platform.OS === 'web') { try { localStorage.removeItem(draftKey); } catch {} }
    setResult(null);
    Alert.alert('Opublikowano!', `Zapisano ${ok} z ${editableShifts.length} zmian. Pracownicy zobaczą je w grafiku.`);
  };

  const toggleAvailability = async (employeeId: string, dayIdx: number, current: boolean) => {
    const updated: EmpAvail = {
      employee_id: employeeId,
      restaurant_id: rid,
      day_of_week: dayIdx,
      available: !current,
    };
    const newAvail = [...availability.filter(a => !(a.employee_id === employeeId && a.day_of_week === dayIdx)), updated];
    setAvailability(newAvail);
    await upsertEmployeeAvailability([updated]);
  };

  const getAvail = (empId: string, day: number): boolean => {
    const a = availability.find(a => a.employee_id === empId && a.day_of_week === day);
    return a === undefined ? true : a.available;
  };

  // Build shift map from editable shifts
  const shiftMap: Record<string, GeneratedShift[]> = {};
  editableShifts.forEach(sh => {
    const key = sh.employee_id;
    if (!shiftMap[key]) shiftMap[key] = [];
    shiftMap[key].push(sh);
  });

  if (dataLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.aiBadge}>
            <Ionicons name="sparkles" size={13} color="#7C3AED" />
            <Text style={s.aiBadgeText}>AI</Text>
          </View>
          <View>
            <Text style={s.title}>Grafik pracy AI</Text>
            <Text style={s.headerSub}>{weekLabel(weekStart)}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={s.weekNav}>
            <TouchableOpacity style={s.weekBtn} onPress={() => setWeekOffset(o => o - 1)} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={s.weekLabel}>Tydzień</Text>
            <TouchableOpacity style={s.weekBtn} onPress={() => setWeekOffset(o => o + 1)} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.generateBtn, generating && s.generateBtnLoading]}
            onPress={handleGenerate}
            activeOpacity={0.85}
            disabled={generating}
          >
            <Ionicons name={generating ? 'hourglass' : 'sparkles'} size={15} color="#fff" />
            <Text style={s.generateBtnText}>{generating ? 'Generowanie...' : 'Generuj AI'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{result ? result.stats.totalHours.toFixed(0) : '—'}</Text>
          <Text style={s.statLbl}>godz. łącznie</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statNum}>{employees.length}</Text>
          <Text style={s.statLbl}>pracowników</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: result ? '#059669' : theme.colors.textMuted }]}>
            {result ? `${result.stats.coveredDays}/7` : '—'}
          </Text>
          <Text style={s.statLbl}>dni pokrytych</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: result ? '#059669' : '#D97706' }]}>{result ? 'Gotowy' : 'Brak'}</Text>
          <Text style={s.statLbl}>status</Text>
        </View>
      </View>

      {/* Warnings banner */}
      {result && result.warnings.length > 0 && (
        <View style={s.warningBanner}>
          <Ionicons name="warning" size={14} color="#92400E" />
          <Text style={s.warningText}>{result.warnings[0]}{result.warnings.length > 1 ? ` (+${result.warnings.length - 1})` : ''}</Text>
        </View>
      )}
      {result && result.warnings.length === 0 && (
        <View style={s.successBanner}>
          <Ionicons name="checkmark-circle" size={14} color="#065F46" />
          <Text style={s.successText}>Grafik wygenerowany — wszystkie dni pokryte minimalną obsadą.</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabs}>
        {(['grafik', 'dostepnosc'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'grafik' ? 'Grafik' : 'Dostępność'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ── GRAFIK TAB ── */}
        {activeTab === 'grafik' && (
          <View style={s.content}>
            {employees.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
                <Text style={s.emptyTitle}>Brak pracowników</Text>
                <Text style={s.emptySub}>Dodaj pracowników do restauracji, aby wygenerować grafik.</Text>
              </View>
            ) : !result ? (
              <View style={s.emptyState}>
                <Ionicons name="sparkles-outline" size={48} color="#7C3AED" />
                <Text style={s.emptyTitle}>Kliknij "Generuj AI"</Text>
                <Text style={s.emptySub}>AI uwzględni dostępność pracowników, urlopy i preferencje godzinowe.</Text>
                <TouchableOpacity style={s.generateBigBtn} onPress={handleGenerate} activeOpacity={0.85}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={s.generateBigBtnText}>Generuj grafik na ten tydzień</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Publish bar */}
                <View style={s.publishBar}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.publishTitle}>Gotowy do publikacji</Text>
                    <Text style={s.publishSub}>{editableShifts.length} zmian · przeciągnij, aby przesunąć</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.publishBtn, publishing && { opacity: 0.6 }]}
                    onPress={handlePublish}
                    disabled={publishing}
                    activeOpacity={0.85}
                  >
                    {publishing
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="cloud-upload-outline" size={16} color="#fff" />}
                    <Text style={s.publishBtnText}>{publishing ? 'Zapisywanie...' : 'Opublikuj grafik'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Schedule grid */}
                <View style={s.grid}>
                  <View style={s.gridHeader}>
                    <View style={s.gridEmpCol} />
                    {DAYS.map((d, i) => (
                      <View key={i} style={s.gridDayCol}>
                        <Text style={s.gridDayText}>{d}</Text>
                      </View>
                    ))}
                  </View>
                  {employees.map(emp => {
                    const empShifts = shiftMap[emp.id] ?? [];
                    return (
                      <View key={emp.id} style={s.gridRow}>
                        <View style={s.gridEmpCol}>
                          <View style={[s.empAvatar, { backgroundColor: (emp.avatar_color ?? '#2563EB') + '22' }]}>
                            <Text style={[s.empAvatarText, { color: emp.avatar_color ?? '#2563EB' }]}>
                              {emp.first_name[0]}{emp.last_name[0]}
                            </Text>
                          </View>
                          {isDesktop && (
                            <View style={{ flex: 1 }}>
                              <Text style={s.empName} numberOfLines={1}>{emp.first_name} {emp.last_name}</Text>
                              <Text style={s.empRole}>{emp.job_title}</Text>
                            </View>
                          )}
                        </View>
                        {DAYS.map((_, dayIdx) => {
                          const shift = empShifts.find(sh => sh.day_of_week === dayIdx);
                          const avail = getAvail(emp.id, dayIdx);
                          const color = emp.avatar_color ?? theme.colors.primary;
                          const isThisDragOver = dragOver?.empId === emp.id && dragOver?.dayIdx === dayIdx;
                          const isThisDragging = dragging?.empId === emp.id && dragging?.dayIdx === dayIdx;
                          const webDropProps = Platform.OS === 'web' ? {
                            onDragOver: (e: any) => { e.preventDefault(); setDragOver({ empId: emp.id, dayIdx }); },
                            onDragLeave: () => setDragOver(null),
                            onDrop: (e: any) => {
                              e.preventDefault();
                              setDragOver(null);
                              if (dragRef.current) {
                                moveShift(dragRef.current.empId, dragRef.current.dayIdx, emp.id, dayIdx);
                                dragRef.current = null;
                                setDragging(null);
                              }
                            },
                          } as any : {};
                          return (
                            <View
                              key={dayIdx}
                              style={[s.gridDayCol, isThisDragOver && s.gridDayColDrop]}
                              {...webDropProps}
                            >
                              {shift ? (
                                <View
                                  style={[s.shiftBlock, { backgroundColor: color + '18', borderColor: color }, isThisDragging && { opacity: 0.3 }]}
                                  {...(Platform.OS === 'web' ? {
                                    draggable: true,
                                    onDragStart: (e: any) => {
                                      dragRef.current = { empId: emp.id, dayIdx };
                                      setDragging({ empId: emp.id, dayIdx });
                                      e.dataTransfer.effectAllowed = 'move';
                                    },
                                    onDragEnd: () => { dragRef.current = null; setDragging(null); setDragOver(null); },
                                    style: { cursor: 'grab', backgroundColor: color + '18', borderColor: color, borderWidth: 1, borderLeftWidth: 3, width: '92%', borderRadius: 6, paddingVertical: 3, alignItems: 'center' },
                                  } as any : {})}
                                >
                                  <Text style={[s.shiftTime, { color }]}>{shift.start_time}</Text>
                                  <Text style={[s.shiftHours, { color }]}>{shift.hours}h</Text>
                                </View>
                              ) : !avail ? (
                                <View style={s.offBlock}>
                                  <Text style={s.offText}>—</Text>
                                </View>
                              ) : (
                                <View style={s.freeBlock}>
                                  <Ionicons name="ellipse-outline" size={12} color={isThisDragOver ? theme.colors.primary : theme.colors.border} />
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>

                {/* Per-employee summary */}
                <Text style={s.sectionTitle}>Podsumowanie tygodnia</Text>
                {employees.map(emp => {
                  const empShifts = shiftMap[emp.id] ?? [];
                  const total = empShifts.reduce((s, sh) => s + sh.hours, 0);
                  const color = emp.avatar_color ?? theme.colors.primary;
                  const pct = prefs ? Math.min(total / prefs.max_hours_per_week, 1) : 0;
                  return (
                    <View key={emp.id} style={s.summaryRow}>
                      <View style={[s.empAvatar, { backgroundColor: color + '22' }]}>
                        <Text style={[s.empAvatarText, { color }]}>{emp.first_name[0]}{emp.last_name[0]}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={s.empName}>{emp.first_name} {emp.last_name}</Text>
                          <Text style={[s.summaryHours, { color }]}>{total}h</Text>
                        </View>
                        <View style={s.progressBg}>
                          <View style={[s.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
                        </View>
                        <Text style={s.summaryMeta}>{empShifts.length} zmian · max {prefs?.max_hours_per_week}h</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Warnings detail */}
                {result.warnings.length > 0 && (
                  <>
                    <Text style={s.sectionTitle}>Ostrzeżenia</Text>
                    {result.warnings.map((w, i) => (
                      <View key={i} style={s.warningCard}>
                        <Ionicons name="warning-outline" size={16} color="#D97706" />
                        <Text style={s.warningCardText}>{w}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ── DOSTĘPNOŚĆ TAB ── */}
        {activeTab === 'dostepnosc' && (
          <View style={s.content}>
            <Text style={s.sectionTitle}>Dostępność pracowników</Text>
            <Text style={s.sectionSub}>Dotknij dzień, aby przełączyć dostępność pracownika. Zmiany zapisują się automatycznie.</Text>
            {employees.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptySub}>Brak pracowników w restauracji.</Text>
              </View>
            ) : (
              employees.map(emp => {
                const color = emp.avatar_color ?? theme.colors.primary;
                const totalAvail = DAYS.map((_, i) => getAvail(emp.id, i)).filter(Boolean).length;
                return (
                  <View key={emp.id} style={s.availCard}>
                    <View style={s.availHeader}>
                      <View style={[s.empAvatar, { backgroundColor: color + '22' }]}>
                        <Text style={[s.empAvatarText, { color }]}>{emp.first_name[0]}{emp.last_name[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.empName}>{emp.first_name} {emp.last_name}</Text>
                        <Text style={s.empRole}>{emp.job_title}</Text>
                      </View>
                      <Text style={[s.availCount, { color }]}>{totalAvail}/7 dni</Text>
                    </View>
                    <View style={s.availDays}>
                      {DAYS.map((day, i) => {
                        const avail = getAvail(emp.id, i);
                        return (
                          <TouchableOpacity
                            key={i}
                            style={[s.availDay, avail ? { backgroundColor: color + '20', borderColor: color } : s.availDayOff]}
                            onPress={() => toggleAvailability(emp.id, i, avail)}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.availDayLabel, avail ? { color } : s.availDayLabelOff]}>{day}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
            <View style={s.availLegend}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary }]} /><Text style={s.legendText}>Dostępny</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} /><Text style={s.legendText}>Niedostępny</Text></View>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  aiBadgeText: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  title: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.surface, borderRadius: 20, paddingHorizontal: 4, paddingVertical: 2 },
  weekBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.text, paddingHorizontal: 4 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22 },
  generateBtnLoading: { backgroundColor: '#A78BFA' },
  generateBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  statsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  statLbl: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  statDivider: { width: 1, height: 26, backgroundColor: theme.colors.border },
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  warningText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#A7F3D0' },
  successText: { flex: 1, fontSize: 12, color: '#065F46', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.card, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#7C3AED' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: '#7C3AED' },
  content: { padding: 16, gap: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
  generateBigBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, marginTop: 8 },
  generateBigBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  publishBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', borderRadius: 12, padding: 14, gap: 12 },
  publishTitle: { fontSize: 13, fontWeight: '700', color: '#5B21B6' },
  publishSub: { fontSize: 11, color: '#7C3AED', marginTop: 1 },
  publishBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  publishBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  gridDayColDrop: { backgroundColor: '#EDE9FE', borderRadius: 6 },
  grid: { backgroundColor: theme.colors.card, borderRadius: 14, overflow: 'hidden', ...theme.shadows.card },
  gridHeader: { flexDirection: 'row', backgroundColor: theme.colors.surface, paddingVertical: 7 },
  gridEmpCol: { width: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6 },
  gridDayCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, paddingHorizontal: 1 },
  gridDayText: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary },
  gridRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 5 },
  empAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { fontSize: 10, fontWeight: '800' },
  empName: { fontSize: 11, fontWeight: '700', color: theme.colors.text },
  empRole: { fontSize: 10, color: theme.colors.textMuted },
  shiftBlock: { width: '92%', borderRadius: 6, paddingVertical: 3, alignItems: 'center', borderWidth: 1, borderLeftWidth: 3 },
  shiftTime: { fontSize: 9, fontWeight: '700' },
  shiftHours: { fontSize: 10, fontWeight: '800' },
  offBlock: { alignItems: 'center' },
  offText: { fontSize: 11, color: theme.colors.border },
  freeBlock: { alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  sectionSub: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 16, marginTop: -8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: 12, padding: 12, ...theme.shadows.card },
  summaryHours: { fontSize: 15, fontWeight: '800' },
  summaryMeta: { fontSize: 10, color: theme.colors.textMuted },
  progressBg: { height: 5, backgroundColor: theme.colors.surface, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#D97706' },
  warningCardText: { flex: 1, fontSize: 13, color: '#92400E' },
  availCard: { backgroundColor: theme.colors.card, borderRadius: 14, padding: 14, gap: 12, ...theme.shadows.card },
  availHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availCount: { fontSize: 13, fontWeight: '800' },
  availDays: { flexDirection: 'row', gap: 6 },
  availDay: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  availDayOff: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  availDayLabel: { fontSize: 10, fontWeight: '800' },
  availDayLabelOff: { color: theme.colors.textMuted },
  availLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, backgroundColor: theme.colors.card, borderRadius: 12, padding: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 12, ...theme.shadows.card },
  prefIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  prefLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  prefInput: { width: 80, backgroundColor: theme.colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontWeight: '700', color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, textAlign: 'center' },
  formLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 13, borderRadius: 12 },
  saveBtnLoading: { backgroundColor: '#93C5FD' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  generateSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', paddingVertical: 13, borderRadius: 12 },
  generateSaveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
