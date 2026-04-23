import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getTrainings } from '../../lib/db';
import type { DbTraining } from '../../lib/supabase';
import { theme } from '../../styles/theme';

type FilterKey = 'wszystkie' | 'dla_mnie' | 'obowiazkowe' | 'nowe';

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

function TrainingCard({ training }: { training: DbTraining }) {
  const cfg = STATUS_CONFIG[training.status];
  const router = useRouter();

  const handleStart = () => {
    router.push({
      pathname: '/training/quiz' as any,
      params: { trainingId: training.id, category: training.category, title: training.title },
    });
  };

  return (
    <View style={tStyles.card}>
      {/* Image placeholder */}
      <View style={[tStyles.imagePlaceholder, { backgroundColor: training.category === 'BHP' ? '#1E3A5F' : '#2D4A3E' }]}>
        <Ionicons
          name={training.category === 'BHP' ? 'shield-checkmark-outline' : training.category === 'Barista' ? 'cafe-outline' : 'book-outline'}
          size={32}
          color="rgba(255,255,255,0.6)"
        />
        <View style={[tStyles.statusOverlay, { backgroundColor: cfg.color }]}>
          <Text style={tStyles.statusOverlayText}>{cfg.label}</Text>
        </View>
        <View style={tStyles.categoryBadge}>
          <Text style={tStyles.categoryText}>{training.category}</Text>
        </View>
      </View>

      <View style={tStyles.body}>
        <Text style={tStyles.title} numberOfLines={2}>{training.title}</Text>
        <Text style={tStyles.desc} numberOfLines={2}>
          Odśwież wiedzę na temat procedur i wymagań dla tej kategorii szkolenia.
        </Text>

        <View style={tStyles.meta}>
          <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
          <Text style={tStyles.metaText}>{training.duration_min} min</Text>
          {training.progress_percent > 0 && (
            <Text style={tStyles.progress}>{training.progress_percent}% ukończono</Text>
          )}
        </View>

        {training.progress_percent > 0 && training.progress_percent < 100 && (
          <View style={tStyles.progressBg}>
            <View style={[tStyles.progressFill, { width: `${training.progress_percent}%` }]} />
          </View>
        )}

        <TouchableOpacity style={tStyles.btn} onPress={handleStart} activeOpacity={0.85}>
          <Ionicons name="play" size={14} color={theme.colors.white} />
          <Text style={tStyles.btnText}>
            {training.progress_percent === 0 ? 'Rozpocznij' : training.progress_percent === 100 ? 'Powtórz' : 'Kontynuuj'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 14,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  imagePlaceholder: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  statusOverlayText: { fontSize: 9, fontWeight: '800', color: theme.colors.white },
  categoryBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  categoryText: { fontSize: 10, fontWeight: '700', color: theme.colors.white },
  body: { padding: 14 },
  title: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  desc: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 16, marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  metaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  progress: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '600', marginLeft: 8 },
  progressBg: {
    height: 5,
    backgroundColor: theme.colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  btn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
});

export default function SzkoleniaScreen() {
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';
  const [trainings, setTrainings] = useState<DbTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('wszystkie');

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    getTrainings(rid).then((data) => { setTrainings(data); setLoading(false); });
  }, [rid]);

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2196C9" />
      </View>
    </SafeAreaView>
  );

  const requiredCount = trainings.filter((t) => t.required && t.status !== 'ukonczone').length;

  const filtered = activeFilter === 'obowiazkowe'
    ? trainings.filter((t) => t.category === 'BHP')
    : activeFilter === 'dla_mnie'
    ? trainings.filter((t) => t.category === 'Procedury' || t.category === 'Obsługa')
    : trainings;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Centrum szkoleń</Text>
        <View style={styles.headerRight}>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={13} color={theme.colors.yellow} />
            <Text style={styles.xpText}>1250</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
    paddingBottom: 12,
    backgroundColor: theme.colors.white,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
    backgroundColor: theme.colors.white,
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
    backgroundColor: theme.colors.white,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    ...theme.shadows.card,
  },
  badgesTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 14 },
  badgesRow: { flexDirection: 'row', gap: 20 },
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
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterBtnActive: {
    backgroundColor: theme.colors.navy,
    borderColor: theme.colors.navy,
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
});
