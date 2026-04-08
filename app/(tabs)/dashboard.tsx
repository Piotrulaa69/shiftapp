import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
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
import { currentUser, tasks, todayShift } from '../../data/mockData';
import { theme } from '../../styles/theme';

const QUICK_ACTIONS = [
  { icon: 'list-outline', label: 'Zadania', route: '/(tabs)/tasks' as const, color: theme.colors.orange },
  { icon: 'calendar-outline', label: 'Grafik', route: '/(tabs)/schedule' as const, color: theme.colors.primary },
  { icon: 'school-outline', label: 'Szkolenia', route: '/(tabs)/szkolenia' as const, color: theme.colors.purple },
];

export default function DashboardScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), []);
  const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed).slice(0, 4), []);
  const progress = tasks.length > 0 ? completedTasks.length / tasks.length : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{currentUser.initials}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Cześć, {currentUser.firstName}! 👋</Text>
              <Text style={styles.greetingSub}>Gotowa na dzisiejszą zmianę?</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Desktop: 2-column grid / Mobile: single column */}
        <View style={isDesktop ? styles.gridRow : undefined}>
        <View style={isDesktop ? styles.gridLeft : undefined}>

        {/* Today's Shift Card */}
        <View style={[styles.shiftCard, isDesktop && styles.cardDesktop]}>
          <View style={styles.shiftCardTop}>
            <Text style={styles.shiftCardTitle}>Dzisiejsza zmiana</Text>
            <View style={styles.shiftCardIcon}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
            </View>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Zaplanowana</Text>
          </View>

          <View style={styles.shiftDetails}>
            <View>
              <Text style={styles.shiftDetailLabel}>Godziny</Text>
              <Text style={styles.shiftTime}>{todayShift.startTime} - {todayShift.endTime}</Text>
            </View>
            <View>
              <Text style={styles.shiftDetailLabel}>Lokalizacja</Text>
              <Text style={styles.shiftLocation}>{todayShift.location}</Text>
            </View>
          </View>

          <View style={styles.leaderRow}>
            <View style={styles.leaderAvatar}>
              <Text style={styles.leaderAvatarText}>MN</Text>
            </View>
            <Text style={styles.leaderLabel}>Lider zmiany: </Text>
            <Text style={styles.leaderName}>{todayShift.leader}</Text>
          </View>

          <TouchableOpacity style={styles.checkinBtn} activeOpacity={0.85}>
            <Ionicons name="location" size={16} color={theme.colors.white} />
            <Text style={styles.checkinBtnText}>Zamelduj się</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActions, isDesktop && styles.cardDesktop]}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickAction}
              onPress={() => router.push(a.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: a.color + '18' }]}>
                <Ionicons name={a.icon as any} size={22} color={a.color} />
              </View>
              <Text style={styles.quickActionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
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
                {task.completed && <Ionicons name="checkmark" size={12} color={theme.colors.white} />}
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
  scroll: { paddingBottom: 32 },
  scrollDesktop: { paddingBottom: 40 },
  gridRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, gap: 20, marginTop: 4 },
  gridLeft: { flex: 1 },
  gridRight: { flex: 1 },
  cardDesktop: { marginHorizontal: 0, marginTop: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: theme.colors.white,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  greeting: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  greetingSub: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 1 },

  shiftCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    ...theme.shadows.card,
  },
  shiftCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftCardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  shiftCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 14,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },

  shiftDetails: { flexDirection: 'row', gap: 32, marginBottom: 14 },
  shiftDetailLabel: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: 2 },
  shiftTime: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  shiftLocation: { fontSize: 15, fontWeight: '600', color: theme.colors.text },

  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  leaderAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  leaderAvatarText: { fontSize: 8, fontWeight: '700', color: theme.colors.white },
  leaderLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  leaderName: { ...theme.typography.bodySmall, fontWeight: '600', color: theme.colors.text },

  checkinBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.navy,
    borderRadius: theme.borderRadius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkinBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },

  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    justifyContent: 'space-around',
    ...theme.shadows.card,
  },
  quickAction: { alignItems: 'center', gap: 8 },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.text },

  section: {
    backgroundColor: theme.colors.white,
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  seeAll: { ...theme.typography.bodySmall, color: theme.colors.primary, fontWeight: '600' },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  progressCount: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.text },
  progressBg: {
    height: 6,
    backgroundColor: theme.colors.background,
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckDone: {
    backgroundColor: theme.colors.green,
    borderColor: theme.colors.green,
  },
  taskTitle: { ...theme.typography.bodySmall, color: theme.colors.text, flex: 1 },
  taskTitleDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  logoutText: { ...theme.typography.bodySmall, color: theme.colors.textMuted },
});
