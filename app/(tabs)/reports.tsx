import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getEmployees, getTaskConfirmations, type DbTaskConfirmation } from '../../lib/db';
import type { DbProfile } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { theme } from '../../styles/theme';

type ReportType = 'shifts' | 'attendance' | 'tasks' | 'hours' | 'confirmations';

function escapeCSV(val: unknown): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function triggerCsvDownload(csv: string, filename: string) {
  if (Platform.OS !== 'web') {
    Alert.alert('Eksport CSV', 'Eksport pliku CSV dostępny tylko w wersji przeglądarkowej (web).');
    return;
  }
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const REPORTS: { key: ReportType; icon: string; label: string; desc: string; color: string }[] = [
  { key: 'hours',      icon: 'bar-chart-outline',    label: 'Godziny pracowników', desc: 'Przepracowane godziny i zarobki per osoba',  color: '#A855F7' },
  { key: 'shifts',     icon: 'calendar-outline',     label: 'Zmiany',              desc: 'Lista zmian w wybranym miesiącu',             color: theme.colors.primary },
  { key: 'attendance', icon: 'time-outline',          label: 'Frekwencja',          desc: 'Zameldowania i spóźnienia pracowników',       color: '#22C55E' },
  { key: 'tasks',      icon: 'list-outline',          label: 'Zadania',             desc: 'Wykonanie zadań przez zespół w miesiącu',     color: '#F97316' },
  { key: 'confirmations', icon: 'thermometer-outline', label: 'Kontrole i pomiary', desc: 'Temperatury lodówek i inne zadania cykliczne — pełna lista z każdego dnia', color: '#0D9488' },
];

const CONF_TYPE_LABEL: Record<string, string> = { values: 'Pomiary', photo: 'Zdjęcie', description: 'Opis' };
const CONF_STATUS_LABEL: Record<string, string> = { ok: 'OK', low: 'Za nisko', high: 'Za wysoko', empty: '—' };
const CONF_STATUS_COLOR: Record<string, string> = { ok: '#22C55E', low: '#2563EB', high: '#DC2626', empty: '#9CA3AF' };

const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const MONTHS_SHORT = ['','Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'];

const fmt2 = (n: number) => String(n).padStart(2, '0');

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`;
}

function monthLabel(iso: string) {
  const [y, m] = iso.split('-');
  return `${MONTHS_PL[parseInt(m) - 1]} ${y}`;
}

function shiftMinutes(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let m = (eh * 60 + em) - (sh * 60 + sm);
  if (m < 0) m += 24 * 60;
  return m;
}

type EmpHourRow = { emp: DbProfile; totalMinutes: number; shiftsCount: number; earnings: number | null };

// ── shared month nav ──────────────────────────────────────────────────────────
function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const prev = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    onChange(`${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`);
  };
  const next = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    onChange(`${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`);
  };
  return (
    <View style={styles.monthRow}>
      <TouchableOpacity onPress={prev} style={styles.monthArrow} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
      <TouchableOpacity onPress={next} style={styles.monthArrow} activeOpacity={0.7}>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// ── summary pill row ──────────────────────────────────────────────────────────
function SummaryRow({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <View style={styles.teamSummaryCard}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', flex: 1 }}>
          {i > 0 && <View style={styles.teamSummaryDivider} />}
          <View style={styles.teamSummaryItem}>
            <Text style={[styles.teamSummaryValue, it.color ? { color: it.color } : undefined]}>{it.value}</Text>
            <Text style={styles.teamSummaryLabel}>{it.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';

  const [selected, setSelected] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth());

  // ── employee filter ──
  const [allEmployees, setAllEmployees] = useState<DbProfile[]>([]);
  const [filterEmpId, setFilterEmpId] = useState<string>('');
  const [showEmpPicker, setShowEmpPicker] = useState(false);

  useEffect(() => {
    if (rid) getEmployees(rid).then(setAllEmployees);
  }, [rid]);

  // ── hours ──
  const [empRows, setEmpRows] = useState<EmpHourRow[]>([]);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [empShifts, setEmpShifts] = useState<Record<string, any[]>>({});
  const [empClockIns, setEmpClockIns] = useState<Record<string, any[]>>({}); // empId -> clock_ins[]
  const [loadingEmp, setLoadingEmp] = useState<string | null>(null);

  // ── edit clock-in modal ──
  const [editCI, setEditCI] = useState<any | null>(null);
  const [editCIIn, setEditCIIn] = useState('');
  const [editCIOut, setEditCIOut] = useState('');
  const [editCISaving, setEditCISaving] = useState(false);

  // ── add shift modal ──
  const [addShiftEmp, setAddShiftEmp] = useState<DbProfile | null>(null);
  const [addShiftDay, setAddShiftDay] = useState('');
  const [addShiftStart, setAddShiftStart] = useState('');
  const [addShiftEnd, setAddShiftEnd] = useState('');
  const [addShiftSaving, setAddShiftSaving] = useState(false);

  // ── shifts ──
  const [shiftsData, setShiftsData] = useState<any[]>([]);
  const [shiftsProfiles, setShiftsProfiles] = useState<Record<string, DbProfile>>({});

  // ── attendance ──
  const [clockIns, setClockIns] = useState<any[]>([]);
  const [attendanceProfiles, setAttendanceProfiles] = useState<Record<string, DbProfile>>({});

  // ── tasks ──
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [tasksProfiles, setTasksProfiles] = useState<Record<string, DbProfile>>({});
  const [exportingCsv, setExportingCsv] = useState(false);

  // ── confirmations (HACCP / values / photo / description — full daily history) ──
  const [confirmationsData, setConfirmationsData] = useState<DbTaskConfirmation[]>([]);
  const [confirmationsProfiles, setConfirmationsProfiles] = useState<Record<string, DbProfile>>({});
  const [confTaskFilter, setConfTaskFilter] = useState<string>(''); // task_id, '' = all
  const [exportingConfCsv, setExportingConfCsv] = useState(false);

  const monthRange = useCallback((m: string) => {
    const [y, mo] = m.split('-').map(Number);
    const lastDay = new Date(y, mo, 0).getDate();
    return { from: `${m}-01`, to: `${m}-${fmt2(lastDay)}` };
  }, []);

  // ── load hours ──────────────────────────────────────────────────────────────
  const loadHours = useCallback(async (m: string) => {
    setLoading(true);
    setEmpRows([]); setExpandedEmp(null); setEmpShifts({});
    try {
      const { from, to } = monthRange(m);
      const [employees, { data: shifts }] = await Promise.all([
        getEmployees(rid),
        supabase.from('shifts').select('*').eq('restaurant_id', rid).gte('day', from).lte('day', to),
      ]);
      const rows: EmpHourRow[] = employees.map((emp) => {
        const mine = (shifts ?? []).filter((s: any) => s.employee_id === emp.id);
        let totalMinutes = 0;
        mine.forEach((s: any) => { if (s.start_time && s.end_time) totalMinutes += shiftMinutes(s.start_time, s.end_time); });
        const rate = (emp as any).hourly_rate;
        const earnings = rate != null ? Math.round((totalMinutes / 60) * rate * 100) / 100 : null;
        return { emp, totalMinutes, shiftsCount: mine.length, earnings };
      });
      rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
      setEmpRows(rows);
    } catch (e) { console.error('loadHours', e); }
    setLoading(false);
  }, [rid, monthRange]);

  // ── load shifts ─────────────────────────────────────────────────────────────
  const loadShifts = useCallback(async (m: string) => {
    setLoading(true); setShiftsData([]);
    try {
      const { from, to } = monthRange(m);
      const [{ data: shifts }, employees] = await Promise.all([
        supabase.from('shifts').select('*').eq('restaurant_id', rid).gte('day', from).lte('day', to).order('day').order('start_time'),
        getEmployees(rid),
      ]);
      const map: Record<string, DbProfile> = {};
      employees.forEach((e) => { map[e.id] = e; });
      setShiftsData(shifts ?? []);
      setShiftsProfiles(map);
    } catch (e) { console.error('loadShifts', e); }
    setLoading(false);
  }, [rid, monthRange]);

  // ── load attendance ─────────────────────────────────────────────────────────
  const loadAttendance = useCallback(async (m: string) => {
    setLoading(true); setClockIns([]);
    try {
      const { from, to } = monthRange(m);
      const [{ data: clocks }, employees] = await Promise.all([
        supabase.from('clock_ins').select('*').eq('restaurant_id', rid)
          .gte('clock_in_at', from + 'T00:00:00').lte('clock_in_at', to + 'T23:59:59')
          .order('clock_in_at', { ascending: false }),
        getEmployees(rid),
      ]);
      const map: Record<string, DbProfile> = {};
      employees.forEach((e) => { map[e.id] = e; });
      setClockIns(clocks ?? []);
      setAttendanceProfiles(map);
    } catch (e) { console.error('loadAttendance', e); }
    setLoading(false);
  }, [rid, monthRange]);

  // ── load tasks ──────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async (m: string) => {
    setLoading(true); setTasksData([]);
    try {
      const { from, to } = monthRange(m);
      const [{ data: tasks }, employees] = await Promise.all([
        supabase.from('tasks').select('*').eq('restaurant_id', rid)
          .gte('scheduled_date', from).lte('scheduled_date', to)
          .order('scheduled_date').order('assigned_time'),
        getEmployees(rid),
      ]);
      const map: Record<string, DbProfile> = {};
      employees.forEach((e) => { map[e.id] = e; });
      setTasksData(tasks ?? []);
      setTasksProfiles(map);
    } catch (e) { console.error('loadTasks', e); }
    setLoading(false);
  }, [rid, monthRange]);

  // ── load confirmations (values/photo/description — one row per actual completion) ──
  const loadConfirmations = useCallback(async (m: string) => {
    setLoading(true); setConfirmationsData([]);
    try {
      const { from, to } = monthRange(m);
      const [confs, employees] = await Promise.all([
        getTaskConfirmations(rid, from, to),
        getEmployees(rid),
      ]);
      const map: Record<string, DbProfile> = {};
      employees.forEach((e) => { map[e.id] = e; });
      setConfirmationsData(confs);
      setConfirmationsProfiles(map);
    } catch (e) { console.error('loadConfirmations', e); }
    setLoading(false);
  }, [rid, monthRange]);

  const exportTasksCsv = async () => {
    if (filteredTasks.length === 0) return;
    setExportingCsv(true);
    try {
      const taskIds = filteredTasks.map((t: any) => t.id);
      const { data: confirmations } = await supabase
        .from('task_confirmations')
        .select('*')
        .in('task_id', taskIds);
      const confMap: Record<string, any> = {};
      (confirmations ?? []).forEach((c: any) => { confMap[c.task_id] = c; });

      const headers = ['Data', 'Czas', 'Zadanie', 'Opis zadania', 'Pracownik', 'Status', 'Priorytet', 'Typ potwierdzenia', 'Potwierdzono', 'URL zdjecia', 'Notatki do zdjecia', 'Wartosci', 'Opis potwierdzenia'];
      const rows = filteredTasks.map((t: any) => {
        const emp = tasksProfiles[t.assigned_to];
        const empName = emp ? `${emp.first_name} ${emp.last_name}` : '';
        const conf = confMap[t.id];
        let valuesStr = '';
        if (conf?.values_data) {
          try {
            const vals = typeof conf.values_data === 'string' ? JSON.parse(conf.values_data) : conf.values_data;
            if (Array.isArray(vals)) {
              valuesStr = vals.map((v: any) => `${v.label ?? v.name ?? ''}: ${v.value ?? ''}${v.unit ? ' ' + v.unit : ''}`).join('; ');
            } else {
              valuesStr = JSON.stringify(vals);
            }
          } catch { valuesStr = String(conf.values_data); }
        }
        return [
          t.scheduled_date ?? '',
          t.assigned_time ?? '',
          t.title ?? '',
          t.description ?? '',
          empName,
          STATUS_LABEL[t.status] ?? t.status ?? '',
          t.priority ?? '',
          t.confirmation_type ?? '',
          conf ? 'Tak' : 'Nie',
          conf?.photo_url ?? '',
          conf?.photo_notes ?? '',
          valuesStr,
          conf?.description ?? '',
        ].map(escapeCSV).join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      triggerCsvDownload(csv, `zadania_${month}.csv`);
    } catch (e) {
      console.error('exportTasksCsv', e);
      Alert.alert('Błąd', 'Nie udało się wygenerować eksportu.');
    }
    setExportingCsv(false);
  };

  // Long format — one row PER MEASUREMENT (e.g. per fridge, per day) so a whole
  // month of a recurring HACCP task exports as a full, filterable list instead
  // of collapsing to a single row.
  const exportConfirmationsCsv = () => {
    if (filteredConfirmations.length === 0) return;
    setExportingConfCsv(true);
    try {
      const headers = ['Data', 'Godzina', 'Zadanie', 'Pracownik', 'Typ', 'Pomiar', 'Wartość', 'Jednostka', 'Min', 'Max', 'Status pomiaru', 'URL zdjęcia', 'Notatka do zdjęcia', 'Opis / checklista'];
      const rows: string[] = [];
      filteredConfirmations.forEach((c) => {
        const emp = confirmationsProfiles[c.employee_id];
        const empName = emp ? `${emp.first_name} ${emp.last_name}` : '';
        const d = new Date(c.created_at);
        const dateStr = `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;
        const timeStr = `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
        const base = [dateStr, timeStr, c.task_title, empName, CONF_TYPE_LABEL[c.confirmation_type] ?? c.confirmation_type];

        if (c.confirmation_type === 'values' && Array.isArray(c.values_data) && c.values_data.length > 0) {
          c.values_data.forEach((v) => {
            rows.push([
              ...base,
              v.name ?? '', String(v.value ?? ''), v.unit ?? '', String(v.min ?? ''), String(v.max ?? ''),
              CONF_STATUS_LABEL[v.status] ?? v.status ?? '', '', '', '',
            ].map(escapeCSV).join(','));
          });
        } else {
          const checklistStr = Array.isArray(c.checklist_data)
            ? c.checklist_data.map((it) => `${it.label}: ${it.checked ? '✓' : '✗'}`).join('; ')
            : '';
          const desc = [c.description, checklistStr].filter(Boolean).join(' | ');
          rows.push([
            ...base,
            '', '', '', '', '', '',
            c.photo_url ?? '', c.photo_notes ?? '', desc,
          ].map(escapeCSV).join(','));
        }
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const suffix = confTaskFilter ? `_${(confirmationsData.find((c) => c.task_id === confTaskFilter)?.task_title ?? 'zadanie').replace(/[^a-z0-9]+/gi, '_')}` : '';
      triggerCsvDownload(csv, `kontrole${suffix}_${month}.csv`);
    } catch (e) {
      console.error('exportConfirmationsCsv', e);
      Alert.alert('Błąd', 'Nie udało się wygenerować eksportu.');
    }
    setExportingConfCsv(false);
  };

  // auto-reload when month changes for active report
  useEffect(() => {
    if (!selected) return;
    if (selected === 'hours') loadHours(month);
    else if (selected === 'shifts') loadShifts(month);
    else if (selected === 'attendance') loadAttendance(month);
    else if (selected === 'tasks') loadTasks(month);
    else if (selected === 'confirmations') loadConfirmations(month);
  }, [month, selected]);

  const selectReport = (type: ReportType) => {
    setSelected(type);
    setConfTaskFilter('');
    if (type === 'hours') loadHours(month);
    else if (type === 'shifts') loadShifts(month);
    else if (type === 'attendance') loadAttendance(month);
    else if (type === 'tasks') loadTasks(month);
    else if (type === 'confirmations') loadConfirmations(month);
  };

  const toggleEmpExpand = async (empId: string) => {
    if (expandedEmp === empId) { setExpandedEmp(null); return; }
    setExpandedEmp(empId);
    setLoadingEmp(empId);
    const { from, to } = monthRange(month);
    const [{ data: shifts }, { data: cis }] = await Promise.all([
      supabase.from('shifts').select('*').eq('restaurant_id', rid).eq('employee_id', empId).gte('day', from).lte('day', to).order('day'),
      supabase.from('clock_ins').select('*').eq('restaurant_id', rid).eq('employee_id', empId).gte('clock_in_at', from + 'T00:00:00').lte('clock_in_at', to + 'T23:59:59'),
    ]);
    setEmpShifts((prev) => ({ ...prev, [empId]: shifts ?? [] }));
    setEmpClockIns((prev) => ({ ...prev, [empId]: cis ?? [] }));
    setLoadingEmp(null);
  };

  const reloadEmpShifts = async (empId: string) => {
    const { from, to } = monthRange(month);
    const [{ data: shifts }, { data: cis }] = await Promise.all([
      supabase.from('shifts').select('*').eq('restaurant_id', rid).eq('employee_id', empId).gte('day', from).lte('day', to).order('day'),
      supabase.from('clock_ins').select('*').eq('restaurant_id', rid).eq('employee_id', empId).gte('clock_in_at', from + 'T00:00:00').lte('clock_in_at', to + 'T23:59:59'),
    ]);
    setEmpShifts((prev) => ({ ...prev, [empId]: shifts ?? [] }));
    setEmpClockIns((prev) => ({ ...prev, [empId]: cis ?? [] }));
    loadHours(month);
  };

  const openEditCI = (ci: any) => {
    setEditCI(ci);
    const inD = new Date(ci.clock_in_at);
    setEditCIIn(`${fmt2(inD.getHours())}:${fmt2(inD.getMinutes())}`);
    if (ci.clock_out_at) {
      const outD = new Date(ci.clock_out_at);
      setEditCIOut(`${fmt2(outD.getHours())}:${fmt2(outD.getMinutes())}`);
    } else setEditCIOut('');
  };

  const saveEditCI = async () => {
    if (!editCI) return;
    setEditCISaving(true);
    const inBase = editCI.clock_in_at.slice(0, 10);
    const newIn = `${inBase}T${editCIIn}:00`;
    const newOut = editCIOut ? `${inBase}T${editCIOut}:00` : null;
    await supabase.from('clock_ins').update({ clock_in_at: newIn, clock_out_at: newOut, status: newOut ? 'completed' : 'active' }).eq('id', editCI.id);
    setEditCISaving(false);
    setEditCI(null);
    loadAttendance(month);
  };

  const deleteShift = async (shiftId: string, empId: string) => {
    const confirm = Platform.OS === 'web' ? window.confirm('Usunąć tę zmianę?') : await new Promise<boolean>(r => Alert.alert('Usuń zmianę', 'Na pewno?', [{ text: 'Anuluj', onPress: () => r(false) }, { text: 'Usuń', style: 'destructive', onPress: () => r(true) }]));
    if (!confirm) return;
    await supabase.from('shifts').delete().eq('id', shiftId);
    reloadEmpShifts(empId);
  };

  const saveAddShift = async () => {
    if (!addShiftEmp || !addShiftDay || !addShiftStart || !addShiftEnd) return;
    setAddShiftSaving(true);
    const emp = addShiftEmp;
    await supabase.from('shifts').insert({
      restaurant_id: rid,
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      job_title: emp.job_title ?? '',
      day: addShiftDay,
      start_time: addShiftStart,
      end_time: addShiftEnd,
      status: 'potwierdzona',
      location: '',
    });
    setAddShiftSaving(false);
    setAddShiftEmp(null);
    reloadEmpShifts(emp.id);
  };

  // derived — apply employee filter
  const filteredEmpRows = filterEmpId ? empRows.filter(r => r.emp.id === filterEmpId) : empRows;
  const filteredShifts = filterEmpId ? shiftsData.filter(s => s.employee_id === filterEmpId) : shiftsData;
  const filteredClockIns = filterEmpId ? clockIns.filter(c => c.employee_id === filterEmpId) : clockIns;
  const filteredTasks = filterEmpId ? tasksData.filter(t => t.assigned_to === filterEmpId) : tasksData;
  const confByEmp = filterEmpId ? confirmationsData.filter(c => c.employee_id === filterEmpId) : confirmationsData;
  const filteredConfirmations = confTaskFilter ? confByEmp.filter(c => c.task_id === confTaskFilter) : confByEmp;
  const confDistinctTasks = Array.from(
    new Map(confByEmp.map((c) => [c.task_id, c.task_title])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));
  const confOutOfRange = filteredConfirmations.reduce((sum, c) =>
    sum + (Array.isArray(c.values_data) ? c.values_data.filter((v) => v.status && v.status !== 'ok').length : 0), 0);

  const totalTeamHours = filteredEmpRows.reduce((s, r) => s + r.totalMinutes, 0) / 60;
  const totalTeamEarnings = filteredEmpRows.length > 0 && filteredEmpRows.every((r) => r.earnings !== null)
    ? filteredEmpRows.reduce((s, r) => s + (r.earnings ?? 0), 0) : null;
  const shiftsConfirmed = filteredShifts.filter((s) => s.status === 'potwierdzona').length;
  const clockDone = filteredClockIns.filter((c) => c.status === 'completed').length;
  const tasksDone = filteredTasks.filter((t) => t.completed).length;

  const PRIORITY_COLORS: Record<string, string> = { wysoki: theme.colors.error, normalny: theme.colors.orange, niski: theme.colors.green };
  const STATUS_LABEL: Record<string, string> = { do_zrobienia: 'Do zrobienia', w_trakcie: 'W trakcie', czeka_na_zatwierdzenie: 'Czeka', zatwierdzone: 'Zatwierdzone', zamkniete: 'Zamknięte', odrzucone: 'Odrzucone' };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raporty</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        {/* Type cards */}
        <View style={styles.grid}>
          {REPORTS.map((r) => (
            <TouchableOpacity key={r.key} style={[styles.reportCard, selected === r.key && { borderColor: r.color }]} onPress={() => selectReport(r.key)} activeOpacity={0.8}>
              <View style={[styles.iconBox, { backgroundColor: r.color + '18' }]}>
                <Ionicons name={r.icon as any} size={22} color={r.color} />
              </View>
              <Text style={styles.reportLabel}>{r.label}</Text>
              <Text style={styles.reportDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Month nav — shared for all reports */}
        {!!selected && <MonthNav month={month} onChange={setMonth} />}

        {/* Employee filter */}
        {!!selected && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 0, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.colors.card, borderRadius: 12, borderWidth: 1, borderColor: filterEmpId ? theme.colors.primary : theme.colors.border }}
            onPress={() => setShowEmpPicker(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={16} color={filterEmpId ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={{ flex: 1, fontSize: 14, color: filterEmpId ? theme.colors.text : theme.colors.textMuted }}>
              {filterEmpId ? (() => { const e = allEmployees.find(x => x.id === filterEmpId); return e ? `${e.first_name} ${e.last_name}` : 'Pracownik'; })() : 'Wszyscy pracownicy'}
            </Text>
            {filterEmpId
              ? <TouchableOpacity onPress={(e) => { e.stopPropagation(); setFilterEmpId(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              : <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />}
          </TouchableOpacity>
        )}

        {loading && <ActivityIndicator style={{ marginTop: 24 }} size="large" color={REPORTS.find((r) => r.key === selected)?.color ?? theme.colors.primary} />}

        {/* ── HOURS ── */}
        {!loading && selected === 'hours' && (
          <View style={styles.section}>
            <SummaryRow items={[
              { label: 'Razem godzin', value: `${totalTeamHours.toFixed(1)}h` },
              { label: 'Aktywnych', value: String(filteredEmpRows.filter((r) => r.shiftsCount > 0).length) },
              { label: 'Szac. koszt', value: totalTeamEarnings != null ? `${totalTeamEarnings.toFixed(0)} zł` : '—', color: '#A855F7' },
            ]} />
            {filteredEmpRows.length === 0
              ? <EmptyState icon="bar-chart-outline" text="Brak danych za ten miesiąc" />
              : <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>Godziny per pracownik — {monthLabel(month)}</Text>
                  {filteredEmpRows.map((row, idx) => {
                    const hrs = row.totalMinutes / 60;
                    const hrsStr = `${Math.floor(hrs)}h ${fmt2(row.totalMinutes % 60)}m`;
                    const isExp = expandedEmp === row.emp.id;
                    const rate = (row.emp as any).hourly_rate;
                    return (
                      <View key={row.emp.id} style={[styles.empBlock, idx > 0 && styles.borderTop]}>
                        <TouchableOpacity style={styles.empRow} onPress={() => toggleEmpExpand(row.emp.id)} activeOpacity={0.75}>
                          <View style={[styles.empAvatar, { backgroundColor: row.emp.avatar_color ?? theme.colors.primary }]}>
                            <Text style={styles.empAvatarText}>{`${row.emp.first_name?.[0] ?? ''}${row.emp.last_name?.[0] ?? ''}`.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.empName} numberOfLines={1}>{row.emp.first_name} {row.emp.last_name}</Text>
                            <Text style={styles.empJobTitle} numberOfLines={1}>{row.emp.job_title}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <Text style={[styles.empHours, row.shiftsCount === 0 && { color: theme.colors.textMuted }]}>{row.shiftsCount > 0 ? hrsStr : '0h'}</Text>
                            {rate != null
                              ? <Text style={styles.empEarnings}>{row.earnings != null ? `${row.earnings.toFixed(0)} zł` : '—'}</Text>
                              : <Text style={styles.empNoRate}>brak stawki</Text>}
                          </View>
                          <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                        {isExp && (
                          <View style={styles.shiftList}>
                            {loadingEmp === row.emp.id
                              ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 8 }} />
                              : (empShifts[row.emp.id] ?? []).length === 0
                              ? <Text style={styles.noItemText}>Brak zmian w tym miesiącu</Text>
                              : (empShifts[row.emp.id] ?? []).map((s: any) => {
                                  const scheduledMin = s.start_time && s.end_time ? shiftMinutes(s.start_time, s.end_time) : 0;
                                  // find matching clock_in for this shift
                                  const ci = (empClockIns[row.emp.id] ?? []).find((c: any) => c.shift_id === s.id);
                                  const realMin = ci?.clock_in_at && ci?.clock_out_at
                                    ? Math.round((new Date(ci.clock_out_at).getTime() - new Date(ci.clock_in_at).getTime()) / 60000)
                                    : null;
                                  const billMin = realMin ?? scheduledMin;
                                  const earn = rate != null ? ((billMin / 60) * rate).toFixed(2) : null;
                                  const diffMin = realMin != null ? realMin - scheduledMin : null;
                                  const [, mm, dd] = (s.day ?? '').split('-');
                                  const inT = ci?.clock_in_at ? new Date(ci.clock_in_at) : null;
                                  const outT = ci?.clock_out_at ? new Date(ci.clock_out_at) : null;
                                  return (
                                    <View key={s.id} style={[styles.shiftRow, { flexDirection: 'column', gap: 6 }]}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={styles.shiftDateBox}>
                                          <Text style={styles.shiftDay}>{dd}</Text>
                                          <Text style={styles.shiftMon}>{MONTHS_SHORT[parseInt(mm)] ?? ''}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={[styles.shiftTime, { color: theme.colors.textMuted, fontSize: 11 }]}>Plan: {s.start_time} – {s.end_time}</Text>
                                          {ci && inT ? (
                                            <Text style={[styles.shiftTime, { fontSize: 13 }]}>
                                              Realne: {fmt2(inT.getHours())}:{fmt2(inT.getMinutes())}
                                              {outT ? ` – ${fmt2(outT.getHours())}:${fmt2(outT.getMinutes())}` : ' → w trakcie'}
                                            </Text>
                                          ) : (
                                            <Text style={[styles.shiftTime, { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' }]}>Brak zameldowania</Text>
                                          )}
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                          {realMin != null ? (
                                            <Text style={[styles.shiftDuration, { fontWeight: '700', color: theme.colors.text }]}>
                                              {Math.floor(realMin / 60)}h {fmt2(realMin % 60)}m
                                            </Text>
                                          ) : (
                                            <Text style={[styles.shiftDuration, { color: theme.colors.textMuted }]}>
                                              {Math.floor(scheduledMin / 60)}h {fmt2(scheduledMin % 60)}m
                                            </Text>
                                          )}
                                          {earn && <Text style={styles.shiftEarnings}>{earn} zł</Text>}
                                        </View>
                                        <TouchableOpacity onPress={() => deleteShift(s.id, row.emp.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 4 }}>
                                          <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                        </TouchableOpacity>
                                      </View>
                                      {diffMin != null && Math.abs(diffMin) > 1 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 44 }}>
                                          <Ionicons
                                            name={diffMin > 0 ? 'time-outline' : 'warning-outline'}
                                            size={13}
                                            color={diffMin > 0 ? theme.colors.green : '#D97706'}
                                          />
                                          <Text style={{ fontSize: 11, color: diffMin > 0 ? theme.colors.green : '#D97706' }}>
                                            {diffMin > 0 ? `+${Math.floor(diffMin / 60)}h ${fmt2(diffMin % 60)}m nadgodzin` : `-${Math.floor(Math.abs(diffMin) / 60)}h ${fmt2(Math.abs(diffMin) % 60)}m wcześniej`}
                                          </Text>
                                          {(ci?.clock_out_note || ci?.clock_out_reason) && (
                                            <Text style={{ fontSize: 11, color: theme.colors.textMuted }} numberOfLines={1}>· {ci.clock_out_reason || ci.clock_out_note}</Text>
                                          )}
                                        </View>
                                      )}
                                      {ci && !ci.clock_out_at && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 44 }}>
                                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.green }} />
                                          <Text style={{ fontSize: 11, color: theme.colors.green }}>Aktywna zmiana</Text>
                                        </View>
                                      )}
                                    </View>
                                  );
                                })
                            }
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginTop: 4 }}
                              onPress={() => { setAddShiftEmp(row.emp); setAddShiftDay(''); setAddShiftStart(''); setAddShiftEnd(''); }}
                            >
                              <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                              <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: '600' }}>Dodaj zmianę</Text>
                            </TouchableOpacity>
                            {row.shiftsCount > 0 && (
                              <View style={styles.empSummaryRow}>
                                <Text style={styles.empSummaryText}>Razem: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{hrsStr}</Text></Text>
                                {row.earnings != null && <Text style={styles.empSummaryText}>Szac.: <Text style={{ fontWeight: '700', color: '#A855F7' }}>{row.earnings.toFixed(2)} zł</Text></Text>}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
            }
          </View>
        )}

        {/* ── SHIFTS ── */}
        {!loading && selected === 'shifts' && (
          <View style={styles.section}>
            <SummaryRow items={[
              { label: 'Łącznie zmian', value: String(filteredShifts.length) },
              { label: 'Potwierdzone', value: String(shiftsConfirmed), color: theme.colors.green },
              { label: 'Oczekujące', value: String(filteredShifts.length - shiftsConfirmed), color: theme.colors.orange },
            ]} />
            {filteredShifts.length === 0
              ? <EmptyState icon="calendar-outline" text="Brak zmian w tym miesiącu" />
              : <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>Lista zmian — {monthLabel(month)}</Text>
                  {filteredShifts.map((s, idx) => {
                    const emp = shiftsProfiles[s.employee_id];
                    const sm = s.start_time && s.end_time ? shiftMinutes(s.start_time, s.end_time) : 0;
                    const isConf = s.status === 'potwierdzona';
                    const [, mm, dd] = (s.day ?? '').split('-');
                    return (
                      <View key={s.id} style={[styles.listRow, idx > 0 && styles.borderTop]}>
                        <View style={styles.shiftDateBox}>
                          <Text style={styles.shiftDay}>{dd}</Text>
                          <Text style={styles.shiftMon}>{MONTHS_SHORT[parseInt(mm)] ?? ''}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.listRowTitle} numberOfLines={1}>
                            {emp ? `${emp.first_name} ${emp.last_name}` : '—'}
                          </Text>
                          <Text style={styles.listRowSub}>{s.start_time} – {s.end_time} · {Math.floor(sm / 60)}h {fmt2(sm % 60)}m</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: isConf ? theme.colors.greenLight : theme.colors.surface }]}>
                          <Text style={[styles.statusBadgeText, { color: isConf ? theme.colors.green : theme.colors.textMuted }]}>
                            {isConf ? 'Potwierdzono' : 'Oczekuje'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
            }
          </View>
        )}

        {/* ── ATTENDANCE ── */}
        {!loading && selected === 'attendance' && (
          <View style={styles.section}>
            <SummaryRow items={[
              { label: 'Łącznie wejść', value: String(filteredClockIns.length) },
              { label: 'Zakończone', value: String(clockDone), color: theme.colors.green },
              { label: 'Aktywne', value: String(filteredClockIns.length - clockDone), color: theme.colors.primary },
            ]} />
            {filteredClockIns.length === 0
              ? <EmptyState icon="time-outline" text="Brak zameldowań w tym miesiącu" />
              : <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>Frekwencja — {monthLabel(month)}</Text>
                  {filteredClockIns.map((c, idx) => {
                    const emp = attendanceProfiles[c.employee_id];
                    const inTime = new Date(c.clock_in_at);
                    const outTime = c.clock_out_at ? new Date(c.clock_out_at) : null;
                    const durMin = outTime ? Math.round((outTime.getTime() - inTime.getTime()) / 60000) : null;
                    const done = c.status === 'completed';
                    const dd = fmt2(inTime.getDate());
                    const mm = fmt2(inTime.getMonth() + 1);
                    return (
                      <TouchableOpacity key={c.id} style={[styles.listRow, idx > 0 && styles.borderTop]} onPress={() => openEditCI(c)} activeOpacity={0.75}>
                        <View style={styles.shiftDateBox}>
                          <Text style={styles.shiftDay}>{dd}</Text>
                          <Text style={styles.shiftMon}>{MONTHS_SHORT[inTime.getMonth() + 1]}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.listRowTitle} numberOfLines={1}>
                            {emp ? `${emp.first_name} ${emp.last_name}` : '—'}
                          </Text>
                          <Text style={styles.listRowSub}>
                            {fmt2(inTime.getHours())}:{fmt2(inTime.getMinutes())}
                            {outTime ? ` – ${fmt2(outTime.getHours())}:${fmt2(outTime.getMinutes())}` : ' → w trakcie'}
                            {durMin != null ? ` · ${Math.floor(durMin / 60)}h ${fmt2(durMin % 60)}m` : ''}
                          </Text>
                          {c.clock_out_reason ? <Text style={[styles.listRowSub, { color: '#D97706', marginTop: 2 }]} numberOfLines={1}>💬 {c.clock_out_reason}</Text> : null}
                        </View>
                        <Ionicons name="pencil-outline" size={15} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
            }
          </View>
        )}

        {/* ── TASKS ── */}
        {!loading && selected === 'tasks' && (
          <View style={styles.section}>
            <SummaryRow items={[
              { label: 'Łącznie', value: String(filteredTasks.length) },
              { label: 'Wykonane', value: String(tasksDone), color: theme.colors.green },
              { label: 'Realizacja', value: filteredTasks.length > 0 ? `${Math.round(tasksDone / filteredTasks.length * 100)}%` : '—', color: theme.colors.primary },
            ]} />
            {filteredTasks.length === 0
              ? <EmptyState icon="list-outline" text="Brak zadań w tym miesiącu" />
              : <View style={styles.resultCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                    <Text style={[styles.resultTitle, { flex: 1, padding: 0, borderBottomWidth: 0 }]}>Zadania — {monthLabel(month)}</Text>
                    <TouchableOpacity
                      onPress={exportTasksCsv}
                      disabled={exportingCsv}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8 }}
                      activeOpacity={0.75}
                    >
                      {exportingCsv
                        ? <ActivityIndicator size="small" color={theme.colors.primary} />
                        : <Ionicons name="download-outline" size={15} color={theme.colors.primary} />}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>CSV</Text>
                    </TouchableOpacity>
                  </View>
                  {filteredTasks.map((t, idx) => {
                    const emp = tasksProfiles[t.assigned_to];
                    const pc = PRIORITY_COLORS[t.priority] ?? theme.colors.textMuted;
                    const statusLabel = STATUS_LABEL[t.status] ?? t.status;
                    const done = t.completed;
                    const [, mm, dd] = (t.scheduled_date ?? '').split('-');
                    return (
                      <View key={t.id} style={[styles.listRow, idx > 0 && styles.borderTop]}>
                        <View style={styles.shiftDateBox}>
                          <Text style={styles.shiftDay}>{dd}</Text>
                          <Text style={styles.shiftMon}>{MONTHS_SHORT[parseInt(mm)] ?? ''}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                          <Text style={[styles.listRowTitle, done && { textDecorationLine: 'line-through', color: theme.colors.textMuted }]} numberOfLines={1}>{t.title}</Text>
                          <Text style={styles.listRowSub} numberOfLines={1}>
                            {emp ? `${emp.first_name} ${emp.last_name}` : 'Wszyscy'} · {t.assigned_time}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <View style={[styles.statusBadge, { backgroundColor: done ? theme.colors.greenLight : theme.colors.surface }]}>
                            <Text style={[styles.statusBadgeText, { color: done ? theme.colors.green : theme.colors.textSecondary }]}>{statusLabel}</Text>
                          </View>
                          <View style={[styles.priorityDot, { backgroundColor: pc + '22' }]}>
                            <Text style={[styles.priorityDotText, { color: pc }]}>{t.priority}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
            }
          </View>
        )}

        {/* ── CONFIRMATIONS (HACCP / values / photo / description) ── */}
        {!loading && selected === 'confirmations' && (
          <View style={styles.section}>
            {confDistinctTasks.length > 1 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setConfTaskFilter('')}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: !confTaskFilter ? '#0D948818' : theme.colors.card, borderWidth: 1, borderColor: !confTaskFilter ? '#0D9488' : theme.colors.border }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: !confTaskFilter ? '#0D9488' : theme.colors.textSecondary }}>Wszystkie zadania</Text>
                </TouchableOpacity>
                {confDistinctTasks.map(([taskId, title]) => (
                  <TouchableOpacity
                    key={taskId}
                    onPress={() => setConfTaskFilter(taskId)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: confTaskFilter === taskId ? '#0D948818' : theme.colors.card, borderWidth: 1, borderColor: confTaskFilter === taskId ? '#0D9488' : theme.colors.border }}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: confTaskFilter === taskId ? '#0D9488' : theme.colors.textSecondary }} numberOfLines={1}>{title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <SummaryRow items={[
              { label: 'Wpisów', value: String(filteredConfirmations.length) },
              { label: 'Dni z kontrolą', value: String(new Set(filteredConfirmations.map((c) => c.created_at.slice(0, 10))).size) },
              { label: 'Poza normą', value: String(confOutOfRange), color: confOutOfRange > 0 ? theme.colors.error : theme.colors.green },
            ]} />

            {filteredConfirmations.length === 0
              ? <EmptyState icon="thermometer-outline" text="Brak kontroli w tym miesiącu" />
              : <View style={styles.resultCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                    <Text style={[styles.resultTitle, { flex: 1, padding: 0, borderBottomWidth: 0 }]}>Kontrole i pomiary — {monthLabel(month)}</Text>
                    <TouchableOpacity
                      onPress={exportConfirmationsCsv}
                      disabled={exportingConfCsv}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0D948818', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8 }}
                      activeOpacity={0.75}
                    >
                      {exportingConfCsv
                        ? <ActivityIndicator size="small" color="#0D9488" />
                        : <Ionicons name="download-outline" size={15} color="#0D9488" />}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0D9488' }}>CSV — cały miesiąc</Text>
                    </TouchableOpacity>
                  </View>
                  {filteredConfirmations.map((c, idx) => {
                    const emp = confirmationsProfiles[c.employee_id];
                    const d = new Date(c.created_at);
                    const outOfRangeCount = Array.isArray(c.values_data) ? c.values_data.filter((v) => v.status && v.status !== 'ok').length : 0;
                    return (
                      <View key={c.id} style={[{ padding: 14, gap: 8 }, idx > 0 && styles.borderTop]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.shiftDateBox}>
                            <Text style={styles.shiftDay}>{fmt2(d.getDate())}</Text>
                            <Text style={styles.shiftMon}>{MONTHS_SHORT[d.getMonth() + 1]}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.listRowTitle} numberOfLines={1}>{c.task_title}</Text>
                            <Text style={styles.listRowSub} numberOfLines={1}>
                              {emp ? `${emp.first_name} ${emp.last_name}` : ''} · {fmt2(d.getHours())}:{fmt2(d.getMinutes())} · {CONF_TYPE_LABEL[c.confirmation_type] ?? c.confirmation_type}
                            </Text>
                          </View>
                          {outOfRangeCount > 0 && (
                            <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2' }]}>
                              <Text style={[styles.statusBadgeText, { color: theme.colors.error }]}>{outOfRangeCount} poza normą</Text>
                            </View>
                          )}
                        </View>

                        {c.confirmation_type === 'values' && Array.isArray(c.values_data) && c.values_data.length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {c.values_data.map((v, vi) => (
                              <View key={vi} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.colors.background }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: CONF_STATUS_COLOR[v.status] ?? '#9CA3AF' }} />
                                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>{v.name}: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{v.value}{v.unit}</Text></Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {c.confirmation_type === 'photo' && (
                          <Text style={styles.listRowSub}>{c.photo_notes || 'Zdjęcie bez notatki'}</Text>
                        )}

                        {c.confirmation_type === 'description' && (
                          <Text style={styles.listRowSub} numberOfLines={2}>{c.description || '—'}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
            }
          </View>
        )}
      </ScrollView>

      {/* Edit clock-in modal */}
      <Modal visible={!!editCI} animationType="fade" transparent onRequestClose={() => setEditCI(null)}>
        <View style={eStyles.overlay}>
          <View style={eStyles.sheet}>
            <View style={eStyles.header}>
              <Text style={eStyles.title}>Edytuj zameldowanie</Text>
              <TouchableOpacity onPress={() => setEditCI(null)}><Ionicons name="close" size={22} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <View style={eStyles.body}>
              <Text style={eStyles.label}>Godzina przyjścia (HH:MM)</Text>
              <TextInput style={eStyles.input} value={editCIIn} onChangeText={setEditCIIn} placeholder="np. 08:30" placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" />
              <Text style={eStyles.label}>Godzina wyjścia (HH:MM)</Text>
              <TextInput style={eStyles.input} value={editCIOut} onChangeText={setEditCIOut} placeholder="np. 16:00 (puste = aktywne)" placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" />
              <TouchableOpacity style={eStyles.saveBtn} onPress={saveEditCI} disabled={editCISaving} activeOpacity={0.85}>
                {editCISaving ? <ActivityIndicator color="#fff" /> : <Text style={eStyles.saveBtnText}>Zapisz zmiany</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Employee picker modal */}
      <Modal visible={showEmpPicker} animationType="fade" transparent onRequestClose={() => setShowEmpPicker(false)}>
        <View style={eStyles.overlay}>
          <View style={eStyles.sheet}>
            <View style={eStyles.header}>
              <Text style={eStyles.title}>Filtruj po pracowniku</Text>
              <TouchableOpacity onPress={() => setShowEmpPicker(false)}><Ionicons name="close" size={22} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: !filterEmpId ? theme.colors.primaryLight : 'transparent' }}
                onPress={() => { setFilterEmpId(''); setShowEmpPicker(false); }}
                activeOpacity={0.75}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people-outline" size={18} color={theme.colors.textMuted} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: !filterEmpId ? '700' : '400', color: !filterEmpId ? theme.colors.primary : theme.colors.text }}>Wszyscy pracownicy</Text>
                {!filterEmpId && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
              </TouchableOpacity>
              {allEmployees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: filterEmpId === emp.id ? theme.colors.primaryLight : 'transparent' }}
                  onPress={() => { setFilterEmpId(emp.id); setShowEmpPicker(false); }}
                  activeOpacity={0.75}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: (emp as any).avatar_color ?? theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{`${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: filterEmpId === emp.id ? '700' : '400', color: filterEmpId === emp.id ? theme.colors.primary : theme.colors.text }}>{emp.first_name} {emp.last_name}</Text>
                    {emp.job_title ? <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>{emp.job_title}</Text> : null}
                  </View>
                  {filterEmpId === emp.id && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add shift modal */}
      <Modal visible={!!addShiftEmp} animationType="fade" transparent onRequestClose={() => setAddShiftEmp(null)}>
        <View style={eStyles.overlay}>
          <View style={eStyles.sheet}>
            <View style={eStyles.header}>
              <Text style={eStyles.title}>Dodaj zmianę — {addShiftEmp?.first_name} {addShiftEmp?.last_name}</Text>
              <TouchableOpacity onPress={() => setAddShiftEmp(null)}><Ionicons name="close" size={22} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <View style={eStyles.body}>
              <Text style={eStyles.label}>Data (RRRR-MM-DD)</Text>
              <TextInput style={eStyles.input} value={addShiftDay} onChangeText={setAddShiftDay} placeholder={`np. ${month}-15`} placeholderTextColor={theme.colors.textMuted} />
              <Text style={eStyles.label}>Godzina rozpoczęcia (HH:MM)</Text>
              <TextInput style={eStyles.input} value={addShiftStart} onChangeText={setAddShiftStart} placeholder="np. 09:00" placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" />
              <Text style={eStyles.label}>Godzina zakończenia (HH:MM)</Text>
              <TextInput style={eStyles.input} value={addShiftEnd} onChangeText={setAddShiftEnd} placeholder="np. 17:00" placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" />
              <TouchableOpacity style={[eStyles.saveBtn, (!addShiftDay || !addShiftStart || !addShiftEnd) && { opacity: 0.5 }]} onPress={saveAddShift} disabled={addShiftSaving || !addShiftDay || !addShiftStart || !addShiftEnd} activeOpacity={0.85}>
                {addShiftSaving ? <ActivityIndicator color="#fff" /> : <Text style={eStyles.saveBtnText}>Dodaj zmianę</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon as any} size={40} color={theme.colors.border} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  reportCard: { width: '47%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, borderWidth: 2, borderColor: 'transparent', ...theme.shadows.card },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  reportLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  reportDesc: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 15 },

  monthRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, ...theme.shadows.card },
  monthArrow: { padding: 6 },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: theme.colors.text },

  section: { gap: 12 },

  teamSummaryCard: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, ...theme.shadows.card },
  teamSummaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  teamSummaryDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  teamSummaryValue: { fontSize: 19, fontWeight: '800', color: theme.colors.text },
  teamSummaryLabel: { fontSize: 10, color: theme.colors.textMuted, textAlign: 'center' },

  resultCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, overflow: 'hidden', ...theme.shadows.card },
  resultTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, padding: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },

  borderTop: { borderTopWidth: 1, borderTopColor: theme.colors.border },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  listRowTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  listRowSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  priorityDot: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  priorityDotText: { fontSize: 10, fontWeight: '700' },

  empBlock: {},
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  empAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  empAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  empName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empJobTitle: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  empHours: { fontSize: 14, fontWeight: '700', color: theme.colors.text, textAlign: 'right' },
  empEarnings: { fontSize: 12, fontWeight: '600', color: '#A855F7', textAlign: 'right' },
  empNoRate: { fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic' },

  shiftList: { backgroundColor: theme.colors.surface, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  shiftDateBox: { width: 30, alignItems: 'center', flexShrink: 0 },
  shiftDay: { fontSize: 15, fontWeight: '800', color: theme.colors.text, lineHeight: 17 },
  shiftMon: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },
  shiftTime: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  shiftDuration: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  shiftEarnings: { fontSize: 13, fontWeight: '700', color: '#A855F7' },
  noItemText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' },
  empSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, paddingTop: 10, marginTop: 4 },
  empSummaryText: { fontSize: 12, color: theme.colors.textSecondary },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
});

const eStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 440, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 8 },
  body: { padding: 20, gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
