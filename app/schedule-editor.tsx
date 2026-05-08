import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createShift, deleteShift, getEmployees, getShifts } from '../lib/db';
import type { DbProfile, DbShift } from '../lib/supabase';
import { theme } from '../styles/theme';

const DAY_SHORT = ['Pon', 'Wto', 'Śro', 'Czw', 'Pt', 'Sob', 'Nie'];

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
  const [location, setLocation] = useState('Sala główna');
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
      status: 'zaplanowana',
    });
    if (created) setShifts((prev) => [...prev, created]);
    setSaving(false);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setSelDay(''); setSelEmployee(''); setStartTime('09:00'); setEndTime('17:00'); setLocation('Sala główna');
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
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Dodaj zmianę</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={mStyles.body}>
              <Text style={mStyles.label}>Data</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
                {weekDates.map((d) => (
                  <TouchableOpacity key={d} style={[mStyles.dateChip, selDay === d && mStyles.dateChipActive]} onPress={() => setSelDay(d)}>
                    <Text style={[mStyles.dateChipText, selDay === d && mStyles.dateChipTextActive]}>{DAY_SHORT[weekDates.indexOf(d)]} {new Date(d).getDate()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={mStyles.label}>Pracownik</Text>
              {employees.map((e) => (
                <TouchableOpacity key={e.id} style={[mStyles.empRow, selEmployee === e.id && mStyles.empRowActive]} onPress={() => setSelEmployee(e.id)}>
                  <View style={[mStyles.empAvatar, { backgroundColor: e.avatar_color }]}>
                    <Text style={mStyles.empInitials}>{(e.first_name[0] + e.last_name[0]).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={[mStyles.empName, selEmployee === e.id && { fontWeight: '700' }]}>{e.first_name} {e.last_name}</Text>
                    <Text style={mStyles.empJob}>{e.job_title}</Text>
                  </View>
                  {selEmployee === e.id && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              ))}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.label}>Od</Text>
                  <TextInput style={mStyles.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.label}>Do</Text>
                  <TextInput style={mStyles.input} value={endTime} onChangeText={setEndTime} placeholder="17:00" placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>

              <Text style={mStyles.label}>Lokalizacja</Text>
              <TextInput style={mStyles.input} value={location} onChangeText={setLocation} placeholder="Sala główna" placeholderTextColor={theme.colors.textMuted} />

              <TouchableOpacity style={mStyles.saveBtn} onPress={handleCreate} activeOpacity={0.85} disabled={saving || !selDay || !selEmployee}>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
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
});
