import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileHeader from '../../components/MobileHeader';
import { useAuth } from '../../context/AuthContext';
import { getPointsForEmployee, getTeamPoints, getTrainings } from '../../lib/db';
import type { DbPointsLedger, DbTraining } from '../../lib/supabase';
import { theme } from '../../styles/theme';

type FilterKey = 'wszystkie' | 'dla_mnie' | 'obowiazkowe' | 'nowe';
type TabKey = 'szkolenia' | 'punkty';

const POINT_EVENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  clock_in_on_time: { label: 'Clock-in na czas', icon: 'time-outline', color: '#22C55E' },
  task_completed: { label: 'Zadanie wykonane', icon: 'checkmark-circle-outline', color: theme.colors.primary },
  training_completed: { label: 'Szkolenie ukończone', icon: 'school-outline', color: '#A855F7' },
  quiz_score: { label: 'Wynik quizu', icon: 'trophy-outline', color: '#F97316' },
};

const STATUS_CONFIG = {
  w_toku: { label: 'W TOKU', color: theme.colors.primary, bg: theme.colors.primaryLight },
  ukonczone: { label: 'UKOŃCZONE', color: theme.colors.green, bg: theme.colors.greenLight },
  nierozpoczete: { label: 'NOWE', color: theme.colors.orange, bg: theme.colors.orangeLight },
};

const BADGES = [
  { icon: '☕', label: 'Mistrz\nLatte', color: theme.colors.yellow },
  { icon: '🌿', label: 'BHP\nEkspert', color: theme.colors.green },
  { icon: '😊', label: 'Obsługa\nKlienta', color: theme.colors.purple },
];

const CAT_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  'BHP': { icon: 'shield-checkmark-outline', color: '#EF4444', bg: '#FEF2F2' },
  'Barista': { icon: 'cafe-outline', color: '#F97316', bg: '#FFF7ED' },
  'Obsługa': { icon: 'people-outline', color: '#8B5CF6', bg: '#FAF5FF' },
  'Procedury': { icon: 'document-text-outline', color: '#2563EB', bg: '#EFF6FF' },
  'Kuchnia': { icon: 'restaurant-outline', color: '#22C55E', bg: '#F0FDF4' },
  'Sprzedaż': { icon: 'trending-up-outline', color: '#06B6D4', bg: '#ECFEFF' },
};
const DEFAULT_CAT = { icon: 'book-outline', color: theme.colors.primary, bg: theme.colors.primaryLight };

function TrainingCard({ training }: { training: DbTraining }) {
  const cfg = STATUS_CONFIG[training.status];
  const cat = CAT_CONFIG[training.category] ?? DEFAULT_CAT;
  const router = useRouter();

  const handleStart = () => {
    router.push({
      pathname: '/training/quiz' as any,
      params: { trainingId: training.id, category: training.category, title: training.title },
    });
  };

  const isCompleted = training.status === 'ukonczone';
  const inProgress = training.progress_percent > 0 && training.progress_percent < 100;

  return (
    <TouchableOpacity style={tStyles.card} onPress={handleStart} activeOpacity={0.85}>
      <View style={[tStyles.accent, { backgroundColor: cat.color }]} />
      <View style={tStyles.body}>
        <View style={tStyles.topRow}>
          <View style={[tStyles.iconCircle, { backgroundColor: cat.bg }]}>
            <Ionicons name={cat.icon as any} size={22} color={cat.color} />
          </View>
          <View style={tStyles.titleGroup}>
            <Text style={tStyles.title} numberOfLines={2}>{training.title}</Text>
            <View style={tStyles.metaRow}>
              <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
              <Text style={tStyles.metaText}>{training.duration_min} min</Text>
              <View style={[tStyles.catPill, { backgroundColor: cat.bg }]}>
                <Text style={[tStyles.catText, { color: cat.color }]}>{training.category}</Text>
              </View>
            </View>
          </View>
          <View style={[tStyles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[tStyles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {inProgress && (
          <View style={tStyles.progressGroup}>
            <View style={tStyles.progressBg}>
              <View style={[tStyles.progressFill, { width: `${training.progress_percent}%` }]} />
            </View>
            <Text style={tStyles.progressPct}>{training.progress_percent}%</Text>
          </View>
        )}

        <View style={tStyles.footer}>
          {training.required && (
            <View style={tStyles.requiredTag}>
              <Ionicons name="alert-circle-outline" size={12} color={theme.colors.orange} />
              <Text style={tStyles.requiredTagText}>Obowiązkowe</Text>
            </View>
          )}
          <TouchableOpacity
            style={[tStyles.btn, isCompleted && tStyles.btnDone]}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isCompleted ? 'refresh-outline' : inProgress ? 'play-forward-outline' : 'play-outline'}
              size={14}
              color={isCompleted ? theme.colors.textSecondary : theme.colors.white}
            />
            <Text style={[tStyles.btnText, isCompleted && tStyles.btnTextDone]}>
              {training.progress_percent === 0 ? 'Rozpocznij' : isCompleted ? 'Powtórz' : 'Kontynuuj'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const tStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 10,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  accent: { width: 4 },
  body: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  titleGroup: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: theme.colors.textMuted },
  catPill: { borderRadius: theme.borderRadius.full, paddingHorizontal: 6, paddingVertical: 2 },
  catText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { borderRadius: theme.borderRadius.full, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 9, fontWeight: '800' },
  progressGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressBg: { flex: 1, height: 6, backgroundColor: theme.colors.surface, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  progressPct: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, width: 30, textAlign: 'right' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredTag: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  requiredTagText: { fontSize: 11, fontWeight: '600', color: theme.colors.orange },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  btnDone: { backgroundColor: theme.colors.surface },
  btnText: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  btnTextDone: { color: theme.colors.textSecondary },
});

export default function SzkoleniaScreen() {
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';
  const [trainings, setTrainings] = useState<DbTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('wszystkie');
  const [activeTab, setActiveTab] = useState<TabKey>('szkolenia');
  const [points, setPoints] = useState<DbPointsLedger[]>([]);
  const [ranking, setRanking] = useState<{ employee_id: string; total: number; name: string }[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    getTrainings(rid).then((data) => { setTrainings(data); setLoading(false); });
  }, [rid]);

  useEffect(() => {
    if (!rid || !user || activeTab !== 'punkty') return;
    setPointsLoading(true);
    Promise.all([getPointsForEmployee(rid, user.id), getTeamPoints(rid)]).then(async ([myPts, teamPts]) => {
      setPoints(myPts);
      const { data: profiles } = await (await import('../../lib/supabase')).supabase
        .from('profiles').select('id, first_name, last_name').eq('restaurant_id', rid);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.id] = `${p.first_name} ${p.last_name}`; });
      setRanking(teamPts.map((r) => ({ ...r, name: nameMap[r.employee_id] ?? 'Nieznany' })));
      setPointsLoading(false);
    });
  }, [rid, user, activeTab]);

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </SafeAreaView>
  );

  const requiredCount = trainings.filter((t) => t.required && t.status !== 'ukonczone').length;
  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);

  const filtered = activeFilter === 'obowiazkowe'
    ? trainings.filter((t) => t.category === 'BHP')
    : activeFilter === 'dla_mnie'
    ? trainings.filter((t) => t.category === 'Procedury' || t.category === 'Obsługa')
    : trainings;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      {isDesktop ? (
        <View style={styles.header}>
          <Text style={styles.title}>Centrum szkoleń</Text>
          <View style={styles.headerRight}>
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={13} color={theme.colors.yellow} />
              <Text style={styles.xpText}>{totalPoints}</Text>
            </View>
          </View>
        </View>
      ) : (
        <MobileHeader
          left={<Text style={styles.title}>Centrum szkoleń</Text>}
          center={
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={13} color={theme.colors.yellow} />
              <Text style={styles.xpText}>{totalPoints}</Text>
            </View>
          }
        />
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {([['szkolenia', 'Szkolenia', 'book-outline'], ['punkty', 'Punkty', 'star-outline']] as const).map(([key, label, icon]) => (
          <TouchableOpacity key={key} style={[styles.tabBarBtn, activeTab === key && styles.tabBarBtnActive]} onPress={() => setActiveTab(key)} activeOpacity={0.7}>
            <Ionicons name={icon as any} size={14} color={activeTab === key ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.tabBarText, activeTab === key && styles.tabBarTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}>
        {/* Progress card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressCardTitle}>Twoje postępy</Text>
          <Text style={styles.progressCardSub}>Świetnie ci idzie! Utrzymaj passę.</Text>

          <View style={styles.streakBox}>
            <View style={styles.streakIcon}>
              <Ionicons name="flame" size={20} color={theme.colors.orange} />
            </View>
            <View>
              <Text style={styles.streakLabel}>SERIA DNI</Text>
              <Text style={styles.streakValue}>7 Dni</Text>
            </View>
          </View>

          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Poziom 2: Adept</Text>
            <Text style={styles.levelPct}>65%</Text>
          </View>
          <View style={styles.levelBg}>
            <View style={[styles.levelFill, { width: '65%' }]} />
          </View>
          <Text style={styles.levelHint}>Jeszcze 350 pkt do awansu</Text>
        </View>

        {/* Badges */}
        <View style={styles.badgesCard}>
          <Text style={styles.badgesTitle}>Zdobyte odznaki</Text>
          <View style={styles.badgesRow}>
            {BADGES.map((b) => (
              <View key={b.label} style={styles.badge}>
                <View style={[styles.badgeIcon, { backgroundColor: b.color + '22' }]}>
                  <Text style={styles.badgeEmoji}>{b.icon}</Text>
                </View>
                <Text style={styles.badgeLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tab filter */}
        <View style={styles.filterRow}>
          {[
            { key: 'dla_mnie' as FilterKey, label: 'Dla mnie' },
            { key: 'obowiazkowe' as FilterKey, label: 'Obowiązkowe' },
            { key: 'wszystkie' as FilterKey, label: 'Nowe' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, activeFilter === f.key && styles.filterBtnActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Required badge */}
        {requiredCount > 0 && (
          <View style={styles.requiredBanner}>
            <View style={styles.requiredLeft}>
              <Ionicons name="time-outline" size={18} color={theme.colors.orange} />
              <Text style={styles.requiredTitle}>Do ukończenia</Text>
            </View>
            <Text style={styles.requiredCount}>Wymagane: {requiredCount}</Text>
          </View>
        )}

        {/* Demo mode banner */}
        <View style={styles.demoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
          <View style={styles.demoBannerText}>
            <Text style={styles.demoBannerTitle}>Szkolenia dopasowane do Twojej firmy</Text>
            <Text style={styles.demoBannerSub}>W trybie demo wyświetlamy ogólne moduły. Po wdrożeniu aplikacji właściciel dodaje szkolenia specyficzne dla swojego lokalu.</Text>
          </View>
        </View>

        {activeTab === 'szkolenia' ? (
          <>
            {/* Training list */}
            <View style={styles.body}>
              <Text style={styles.sectionTitle}>Polecane dla Ciebie</Text>
              {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={40} color={theme.colors.border} />
                  <Text style={styles.emptyText}>Brak szkoleń w tej kategorii</Text>
                </View>
              ) : filtered.map((t) => (
                <TrainingCard key={t.id} training={t} />
              ))}
            </View>
          </>
        ) : (
          /* ── Punkty tab ── */
          <View style={styles.body}>
            {pointsLoading ? (
              <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
            ) : (
              <>
                {/* Summary */}
                <View style={styles.pointsSummary}>
                  <View style={styles.pointsSummaryCol}>
                    <Text style={styles.pointsSummaryValue}>{totalPoints}</Text>
                    <Text style={styles.pointsSummaryLabel}>Punktów łącznie</Text>
                  </View>
                  <View style={styles.pointsDivider} />
                  <View style={styles.pointsSummaryCol}>
                    <Text style={styles.pointsSummaryValue}>#{(ranking.findIndex((r) => r.employee_id === user?.id) + 1) || '—'}</Text>
                    <Text style={styles.pointsSummaryLabel}>Ranking</Text>
                  </View>
                  <View style={styles.pointsDivider} />
                  <View style={styles.pointsSummaryCol}>
                    <Text style={styles.pointsSummaryValue}>{points.length}</Text>
                    <Text style={styles.pointsSummaryLabel}>Zdarzeń</Text>
                  </View>
                </View>

                {/* History */}
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Historia punktów</Text>
                {points.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="trophy-outline" size={40} color={theme.colors.border} />
                    <Text style={styles.emptyText}>Brak punktów — ukończ szkolenie!</Text>
                  </View>
                ) : points.map((p) => {
                  const ev = POINT_EVENT_LABELS[p.event_type] ?? { label: p.event_type, icon: 'star-outline', color: '#6B7280' };
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

                {/* Ranking */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Ranking zespołu</Text>
                {ranking.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="podium-outline" size={40} color={theme.colors.border} />
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
                })}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 40 },
  scrollContentDesktop: { maxWidth: 700, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.card,
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.yellowLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
  },
  xpText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },

  progressCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    ...theme.shadows.card,
  },
  progressCardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  progressCardSub: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: 14 },

  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.orangeLight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  streakIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.orange + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.orange, letterSpacing: 0.5 },
  streakValue: { fontSize: 18, fontWeight: '800', color: theme.colors.text },

  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  levelLabel: { ...theme.typography.bodySmall, fontWeight: '600', color: theme.colors.primary },
  levelPct: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.primary },
  levelBg: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  levelFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  levelHint: { ...theme.typography.caption, color: theme.colors.primary },

  badgesCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    ...theme.shadows.card,
  },
  badgesTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 14 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  badge: { alignItems: 'center', gap: 6 },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 24 },
  badgeLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, textAlign: 'center' },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.white },

  requiredBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  requiredLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requiredTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  requiredCount: { fontSize: 13, fontWeight: '600', color: theme.colors.orange },

  body: { padding: 16, paddingTop: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  demoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderWidth: 1, borderColor: theme.colors.primary + '30',
  },
  demoBannerText: { flex: 1 },
  demoBannerTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.primary, marginBottom: 3 },
  demoBannerSub: { fontSize: 12, color: theme.colors.primary, lineHeight: 17, opacity: 0.85 },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, marginTop: 8, gap: 8 },
  tabBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  tabBarBtnActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  tabBarText: { fontSize: 12, fontWeight: '600' as const, color: theme.colors.textSecondary },
  tabBarTextActive: { color: theme.colors.primary },

  pointsSummary: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 20, marginBottom: 16 },
  pointsSummaryCol: { flex: 1, alignItems: 'center' as const },
  pointsSummaryValue: { fontSize: 24, fontWeight: '800' as const, color: theme.colors.primary, marginBottom: 4 },
  pointsSummaryLabel: { fontSize: 11, color: theme.colors.textMuted },
  pointsDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },

  pointRow: { flexDirection: 'row', alignItems: 'center' as const, gap: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  pointIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  pointInfo: { flex: 1 },
  pointLabel: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.text },
  pointDate: { fontSize: 11, color: theme.colors.textMuted },
  pointValue: { fontSize: 16, fontWeight: '800' as const },

  rankRow: { flexDirection: 'row', alignItems: 'center' as const, gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rankRowMe: { backgroundColor: theme.colors.primaryLight, borderRadius: 10, paddingHorizontal: 12 },
  rankPos: { fontSize: 15, fontWeight: '700' as const, color: theme.colors.textSecondary, width: 36 },
  rankName: { flex: 1, fontSize: 14, color: theme.colors.text },
  rankPoints: { fontSize: 14, fontWeight: '700' as const, color: theme.colors.primary },
});
