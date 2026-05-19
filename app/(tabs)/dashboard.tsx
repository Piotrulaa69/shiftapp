import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import {
    getActiveClockIn,
    getClockIns,
    getPendingCounts,
    getPointsForEmployee,
    getShiftsForDate,
    getTasks,
    getTodayShift,
} from '../../lib/db';
import type { DbClockIn, DbShift, DbTask } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const QUICK_ACTIONS = [
  { icon: 'list-outline', label: 'Zadania', route: '/(tabs)/tasks' as const },
  { icon: 'calendar-outline', label: 'Grafik', route: '/(tabs)/schedule' as const },
  { icon: 'school-outline', label: 'Szkolenia', route: '/(tabs)/szkolenia' as const },
  { icon: 'document-text-outline', label: 'Urlopy', route: '/leave-requests' as const },
  { icon: 'chatbubble-outline', label: 'Czat', route: '/chat' as const },
];

function fmt(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type ClockStatus = 'on_time' | 'late' | 'no_clockin' | 'active' | 'done';

function getClockStatus(shift: DbShift, clockIns: DbClockIn[]): ClockStatus {
  const ci = clockIns.find((c) => c.shift_id === shift.id);
  if (!ci) return 'no_clockin';
  if (ci.status === 'active') return 'active';
  if (ci.status === 'completed') return ci.late_minutes > 0 ? 'late' : 'on_time';
  return 'no_clockin';
}

const CLOCK_STATUS_LABELS: Record<ClockStatus, { label: string; color: string; bg: string }> = {
  on_time: { label: 'Na czas', color: '#16A34A', bg: '#F0FDF4' },
  late: { label: 'Spóźnienie', color: '#F59E0B', bg: '#FFFBEB' },
  no_clockin: { label: 'Brak clock-in', color: '#EF4444', bg: '#FEF2F2' },
  active: { label: 'Nadal pracuje', color: '#2563EB', bg: '#EFF6FF' },
  done: { label: 'Zakończona', color: '#6B7280', bg: '#F3F4F6' },
};

export default function DashboardScreen() {
  const { logout, user, restaurant } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';
  const isManager = user?.role === 'manager' || user?.role === 'owner';

  // Employee state
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [todayShift, setTodayShift] = useState<DbShift | null>(null);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [activeCI, setActiveCI] = useState<DbClockIn | null>(null);
  const [elapsed, setElapsed] = useState('00:00');

  // Manager state
  const [todayShifts, setTodayShifts] = useState<DbShift[]>([]);
  const [todayClockIns, setTodayClockIns] = useState<DbClockIn[]>([]);
  const [pendingCounts, setPendingCounts] = useState({ leaveRequests: 0, absences: 0, swaps: 0, taskApprovals: 0 });

  const today = fmt(new Date());

  useFocusEffect(useCallback(() => {
    if (!rid) return;
    getTasks(rid).then(setTasks);
    if (user?.id) {
      getTodayShift(rid, user.id).then((s) => {
        setTodayShift(s);
        if (s) getActiveClockIn(s.id).then(setActiveCI);
      });
      getPointsForEmployee(rid, user.id).then((pts) => setTotalPoints(pts.reduce((s, p) => s + p.points, 0)));
    }
    if (isManager) {
      getShiftsForDate(rid, today).then(setTodayShifts);
      getClockIns(rid, today).then(setTodayClockIns);
      getPendingCounts(rid).then(setPendingCounts);
    }
  }, [rid, user?.id, isManager]));

  // Timer for elapsed work time
  useEffect(() => {
    if (!activeCI?.clock_in_at) { setElapsed('00:00'); return; }
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(activeCI.clock_in_at!).getTime()) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      setElapsed(`${h}:${m}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCI]);

  const myTasks = isManager ? tasks : tasks.filter((t) => t.assigned_to === user?.id);
  const completedTasks = myTasks.filter((t) => t.completed || t.status === 'zatwierdzone');
  const pendingTasks = myTasks.filter((t) => !t.completed && t.status !== 'zatwierdzone').slice(0, 4);
  const progress = myTasks.length > 0 ? completedTasks.length / myTasks.length : 0;
  const totalPending = pendingCounts.leaveRequests + pendingCounts.absences + pendingCounts.swaps + pendingCounts.taskApprovals;

  if (!user) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  const STAT_CARDS = [
    { icon: 'time-outline', label: activeCI ? 'Przepracowano' : 'Zmiana', iconBg: '#EFF6FF', iconColor: '#2563EB', value: activeCI ? elapsed : (todayShift ? todayShift.start_time : '--:--') },
    { icon: 'checkmark-done-outline', label: 'Zadania', iconBg: '#F0FDF4', iconColor: '#16A34A', value: `${completedTasks.length}/${myTasks.length}` },
    { icon: 'trophy-outline', label: 'Punkty', iconBg: '#F5F3FF', iconColor: '#7C3AED', value: String(totalPoints), route: '/(tabs)/szkolenia' },
    { icon: 'cash-outline', label: 'Zarobki', iconBg: '#ECFDF5', iconColor: '#059669', value: '→', route: '/earnings' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Cześć, {user?.firstName}! 👋</Text>
            <Text style={styles.greetingSub}>{restaurant?.name}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push('/chat' as any)} style={styles.headerIconBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile' as any)} activeOpacity={0.8}>
              <View style={[styles.avatar, { backgroundColor: user.avatarColor || theme.colors.primary }]}>
                <Text style={styles.avatarText}>{user?.initials ?? '?'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          {STAT_CARDS.map((card) => (
            <TouchableOpacity key={card.label} style={styles.statCard}
              onPress={card.route ? () => router.push(card.route as any) : undefined}
              activeOpacity={card.route ? 0.7 : 1}
            >
              <View style={[styles.statCardIconWrap, { backgroundColor: card.iconBg }]}>
                <Ionicons name={card.icon as any} size={18} color={card.iconColor} />
              </View>
              <Text style={styles.statCardValue}>{card.value}</Text>
              <Text style={styles.statCardLabel}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={isDesktop ? styles.gridRow : undefined}>
        <View style={isDesktop ? styles.gridLeft : undefined}>

        {/* ── MANAGER: Do zatwierdzenia ── */}
        {isManager && totalPending > 0 && (
          <View style={[styles.section, { marginTop: 16 }]}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.sectionTitle}>Do zatwierdzenia</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{totalPending}</Text></View>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/admin' as any)}>
                <Text style={styles.seeAll}>Wszystkie</Text>
              </TouchableOpacity>
            </View>
            {pendingCounts.leaveRequests > 0 && (
              <TouchableOpacity style={styles.pendingRow} onPress={() => router.push('/(tabs)/admin' as any)} activeOpacity={0.7}>
                <View style={[styles.pendingIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="umbrella-outline" size={16} color="#F97316" />
                </View>
                <Text style={styles.pendingLabel}>Wnioski urlopowe</Text>
                <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>{pendingCounts.leaveRequests}</Text></View>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
            {pendingCounts.taskApprovals > 0 && (
              <TouchableOpacity style={styles.pendingRow} onPress={() => router.push('/(tabs)/tasks' as any)} activeOpacity={0.7}>
                <View style={[styles.pendingIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                </View>
                <Text style={styles.pendingLabel}>Zadania do zatwierdzenia</Text>
                <View style={[styles.pendingBadge, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.pendingBadgeText, { color: '#16A34A' }]}>{pendingCounts.taskApprovals}</Text></View>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
            {pendingCounts.swaps > 0 && (
              <TouchableOpacity style={styles.pendingRow} onPress={() => router.push('/(tabs)/admin' as any)} activeOpacity={0.7}>
                <View style={[styles.pendingIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.pendingLabel}>Wymiany zmian</Text>
                <View style={[styles.pendingBadge, { backgroundColor: '#EFF6FF' }]}><Text style={[styles.pendingBadgeText, { color: theme.colors.primary }]}>{pendingCounts.swaps}</Text></View>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
            {pendingCounts.absences > 0 && (
              <TouchableOpacity style={styles.pendingRow} onPress={() => router.push('/(tabs)/admin' as any)} activeOpacity={0.7}>
                <View style={[styles.pendingIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                </View>
                <Text style={styles.pendingLabel}>Nieobecności</Text>
                <View style={[styles.pendingBadge, { backgroundColor: '#FEF2F2' }]}><Text style={[styles.pendingBadgeText, { color: '#EF4444' }]}>{pendingCounts.absences}</Text></View>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── MANAGER: Dziś ── */}
        {isManager && (
          <View style={[styles.section, { marginTop: 16 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dziś — {todayShifts.length} zmian{todayShifts.length === 1 ? 'a' : todayShifts.length < 5 ? 'y' : ''}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/schedule' as any)}>
                <Text style={styles.seeAll}>Grafik</Text>
              </TouchableOpacity>
            </View>
            {todayShifts.length === 0 ? (
              <Text style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>Brak zmian na dziś</Text>
            ) : (
              todayShifts.slice(0, 6).map((shift) => {
                const cs = getClockStatus(shift, todayClockIns);
                const csInfo = CLOCK_STATUS_LABELS[cs];
                const activeCI = todayClockIns.find((c) => c.shift_id === shift.id && c.status === 'active');
                let elapsedText = '';
                if (activeCI?.clock_in_at) {
                  const diff = Math.floor((Date.now() - new Date(activeCI.clock_in_at).getTime()) / 1000);
                  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
                  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
                  elapsedText = `${h}:${m}`;
                }
                return (
                  <View key={shift.id} style={styles.todayShiftRow}>
                    <View style={[styles.todayAvatar, { backgroundColor: theme.colors.surface }]}>
                      <Text style={styles.todayAvatarText}>{(shift.employee_name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.todayName}>{shift.employee_name}</Text>
                      <Text style={styles.todayTime}>{shift.start_time} – {shift.end_time}</Text>
                      {elapsedText && <Text style={styles.todayElapsed}>Przepracowano: {elapsedText}</Text>}
                    </View>
                    <View style={[styles.csChip, { backgroundColor: csInfo.bg }]}>
                      <Text style={[styles.csChipText, { color: csInfo.color }]}>{csInfo.label}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── EMPLOYEE: Today's Shift Card ── */}
        {!isManager && (
          <View style={[styles.shiftCard, isDesktop && styles.cardDesktop]}>
            <View style={styles.shiftCardAccent} />
            <View style={styles.shiftCardBody}>
              <View style={styles.shiftCardTop}>
                <Text style={styles.shiftCardTitle}>Dzisiejsza zmiana</Text>
                {todayShift && (
                  <View style={[styles.statusBadge, activeCI ? { backgroundColor: '#EFF6FF' } : undefined]}>
                    <Text style={[styles.statusBadgeText, activeCI ? { color: theme.colors.primary } : undefined]}>
                      {activeCI ? 'W trakcie' : todayShift.status === 'potwierdzona' ? 'Potwierdzona' : 'Zaplanowana'}
                    </Text>
                  </View>
                )}
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
              <TouchableOpacity
                style={[styles.checkinBtn, activeCI && { backgroundColor: theme.colors.error }]}
                activeOpacity={0.85}
                onPress={() => {
                  if (todayShift) router.push({ pathname: '/shift-detail', params: { shiftId: todayShift.id } } as any);
                  else router.push('/shift-detail' as any);
                }}
              >
                <Ionicons name={activeCI ? 'log-out-outline' : 'finger-print-outline'} size={18} color="#FFF" />
                <Text style={styles.checkinBtnText}>{activeCI ? 'Zakończ zmianę (clock-out)' : todayShift ? 'Zamelduj się' : 'Brak zmiany na dziś'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={[styles.quickActionsWrap, isDesktop && styles.cardDesktop]}>
          <Text style={styles.quickActionsTitle}>Szybki dostęp</Text>
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity key={a.label} style={styles.quickAction} onPress={() => router.push(a.route as any)} activeOpacity={0.7}>
                <View style={styles.quickActionIcon}>
                  <Ionicons name={a.icon as any} size={20} color={theme.colors.accent} />
                </View>
                <Text style={styles.quickActionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        </View>
        <View style={isDesktop ? styles.gridRight : undefined}>

        {/* Tasks */}
        <View style={[styles.section, isDesktop && styles.cardDesktop]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Zadania na dziś</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={styles.seeAll}>Zobacz wszystkie</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Postęp</Text>
            <Text style={styles.progressCount}>{completedTasks.length}/{tasks.length}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          {tasks.slice(0, 4).map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={[styles.taskCheck, (task.completed || task.status === 'zatwierdzone') && styles.taskCheckDone]}>
                {(task.completed || task.status === 'zatwierdzone') && <Ionicons name="checkmark" size={12} color="#FFF" />}
              </View>
              <Text style={[styles.taskTitle, (task.completed || task.status === 'zatwierdzone') && styles.taskTitleDone]}>{task.title}</Text>
              {task.status === 'czeka_na_zatwierdzenie' && (
                <View style={{ backgroundColor: '#FFFBEB', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>Oczekuje</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        </View>
        </View>

        {!isDesktop && (
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.logoutText}>Wyloguj się</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingBottom: 40 },
  scrollDesktop: { paddingBottom: 48, paddingHorizontal: 20 },
  gridRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, gap: 16, marginTop: 4 },
  gridLeft: { flex: 1 },
  gridRight: { flex: 1 },
  cardDesktop: { marginHorizontal: 0, marginTop: 16, maxWidth: 720, alignSelf: 'center' as any },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: { fontSize: 18, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.2 },
  greetingSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 16, marginBottom: 4, paddingBottom: 4 },
  statCard: { width: 120, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, ...theme.shadows.card },
  statCardIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statCardValue: { fontSize: 17, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  statCardLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

  section: { backgroundColor: theme.colors.card, marginHorizontal: 16, borderRadius: theme.borderRadius.lg, padding: 18, ...theme.shadows.card },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  seeAll: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },

  badge: { backgroundColor: theme.colors.error, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  pendingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pendingLabel: { flex: 1, fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  pendingBadge: { backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  todayShiftRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  todayAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  todayAvatarText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  todayName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  todayTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  todayElapsed: { fontSize: 10, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  csChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  csChipText: { fontSize: 11, fontWeight: '700' },

  shiftCard: { backgroundColor: theme.colors.card, marginHorizontal: 16, marginTop: 16, borderRadius: theme.borderRadius.lg, overflow: 'hidden', ...theme.shadows.card },
  shiftCardAccent: { height: 4, backgroundColor: theme.colors.primary },
  shiftCardBody: { padding: 18 },
  shiftCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  shiftCardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  statusBadge: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  shiftDetails: { flexDirection: 'row', gap: 24, marginBottom: 14 },
  shiftDetailItem: { gap: 3 },
  shiftDetailLabel: { fontSize: 11, color: theme.colors.textMuted },
  shiftTime: { fontSize: 17, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  shiftLocation: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  checkinBtn: { flexDirection: 'row', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, height: 46, alignItems: 'center', justifyContent: 'center', gap: 8, ...theme.shadows.fab },
  checkinBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  quickActionsWrap: { marginHorizontal: 16, marginTop: 20 },
  quickActionsTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAction: { alignItems: 'center', gap: 6, flexBasis: '30.5%', flexGrow: 1, maxWidth: '32%', paddingVertical: 14, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, ...theme.shadows.card },
  quickActionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: theme.colors.textSecondary },
  progressCount: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  progressBg: { height: 6, backgroundColor: theme.colors.surface, borderRadius: 3, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },

  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 10 },
  taskCheck: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  taskCheckDone: { backgroundColor: theme.colors.green, borderColor: theme.colors.green },
  taskTitle: { fontSize: 13, color: theme.colors.text, flex: 1 },
  taskTitleDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 6 },
  logoutText: { fontSize: 13, color: theme.colors.textMuted },
});
