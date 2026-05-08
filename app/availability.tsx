import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getAvailability, setAvailability } from '../lib/db';
import type { DbAvailability } from '../lib/supabase';
import { theme } from '../styles/theme';

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'So', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: '#E8F8ED', text: '#22C55E', label: 'Dostępny' },
  unavailable: { bg: '#F3F4F6', text: '#6B7280', label: 'Niedostępny' },
  partial: { bg: '#FFF4E5', text: '#F97316', label: 'Częściowo' },
};

export default function AvailabilityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<DbAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, 'available' | 'unavailable' | 'partial'>>({});

  const [year, month] = currentMonth.split('-').map(Number);

  const loadData = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const avail = await getAvailability(rid, user.id, currentMonth);
    setData(avail);
    setChanges({});
    setLoading(false);
  }, [rid, user, currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Mon=0

  const getStatus = (day: string): 'available' | 'unavailable' | 'partial' => {
    if (changes[day]) return changes[day];
    const found = data.find((d) => d.day === day);
    return found?.status ?? 'available';
  };

  const toggleDay = (day: string) => {
    const current = getStatus(day);
    const next = current === 'available' ? 'unavailable' : current === 'unavailable' ? 'partial' : 'available';
    setChanges((prev) => ({ ...prev, [day]: next }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    for (const [day, status] of Object.entries(changes)) {
      await setAvailability(rid, user.id, day, status);
    }
    setSaving(false);
    loadData();
  };

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Dyspozycyjność</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth}><Ionicons name="chevron-back" size={22} color={theme.colors.primary} /></TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth}><Ionicons name="chevron-forward" size={22} color={theme.colors.primary} /></TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: val.text }]} />
              <Text style={styles.legendText}>{val.label}</Text>
            </View>
          ))}
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} /> : (
          <>
            {/* Day headers */}
            <View style={styles.weekRow}>
              {DAY_NAMES.map((d) => <Text key={d} style={styles.dayHeader}>{d}</Text>)}
            </View>

            {/* Calendar grid */}
            {Array.from({ length: cells.length / 7 }, (_, week) => (
              <View key={week} style={styles.weekRow}>
                {cells.slice(week * 7, week * 7 + 7).map((day, idx) => {
                  if (day === null) return <View key={idx} style={styles.dayCell} />;
                  const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const st = getStatus(dayStr);
                  const colors = STATUS_COLORS[st];
                  return (
                    <TouchableOpacity key={idx} style={[styles.dayCell, { backgroundColor: colors.bg }]} onPress={() => toggleDay(dayStr)} activeOpacity={0.7}>
                      <Text style={[styles.dayNum, { color: colors.text }]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Save button */}
            {Object.keys(changes).length > 0 && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
                {saving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.saveBtnText}>Zapisz ({Object.keys(changes).length} zmian)</Text>}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  monthLabel: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  weekRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, paddingVertical: 6 },
  dayCell: { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});
