import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../styles/theme';

type ReportType = 'shifts' | 'attendance' | 'tasks' | 'hours';

const REPORTS: { key: ReportType; icon: string; label: string; desc: string; color: string }[] = [
  { key: 'shifts', icon: 'calendar-outline', label: 'Zmiany', desc: 'Podsumowanie zmian w okresie', color: theme.colors.primary },
  { key: 'attendance', icon: 'time-outline', label: 'Frekwencja', desc: 'Zameldowania i spóźnienia', color: '#22C55E' },
  { key: 'tasks', icon: 'list-outline', label: 'Zadania', desc: 'Wykonanie zadań przez zespół', color: '#F97316' },
  { key: 'hours', icon: 'bar-chart-outline', label: 'Godziny', desc: 'Przepracowane godziny', color: '#A855F7' },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';

  const [selected, setSelected] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = useCallback(async (type: ReportType) => {
    setLoading(true);
    setSelected(type);
    setReportData(null);

    try {
      if (type === 'shifts') {
        const { data, count } = await supabase.from('shifts').select('*', { count: 'exact' }).eq('restaurant_id', rid);
        const confirmed = (data ?? []).filter((s: any) => s.status === 'potwierdzona').length;
        setReportData({ total: count ?? 0, confirmed, pending: (count ?? 0) - confirmed });
      } else if (type === 'attendance') {
        const { data, count } = await supabase.from('clock_ins').select('*', { count: 'exact' }).eq('restaurant_id', rid);
        const completed = (data ?? []).filter((c: any) => c.status === 'completed').length;
        setReportData({ total: count ?? 0, completed, active: (count ?? 0) - completed });
      } else if (type === 'tasks') {
        const { data, count } = await supabase.from('tasks').select('*', { count: 'exact' }).eq('restaurant_id', rid);
        const done = (data ?? []).filter((t: any) => t.completed).length;
        setReportData({ total: count ?? 0, done, pending: (count ?? 0) - done, rate: count ? Math.round((done / (count as number)) * 100) : 0 });
      } else if (type === 'hours') {
        const { data } = await supabase.from('clock_ins').select('clock_in_at, clock_out_at').eq('restaurant_id', rid).eq('status', 'completed');
        let totalMinutes = 0;
        (data ?? []).forEach((r: any) => {
          if (r.clock_in_at && r.clock_out_at) {
            totalMinutes += (new Date(r.clock_out_at).getTime() - new Date(r.clock_in_at).getTime()) / 60000;
          }
        });
        setReportData({ totalHours: Math.round(totalMinutes / 60), entries: (data ?? []).length });
      }
    } catch (e) {
      console.error('Report error', e);
    }
    setLoading(false);
  }, [rid]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raporty</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} style={isDesktop ? { width: '100%' } : undefined}>
        {/* Report Types */}
        <View style={styles.grid}>
          {REPORTS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.reportCard, selected === r.key && styles.reportCardActive]}
              onPress={() => loadReport(r.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: r.color + '18' }]}>
                <Ionicons name={r.icon as any} size={24} color={r.color} />
              </View>
              <Text style={styles.reportLabel}>{r.label}</Text>
              <Text style={styles.reportDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Report Data */}
        {loading && <ActivityIndicator style={{ marginTop: 30 }} size="large" color={theme.colors.primary} />}

        {!loading && reportData && selected === 'shifts' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Raport: Zmiany</Text>
            <StatRow label="Łącznie zmian" value={reportData.total} />
            <StatRow label="Potwierdzone" value={reportData.confirmed} color={theme.colors.green} />
            <StatRow label="Oczekujące" value={reportData.pending} color={theme.colors.orange} />
          </View>
        )}

        {!loading && reportData && selected === 'attendance' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Raport: Frekwencja</Text>
            <StatRow label="Łącznie wpisów" value={reportData.total} />
            <StatRow label="Zakończone" value={reportData.completed} color={theme.colors.green} />
            <StatRow label="Aktywne" value={reportData.active} color={theme.colors.primary} />
          </View>
        )}

        {!loading && reportData && selected === 'tasks' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Raport: Zadania</Text>
            <StatRow label="Łącznie zadań" value={reportData.total} />
            <StatRow label="Wykonane" value={reportData.done} color={theme.colors.green} />
            <StatRow label="Oczekujące" value={reportData.pending} color={theme.colors.orange} />
            <View style={styles.bigStat}>
              <Text style={styles.bigStatValue}>{reportData.rate}%</Text>
              <Text style={styles.bigStatLabel}>Wskaźnik realizacji</Text>
            </View>
          </View>
        )}

        {!loading && reportData && selected === 'hours' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Raport: Godziny pracy</Text>
            <View style={styles.bigStat}>
              <Text style={styles.bigStatValue}>{reportData.totalHours}h</Text>
              <Text style={styles.bigStatLabel}>Łącznie przepracowanych godzin</Text>
            </View>
            <StatRow label="Zakończonych sesji" value={reportData.entries} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16 },
  contentDesktop: { maxWidth: 720, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  reportCard: { width: '47%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, borderWidth: 2, borderColor: 'transparent' },
  reportCardActive: { borderColor: theme.colors.primary },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  reportLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  reportDesc: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 15 },
  resultCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 20 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statLabel: { fontSize: 14, color: theme.colors.textSecondary },
  statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  bigStat: { alignItems: 'center', paddingVertical: 20 },
  bigStatValue: { fontSize: 42, fontWeight: '800', color: theme.colors.primary },
  bigStatLabel: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
});
