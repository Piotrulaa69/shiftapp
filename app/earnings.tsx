import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getPointsForEmployee, getTeamPoints } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { DbPointsLedger, DbProfile } from '../lib/supabase';
import { theme } from '../styles/theme';

const EVENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  clock_in_on_time: { label: 'Clock-in na czas', icon: 'time-outline', color: '#22C55E' },
  task_completed: { label: 'Zadanie wykonane', icon: 'checkmark-circle-outline', color: theme.colors.primary },
  training_completed: { label: 'Szkolenie ukończone', icon: 'school-outline', color: '#A855F7' },
  quiz_score: { label: 'Wynik quizu', icon: 'trophy-outline', color: '#F97316' },
};

export default function EarningsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [tab, setTab] = useState<'points' | 'ranking'>('points');
  const [points, setPoints] = useState<DbPointsLedger[]>([]);
  const [ranking, setRanking] = useState<{ employee_id: string; total: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);

  const load = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const [myPoints, teamPts] = await Promise.all([
      getPointsForEmployee(rid, user.id),
      getTeamPoints(rid),
    ]);
    setPoints(myPoints);
    // Enrich ranking with names
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').eq('restaurant_id', rid);
    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => { nameMap[p.id] = `${p.first_name} ${p.last_name}`; });
    setRanking(teamPts.map((r) => ({ ...r, name: nameMap[r.employee_id] ?? 'Nieznany' })));
    setLoading(false);
  }, [rid, user]);

  useEffect(() => { load(); }, [load]);

  const myRank = ranking.findIndex((r) => r.employee_id === user?.id) + 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Punkty i zarobki</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Summary Card */}
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

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'points' && styles.tabActive]} onPress={() => setTab('points')}>
          <Text style={[styles.tabText, tab === 'points' && styles.tabTextActive]}>Moje punkty</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'ranking' && styles.tabActive]} onPress={() => setTab('ranking')}>
          <Text style={[styles.tabText, tab === 'ranking' && styles.tabTextActive]}>Ranking</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} /> : tab === 'points' ? (
          points.length === 0 ? (
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
          })
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
});
