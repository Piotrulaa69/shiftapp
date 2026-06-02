import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileHeader from '../../components/MobileHeader';
import TimePickerRow from '../../components/TimePickerRow';
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

const HOUR_HEIGHT = 64;
const TIME_START = 6;
const TIME_END = 24;
const GRID_HOURS = Array.from({ length: TIME_END - TIME_START }, (_, i) => TIME_START + i);
const TIME_COL_W = 52;

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
/* ── helpers ── */
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const DEFAULT_LOCATIONS = ['Restauracja', 'Bar', 'Kuchnia', 'Sala', 'Taras', 'Recepcja', 'Magazyn', 'Biuro'];

const FIXED_STATUSES: ShiftStatus[] = ['zaplanowana', 'do_potwierdzenia', 'potwierdzona', 'urlop'];

/* ── tiny sub-components ── */

function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (Platform.OS === 'web') {
    return (
      <View style={sm.dateFieldWrap}>
        <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
        <TextInput
          style={[sm.input, { paddingLeft: 36, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }]}
          value={value}
          onChangeText={onChange}
          placeholder="RRRR-MM-DD"
          placeholderTextColor={theme.colors.textMuted}
          {...(Platform.OS === 'web' ? { type: 'date' } as any : {})}
        />
      </View>
    );
  }
  return (
    <View style={sm.dateFieldWrap}>
      <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
      <TextInput
        style={[sm.input, { paddingLeft: 36 }]}
        value={value}
        onChangeText={onChange}
        placeholder="RRRR-MM-DD"
        placeholderTextColor={theme.colors.textMuted}
      />
    </View>
  );
}

function LocationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isCustom = !DEFAULT_LOCATIONS.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={[{ marginBottom: 8, maxHeight: 50 }, Platform.OS === 'web' && { overflowX: 'auto' } as any]}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
      >
        {DEFAULT_LOCATIONS.map(loc => (
          <TouchableOpacity
            key={loc}
            style={[sm.chip, value === loc && !showCustom && sm.chipActive]}
            onPress={() => { onChange(loc); setShowCustom(false); }}
            activeOpacity={0.7}
          >
            <Text style={[sm.chipText, value === loc && !showCustom && sm.chipTextActive]}>{loc}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[sm.chip, showCustom && sm.chipActive]}
          onPress={() => setShowCustom(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={13} color={showCustom ? '#fff' : theme.colors.textSecondary} />
          <Text style={[sm.chipText, showCustom && sm.chipTextActive]}>Inna</Text>
        </TouchableOpacity>
      </ScrollView>
      {showCustom && (
        <TextInput
          style={sm.input}
          value={isCustom || showCustom ? value : ''}
          onChangeText={onChange}
          placeholder="Wpisz lokalizację..."
          placeholderTextColor={theme.colors.textMuted}
          autoFocus
        />
      )}
    </View>
  );
}

function StatusPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showCustom, setShowCustom] = useState(!FIXED_STATUSES.includes(value as ShiftStatus));
  const [customVal, setCustomVal] = useState(FIXED_STATUSES.includes(value as ShiftStatus) ? '' : value);
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={[{ marginBottom: 8, maxHeight: 50 }, Platform.OS === 'web' && { overflowX: 'auto' } as any]}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
      >
        {FIXED_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          const active = value === s && !showCustom;
          return (
            <TouchableOpacity
              key={s}
              style={[sm.chip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
              onPress={() => { onChange(s); setShowCustom(false); }}
              activeOpacity={0.7}
            >
              {active && <View style={[sm.chipDot, { backgroundColor: '#fff' }]} />}
              <Text style={[sm.chipText, active && { color: '#fff' }]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[sm.chip, showCustom && sm.chipActive]}
          onPress={() => setShowCustom(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={13} color={showCustom ? '#fff' : theme.colors.textSecondary} />
          <Text style={[sm.chipText, showCustom && sm.chipTextActive]}>Własny</Text>
        </TouchableOpacity>
      </ScrollView>
      {showCustom && (
        <TextInput
          style={sm.input}
          value={customVal}
          onChangeText={v => { setCustomVal(v); onChange(v); }}
          placeholder="Np. szkolenie, zastępstwo..."
          placeholderTextColor={theme.colors.textMuted}
          autoFocus
        />
      )}
    </View>
  );
}

/* ── main ShiftModal ── */
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
  const cfg = STATUS_CONFIG[shift.status as ShiftStatus] ?? { color: theme.colors.primary, bg: theme.colors.primaryLight, label: shift.status };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editDay, setEditDay] = useState(shift.day);
  const [editStart, setEditStart] = useState(shift.start_time);
  const [editEnd, setEditEnd] = useState(shift.end_time);
  const [editLocation, setEditLocation] = useState(shift.location);
  const [editStatus, setEditStatus] = useState(shift.status as string);
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
      status: editStatus as ShiftStatus,
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
      {/* Header */}
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

      {/* Body */}
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={sm.body} keyboardShouldPersistTaps="handled">
        {!editing ? (
          <>
            <View style={sm.infoRow}>
              <Ionicons name="person-outline" size={16} color={theme.colors.textMuted} />
              <Text style={sm.infoText}>{shift.employee_name}</Text>
            </View>
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
            {/* Pracownik */}
            <Text style={sm.label}>Pracownik</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={Platform.OS !== 'web'}
              style={[sm.hScroll, Platform.OS === 'web' && { overflowX: 'auto' } as any]}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingBottom: 4 }}
            >
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
            </ScrollView>

            {/* Data */}
            <Text style={sm.label}>Data</Text>
            <DatePickerField value={editDay} onChange={setEditDay} />

            {/* Godziny */}
            <TimePickerRow label="Godzina od" value={editStart} onChange={setEditStart} />
            <TimePickerRow label="Godzina do" value={editEnd} onChange={setEditEnd} />

            {/* Lokalizacja */}
            <Text style={sm.label}>Lokalizacja</Text>
            <LocationPicker value={editLocation} onChange={setEditLocation} />

            {/* Status */}
            <Text style={sm.label}>Status</Text>
            <StatusPicker value={editStatus} onChange={setEditStatus} />
          </>
        )}
      </ScrollView>

      {/* Footer */}
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
                    {deleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={sm.deleteBtnText}>Usuń</Text>}
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
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={sm.saveBtnText}>Zapisz</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const sm = StyleSheet.create({
  container: { borderRadius: 18, overflow: 'hidden', backgroundColor: theme.colors.card },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  sub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingVertical: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoText: { fontSize: 14, color: theme.colors.text, fontWeight: '400' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 14, alignSelf: 'flex-start' },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  dateFieldWrap: { position: 'relative', justifyContent: 'center' },
  hScroll: { marginBottom: 4, height: 40 },
  timeScroll: { marginBottom: 4, height: 36 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },
  timeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, minWidth: 52, alignItems: 'center' },
  timeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  timeChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  timeChipTextActive: { color: '#fff' },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  confirmText: { flex: 1, fontSize: 13, fontWeight: '500', color: theme.colors.error },
  cancelSmall: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  cancelSmallText: { fontSize: 13, fontWeight: '500', color: theme.colors.text },
  deleteBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.colors.error },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  deleteOutline: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.error },
  deleteOutlineText: { fontSize: 13, fontWeight: '500', color: theme.colors.error },
  saveBtn: { flex: 1, height: 42, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cancelBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
});

export default function ScheduleScreen() {
  const { user, isOwner, isManager } = useAuth();
  const router = useRouter();
  const canManage = isOwner || isManager;
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

  useFocusEffect(useCallback(() => {
    if (!rid) return;
    setLoading(true);
    Promise.all([getShifts(rid), isOwner ? getEmployees(rid) : Promise.resolve([])])
      .then(([shifts, emps]) => { setAllShifts(shifts); setEmployees(emps); setLoading(false); });
  }, [rid, isOwner]));

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

    const isWeekend = isSat || isSun;
    return (
      <Pressable
        key={key}
        style={[
          isDesktop ? cal.cellDesktop : cal.cell,
          isWeekend && cal.cellWeekend,
          isOtherMonth && cal.cellOtherMonth,
          isToday && cal.cellToday,
          isSelected && cal.cellSelected,
          isDragOver && cal.cellDragOver,
        ]}
        onPress={() => { setSelectedDate(dateStr); setCalView('day'); }}
        {...(webDropProps as any)}
      >
        <View style={cal.cellHeader}>
          <View style={[cal.dayNumWrap, isToday && cal.dayNumTodayWrap]}>
            <Text style={[
              cal.dayNum,
              isOtherMonth && cal.dayNumOther,
              isWeekend && !isOtherMonth && cal.dayNumWeekend,
              isToday && cal.dayNumTodayText,
            ]}>{d.getDate()}</Text>
          </View>
          {holiday && (
            <Text style={cal.holidayText} numberOfLines={1}>{holiday}</Text>
          )}
        </View>
        <View style={cal.eventsWrap}>
          {cellShifts.slice(0, isDesktop ? 3 : 2).map((s) => {
            const cfg = STATUS_CONFIG[s.status as ShiftStatus];
            const webDragProps = Platform.OS === 'web' ? {
              draggable: isOwner,
              onDragStart: (e: any) => { e.stopPropagation(); handleDragStart(s.id); },
            } : {};
            const barColor = cfg?.color ?? theme.colors.primary;
            return (
              <Pressable
                key={s.id}
                style={[cal.eventBar, { borderLeftColor: barColor, backgroundColor: barColor + '18' }, dragShiftId === s.id && cal.eventDragging]}
                onPress={(e) => { (e as any).stopPropagation?.(); setSelectedShift(s); }}
                {...(webDragProps as any)}
              >
                <Text style={[cal.eventText, { color: barColor }]} numberOfLines={1}>{s.start_time} {s.employee_name?.split(' ')[0]}</Text>
              </Pressable>
            );
          })}
          {cellShifts.length > (isDesktop ? 3 : 2) && (
            <Pressable onPress={() => { setSelectedDate(dateStr); setCalView('day'); }}>
              <Text style={cal.moreText}>+{cellShifts.length - (isDesktop ? 3 : 2)}</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      {isDesktop ? (
        <View style={styles.header}>
          <Text style={styles.title}>Mój Grafik</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={styles.legendBtn} onPress={() => setShowLegend(true)} activeOpacity={0.7}>
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {canManage && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#7C3AED', flexDirection: 'row', gap: 5 }]}
                onPress={() => router.push('/(tabs)/schedule-ai' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.addBtnText}>Grafik AI</Text>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity style={styles.addBtn} onPress={() => { setNewDay(selectedDate); setShowCreateModal(true); }} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color={theme.colors.white} />
                <Text style={styles.addBtnText}>Dodaj zmianę</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <MobileHeader
          left={<Text style={styles.title}>Mój Grafik</Text>}
          center={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity style={styles.legendBtn} onPress={() => setShowLegend(true)} activeOpacity={0.7}>
                <Ionicons name="help-circle-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {canManage && (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: '#7C3AED' }]}
                  onPress={() => router.push('/(tabs)/schedule-ai' as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={14} color="#fff" />
                </TouchableOpacity>
              )}
              {isOwner && (
                <TouchableOpacity style={styles.addBtn} onPress={() => { setNewDay(selectedDate); setShowCreateModal(true); }} activeOpacity={0.8}>
                  <Ionicons name="add" size={16} color={theme.colors.white} />
                  <Text style={styles.addBtnText}>Dodaj</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

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
            <Text style={styles.monthLabel}>{formatMonthLabel(curYear, curMonth)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity style={styles.todayBtn} onPress={() => setSelectedDate(today)} activeOpacity={0.8}>
                <Text style={styles.todayBtnText}>Dziś</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateMonth(-1)} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateMonth(1)} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Day headers */}
          <View style={cal.headerRow}>
            {DAY_HEADER.map((h, i) => (
              <Text key={h} style={[cal.headerCell, (i === 5 || i === 6) && cal.headerCellWeekend]}>{h}</Text>
            ))}
          </View>

          {/* Grid – full height on both desktop and mobile */}
          <View style={{ flex: 1 }}>
            {monthGrid.map((week, wi) => (
              <View key={wi} style={isDesktop ? cal.gridRowDesktop : cal.gridRowMobile}>
                {week.map((d, di) => renderMonthCell(d, `${wi}-${di}`))}
              </View>
            ))}
          </View>
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
                const isDropTarget = dragOverDate === d && dragShiftId !== null;
                const webColProps = isOwner && Platform.OS === 'web' ? {
                  onDragOver: (e: any) => { e.preventDefault(); handleDragOver(d); },
                  onDragLeave: () => setDragOverDate(null),
                  onDrop: (e: any) => { e.preventDefault(); handleDrop(d); },
                } as any : {};
                return (
                  <View
                    key={d}
                    style={[wv.dayCol, (i === 5 || i === 6) && wv.weekendBg, isDropTarget && wv.dayColDrop]}
                    {...webColProps}
                  >
                    {GRID_HOURS.map((h) => <View key={h} style={wv.hourLine} />)}
                    {colLayout.map(({ shift: s, col, totalCols }) => {
                      const top = shiftTop(s.start_time);
                      const height = shiftHeight(s.start_time, s.end_time);
                      const cfg = STATUS_CONFIG[s.status as ShiftStatus];
                      const wPct = `${Math.floor(100 / totalCols) - 1}%`;
                      const lPct = `${Math.floor((col / totalCols) * 100) + 1}%`;
                      const isDraggingThis = dragShiftId === s.id;
                      const webShiftProps = isOwner && Platform.OS === 'web' ? {
                        draggable: true,
                        onDragStart: (e: any) => { e.dataTransfer.effectAllowed = 'move'; handleDragStart(s.id); },
                        onDragEnd: () => { setDragShiftId(null); setDragOverDate(null); },
                      } as any : {};
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[
                            wv.event,
                            { top, height, left: lPct as any, width: wPct as any, backgroundColor: cfg?.color ?? theme.colors.primary },
                            isDraggingThis && { opacity: 0.35 },
                            isOwner && Platform.OS === 'web' && { cursor: 'grab' } as any,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => setSelectedShift(s)}
                          {...webShiftProps}
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
      <Modal visible={showLegend} animationType="fade" transparent onRequestClose={() => setShowLegend(false)}>
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
      <Modal visible={showCreateModal} animationType="fade" transparent onRequestClose={() => setShowCreateModal(false)}>
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
              <Text style={mStyles.label}>Data</Text>
              <DatePickerField value={newDay} onChange={setNewDay} />
              <View style={mStyles.row}>
                <TimePickerRow label="Godzina od" value={newStart} onChange={setNewStart} />
                <TimePickerRow label="Godzina do" value={newEnd} onChange={setNewEnd} />
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
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
  },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  dayHeaderLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 5, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  weekendLabel: { color: '#EF4444' },
  dateCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dateCircleToday: { backgroundColor: theme.colors.primary },
  dateNum: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  weekendNum: { color: '#EF4444' },
  dateNumToday: { color: '#fff' },

  allDayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 28,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  allDayLabel: { fontSize: 9, color: theme.colors.textMuted, letterSpacing: 0.3 },
  allDayCell: { flex: 1, paddingHorizontal: 3, paddingVertical: 4 },
  weekendBg: { backgroundColor: '#FAFAF8' },
  holidayPill: { backgroundColor: '#DCFCE7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  holidayPillText: { fontSize: 9, color: '#15803D', fontWeight: '600' },

  timeCol: { width: TIME_COL_W, borderRightWidth: 1, borderRightColor: theme.colors.border, backgroundColor: theme.colors.card },
  timeLabelRow: { height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 10, paddingTop: 4 },
  timeLabelText: { fontSize: 10, color: theme.colors.textMuted, letterSpacing: 0.2 },

  dayCol: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    position: 'relative',
    backgroundColor: theme.colors.card,
  },
  dayColDrop: {
    backgroundColor: theme.colors.primaryLight,
  },
  hourLine: {
    height: HOUR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  event: {
    position: 'absolute',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 8,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  hourOverlayLine: {
    height: HOUR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  eventTitle: { fontSize: 11, color: '#FFF', fontWeight: '600', letterSpacing: 0.1 },
  eventSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  emptyDay: { position: 'absolute', top: 160, left: 0, right: 0, alignItems: 'center', gap: 8 },
  emptyDayText: { fontSize: 13, color: theme.colors.textMuted },

  dayViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dayViewDateArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
  },
  dateCircleLg: { width: 38, height: 38, borderRadius: 19 },
  dateNumLg: { fontSize: 19, fontWeight: '500', color: theme.colors.text },

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
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#EF4444',
    marginLeft: -4,
    flexShrink: 0,
  },
  nowBar: { flex: 1, height: 1.5, backgroundColor: '#EF4444' },
});

/* ── Month grid styles ── */
const cal = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 0,
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.textMuted,
    paddingVertical: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  headerCellWeekend: { color: '#DC2626', opacity: 0.7 },
  gridRow: { flexDirection: 'row', minHeight: 90, overflow: 'hidden' },
  gridRowMobile: { flexDirection: 'row', flex: 1, overflow: 'hidden' },
  gridRowDesktop: { flexDirection: 'row', flex: 1, overflow: 'hidden' },
  emptyCell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F8F7F3',
  },
  cellDesktop: {
    flex: 1,
    minHeight: 0,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: 6,
    paddingHorizontal: 5,
    paddingBottom: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  cell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: 6,
    paddingHorizontal: 5,
    paddingBottom: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  cellWeekend: { backgroundColor: '#FAFAF8' },
  cellOtherMonth: { backgroundColor: '#F8F7F3' },
  cellSelected: { backgroundColor: '#EFF6FF' },
  cellToday: { backgroundColor: '#FAFCFF' },
  cellDragOver: { backgroundColor: '#EFF6FF' },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dayNumWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumTodayWrap: { backgroundColor: theme.colors.primary },
  dayNum: { fontSize: 11, fontWeight: '400', color: theme.colors.text },
  dayNumOther: { color: theme.colors.textMuted, opacity: 0.5 },
  dayNumWeekend: { color: '#DC2626' },
  dayNumTodayText: { color: '#fff', fontWeight: '600' },
  holidayText: {
    fontSize: 8,
    color: '#15803D',
    fontWeight: '500',
    flex: 1,
  },
  eventsWrap: { gap: 2 },
  eventBar: {
    borderRadius: 3,
    borderLeftWidth: 2,
    paddingLeft: 4,
    paddingRight: 3,
    paddingVertical: 1,
    cursor: 'grab' as any,
  },
  eventDragging: { opacity: 0.3 },
  eventText: { fontSize: 10, fontWeight: '500', letterSpacing: 0.05 },
  moreText: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: '400',
    paddingLeft: 2,
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
    ...(Platform.OS === 'web' ? { height: '100vh' as any, overflow: 'hidden' as any } : {}),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 17, fontWeight: '600', color: theme.colors.text, letterSpacing: -0.2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: theme.borderRadius.full },
  addBtnText: { fontSize: 12, fontWeight: '600', color: '#fff', letterSpacing: 0.1 },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  viewBtnActive: { backgroundColor: theme.colors.surface },
  viewBtnText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  viewBtnTextActive: { color: theme.colors.text, fontWeight: '600' },

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
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  monthLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text, letterSpacing: -0.2 },
  navBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  todayBtn: {
    paddingHorizontal: 13, paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  todayBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  todayBtnText: { fontSize: 12, fontWeight: '500', color: theme.colors.text },
  todayBtnTextActive: { color: '#fff' },
  daysRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  dayBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2, borderRadius: 10 },
  dayBtnSelected: { backgroundColor: theme.colors.primaryLight },
  dayShort: { fontSize: 10, fontWeight: '500', color: theme.colors.textMuted, marginBottom: 3 },
  dayShortSelected: { color: theme.colors.primary },
  dayNumWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNumToday: { backgroundColor: theme.colors.primary },
  dayNum: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  dayNumSelected: { color: theme.colors.primary },
  dayNumTodayText: { color: '#fff' },
  weekHolidayText: { fontSize: 8, color: '#15803D', fontWeight: '600', textAlign: 'center', marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },

  body: { padding: 12, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 10 },
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
  holidaysSectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  holidayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  holidayDateBox: { width: 40, alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 8, paddingVertical: 5 },
  holidayDayNum: { fontSize: 16, fontWeight: '700', color: '#15803D' },
  holidayDayShort: { fontSize: 9, fontWeight: '600', color: '#15803D' },
  holidayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#15803D' },
  holidayName: { flex: 1, fontSize: 13, fontWeight: '500', color: theme.colors.text },

  legendBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  legendSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  legendHandle: {
    width: 32, height: 3, borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  legendTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 16 },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  legendDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
});

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  sheetDesktop: {
    maxWidth: 480,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  body: { padding: 20, gap: 4 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
