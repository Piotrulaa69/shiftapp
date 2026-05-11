import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createShift, deleteShift, getEmployees, getShifts } from '../lib/db';
import type { DbProfile, DbShift } from '../lib/supabase';
import { theme } from '../styles/theme';

const DAY_SHORT = ['Pon', 'Wto', 'Śro', 'Czw', 'Pt', 'Sob', 'Nie'];

const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`);
  TIMES.push(`${String(h).padStart(2, '0')}:30`);
}

const LOCATIONS = ['Restauracja', 'Bar', 'Kuchnia', 'Sala', 'Taras', 'Recepcja'];
const STATUSES: Array<{ value: string; label: string }> = [
  { value: 'zaplanowana', label: 'ZAPLANOWANA' },
  { value: 'do_potwierdzenia', label: 'DO POTWIERDZENIA' },
  { value: 'potwierdzona', label: 'POTWIERDZONA' },
  { value: 'ukonczona', label: 'UKOŃCZONA' },
];

const isWeb = Platform.OS === 'web';

function ArrowScroller({ children, style }: { children: React.ReactNode; style?: object }) {
  const divRef = useRef<any>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  if (!isWeb) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }} style={style}>
        {children}
      </ScrollView>
    );
  }

  const handleMouseDown = (e: any) => {
    isDragging.current = true;
    dragStartX.current = e.pageX - divRef.current.offsetLeft;
    dragScrollLeft.current = divRef.current.scrollLeft;
    divRef.current.style.cursor = 'grabbing';
    divRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: any) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - divRef.current.offsetLeft;
    const walk = x - dragStartX.current;
    divRef.current.scrollLeft = dragScrollLeft.current - walk;
  };

  const stopDrag = () => {
    isDragging.current = false;
    if (divRef.current) {
      divRef.current.style.cursor = 'grab';
      divRef.current.style.userSelect = '';
    }
  };

  return (
    <div
      ref={divRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 6,
        paddingTop: 2,
        cursor: 'grab',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        ...(style as any),
      }}
    >
      {children}
    </div>
  );
}

function getWeekDates(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day.toISOString().split('T')[0];
  });
}

export default function ScheduleEditorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState<DbShift[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [selDay, setSelDay] = useState('');
  const [selEmployee, setSelEmployee] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState('Restauracja');
  const [shiftStatus, setShiftStatus] = useState('zaplanowana');
  const [saving, setSaving] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = `${weekDates[0].slice(5)} — ${weekDates[6].slice(5)}`;

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const [s, e] = await Promise.all([getShifts(rid), getEmployees(rid)]);
    setShifts(s);
    setEmployees(e);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  const weekShifts = shifts.filter((s) => weekDates.includes(s.day));

  const handleCreate = async () => {
    if (!selDay || !selEmployee) return;
    const emp = employees.find((e) => e.id === selEmployee);
    if (!emp) return;
    setSaving(true);
    const created = await createShift(rid, {
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      job_title: emp.job_title,
      day: selDay,
      start_time: startTime,
      end_time: endTime,
      location,
      status: shiftStatus as any,
    });
    if (created) setShifts((prev) => [...prev, created]);
    setSaving(false);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setSelDay(''); setSelEmployee(''); setStartTime('09:00'); setEndTime('17:00'); setLocation('Restauracja'); setShiftStatus('zaplanowana');
  };

  const handleDelete = async (id: string) => {
    const doDelete = async () => {
      setShifts((prev) => prev.filter((s) => s.id !== id));
      await deleteShift(id);
    };
    if (Platform.OS === 'web') {
      if (confirm('Usunąć zmianę?')) doDelete();
    } else {
      Alert.alert('Usuń zmianę', 'Czy na pewno?', [{ text: 'Anuluj', style: 'cancel' }, { text: 'Usuń', style: 'destructive', onPress: doDelete }]);
    }
  };

  const openAdd = (day: string) => {
    setSelDay(day);
    setShowModal(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edytor grafiku</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Week Nav */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset((o) => o - 1)}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity onPress={() => setWeekOffset((o) => o + 1)}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {weekDates.map((day, idx) => {
            const dayShifts = weekShifts.filter((s) => s.day === day);
            const dayName = DAY_SHORT[idx];
            const dayNum = new Date(day).getDate();
            const isToday = day === new Date().toISOString().split('T')[0];

            return (
              <View key={day} style={styles.dayRow}>
                <View style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{dayName}</Text>
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{dayNum}</Text>
                </View>
                <View style={styles.dayShifts}>
                  {dayShifts.length === 0 ? (
                    <TouchableOpacity style={styles.emptySlot} onPress={() => openAdd(day)}>
                      <Ionicons name="add-outline" size={16} color={theme.colors.textMuted} />
                      <Text style={styles.emptySlotText}>Dodaj zmianę</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {dayShifts.map((s) => (
                        <View key={s.id} style={styles.shiftChip}>
                          <View style={styles.shiftChipContent}>
                            <Text style={styles.shiftChipTime}>{s.start_time}–{s.end_time}</Text>
                            <Text style={styles.shiftChipName} numberOfLines={1}>{s.employee_name}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDelete(s.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={18} color={theme.colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addSmall} onPress={() => openAdd(day)}>
                        <Ionicons name="add" size={14} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add Shift Modal */}
      <Modal visible={showModal} animationType="fade" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Dodaj zmianę</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={mStyles.body} showsVerticalScrollIndicator={false}>
              <Text style={mStyles.label}>PRACOWNIK</Text>
              <ArrowScroller style={{ marginBottom: 4 }}>
                {employees.map((e) => {
                  const isActive = selEmployee === e.id;
                  return (
                    <TouchableOpacity key={e.id} style={[mStyles.empChip, isActive && mStyles.empChipActive]} onPress={() => setSelEmployee(e.id)} activeOpacity={0.75}>
                      <View style={[mStyles.empAvatar, { backgroundColor: isActive ? theme.colors.primary : e.avatar_color }]}>
                        <Text style={mStyles.empInitials}>{(e.first_name[0] + e.last_name[0]).toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={[mStyles.empChipName, isActive && { color: theme.colors.primary }]} numberOfLines={1}>{e.first_name}</Text>
                        <Text style={mStyles.empChipJob} numberOfLines={1}>{e.job_title}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ArrowScroller>

              <Text style={mStyles.label}>DATA</Text>
              <ArrowScroller style={{ marginBottom: 4 }}>
                {weekDates.map((d) => (
                  <TouchableOpacity key={d} style={[mStyles.chip, selDay === d && mStyles.chipActive]} onPress={() => setSelDay(d)}>
                    <Text style={[mStyles.chipText, selDay === d && mStyles.chipTextActive]}>{DAY_SHORT[weekDates.indexOf(d)]} {new Date(d).getDate()}</Text>
                  </TouchableOpacity>
                ))}
              </ArrowScroller>

              <Text style={mStyles.label}>GODZINA OD</Text>
              <ArrowScroller style={{ marginBottom: 4 }}>
                {TIMES.map((t) => (
                  <TouchableOpacity key={t} style={[mStyles.chip, startTime === t && mStyles.chipActive]} onPress={() => setStartTime(t)}>
                    <Text style={[mStyles.chipText, startTime === t && mStyles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ArrowScroller>

              <Text style={mStyles.label}>GODZINA DO</Text>
              <ArrowScroller style={{ marginBottom: 4 }}>
                {TIMES.map((t) => (
                  <TouchableOpacity key={t} style={[mStyles.chip, endTime === t && mStyles.chipActive]} onPress={() => setEndTime(t)}>
                    <Text style={[mStyles.chipText, endTime === t && mStyles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ArrowScroller>

              <Text style={mStyles.label}>LOKALIZACJA</Text>
              <ArrowScroller style={{ marginBottom: 4 }}>
                {LOCATIONS.map((loc) => (
                  <TouchableOpacity key={loc} style={[mStyles.chip, location === loc && mStyles.chipActive]} onPress={() => setLocation(loc)}>
                    <Text style={[mStyles.chipText, location === loc && mStyles.chipTextActive]}>{loc}</Text>
                  </TouchableOpacity>
                ))}
              </ArrowScroller>

              <Text style={mStyles.label}>STATUS</Text>
              <ArrowScroller style={{ marginBottom: 4 }}>
                {STATUSES.map((s) => (
                  <TouchableOpacity key={s.value} style={[mStyles.chip, shiftStatus === s.value && mStyles.chipActive]} onPress={() => setShiftStatus(s.value)}>
                    <Text style={[mStyles.chipText, shiftStatus === s.value && mStyles.chipTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ArrowScroller>

              <TouchableOpacity style={[mStyles.saveBtn, (!selDay || !selEmployee) && { opacity: 0.5 }]} onPress={handleCreate} activeOpacity={0.85} disabled={saving || !selDay || !selEmployee}>
                {saving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>Dodaj zmianę</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  weekLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  dayRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  dayLabel: { width: 48, alignItems: 'center', paddingTop: 4 },
  dayLabelToday: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 4 },
  dayName: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  dayNameToday: { color: theme.colors.white },
  dayNum: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  dayNumToday: { color: theme.colors.white },
  dayShifts: { flex: 1, marginLeft: 12, gap: 6 },
  emptySlot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border },
  emptySlotText: { fontSize: 12, color: theme.colors.textMuted },
  shiftChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: 10, padding: 10, gap: 8 },
  shiftChipContent: { flex: 1 },
  shiftChipTime: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  shiftChipName: { fontSize: 12, color: theme.colors.text },
  addSmall: { alignSelf: 'flex-start', padding: 4 },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '85%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  dateChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dateChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  dateChipTextActive: { color: theme.colors.white },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  empRowActive: { backgroundColor: theme.colors.primaryLight, borderRadius: 10, paddingHorizontal: 8 },
  empAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 13, color: theme.colors.text },
  empJob: { fontSize: 11, color: theme.colors.textMuted },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.white },
  empChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, minWidth: 80 },
  empChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  empChipName: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  empChipJob: { fontSize: 10, color: theme.colors.textMuted },
});
