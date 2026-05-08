import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { createShift, deleteShift as dbDeleteShift, getEmployees, getShifts } from '../../lib/db';
import type { DbShift } from '../../lib/supabase';
import { theme } from '../../styles/theme';

type ShiftStatus = 'zaplanowana' | 'do_potwierdzenia' | 'potwierdzona' | 'urlop';

const DAY_SHORT = ['Pon', 'Wto', 'Śro', 'Czw', 'Pt', 'Sob', 'Nie'];
const DAY_FULL_PL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const MONTHS_PL = ['Stycznia','Lutego','Marca','Kwietnia','Maja','Czerwca','Lipca','Sierpnia','Września','Października','Listopada','Grudnia'];

function getWeekDates(offset: number): string[] {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return DAY_SHORT.map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + diff + i + offset * 7);
    return d.toISOString().split('T')[0];
  });
}

function formatMonth(dates: string[]): string {
  const d = new Date(dates[0]);
  return `${d.toLocaleString('pl-PL', { month: 'long' }).charAt(0).toUpperCase() + d.toLocaleString('pl-PL', { month: 'long' }).slice(1)} ${d.getFullYear()}`;
}

const STATUS_CONFIG: Record<ShiftStatus, { label: string; color: string; bg: string }> = {
  do_potwierdzenia: { label: 'DO POTWIERDZENIA', color: theme.colors.orange, bg: theme.colors.orangeLight },
  zaplanowana: { label: 'ZAPLANOWANA', color: theme.colors.primary, bg: theme.colors.primaryLight },
  potwierdzona: { label: 'POTWIERDZONA', color: theme.colors.green, bg: theme.colors.greenLight },
  urlop: { label: 'URLOP', color: theme.colors.textSecondary, bg: theme.colors.background },
};

function ShiftItemCard({ shift, today, onDelete }: { shift: DbShift; today: string; onDelete?: () => void }) {
  const router = useRouter();
  const cfg = STATUS_CONFIG[shift.status];
  const isUrlop = shift.status === 'urlop';
  const needsAction = shift.status === 'do_potwierdzenia';

  return (
    <TouchableOpacity style={cardStyles.card} activeOpacity={0.85} onPress={() => router.push({ pathname: '/shift-detail', params: { shiftId: shift.id } } as any)}>
      <View style={[cardStyles.accent, { backgroundColor: cfg.color }]} />
      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <View style={[cardStyles.iconBox, { backgroundColor: needsAction ? theme.colors.orangeLight : theme.colors.primaryLight }]}>
            <Ionicons
              name={isUrlop ? 'umbrella-outline' : 'time-outline'}
              size={20}
              color={needsAction ? theme.colors.orange : theme.colors.primary}
            />
          </View>
          <View style={cardStyles.info}>
            {isUrlop ? (
              <Text style={cardStyles.urlop}>Urlop</Text>
            ) : (
              <>
                <Text style={cardStyles.shiftDate}>
                  {DAY_FULL_PL[new Date(shift.day).getDay() === 0 ? 6 : new Date(shift.day).getDay() - 1]},{' '}
                  {new Date(shift.day).getDate()} {MONTHS_PL[new Date(shift.day).getMonth()].slice(0,3)}.
                </Text>
                <Text style={cardStyles.shiftTime}>{shift.start_time} - {shift.end_time} • {shift.location}</Text>
              </>
            )}
          </View>
          <View style={[cardStyles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[cardStyles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {needsAction && (
          <View style={cardStyles.actionRow}>
            <TouchableOpacity style={cardStyles.rejectBtn}>
              <Text style={cardStyles.rejectBtnText}>Odrzuć</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cardStyles.confirmBtn}>
              <Text style={cardStyles.confirmBtnText}>Potwierdź</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={cardStyles.bottomRow}>
          {!needsAction && !isUrlop && (
            <TouchableOpacity style={cardStyles.detailsBtn}>
              <Text style={cardStyles.detailsBtnText}>Szczegóły</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={cardStyles.deleteBtn}>
              <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 12,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  accent: { width: 4 },
  body: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  urlop: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  shiftDate: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  shiftTime: { fontSize: 12, color: theme.colors.textSecondary },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  confirmBtn: {
    flex: 1,
    height: 38,
    backgroundColor: theme.colors.navy,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.white },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailsBtn: {
    flex: 1,
    height: 36,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.errorLight, alignItems: 'center', justifyContent: 'center' },
  detailsBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
});

export default function ScheduleScreen() {
  const { user, isOwner } = useAuth();
  const rid = user?.restaurantId ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [allShifts, setAllShifts] = useState<DbShift[]>([]);
  const [employees, setEmployees] = useState<import('../../lib/supabase').DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const [selEmployee, setSelEmployee] = useState('');
  const [newDay, setNewDay] = useState(new Date().toISOString().split('T')[0]);
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('16:00');
  const [newLocation, setNewLocation] = useState('Restauracja');
  const [saving, setSaving] = useState(false);

  const [selectedIdx, setSelectedIdx] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    Promise.all([getShifts(rid), isOwner ? getEmployees(rid) : Promise.resolve([])])
      .then(([shifts, emps]) => { setAllShifts(shifts); setEmployees(emps); setLoading(false); });
  }, [rid]);

  const handleDeleteShift = async (id: string) => {
    setAllShifts((prev) => prev.filter((s) => s.id !== id));
    await dbDeleteShift(id);
  };

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
    setShowModal(false);
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </SafeAreaView>
  );

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const monthLabel = useMemo(() => formatMonth(weekDates), [weekDates]);
  const today = new Date().toISOString().split('T')[0];
  const weekShifts = useMemo(() => allShifts.filter((s) => weekDates.includes(s.day)), [weekDates, allShifts]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mój Grafik</Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Month + Week Nav */}
        <View style={styles.calCard}>
          <View style={styles.monthRow}>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.navBtn} onPress={() => setWeekOffset((w) => w - 1)}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => setWeekOffset((w) => w + 1)}>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.daysRow}>
            {DAY_SHORT.map((label, i) => {
              const date = new Date(weekDates[i]);
              const dayNum = date.getDate();
              const isSelected = i === selectedIdx;
              const isToday = weekDates[i] === today;
              const hasShift = weekShifts.some((s) => s.day === weekDates[i]);

              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.dayBtn, isSelected && styles.dayBtnSelected]}
                  onPress={() => setSelectedIdx(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayShort, isSelected && styles.dayShortSelected]}>{label}</Text>
                  <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{dayNum}</Text>
                  {hasShift && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? theme.colors.white : (isToday ? theme.colors.orange : theme.colors.primary) }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Shifts for the week */}
        <View style={styles.body}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Zmiany w tym tygodniu</Text>
            {isOwner && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color={theme.colors.white} />
                <Text style={styles.addBtnText}>Dodaj zmianę</Text>
              </TouchableOpacity>
            )}
          </View>
          {weekShifts.length > 0 ? (
            weekShifts.map((s) => <ShiftItemCard key={s.id} shift={s} today={today} onDelete={isOwner ? () => handleDeleteShift(s.id) : undefined} />)
          ) : (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={44} color={theme.colors.border} />
              <Text style={styles.emptyText}>{isOwner ? 'Brak zmian — dodaj pierwszą zmianę' : 'Brak zmian w tym tygodniu'}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Shift Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>
            <View style={mStyles.header}>
              <Text style={mStyles.headerTitle}>Nowa zmiana</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
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
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setShowModal(false)} activeOpacity={0.7}>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  calCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.card,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  navRow: { flexDirection: 'row', gap: 4 },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    minWidth: 38,
  },
  dayBtnSelected: { backgroundColor: theme.colors.navy },
  dayShort: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4 },
  dayShortSelected: { color: 'rgba(255,255,255,0.75)' },
  dayNum: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  dayNumSelected: { color: theme.colors.white },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  body: { padding: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.borderRadius.full },
  addBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { ...theme.typography.bodySmall, color: theme.colors.textMuted },
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
