import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getPointsForEmployee, getShiftsForEmployee, getTeamPoints } from '../lib/db';
import type { DbPointsLedger, DbShift } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { theme } from '../styles/theme';

const fmt2 = (n: number) => String(n).padStart(2, '0');

function getPeriodRange(offset: number): { label: string; from: string; to: string } {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const year = d.getFullYear();
  const month = d.getMonth();
  const from = `${year}-${fmt2(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${fmt2(month + 1)}-${fmt2(lastDay)}`;
  const months = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
  return { label: `${months[month]} ${year}`, from, to };
}

const EVENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  clock_in_on_time: { label: 'Zameldowanie na czas', icon: 'time-outline', color: '#22C55E' },
  task_completed: { label: 'Zadanie wykonane', icon: 'checkmark-circle-outline', color: theme.colors.primary },
  training_completed: { label: 'Szkolenie ukończone', icon: 'school-outline', color: '#A855F7' },
  quiz_score: { label: 'Wynik quizu', icon: 'trophy-outline', color: '#F97316' },
};

export default function EarningsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [tab, setTab] = useState<'hours' | 'points' | 'ranking'>('hours');
  const [periodOffset, setPeriodOffset] = useState(0);
  const period = getPeriodRange(periodOffset);

  const [points, setPoints] = useState<DbPointsLedger[]>([]);
  const [ranking, setRanking] = useState<{ employee_id: string; total: number; name: string }[]>([]);
  const [shifts, setShifts] = useState<DbShift[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);
  const totalHours = shifts.reduce((sum, s) => {
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    return sum + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
  }, 0);
  const totalEarnings = hourlyRate ? totalHours * hourlyRate : null;

  const load = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const [myPoints, teamPts, myShifts, profileData] = await Promise.all([
      getPointsForEmployee(rid, user.id),
      getTeamPoints(rid),
      getShiftsForEmployee(rid, user.id, period.from, period.to),
      supabase.from('profiles').select('hourly_rate').eq('id', user.id).single(),
    ]);
    setPoints(myPoints);
    setShifts(myShifts);
    setHourlyRate((profileData.data as any)?.hourly_rate ?? null);
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').eq('restaurant_id', rid);
    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => { nameMap[p.id] = `${p.first_name} ${p.last_name}`; });
    setRanking(teamPts.map((r: { employee_id: string; total: number }) => ({ ...r, name: nameMap[r.employee_id] ?? 'Nieznany' })));
    setLoading(false);
  }, [rid, user, period.from, period.to]);

  useEffect(() => { load(); }, [load]);

  const myRank = ranking.findIndex((r) => r.employee_id === user?.id) + 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Godziny i zarobki</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([['hours','Godziny'], ['points','Punkty'], ['ranking','Ranking']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} /> : (

          tab === 'hours' ? (
            <>
              {/* Period selector */}
              <View style={styles.periodRow}>
                <TouchableOpacity onPress={() => setPeriodOffset(o => o - 1)} style={styles.periodBtn}>
                  <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.periodLabel}>{period.label}</Text>
                <TouchableOpacity onPress={() => setPeriodOffset(o => Math.min(0, o + 1))} style={styles.periodBtn} disabled={periodOffset >= 0}>
                  <Ionicons name="chevron-forward" size={18} color={periodOffset >= 0 ? theme.colors.border : theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Summary cards */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{totalHours.toFixed(1)}h</Text>
                  <Text style={styles.statLabel}>Przepracowane</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="cash-outline" size={20} color="#22C55E" />
                  </View>
                  <Text style={[styles.statValue, { color: '#22C55E' }]}>
                    {totalEarnings != null ? `${totalEarnings.toFixed(2)} zł` : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Szacowane zarobki</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="star-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={[styles.statValue, { color: '#D97706' }]}>
                    {hourlyRate != null ? `${hourlyRate} zł/h` : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Stawka godzinowa</Text>
                </View>
              </View>

              {hourlyRate == null && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.infoText}>Stawka godzinowa nie jest ustawiona. Poproś managera o jej skonfigurowanie w Twoim profilu pracownika.</Text>
                </View>
              )}

              {/* Shifts list */}
              {shifts.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
                  <Text style={styles.emptyText}>Brak zmian w tym okresie</Text>
                </View>
              ) : shifts.map((s) => {
                const [sh, sm] = s.start_time.split(':').map(Number);
                const [eh, em] = s.end_time.split(':').map(Number);
                const h = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
                const earned = hourlyRate ? h * hourlyRate : null;
                const d = new Date(s.day);
                const dayNames = ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'];
                return (
                  <View key={s.id} style={styles.shiftRow}>
                    <View style={styles.shiftDateCol}>
                      <Text style={styles.shiftDayName}>{dayNames[d.getDay()]}</Text>
                      <Text style={styles.shiftDate}>{s.day.slice(8)}.{s.day.slice(5, 7)}</Text>
                    </View>
                    <View style={styles.shiftInfo}>
                      <Text style={styles.shiftTime}>{s.start_time} – {s.end_time}</Text>
                      <Text style={styles.shiftJob}>{s.job_title}</Text>
                    </View>
                    <View style={styles.shiftRight}>
                      <Text style={styles.shiftHours}>{h.toFixed(1)}h</Text>
                      {earned != null && <Text style={styles.shiftEarned}>{earned.toFixed(2)} zł</Text>}
                    </View>
                  </View>
                );
              })}
            </>
          ) : tab === 'points' ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryValue}>{totalPoints}</Text>
                  <Text style={styles.summaryLabel}>Punktów łącznie</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryValue}>#{myRank || '—'}</Text>
                  <Text style={styles.summaryLabel}>Ranking</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryValue}>{points.length}</Text>
                  <Text style={styles.summaryLabel}>Zdarzeń</Text>
                </View>
              </View>
              {points.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="trophy-outline" size={48} color={theme.colors.border} />
                  <Text style={styles.emptyText}>Brak punktów — zaczynaj zbierać!</Text>
                </View>
              ) : points.map((p) => {
                const ev = EVENT_LABELS[p.event_type] ?? { label: p.event_type, icon: 'star-outline', color: '#6B7280' };
                return (
                  <View key={p.id} style={styles.pointRow}>
                    <View style={[styles.pointIcon, { backgroundColor: ev.color + '18' }]}>
                      <Ionicons name={ev.icon as any} size={18} color={ev.color} />
                    </View>
                    <View style={styles.pointInfo}>
                      <Text style={styles.pointLabel}>{ev.label}</Text>
                      <Text style={styles.pointDate}>{new Date(p.created_at).toLocaleDateString('pl-PL')}</Text>
                    </View>
                    <Text style={[styles.pointValue, { color: ev.color }]}>+{p.points}</Text>
                  </View>
                );
              })}
            </>
          ) : (
            ranking.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="podium-outline" size={48} color={theme.colors.border} />
                <Text style={styles.emptyText}>Brak danych rankingowych</Text>
              </View>
            ) : ranking.map((r, idx) => {
              const isMe = r.employee_id === user?.id;
              return (
                <View key={r.employee_id} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                  <Text style={[styles.rankPos, idx < 3 && { color: theme.colors.primary, fontWeight: '800' }]}>#{idx + 1}</Text>
                  <Text style={[styles.rankName, isMe && { fontWeight: '700' }]}>{r.name}{isMe ? ' (Ty)' : ''}</Text>
                  <Text style={styles.rankPoints}>{r.total} pkt</Text>
                </View>
              );
            })
          )
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
  summaryCard: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 20, marginBottom: 16 },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800', color: theme.colors.primary, marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: theme.colors.textMuted },
  summaryDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: theme.colors.card, borderRadius: 12, marginBottom: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.white },
  content: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  pointIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pointInfo: { flex: 1 },
  pointLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  pointDate: { fontSize: 11, color: theme.colors.textMuted },
  pointValue: { fontSize: 16, fontWeight: '800' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rankRowMe: { backgroundColor: theme.colors.primaryLight, borderRadius: 10, paddingHorizontal: 12 },
  rankPos: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary, width: 36 },
  rankName: { flex: 1, fontSize: 14, color: theme.colors.text },
  rankPoints: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  // Hours tab
  periodRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 16, marginBottom: 16 },
  periodBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.card, alignItems: 'center' as const, justifyContent: 'center' as const },
  periodLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: 12, padding: 12, alignItems: 'center' as const, gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, textAlign: 'center' as const },
  infoBox: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, backgroundColor: theme.colors.primaryLight, borderRadius: 10, padding: 12, marginBottom: 12 },
  infoText: { flex: 1, fontSize: 12, color: theme.colors.primary, lineHeight: 18 },
  shiftRow: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: theme.colors.card, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  shiftDateCol: { alignItems: 'center' as const, width: 36 },
  shiftDayName: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  shiftDate: { fontSize: 11, color: theme.colors.textMuted },
  shiftInfo: { flex: 1 },
  shiftTime: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  shiftJob: { fontSize: 11, color: theme.colors.textMuted },
  shiftRight: { alignItems: 'flex-end' as const },
  shiftHours: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  shiftEarned: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
});
