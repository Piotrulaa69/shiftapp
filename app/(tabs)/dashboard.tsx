import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getTasks, getTodayShift } from '../../lib/db';
import type { DbShift, DbTask } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const QUICK_ACTIONS = [
  { icon: 'list-outline', label: 'Zadania', route: '/(tabs)/tasks' as const },
  { icon: 'calendar-outline', label: 'Grafik', route: '/(tabs)/schedule' as const },
  { icon: 'school-outline', label: 'Szkolenia', route: '/(tabs)/szkolenia' as const },
  { icon: 'trophy-outline', label: 'Punkty', route: '/earnings' as const },
  { icon: 'document-text-outline', label: 'Urlopy', route: '/leave-requests' as const },
  { icon: 'chatbubble-outline', label: 'Czat', route: '/chat' as const },
];

const STAT_CARDS: { icon: string; label: string; iconBg: string; iconColor: string }[] = [
  { icon: 'time-outline', label: 'Zmiana', iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { icon: 'checkmark-done-outline', label: 'Zadania', iconBg: '#F0FDF4', iconColor: '#16A34A' },
  { icon: 'trophy-outline', label: 'Punkty', iconBg: '#F5F3FF', iconColor: '#7C3AED' },
  { icon: 'flame-outline', label: 'Seria', iconBg: '#FEFCE8', iconColor: '#CA8A04' },
];

export default function DashboardScreen() {
  const { logout, user, restaurant } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';

  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [todayShift, setTodayShift] = useState<DbShift | null>(null);

  useEffect(() => {
    if (!rid) return;
    getTasks(rid).then(setTasks);
    getTodayShift(rid, user?.id ?? '').then(setTodayShift);
  }, [rid, user?.id]);

  const completedTasks = tasks.filter((t) => t.completed);
  const pendingTasks = tasks.filter((t) => !t.completed).slice(0, 4);
  const progress = tasks.length > 0 ? completedTasks.length / tasks.length : 0;

  const STATUS_LABELS: Record<string, string> = {
    zaplanowana: 'Zaplanowana',
    do_potwierdzenia: 'Do potwierdzenia',
    potwierdzona: 'Potwierdzona',
    urlop: 'Urlop',
  };

  const statValues = [
    todayShift ? `${todayShift.start_time}` : '--:--',
    `${completedTasks.length}/${tasks.length}`,
    '128',
    '5 dni',
  ];

  if (!user) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={styles.greeting}>Cześć, {user?.firstName}! 👋</Text>
              <Text style={styles.greetingSub}>{restaurant?.name}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push('/chat' as any)} style={styles.headerIconBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile' as any)} activeOpacity={0.8}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.initials ?? '?'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat Cards Row — Reztro style */}
        <View style={styles.statsRow}>
          {STAT_CARDS.map((card, i) => (
            <View key={card.label} style={styles.statCard}>
              <View style={[styles.statCardIconWrap, { backgroundColor: card.iconBg }]}>
                <Ionicons name={card.icon as any} size={18} color={card.iconColor} />
              </View>
              <Text style={styles.statCardValue}>{statValues[i]}</Text>
              <Text style={styles.statCardLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Desktop: 2-column grid / Mobile: single column */}
        <View style={isDesktop ? styles.gridRow : undefined}>
        <View style={isDesktop ? styles.gridLeft : undefined}>

        {/* Today's Shift Card */}
        <View style={[styles.shiftCard, isDesktop && styles.cardDesktop]}>
          <View style={styles.shiftCardAccent} />
          <View style={styles.shiftCardBody}>
            <View style={styles.shiftCardTop}>
              <Text style={styles.shiftCardTitle}>Dzisiejsza zmiana</Text>
              <View style={[styles.statusBadge, todayShift?.status === 'potwierdzona' && { backgroundColor: theme.colors.greenLight }]}>
                <Text style={[styles.statusBadgeText, todayShift?.status === 'potwierdzona' && { color: theme.colors.green }]}>
                  {todayShift ? STATUS_LABELS[todayShift.status] ?? todayShift.status : 'Brak zmiany'}
                </Text>
              </View>
            </View>

            <View style={styles.shiftDetails}>
              <View style={styles.shiftDetailItem}>
                <Text style={styles.shiftDetailLabel}>Godziny</Text>
                <Text style={styles.shiftTime}>{todayShift?.start_time ?? '--:--'} – {todayShift?.end_time ?? '--:--'}</Text>
              </View>
              <View style={styles.shiftDetailItem}>
                <Text style={styles.shiftDetailLabel}>Lokalizacja</Text>
                <Text style={styles.shiftLocation}>{todayShift?.location ?? 'Brak'}</Text>
              </View>
            </View>

            <View style={styles.leaderRow}>
              <View style={styles.leaderAvatar}>
                <Text style={styles.leaderAvatarText}>MN</Text>
              </View>
              <Text style={styles.leaderLabel}>Lider zmiany: </Text>
              <Text style={styles.leaderName}>{todayShift?.employee_name ?? 'N/A'}</Text>
            </View>

            <TouchableOpacity
              style={styles.checkinBtn}
              activeOpacity={0.85}
              onPress={() => todayShift && router.push({ pathname: '/shift-detail', params: { shiftId: todayShift.id } } as any)}
            >
              <Ionicons name="finger-print-outline" size={18} color="#FFF" />
              <Text style={styles.checkinBtnText}>Zamelduj się</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActionsWrap, isDesktop && styles.cardDesktop]}>
          <Text style={styles.quickActionsTitle}>Szybki dostęp</Text>
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={styles.quickAction}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={a.icon as any} size={20} color={theme.colors.accent} />
                </View>
                <Text style={styles.quickActionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        </View>{/* end gridLeft */}
        <View style={isDesktop ? styles.gridRight : undefined}>

        {/* Tasks Section */}
        <View style={[styles.section, isDesktop && styles.cardDesktop]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Zadania na dziś</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={styles.seeAll}>Zobacz wszystkie</Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Postęp</Text>
            <Text style={styles.progressCount}>{completedTasks.length}/{tasks.length}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {/* Task list preview */}
          {(isDesktop ? pendingTasks : tasks.slice(0, 4)).map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={[styles.taskCheck, task.completed && styles.taskCheckDone]}>
                {task.completed && <Ionicons name="checkmark" size={12} color="#FFF" />}
              </View>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
                {task.title}
              </Text>
            </View>
          ))}
        </View>

        </View>{/* end gridRight */}
        </View>{/* end gridRow */}

        {!isDesktop && <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingBottom: 40 },
  scrollDesktop: { paddingBottom: 48 },
  gridRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, gap: 16, marginTop: 4 },
  gridLeft: { flex: 1 },
  gridRight: { flex: 1 },
  cardDesktop: { marginHorizontal: 0, marginTop: 16 },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: { fontSize: 18, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.2 },
  greetingSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  /* Stat cards — Reztro style horizontal row */
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 16, marginBottom: 4 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    ...theme.shadows.card,
  },
  statCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statCardValue: { fontSize: 18, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  statCardLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  statCardChange: { fontSize: 10, fontWeight: '600', marginTop: 4 },

  /* Shift card */
  shiftCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  shiftCardAccent: {
    height: 4,
    backgroundColor: theme.colors.primary,
  },
  shiftCardBody: { padding: 18 },
  shiftCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  shiftCardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  statusBadge: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },

  shiftDetails: { flexDirection: 'row', gap: 24, marginBottom: 14 },
  shiftDetailItem: { gap: 3 },
  shiftDetailLabel: { fontSize: 11, color: theme.colors.textMuted },
  shiftTime: { fontSize: 17, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  shiftLocation: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },

  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 6,
  },
  leaderAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: { fontSize: 8, fontWeight: '700', color: '#FFF' },
  leaderLabel: { fontSize: 13, color: theme.colors.textMuted },
  leaderName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },

  checkinBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.fab,
  },
  checkinBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  /* Quick actions */
  quickActionsWrap: { marginHorizontal: 16, marginTop: 20 },
  quickActionsTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAction: {
    alignItems: 'center',
    gap: 8,
    width: '30%',
    paddingVertical: 14,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.card,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },

  /* Tasks section */
  section: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  seeAll: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: theme.colors.textSecondary },
  progressCount: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  progressBg: {
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 10,
  },
  taskCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckDone: { backgroundColor: theme.colors.green, borderColor: theme.colors.green },
  taskTitle: { fontSize: 13, color: theme.colors.text, flex: 1 },
  taskTitleDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  logoutText: { fontSize: 13, color: theme.colors.textMuted },
});
