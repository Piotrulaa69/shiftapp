import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { toggleTask as dbToggleTask, getTasks } from '../../lib/db';
import type { DbTask } from '../../lib/supabase';
import { theme } from '../../styles/theme';

type ConfirmationType = 'photo' | 'values' | 'description';
type TaskPriority = 'wysoki' | 'normalny' | 'niski';
type TaskStatus = 'do_zrobienia' | 'w_trakcie' | 'zamkniete';

const CONFIRM_CONFIG: Record<ConfirmationType, { icon: string; label: string; color: string; bg: string; route: string }> = {
  photo: { icon: 'camera-outline', label: 'Zdjęcie', color: theme.colors.primary, bg: theme.colors.primaryLight, route: '/task/confirm-photo' },
  values: { icon: 'thermometer-outline', label: 'Wartości', color: theme.colors.orange, bg: theme.colors.orangeLight, route: '/task/confirm-values' },
  description: { icon: 'document-text-outline', label: 'Opis', color: theme.colors.purple, bg: theme.colors.purpleLight, route: '/task/confirm-description' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  wysoki: { label: 'WYSOKI PRIORYTET', color: theme.colors.error, bg: theme.colors.errorLight },
  normalny: { label: 'NORMALNY', color: theme.colors.orange, bg: theme.colors.orangeLight },
  niski: { label: 'NISKI', color: theme.colors.green, bg: theme.colors.greenLight },
};

const TABS: { key: TaskStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Start zmiany' },
  { key: 'w_trakcie', label: 'W trakcie' },
  { key: 'zamkniete', label: 'Zamknięte' },
];

function TaskCard({ task, onToggle }: { task: DbTask; onToggle: () => void }) {
  const p = PRIORITY_CONFIG[task.priority as TaskPriority] ?? PRIORITY_CONFIG.normalny;
  const router = useRouter();
  const confirmCfg = task.confirmation_type ? CONFIRM_CONFIG[task.confirmation_type as ConfirmationType] : null;

  return (
    <TouchableOpacity style={tStyles.card} activeOpacity={0.85} onPress={onToggle}>
      <View style={[tStyles.priorityAccent, { backgroundColor: p.color }]} />
      <View style={tStyles.body}>
        <View style={tStyles.topRow}>
          <View style={[tStyles.priorityBadge, { backgroundColor: p.bg }]}>
            <Text style={[tStyles.priorityText, { color: p.color }]}>{p.label}</Text>
          </View>
          <View style={tStyles.timeRow}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
            <Text style={tStyles.timeText}>{task.assigned_time}</Text>
          </View>
        </View>
        <Text style={[tStyles.title, task.completed && tStyles.titleDone]}>{task.title}</Text>
        <Text style={tStyles.desc} numberOfLines={2}>{task.description}</Text>
        <View style={tStyles.footer}>
          <View style={tStyles.duration}>
            <Ionicons name="timer-outline" size={12} color={theme.colors.textMuted} />
            <Text style={tStyles.durationText}>{task.duration_min} min</Text>
          </View>
          {task.status === 'w_trakcie' && (
            <Text style={[tStyles.statusText, { color: theme.colors.primary }]}>• W toku</Text>
          )}
          {confirmCfg && !task.completed && (
            <TouchableOpacity
              style={[tStyles.confirmBtn, { backgroundColor: confirmCfg.bg }]}
              onPress={(e) => { e.stopPropagation?.(); router.push({ pathname: confirmCfg.route as any, params: { taskId: task.id } }); }}
              activeOpacity={0.75}
            >
              <Ionicons name={confirmCfg.icon as any} size={13} color={confirmCfg.color} />
              <Text style={[tStyles.confirmBtnText, { color: confirmCfg.color }]}>Potwierdź</Text>
            </TouchableOpacity>
          )}
          <View style={[tStyles.checkbox, task.completed && tStyles.checkboxDone]}>
            {task.completed && <Ionicons name="checkmark" size={12} color={theme.colors.white} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const tStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 10,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  priorityAccent: { width: 4 },
  body: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.full },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { ...theme.typography.caption, color: theme.colors.textMuted },
  title: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  titleDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },
  desc: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 16, marginBottom: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  durationText: { ...theme.typography.caption, color: theme.colors.textMuted },
  statusText: { fontSize: 12, fontWeight: '600' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: theme.colors.green, borderColor: theme.colors.green },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  confirmBtnText: { fontSize: 12, fontWeight: '700' },
});

export default function TasksScreen() {
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    getTasks(rid).then((data) => { setTasks(data); setLoading(false); });
  }, [rid]);

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: newCompleted, status: newCompleted ? 'zamkniete' : 'do_zrobienia' } : t));
    await dbToggleTask(id, newCompleted);
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2196C9" />
      </View>
    </SafeAreaView>
  );

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const todoCount = tasks.filter((t) => !t.completed).length;

  const filtered = activeTab === 'all'
    ? tasks
    : tasks.filter((t) => t.status === activeTab);

  const doZrobienia = filtered.filter((t) => !t.completed && t.status === 'do_zrobienia');
  const wTrakcie = filtered.filter((t) => t.status === 'w_trakcie' && !t.completed);
  const zamkniete = filtered.filter((t) => t.completed);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Moje Zadania</Text>
        <View style={styles.headerRight}>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={13} color={theme.colors.yellow} />
            <Text style={styles.xpText}>120</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress card */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressTitle}>Postęp dzisiejszej zmiany</Text>
              <Text style={styles.progressSub}>Ukończono {completedCount} z {totalCount} zadań</Text>
            </View>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="list-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.statLabel}>Do{'\n'}zrobienia</Text>
              <Text style={styles.statNum}>{todoCount}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxGreen]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.green} />
              <Text style={[styles.statLabel, { color: theme.colors.green }]}>Zrobione</Text>
              <Text style={[styles.statNum, { color: theme.colors.green }]}>{completedCount}</Text>
            </View>
          </View>
        </View>

        {/* Tab filter */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tasks */}
        <View style={styles.body}>
          {doZrobienia.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.textMuted }]} />
                <Text style={styles.sectionLabel}>Do zrobienia</Text>
                <Text style={styles.sectionCount}>{doZrobienia.length}</Text>
              </View>
              {doZrobienia.map((t) => (
                <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
              ))}
            </>
          )}

          {wTrakcie.length > 0 && activeTab === 'all' && (
            <>
              <View style={[styles.sectionRow, { marginTop: 8 }]}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.sectionLabel}>W toku</Text>
                <Text style={styles.sectionCount}>{wTrakcie.length}</Text>
              </View>
              {wTrakcie.map((t) => (
                <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
              ))}
            </>
          )}

          {zamkniete.length > 0 && (
            <>
              <View style={[styles.sectionRow, { marginTop: 8 }]}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.green }]} />
                <Text style={styles.sectionLabel}>Zamknięte</Text>
                <Text style={styles.sectionCount}>{zamkniete.length}</Text>
              </View>
              {zamkniete.map((t) => (
                <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
              ))}
            </>
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
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  progressSub: { ...theme.typography.caption, color: theme.colors.textSecondary },
  progressPct: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
  progressBg: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 12,
  },
  statBoxGreen: { backgroundColor: theme.colors.greenLight },
  statLabel: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 14 },
  statNum: { fontSize: 22, fontWeight: '800', color: theme.colors.text },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: theme.borderRadius.full,
    padding: 4,
    ...theme.shadows.card,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: theme.colors.text },
  tabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.white },

  body: { padding: 16, paddingTop: 14 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.white,
    backgroundColor: theme.colors.textMuted,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
});
