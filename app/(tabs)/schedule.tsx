import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getShifts } from '../../lib/db';
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

function ShiftItemCard({ shift, today }: { shift: DbShift; today: string }) {
  const cfg = STATUS_CONFIG[shift.status];
  const isUrlop = shift.status === 'urlop';
  const needsAction = shift.status === 'do_potwierdzenia';

  return (
    <View style={cardStyles.card}>
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

        {!needsAction && !isUrlop && (
          <TouchableOpacity style={cardStyles.detailsBtn}>
            <Text style={cardStyles.detailsBtnText}>Szczegóły</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
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
  detailsBtn: {
    height: 36,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
});

export default function ScheduleScreen() {
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';
  const [allShifts, setAllShifts] = useState<DbShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const [selectedIdx, setSelectedIdx] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    getShifts(rid).then((data) => { setAllShifts(data); setLoading(false); });
  }, [rid]);

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2196C9" />
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
          <Text style={styles.sectionTitle}>Zmiany w tym tygodniu</Text>
          {weekShifts.length > 0 ? (
            weekShifts.map((s) => <ShiftItemCard key={s.id} shift={s} today={today} />)
          ) : (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={44} color={theme.colors.border} />
              <Text style={styles.emptyText}>Brak zmian w tym tygodniu</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: theme.colors.white,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  calCard: {
    backgroundColor: theme.colors.white,
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
    backgroundColor: theme.colors.background,
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 14 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { ...theme.typography.bodySmall, color: theme.colors.textMuted },
});
