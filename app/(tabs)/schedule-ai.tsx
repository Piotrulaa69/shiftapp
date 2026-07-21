import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text,
    TouchableOpacity, useWindowDimensions, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { createShift, getAvailabilityRange, getEmployeeGroupsWithMembers, getEmployees, getRestaurantSettings, getShiftsInRange, getShiftTypes, type ShiftTypeRow } from '../../lib/db';
import {
    AvailabilityDefaults,
    DayStatus,
    DEFAULT_PREFS,
    GeneratedShift,
    generateSchedule,
    GenerationResult,
    getApprovedLeaves, getSchedulePrefs,
    hoursBetween,
    resolveDayStatus,
    SchedulePrefs,
} from '../../lib/schedule';
import type { DbAvailability, DbEmployeeGroup, DbProfile } from '../../lib/supabase';
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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStart(weekOffset);

  const [activeTab, setActiveTab] = useState<'grafik' | 'dostepnosc'>('grafik');

  // Data
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [prefs, setPrefs] = useState<SchedulePrefs | null>(null);
  const [availability, setAvailability] = useState<DbAvailability[]>([]);
  const [groups, setGroups] = useState<(DbEmployeeGroup & { members: string[] })[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeRow[]>([]);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [editableShifts, setEditableShifts] = useState<GeneratedShift[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [availLoading, setAvailLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Tap-to-move: tap a shift to pick it up, tap a destination cell to drop it
  // there (swaps if occupied). Works identically on web and native — HTML5
  // drag-and-drop doesn't exist on mobile and clashed with RN's own touch
  // responder system on web anyway.
  const [selectedCell, setSelectedCell] = useState<{ empId: string; dayIdx: number } | null>(null);

  const rid = user?.restaurantId ?? '';

  const availabilityDefaults: AvailabilityDefaults = {
    availability_contract_all_available: restaurantSettings?.availability_contract_all_available ?? true,
    availability_freelance_all_available: restaurantSettings?.availability_freelance_all_available ?? false,
  };

  const loadData = useCallback(async () => {
    if (!rid) return;
    setDataLoading(true);
    const [emps, p, gr, st, rs] = await Promise.all([
      getEmployees(rid),
      getSchedulePrefs(rid),
      getEmployeeGroupsWithMembers(rid),
      getShiftTypes(rid),
      getRestaurantSettings(rid),
    ]);
    setEmployees(emps as DbProfile[]);
    setGroups(gr);
    setShiftTypes(st);
    const base = p ?? DEFAULT_PREFS(rid);
    // Merge extended AI prefs + hard rules from RestaurantSettings — this is
    // the ONLY place these are actually editable (schedule_preferences has no
    // UI of its own), so the generator must read the restaurant's real config,
    // not the schedule_preferences defaults.
    const resolvedPrefs: SchedulePrefs = {
      ...base,
      shift_start: rs.ai_default_shift_start || base.shift_start,
      shift_end: rs.ai_default_shift_end || base.shift_end,
      max_hours_per_week: rs.max_hours_weekly || base.max_hours_per_week,
      max_consecutive_days: rs.ai_max_consecutive_days || base.max_consecutive_days,
      ai_balance_weekends: rs.ai_balance_weekends,
      ai_avoid_single_day_gaps: rs.ai_avoid_single_day_gaps,
      ai_respect_day_off_requests: rs.ai_respect_day_off_requests,
      ai_prefer_same_shifts: rs.ai_prefer_same_shifts,
      ai_use_shift_types: rs.ai_use_shift_types,
      ai_min_hours_per_employee: rs.ai_min_hours_per_employee,
      ai_priority_equal_hours: rs.ai_priority_equal_hours,
      ai_priority_preferences: rs.ai_priority_preferences,
      min_hours_between_shifts: rs.min_hours_between_shifts,
      min_rest_day_after: rs.min_rest_day_after,
      prevent_opening_closing: rs.prevent_opening_closing,
      max_hours_monthly: rs.max_hours_monthly,
    };
    setPrefs(resolvedPrefs);
    setRestaurantSettings(rs);
    setDataLoading(false);
  }, [rid]);

  useEffect(() => { loadData(); }, [loadData]);

  // Availability is per-DATE (not day-of-week), so it must be re-fetched
  // whenever the visible week changes — sourced from the SAME `availability`
  // table the Dostępność screen reads/writes, so the AI always agrees with
  // what employees/managers actually see there.
  useEffect(() => {
    if (!rid) return;
    setAvailLoading(true);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const fromISO = weekStart.toISOString().slice(0, 10);
    const toISO = weekEnd.toISOString().slice(0, 10);
    getAvailabilityRange(rid, fromISO, toISO).then((avail) => {
      setAvailability(avail);
      setAvailLoading(false);
    });
  }, [rid, weekOffset]);

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

    // Month-to-date hours already worked/published this month, so a monthly
    // hour cap (max_hours_monthly) is respected across weeks, not just within
    // the single week being generated.
    const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    const dayBeforeWeek = new Date(weekStart);
    dayBeforeWeek.setDate(dayBeforeWeek.getDate() - 1);
    const monthToDateHours: Record<string, number> = {};
    if (dayBeforeWeek >= monthStart) {
      const pastShifts = await getShiftsInRange(rid, monthStart.toISOString().slice(0, 10), dayBeforeWeek.toISOString().slice(0, 10));
      pastShifts.forEach((sh) => {
        if (sh.start_time && sh.end_time) {
          monthToDateHours[sh.employee_id] = (monthToDateHours[sh.employee_id] ?? 0) + hoursBetween(sh.start_time, sh.end_time);
        }
      });
    }

    const leaves = await getApprovedLeaves(rid, weekStart, weekEnd);
    const res = generateSchedule(employees, availability, leaves as any, prefs, weekStart, restaurantSettings?.min_staffing ?? {}, groups, availabilityDefaults, shiftTypes, monthToDateHours);
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

  // Read-only: availability is edited on the real Dostępność screen — this
  // just reflects it, using the SAME resolution rules the AI schedules on
  // (explicit record → employment-type default → unconfirmed).
  const getDayStatus = (empId: string, dayIdx: number): DayStatus => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return { status: null, slot1_start: null, slot1_end: null };
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIdx);
    const dateStr = date.toISOString().split('T')[0];
    return resolveDayStatus(empId, dateStr, emp, availability, availabilityDefaults);
  };

  const getAvail = (empId: string, day: number): boolean => {
    const st = getDayStatus(empId, day).status;
    return st === 'available' || st === 'partial';
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
                    <Text style={s.publishSub}>{editableShifts.length} zmian · dotknij zmianę, aby ją przenieść</Text>
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

                {/* Move-mode banner — unmissable confirmation that the first tap registered */}
                {!!selectedCell && (
                  <View style={s.moveBanner}>
                    <Ionicons name="move-outline" size={16} color="#fff" />
                    <Text style={s.moveBannerText}>Wybrano zmianę — dotknij miejsce docelowe, aby przenieść</Text>
                    <TouchableOpacity onPress={() => setSelectedCell(null)} style={s.moveBannerCancel} activeOpacity={0.8}>
                      <Text style={s.moveBannerCancelText}>Anuluj</Text>
                    </TouchableOpacity>
                  </View>
                )}

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
                          const isThisSelected = selectedCell?.empId === emp.id && selectedCell?.dayIdx === dayIdx;
                          const isDropHighlight = !!selectedCell && !isThisSelected;

                          const handleCellPress = () => {
                            // Tapped empty space in this cell (the shift block, if any,
                            // consumes its own tap and never bubbles here).
                            if (selectedCell) {
                              moveShift(selectedCell.empId, selectedCell.dayIdx, emp.id, dayIdx);
                              setSelectedCell(null);
                            }
                          };
                          const handleShiftPress = () => {
                            if (isThisSelected) { setSelectedCell(null); return; }
                            if (selectedCell) {
                              moveShift(selectedCell.empId, selectedCell.dayIdx, emp.id, dayIdx);
                              setSelectedCell(null);
                              return;
                            }
                            setSelectedCell({ empId: emp.id, dayIdx });
                          };

                          return (
                            <TouchableOpacity
                              key={dayIdx}
                              style={[s.gridDayCol, isDropHighlight && s.gridDayColDrop]}
                              activeOpacity={selectedCell ? 0.6 : 1}
                              onPress={handleCellPress}
                            >
                              {shift ? (
                                <TouchableOpacity
                                  onPress={handleShiftPress}
                                  activeOpacity={0.75}
                                  style={[s.shiftBlock, { backgroundColor: color + '18', borderColor: color, width: '92%', borderLeftWidth: 3 }, isThisSelected && s.shiftBlockSelected]}
                                >
                                  {shift.shift_type_name ? <Text style={[s.shiftTypeLabel, { color }]} numberOfLines={1}>{shift.shift_type_name}</Text> : null}
                                  <Text style={[s.shiftTime, { color }]}>{shift.start_time}</Text>
                                  <Text style={[s.shiftHours, { color }]}>{shift.hours}h</Text>
                                </TouchableOpacity>
                              ) : !avail ? (
                                <View style={s.offBlock}>
                                  <Text style={s.offText}>—</Text>
                                </View>
                              ) : (
                                <View style={s.freeBlock}>
                                  <Ionicons name="ellipse-outline" size={12} color={isDropHighlight ? theme.colors.primary : theme.colors.border} />
                                </View>
                              )}
                            </TouchableOpacity>
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

        {/* ── DOSTĘPNOŚĆ TAB (read-only — źródłem prawdy jest ekran Dostępność) ── */}
        {activeTab === 'dostepnosc' && (
          <View style={s.content}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={[s.sectionTitle, { flex: 1 }]}>Dostępność w tym tygodniu</Text>
              <TouchableOpacity
                style={s.openAvailBtn}
                onPress={() => router.push('/(tabs)/availability' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="open-outline" size={14} color="#7C3AED" />
                <Text style={s.openAvailBtnText}>Otwórz Dostępność</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.sectionSub}>
              To jest podgląd — dokładnie te dane wykorzystuje generator AI. Edycję zrób na ekranie Dostępność.
            </Text>
            {availLoading ? (
              <ActivityIndicator style={{ marginTop: 16 }} color={theme.colors.primary} />
            ) : employees.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptySub}>Brak pracowników w restauracji.</Text>
              </View>
            ) : (
              employees.map(emp => {
                const color = emp.avatar_color ?? theme.colors.primary;
                const statuses = DAYS.map((_, i) => getDayStatus(emp.id, i).status);
                const totalAvail = statuses.filter(st => st === 'available' || st === 'partial').length;
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
                        const st = statuses[i];
                        const cfg = st === 'available' ? { bg: '#E8F8ED', border: '#22C55E', text: '#22C55E' }
                          : st === 'partial' ? { bg: '#FFF4E5', border: '#F97316', text: '#F97316' }
                          : st === 'unavailable' ? { bg: '#FFF0EF', border: '#EF4444', text: '#EF4444' }
                          : { bg: theme.colors.surface, border: theme.colors.border, text: theme.colors.textMuted };
                        return (
                          <View key={i} style={[s.availDay, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                            <Text style={[s.availDayLabel, { color: cfg.text }]}>{day}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
            <View style={s.availLegend}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#E8F8ED', borderColor: '#22C55E' }]} /><Text style={s.legendText}>Dostępny</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#FFF4E5', borderColor: '#F97316' }]} /><Text style={s.legendText}>Częściowo</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#FFF0EF', borderColor: '#EF4444' }]} /><Text style={s.legendText}>Niedostępny</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} /><Text style={s.legendText}>Nie zgłoszono</Text></View>
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
  shiftBlockSelected: { opacity: 0.5, borderWidth: 2, borderColor: '#7C3AED' },
  moveBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  moveBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#fff' },
  moveBannerCancel: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  moveBannerCancelText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  shiftTypeLabel: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  shiftTime: { fontSize: 9, fontWeight: '700' },
  shiftHours: { fontSize: 10, fontWeight: '800' },
  offBlock: { alignItems: 'center' },
  offText: { fontSize: 11, color: theme.colors.border },
  freeBlock: { alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  sectionSub: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 16, marginTop: -8 },
  openAvailBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  openAvailBtnText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
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
