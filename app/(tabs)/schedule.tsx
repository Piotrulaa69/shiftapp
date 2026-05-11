import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { createShift, deleteShift as dbDeleteShift, updateShift as dbUpdateShift, getEmployees, getShifts } from '../../lib/db';
import type { DbShift } from '../../lib/supabase';
import { theme } from '../../styles/theme';

type ShiftStatus = 'zaplanowana' | 'do_potwierdzenia' | 'potwierdzona' | 'urlop';
type CalView = 'month' | 'week' | 'day';

const DAY_SHORT = ['Pon', 'Wto', 'Śro', 'Czw', 'Pt', 'Sob', 'Nie'];
const DAY_HEADER = ['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SO', 'ND'];
const DAY_FULL_PL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const MONTHS_GEN = ['Stycznia','Lutego','Marca','Kwietnia','Maja','Czerwca','Lipca','Sierpnia','Września','Października','Listopada','Grudnia'];

function fmt(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function easterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getPolishHolidays(year: number): Record<string, string> {
  const easter = easterDate(year);
  return {
    [`${year}-01-01`]: 'Nowy Rok',
    [`${year}-01-06`]: 'Trzech Króli',
    [fmt(easter)]: 'Wielkanoc',
    [fmt(addDays(easter, 1))]: 'Pon. Wielkanocny',
    [`${year}-05-01`]: 'Święto Pracy',
    [`${year}-05-03`]: 'Święto Konstytucji',
    [fmt(addDays(easter, 49))]: 'Zesłanie Ducha Św.',
    [fmt(addDays(easter, 60))]: 'Boże Ciało',
    [`${year}-08-15`]: 'Wniebowzięcie NMP',
    [`${year}-11-01`]: 'Wszyscy Święci',
    [`${year}-11-11`]: 'Dzień Niepodległości',
    [`${year}-12-25`]: 'Boże Narodzenie',
    [`${year}-12-26`]: '2. Boże Narodzenie',
  };
}

function getMonthGrid(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const grid: (string | null)[][] = [];
  let week: (string | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(fmt(new Date(year, month, d)));
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); grid.push(week); }
  return grid;
}

function getWeekDates(baseDate: Date): string[] {
  const dow = baseDate.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return DAY_SHORT.map((_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + diff + i);
    return fmt(d);
  });
}

function formatMonthLabel(year: number, month: number): string {
  return `${MONTHS_PL[month]} ${year}`;
}

const HOUR_HEIGHT = 56;
const TIME_START = 6;
const TIME_END = 24;
const GRID_HOURS = Array.from({ length: TIME_END - TIME_START }, (_, i) => TIME_START + i);
const TIME_COL_W = 44;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m ?? 0);
}
function shiftTop(start: string): number {
  return Math.max(0, timeToMinutes(start) - TIME_START * 60) * (HOUR_HEIGHT / 60);
}
function shiftHeight(start: string, end: string): number {
  return Math.max((timeToMinutes(end) - timeToMinutes(start)) * (HOUR_HEIGHT / 60), 28);
}

function layoutEvents(shifts: DbShift[]) {
  if (!shifts.length) return [] as Array<{ shift: DbShift; col: number; totalCols: number }>;
  const sorted = [...shifts].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  const placed: Array<{ shift: DbShift; col: number }> = [];
  for (const s of sorted) {
    const sS = timeToMinutes(s.start_time), sE = timeToMinutes(s.end_time);
    const usedCols = new Set(placed.filter(({ shift: o }) => timeToMinutes(o.start_time) < sE && timeToMinutes(o.end_time) > sS).map(c => c.col));
    let col = 0; while (usedCols.has(col)) col++;
    placed.push({ shift: s, col });
  }
  return placed.map(({ shift: s, col }) => {
    const sS = timeToMinutes(s.start_time), sE = timeToMinutes(s.end_time);
    const totalCols = Math.max(...placed.filter(({ shift: o }) => timeToMinutes(o.start_time) < sE && timeToMinutes(o.end_time) > sS).map(c => c.col)) + 1;
    return { shift: s, col, totalCols };
  });
}

const STATUS_CONFIG: Record<ShiftStatus, { label: string; color: string; bg: string }> = {
  do_potwierdzenia: { label: 'DO POTWIERDZENIA', color: theme.colors.orange, bg: theme.colors.orangeLight },
  zaplanowana: { label: 'ZAPLANOWANA', color: theme.colors.primary, bg: theme.colors.primaryLight },
  potwierdzona: { label: 'POTWIERDZONA', color: theme.colors.green, bg: theme.colors.greenLight },
  urlop: { label: 'URLOP', color: theme.colors.textSecondary, bg: theme.colors.background },
};

/* ── Shift Detail / Edit Modal ── */
function ShiftModal({
  shift,
  employees,
  onClose,
  onSave,
  onDelete,
  isOwner,
}: {
  shift: DbShift;
  employees: import('../../lib/supabase').DbProfile[];
  onClose: () => void;
  onSave: (id: string, fields: Partial<DbShift>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isOwner: boolean;
}) {
  const cfg = STATUS_CONFIG[shift.status];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editDay, setEditDay] = useState(shift.day);
  const [editStart, setEditStart] = useState(shift.start_time);
  const [editEnd, setEditEnd] = useState(shift.end_time);
  const [editLocation, setEditLocation] = useState(shift.location);
  const [editStatus, setEditStatus] = useState<ShiftStatus>(shift.status);
  const [editEmployee, setEditEmployee] = useState(shift.employee_id);

  const dayObj = new Date(shift.day + 'T12:00:00');
  const dayLabel = `${DAY_FULL_PL[dayObj.getDay() === 0 ? 6 : dayObj.getDay() - 1]}, ${dayObj.getDate()} ${MONTHS_PL[dayObj.getMonth()]}`;

  const handleSave = async () => {
    setSaving(true);
    const emp = employees.find(e => e.id === editEmployee);
    await onSave(shift.id, {
      day: editDay,
      start_time: editStart,
      end_time: editEnd,
      location: editLocation,
      status: editStatus,
      employee_id: editEmployee,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : shift.employee_name,
      job_title: emp?.job_title ?? shift.job_title,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(shift.id);
    setDeleting(false);
    onClose();
  };

  return (
    <View style={sm.container}>
      <View style={sm.header}>
        <View style={[sm.statusDot, { backgroundColor: cfg.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={sm.name}>{shift.employee_name}</Text>
          <Text style={sm.sub}>{shift.job_title}</Text>
        </View>
        {isOwner && !editing && (
          <TouchableOpacity style={sm.editBtn} onPress={() => setEditing(true)} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={sm.closeBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={sm.body}>
        {!editing ? (
          <>
            <View style={sm.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
              <Text style={sm.infoText}>{dayLabel}</Text>
            </View>
            <View style={sm.infoRow}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
              <Text style={sm.infoText}>{shift.start_time} – {shift.end_time}</Text>
            </View>
            <View style={sm.infoRow}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textMuted} />
              <Text style={sm.infoText}>{shift.location}</Text>
            </View>
            <View style={[sm.badge, { backgroundColor: cfg.bg }]}>
              <View style={[sm.badgeDot, { backgroundColor: cfg.color }]} />
              <Text style={[sm.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={sm.label}>Pracownik</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {employees.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={[sm.chip, editEmployee === e.id && sm.chipActive]}
                    onPress={() => setEditEmployee(e.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[sm.chipText, editEmployee === e.id && sm.chipTextActive]}>
                      {e.first_name} {e.last_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={sm.label}>Data (RRRR-MM-DD)</Text>
            <TextInput style={sm.input} value={editDay} onChangeText={setEditDay} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={sm.label}>Od</Text>
                <TextInput style={sm.input} value={editStart} onChangeText={setEditStart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sm.label}>Do</Text>
                <TextInput style={sm.input} value={editEnd} onChangeText={setEditEnd} />
              </View>
            </View>

            <Text style={sm.label}>Lokalizacja</Text>
            <TextInput style={sm.input} value={editLocation} onChangeText={setEditLocation} />

            <Text style={sm.label}>Status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {(Object.keys(STATUS_CONFIG) as ShiftStatus[]).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[sm.chip, editStatus === s && { backgroundColor: STATUS_CONFIG[s].color, borderColor: STATUS_CONFIG[s].color }]}
                  onPress={() => setEditStatus(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[sm.chipText, editStatus === s && { color: '#fff' }]}>{STATUS_CONFIG[s].label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {isOwner && (
        <View style={sm.footer}>
          {!editing ? (
            <>
              {confirmDelete ? (
                <>
                  <Text style={sm.confirmText}>Na pewno usunąć?</Text>
                  <TouchableOpacity style={sm.cancelSmall} onPress={() => setConfirmDelete(false)} activeOpacity={0.7}>
                    <Text style={sm.cancelSmallText}>Nie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={sm.deleteBtn} onPress={handleDelete} disabled={deleting} activeOpacity={0.7}>
                    {deleting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={sm.deleteBtnText}>Usuń</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={sm.deleteOutline} onPress={() => setConfirmDelete(true)} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
                    <Text style={sm.deleteOutlineText}>Usuń</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={sm.saveBtn} onPress={() => setEditing(true)} activeOpacity={0.7}>
                    <Text style={sm.saveBtnText}>Edytuj zmianę</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity style={sm.cancelBtn} onPress={() => setEditing(false)} activeOpacity={0.7}>
                <Text style={sm.cancelBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sm.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.7}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={sm.saveBtnText}>Zapisz</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const sm = StyleSheet.create({
  container: { borderRadius: 20, overflow: 'hidden', backgroundColor: theme.colors.card },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 18, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoText: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 12, alignSelf: 'flex-start' },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  confirmText: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.error },
  cancelSmall: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.border },
  cancelSmallText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  deleteBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: theme.colors.error },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  deleteOutline: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.error },
  deleteOutlineText: { fontSize: 13, fontWeight: '600', color: theme.colors.error },
  saveBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
});

export default function ScheduleScreen() {
  const { user, isOwner } = useAuth();
  const rid = user?.restaurantId ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const today = fmt(new Date());

  const [allShifts, setAllShifts] = useState<DbShift[]>([]);
  const [employees, setEmployees] = useState<import('../../lib/supabase').DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [calView, setCalView] = useState<CalView>('month');
  const [selectedDate, setSelectedDate] = useState(today);

  /* Create modal */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selEmployee, setSelEmployee] = useState('');
  const [newDay, setNewDay] = useState(today);
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('16:00');
  const [newLocation, setNewLocation] = useState('Restauracja');
  const [saving, setSaving] = useState(false);

  /* Shift detail modal */
  const [selectedShift, setSelectedShift] = useState<DbShift | null>(null);

  /* Legend */
  const [showLegend, setShowLegend] = useState(false);

  /* Drag state (web only) */
  const [dragShiftId, setDragShiftId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const dayScrollRef = useRef<import('react-native').ScrollView>(null);

  const selDateObj = useMemo(() => new Date(selectedDate + 'T12:00:00'), [selectedDate]);
  const curYear = selDateObj.getFullYear();
  const curMonth = selDateObj.getMonth();

  const getNowTop = () => {
    const n = new Date();
    return shiftTop(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
  };

  useEffect(() => {
    if (calView === 'day') {
      const scrollY = Math.max(0, getNowTop() - 120);
      setTimeout(() => dayScrollRef.current?.scrollTo({ y: scrollY, animated: false }), 150);
    }
  }, [calView, selectedDate]);

  const holidays = useMemo(() => ({
    ...getPolishHolidays(curYear),
    ...getPolishHolidays(curYear + 1),
    ...getPolishHolidays(curYear - 1),
  }), [curYear]);

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    Promise.all([getShifts(rid), isOwner ? getEmployees(rid) : Promise.resolve([])])
      .then(([shifts, emps]) => { setAllShifts(shifts); setEmployees(emps); setLoading(false); });
  }, [rid]);

  const handleDeleteShift = useCallback(async (id: string) => {
    setAllShifts((prev) => prev.filter((s) => s.id !== id));
    await dbDeleteShift(id);
  }, []);

  const handleUpdateShift = useCallback(async (id: string, fields: Partial<DbShift>) => {
    const updated = await dbUpdateShift(id, fields);
    if (updated) {
      setAllShifts((prev) => prev.map((s) => s.id === id ? updated : s));
    }
    setSelectedShift(null);
  }, []);

  const handleCreate = async () => {
    const emp = employees.find((e) => e.id === selEmployee);
    if (!emp) return;
    setSaving(true);
    const created = await createShift(rid, {
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      job_title: emp.job_title,
      day: newDay,
      start_time: newStart,
      end_time: newEnd,
      location: newLocation,
      status: 'zaplanowana',
    });
    if (created) setAllShifts((prev) => [...prev, created]);
    setSaving(false);
    setShowCreateModal(false);
  };

  const navigateMonth = (dir: 1 | -1) => {
    const d = new Date(selDateObj);
    d.setMonth(d.getMonth() + dir);
    d.setDate(1);
    setSelectedDate(fmt(d));
  };

  const navigateWeek = (dir: 1 | -1) => setSelectedDate(fmt(addDays(selDateObj, dir * 7)));
  const navigateDay = (dir: 1 | -1) => setSelectedDate(fmt(addDays(selDateObj, dir)));

  /* ── Web drag-and-drop handlers ── */
  const handleDragStart = (shiftId: string) => {
    if (Platform.OS === 'web') setDragShiftId(shiftId);
  };
  const handleDragOver = (dateStr: string) => {
    if (Platform.OS === 'web') setDragOverDate(dateStr);
  };
  const handleDrop = async (dateStr: string) => {
    if (!dragShiftId || !dateStr) return;
    setDragShiftId(null);
    setDragOverDate(null);
    const shift = allShifts.find(s => s.id === dragShiftId);
    if (!shift || shift.day === dateStr) return;
    const updated = await dbUpdateShift(dragShiftId, { day: dateStr });
    if (updated) setAllShifts(prev => prev.map(s => s.id === dragShiftId ? updated : s));
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </SafeAreaView>
  );

  const weekDates = getWeekDates(selDateObj);
  const monthGrid = getMonthGrid(curYear, curMonth);
  const dayShifts = allShifts.filter((s) => s.day === selectedDate);

  /* ── Month cell ── */
  const renderMonthCell = (dateStr: string | null, key: string) => {
    if (!dateStr) return <View key={key} style={cal.emptyCell} />;
    const d = new Date(dateStr + 'T12:00:00');
    const isToday = dateStr === today;
    const isSelected = dateStr === selectedDate;
    const cellShifts = allShifts.filter((s) => s.day === dateStr);
    const holiday = holidays[dateStr];
    const isSun = d.getDay() === 0;
    const isSat = d.getDay() === 6;
    const isOtherMonth = d.getMonth() !== curMonth;
    const isDragOver = dragOverDate === dateStr;

    const webDropProps = Platform.OS === 'web' ? {
      onDragOver: (e: any) => { e.preventDefault(); handleDragOver(dateStr); },
      onDrop: (e: any) => { e.preventDefault(); handleDrop(dateStr); },
      onDragLeave: () => setDragOverDate(null),
    } : {};

    return (
      <Pressable
        key={key}
        style={[cal.cell, isSelected && cal.cellSelected, isDragOver && cal.cellDragOver, isToday && cal.cellToday]}
        onPress={() => { setSelectedDate(dateStr); }}
        {...(webDropProps as any)}
      >
        <View style={[cal.dayNumWrap, isToday && cal.dayNumTodayWrap]}>
          <Text style={[
            cal.dayNum,
            isOtherMonth && cal.dayNumOther,
            (isSat || isSun) && cal.dayNumWeekend,
            isToday && cal.dayNumTodayText,
          ]}>{d.getDate()}</Text>
        </View>
        {holiday && (
          <Text style={cal.holidayText} numberOfLines={1}>{holiday}</Text>
        )}
        {cellShifts.slice(0, 3).map((s) => {
          const cfg = STATUS_CONFIG[s.status as ShiftStatus];
          const webDragProps = Platform.OS === 'web' ? {
            draggable: isOwner,
            onDragStart: (e: any) => { e.stopPropagation(); handleDragStart(s.id); },
          } : {};
          return (
            <Pressable
              key={s.id}
              style={[cal.eventBar, { backgroundColor: cfg?.color ?? theme.colors.primary }, dragShiftId === s.id && cal.eventDragging]}
              onPress={(e) => { (e as any).stopPropagation?.(); setSelectedShift(s); }}
              {...(webDragProps as any)}
            >
              <Text style={cal.eventText} numberOfLines={1}>{s.start_time} {s.employee_name?.split(' ')[0]}</Text>
            </Pressable>
          );
        })}
        {cellShifts.length > 3 && (
          <Pressable onPress={() => { setSelectedDate(dateStr); setCalView('day'); }}>
            <Text style={cal.moreText}>+{cellShifts.length - 3} więcej</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mój Grafik</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.legendBtn} onPress={() => setShowLegend(true)} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={styles.addBtn} onPress={() => { setNewDay(selectedDate); setShowCreateModal(true); }} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color={theme.colors.white} />
              <Text style={styles.addBtnText}>Dodaj zmianę</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggle}>
        {(['month', 'week', 'day'] as CalView[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewBtn, calView === v && styles.viewBtnActive]}
            onPress={() => setCalView(v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewBtnText, calView === v && styles.viewBtnTextActive]}>
              {v === 'day' ? 'Dzień' : v === 'week' ? 'Tydzień' : 'Miesiąc'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── MONTH VIEW ── */}
      {calView === 'month' && (
        <View style={{ flex: 1 }}>
          {/* Nav row */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity style={styles.todayBtn} onPress={() => setSelectedDate(today)} activeOpacity={0.8}>
              <Text style={styles.todayBtnText}>Dziś</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateMonth(-1)} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateMonth(1)} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.monthLabel}>{formatMonthLabel(curYear, curMonth)}</Text>
          </View>

          {/* Day headers */}
          <View style={cal.headerRow}>
            {DAY_HEADER.map((h, i) => (
              <Text key={h} style={[cal.headerCell, (i === 5 || i === 6) && cal.headerCellWeekend]}>{h}</Text>
            ))}
          </View>

          {/* Grid */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {monthGrid.map((week, wi) => (
              <View key={wi} style={cal.gridRow}>
                {week.map((d, di) => renderMonthCell(d, `${wi}-${di}`))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── WEEK VIEW ── */}
      {calView === 'week' && (
        <View style={{ flex: 1 }}>
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.todayBtn} onPress={() => setSelectedDate(today)} activeOpacity={0.8}>
              <Text style={styles.todayBtnText}>Dziś</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateWeek(-1)}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateWeek(1)}>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.monthLabel}>
              {new Date(weekDates[0] + 'T12:00:00').getDate()} – {new Date(weekDates[6] + 'T12:00:00').getDate()} {MONTHS_GEN[new Date(weekDates[6] + 'T12:00:00').getMonth()]} {new Date(weekDates[6] + 'T12:00:00').getFullYear()}
            </Text>
          </View>

          <View style={wv.dayHeaderRow}>
            <View style={{ width: TIME_COL_W }} />
            {weekDates.map((d, i) => {
              const dateObj = new Date(d + 'T12:00:00');
              const isToday = d === today;
              return (
                <TouchableOpacity key={d} style={wv.dayHeaderCell} onPress={() => { setSelectedDate(d); setCalView('day'); }} activeOpacity={0.7}>
                  <Text style={[wv.dayHeaderLabel, (i === 5 || i === 6) && wv.weekendLabel]}>{DAY_HEADER[i]}</Text>
                  <View style={[wv.dateCircle, isToday && wv.dateCircleToday]}>
                    <Text style={[wv.dateNum, (i === 5 || i === 6) && wv.weekendNum, isToday && wv.dateNumToday]}>
                      {dateObj.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {weekDates.some((d) => !!holidays[d]) && (
            <View style={wv.allDayRow}>
              <View style={{ width: TIME_COL_W, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 }}>
                <Text style={wv.allDayLabel}>całodz.</Text>
              </View>
              {weekDates.map((d, i) => (
                <View key={d} style={[wv.allDayCell, (i === 5 || i === 6) && wv.weekendBg]}>
                  {holidays[d] && <View style={wv.holidayPill}><Text style={wv.holidayPillText} numberOfLines={1}>{holidays[d]}</Text></View>}
                </View>
              ))}
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View style={{ flexDirection: 'row', height: GRID_HOURS.length * HOUR_HEIGHT }}>
              <View style={wv.timeCol}>
                {GRID_HOURS.map((h) => (
                  <View key={h} style={wv.timeLabelRow}>
                    <Text style={wv.timeLabelText}>{h}:00</Text>
                  </View>
                ))}
              </View>
              {weekDates.map((d, i) => {
                const colLayout = layoutEvents(allShifts.filter((s) => s.day === d));
                return (
                  <View key={d} style={[wv.dayCol, (i === 5 || i === 6) && wv.weekendBg]}>
                    {GRID_HOURS.map((h) => <View key={h} style={wv.hourLine} />)}
                    {colLayout.map(({ shift: s, col, totalCols }) => {
                      const top = shiftTop(s.start_time);
                      const height = shiftHeight(s.start_time, s.end_time);
                      const cfg = STATUS_CONFIG[s.status as ShiftStatus];
                      const wPct = `${Math.floor(100 / totalCols) - 1}%`;
                      const lPct = `${Math.floor((col / totalCols) * 100) + 1}%`;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[wv.event, { top, height, left: lPct as any, width: wPct as any, backgroundColor: cfg?.color ?? theme.colors.primary }]}
                          activeOpacity={0.85}
                          onPress={() => setSelectedShift(s)}
                        >
                          <Text style={wv.eventTitle} numberOfLines={1}>{s.start_time} {s.employee_name?.split(' ')[0]}</Text>
                          {height >= 42 && <Text style={wv.eventSub} numberOfLines={1}>{s.end_time}</Text>}
                        </TouchableOpacity>
                      );
                    })}
                    <View style={wv.gridOverlay} pointerEvents="none">
                      {GRID_HOURS.map((h) => <View key={h} style={wv.hourOverlayLine} />)}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── DAY VIEW ── */}
      {calView === 'day' && (
        <View style={{ flex: 1 }}>
          <View style={styles.navBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={[styles.todayBtn, selectedDate === today && styles.todayBtnActive]}
                onPress={() => setSelectedDate(today)}
                activeOpacity={0.8}
              >
                <Text style={[styles.todayBtnText, selectedDate === today && styles.todayBtnTextActive]}>Dziś</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateDay(-1)}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateDay(1)}>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.monthLabel}>
              {selDateObj.getDate()} {MONTHS_GEN[selDateObj.getMonth()]} {curYear}
            </Text>
            <View style={{ width: 80 }} />
          </View>

          {holidays[selectedDate] && (
            <View style={wv.allDayRow}>
              <View style={{ width: TIME_COL_W, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 }}>
                <Text style={wv.allDayLabel}>całodz.</Text>
              </View>
              <View style={[wv.allDayCell, { flex: 1 }]}>
                <View style={wv.holidayPill}>
                  <Text style={wv.holidayPillText}>{holidays[selectedDate]}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={wv.dayViewHeader}>
            <View style={{ width: TIME_COL_W }} />
            <View style={wv.dayViewDateArea}>
              <Text style={[wv.dayHeaderLabel, (selDateObj.getDay() === 0 || selDateObj.getDay() === 6) && wv.weekendLabel]}>
                {DAY_SHORT[selDateObj.getDay() === 0 ? 6 : selDateObj.getDay() - 1].toUpperCase()}
              </Text>
              <View style={[wv.dateCircle, wv.dateCircleLg, selectedDate === today && wv.dateCircleToday]}>
                <Text style={[wv.dateNumLg, (selDateObj.getDay() === 0 || selDateObj.getDay() === 6) && wv.weekendNum, selectedDate === today && wv.dateNumToday]}>
                  {selDateObj.getDate()}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView ref={dayScrollRef} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View style={{ flexDirection: 'row', height: GRID_HOURS.length * HOUR_HEIGHT }}>
              <View style={wv.timeCol}>
                {GRID_HOURS.map((h) => (
                  <View key={h} style={wv.timeLabelRow}>
                    <Text style={wv.timeLabelText}>{h}:00</Text>
                  </View>
                ))}
              </View>
              <View style={[wv.dayCol, { flex: 1 }]}>
                {GRID_HOURS.map((h) => <View key={h} style={wv.hourLine} />)}
                {selectedDate === today && (
                  <View style={[wv.nowLine, { top: getNowTop() }]}>
                    <View style={wv.nowDot} />
                    <View style={wv.nowBar} />
                  </View>
                )}
                {layoutEvents(dayShifts).map(({ shift: s, col, totalCols }) => {
                  const top = shiftTop(s.start_time);
                  const height = shiftHeight(s.start_time, s.end_time);
                  const cfg = STATUS_CONFIG[s.status as ShiftStatus];
                  const wPct = `${Math.floor(100 / totalCols) - 1}%`;
                  const lPct = `${Math.floor((col / totalCols) * 100) + 1}%`;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[wv.event, { top, height, left: lPct as any, width: wPct as any, backgroundColor: cfg?.color ?? theme.colors.primary }]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedShift(s)}
                    >
                      <Text style={wv.eventTitle} numberOfLines={1}>{s.employee_name?.split(' ')[0]}, {s.start_time}</Text>
                      {height >= 40 && <Text style={wv.eventSub} numberOfLines={1}>{s.start_time}–{s.end_time} · {s.location}</Text>}
                    </TouchableOpacity>
                  );
                })}
                <View style={wv.gridOverlay} pointerEvents="none">
                  {GRID_HOURS.map((h) => <View key={h} style={wv.hourOverlayLine} />)}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Shift Detail Modal ── */}
      <Modal
        visible={!!selectedShift}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedShift(null)}
      >
        <Pressable style={mStyles.overlay} onPress={() => setSelectedShift(null)}>
          <Pressable style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]} onPress={() => {}}>
            {selectedShift && (
              <ShiftModal
                shift={selectedShift}
                employees={employees}
                isOwner={isOwner}
                onClose={() => setSelectedShift(null)}
                onSave={handleUpdateShift}
                onDelete={handleDeleteShift}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Legend Modal ── */}
      <Modal visible={showLegend} animationType="slide" transparent onRequestClose={() => setShowLegend(false)}>
        <TouchableOpacity style={mStyles.overlay} activeOpacity={1} onPress={() => setShowLegend(false)}>
          <TouchableOpacity style={styles.legendSheet} activeOpacity={1}>
            <View style={styles.legendHandle} />
            <Text style={styles.legendTitle}>Legenda kolorów</Text>
            {([
              { key: 'potwierdzona',     label: 'Potwierdzona',       desc: 'Zmiana zaakceptowana przez pracownika' },
              { key: 'zaplanowana',      label: 'Zaplanowana',        desc: 'Czeka na potwierdzenie pracownika' },
              { key: 'do_potwierdzenia', label: 'Do potwierdzenia',   desc: 'Wymaga akcji kierownika' },
              { key: 'urlop',            label: 'Urlop',              desc: 'Dzień wolny / urlop' },
            ] as Array<{ key: ShiftStatus; label: string; desc: string }>).map(({ key, label, desc }) => (
              <View key={key} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_CONFIG[key].color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.legendLabel}>{label}</Text>
                  <Text style={styles.legendDesc}>{desc}</Text>
                </View>
              </View>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Create Shift Modal ── */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>
            <View style={mStyles.header}>
              <Text style={mStyles.headerTitle}>Nowa zmiana</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={mStyles.body}>
              <Text style={mStyles.label}>Pracownik *</Text>
              <View style={mStyles.chips}>
                {employees.map((e) => (
                  <TouchableOpacity key={e.id} style={[mStyles.chip, selEmployee === e.id && mStyles.chipActive]} onPress={() => setSelEmployee(e.id)} activeOpacity={0.7}>
                    <Text style={[mStyles.chipText, selEmployee === e.id && mStyles.chipTextActive]}>{e.first_name} {e.last_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={mStyles.label}>Data (RRRR-MM-DD)</Text>
              <TextInput style={mStyles.input} value={newDay} onChangeText={setNewDay} placeholder="2025-01-15" placeholderTextColor={theme.colors.textMuted} />
              <View style={mStyles.row}>
                <View style={mStyles.half}>
                  <Text style={mStyles.label}>Od</Text>
                  <TextInput style={mStyles.input} value={newStart} onChangeText={setNewStart} placeholder="08:00" placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={mStyles.half}>
                  <Text style={mStyles.label}>Do</Text>
                  <TextInput style={mStyles.input} value={newEnd} onChangeText={setNewEnd} placeholder="16:00" placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>
              <Text style={mStyles.label}>Lokalizacja</Text>
              <TextInput style={mStyles.input} value={newLocation} onChangeText={setNewLocation} placeholder="Restauracja" placeholderTextColor={theme.colors.textMuted} />
            </ScrollView>
            <View style={mStyles.footer}>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setShowCreateModal(false)} activeOpacity={0.7}>
                <Text style={mStyles.cancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[mStyles.saveBtn, !selEmployee && mStyles.saveBtnDisabled]} onPress={handleCreate} activeOpacity={0.85} disabled={saving || !selEmployee}>
                {saving ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Text style={mStyles.saveText}>Dodaj zmianę</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Time-grid styles ── */
const wv = StyleSheet.create({
  dayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
  },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  dayHeaderLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4 },
  weekendLabel: { color: theme.colors.error },
  dateCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dateCircleToday: { backgroundColor: theme.colors.primary },
  dateNum: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  weekendNum: { color: theme.colors.error },
  dateNumToday: { color: theme.colors.white },

  allDayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 26,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  allDayLabel: { fontSize: 9, color: theme.colors.textMuted },
  allDayCell: { flex: 1, paddingHorizontal: 2, paddingVertical: 3 },
  weekendBg: { backgroundColor: '#FAFAF8' },
  holidayPill: { backgroundColor: '#DCFCE7', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 2 },
  holidayPillText: { fontSize: 9, color: '#16A34A', fontWeight: '700' },

  timeCol: { width: TIME_COL_W, borderRightWidth: 0.5, borderRightColor: theme.colors.border, backgroundColor: theme.colors.card },
  timeLabelRow: { height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 8, paddingTop: 3 },
  timeLabelText: { fontSize: 10, color: theme.colors.textMuted },

  dayCol: {
    flex: 1,
    borderLeftWidth: 0.5,
    borderLeftColor: theme.colors.border,
    position: 'relative',
    backgroundColor: theme.colors.card,
  },
  hourLine: {
    height: HOUR_HEIGHT,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
  },
  event: {
    position: 'absolute',
    borderRadius: 4,
    padding: 3,
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  hourOverlayLine: {
    height: HOUR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.07)',
  },
  eventTitle: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  eventSub: { fontSize: 9, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  emptyDay: { position: 'absolute', top: 160, left: 0, right: 0, alignItems: 'center', gap: 8 },
  emptyDayText: { fontSize: 13, color: theme.colors.textMuted },

  dayViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dayViewDateArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
  },
  dateCircleLg: { width: 36, height: 36, borderRadius: 18 },
  dateNumLg: { fontSize: 18, fontWeight: '700', color: theme.colors.text },

  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none' as any,
  },
  nowDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#EF4444',
    marginLeft: -5,
    flexShrink: 0,
  },
  nowBar: { flex: 1, height: 1.5, backgroundColor: '#EF4444' },
});

/* ── Month grid styles ── */
const cal = StyleSheet.create({
  headerRow: { flexDirection: 'row', backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, paddingVertical: 8 },
  headerCellWeekend: { color: theme.colors.error },
  gridRow: { flexDirection: 'row', flex: 1 },
  emptyCell: { flex: 1, borderWidth: 0.5, borderColor: theme.colors.border, backgroundColor: '#FAFAF8' },
  cell: {
    flex: 1,
    minHeight: 100,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    padding: 5,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  cellSelected: { backgroundColor: theme.colors.primaryLight },
  cellToday: { backgroundColor: '#F0F7FF' },
  cellDragOver: { backgroundColor: '#DBEAFE', borderColor: theme.colors.primary, borderWidth: 1.5 },
  dayNumWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  dayNumTodayWrap: { backgroundColor: theme.colors.primary },
  dayNum: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  dayNumOther: { color: theme.colors.textMuted, fontWeight: '400' },
  dayNumWeekend: { color: theme.colors.error },
  dayNumTodayText: { color: theme.colors.white },
  holidayText: { fontSize: 9, color: '#16A34A', fontWeight: '700', marginBottom: 2 },
  eventBar: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 2,
    cursor: 'grab' as any,
  },
  eventDragging: { opacity: 0.4 },
  eventText: { fontSize: 10, color: '#FFF', fontWeight: '600' },
  moreText: { fontSize: 10, color: theme.colors.primary, fontWeight: '700', marginTop: 2, paddingHorizontal: 3 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.borderRadius.full },
  addBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.white },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  viewBtnActive: { backgroundColor: theme.colors.primary },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  viewBtnTextActive: { color: theme.colors.white },

  calCard: {
    backgroundColor: theme.colors.card,
    margin: 12,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  monthLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  todayBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  todayBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  todayBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  todayBtnTextActive: { color: theme.colors.white },
  daysRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  dayBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2, borderRadius: 10 },
  dayBtnSelected: { backgroundColor: theme.colors.primaryLight },
  dayShort: { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 3 },
  dayShortSelected: { color: theme.colors.primary },
  dayNumWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNumToday: { backgroundColor: theme.colors.primary },
  dayNum: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  dayNumSelected: { color: theme.colors.primary },
  dayNumTodayText: { color: theme.colors.white },
  weekHolidayText: { fontSize: 8, color: '#16A34A', fontWeight: '700', textAlign: 'center', marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },

  body: { padding: 12, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: theme.colors.textMuted },

  holidaysSection: {
    margin: 12,
    marginTop: 0,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.card,
  },
  holidaysSectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  holidayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  holidayDateBox: { width: 40, alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 8, paddingVertical: 5 },
  holidayDayNum: { fontSize: 16, fontWeight: '800', color: '#16A34A' },
  holidayDayShort: { fontSize: 9, fontWeight: '700', color: '#16A34A' },
  holidayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  holidayName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },

  legendBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  legendSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  legendHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  legendTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginBottom: 16 },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  legendDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheetDesktop: { maxWidth: 560, alignSelf: 'center', width: '100%', borderRadius: 24, marginBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: theme.colors.text, backgroundColor: theme.colors.surface },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.white },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  cancelBtn: { flex: 1, height: 50, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  saveBtn: { flex: 2, height: 50, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
});
