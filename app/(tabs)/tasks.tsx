import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { createTask, deleteTask as dbDeleteTask, toggleTask as dbToggleTask, getTasks } from '../../lib/db';
import type { DbTask } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
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

const TABS_EMPLOYEE: { key: string; label: string }[] = [
  { key: 'all', label: 'Start zmiany' },
  { key: 'w_trakcie', label: 'W trakcie' },
  { key: 'zamkniete', label: 'Zamknięte' },
];

const TAB_APPROVAL = { key: 'czeka_na_zatwierdzenie', label: 'Do zatwierdzenia' };

function TaskCard({ task, onToggle, onDelete }: { task: DbTask; onToggle: () => void; onDelete?: () => void }) {
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
          {onDelete && (
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onDelete(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          )}
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

const PRIORITIES: Array<'wysoki' | 'normalny' | 'niski'> = ['wysoki', 'normalny', 'niski'];
const CONFIRM_TYPES: Array<{ value: 'photo' | 'values' | 'description' | null; label: string }> = [
  { value: null, label: 'Brak' },
  { value: 'photo', label: 'Zdjęcie' },
  { value: 'values', label: 'Wartości' },
  { value: 'description', label: 'Opis' },
];

export default function TasksScreen() {
  const { user, isOwner, isManager } = useAuth();
  const canApprove = isOwner || isManager;
  const TABS = canApprove ? [...TABS_EMPLOYEE, TAB_APPROVAL] : TABS_EMPLOYEE;
  const rid = user?.restaurantId ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newPriority, setNewPriority] = useState<'wysoki' | 'normalny' | 'niski'>('normalny');
  const [newDuration, setNewDuration] = useState('30');
  const [newConfirm, setNewConfirm] = useState<'photo' | 'values' | 'description' | null>(null);
  const [saving, setSaving] = useState(false);

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

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await dbDeleteTask(id);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const created = await createTask(rid, {
      title: newTitle.trim(),
      description: newDesc.trim(),
      assigned_to: user?.id ?? null,
      assigned_time: newTime,
      priority: newPriority,
      duration_min: parseInt(newDuration) || 30,
      confirmation_type: newConfirm,
    });
    if (created) setTasks((prev) => [...prev, created]);
    setSaving(false);
    setShowModal(false);
    setNewTitle(''); setNewDesc(''); setNewTime('08:00'); setNewPriority('normalny'); setNewDuration('30'); setNewConfirm(null);
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </SafeAreaView>
  );

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const todoCount = tasks.filter((t) => !t.completed).length;

  const filtered = activeTab === 'all'
    ? tasks.filter((t) => (t.status as string) !== 'czeka_na_zatwierdzenie')
    : tasks.filter((t) => (t.status as string) === activeTab);

  const doZrobienia = filtered.filter((t) => !t.completed && t.status === 'do_zrobienia');
  const wTrakcie = filtered.filter((t) => t.status === 'w_trakcie' && !t.completed);
  const zamkniete = filtered.filter((t) => t.completed);
  const pendingApproval = tasks.filter((t) => (t.status as string) === 'czeka_na_zatwierdzenie');

  const approveTask = async (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'zamkniete' as any, completed: true } : t));
    await supabase.from('tasks').update({ status: 'zatwierdzone', completed: true }).eq('id', id);
  };

  const rejectTask = async (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'do_zrobienia' as any } : t));
    await supabase.from('tasks').update({ status: 'odrzucone' }).eq('id', id);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Moje Zadania</Text>
        <View style={styles.headerRight}>
          {(isOwner || isManager) && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={theme.colors.white} />
              <Text style={styles.addBtnText}>Nowe zadanie</Text>
            </TouchableOpacity>
          )}
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
          {tasks.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>Brak zadań</Text>
              {isOwner && <Text style={styles.emptySub}>Dodaj pierwsze zadanie przyciskiem „Nowe zadanie”</Text>}
            </View>
          )}

          {doZrobienia.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.textMuted }]} />
                <Text style={styles.sectionLabel}>Do zrobienia</Text>
                <Text style={styles.sectionCount}>{doZrobienia.length}</Text>
              </View>
              {doZrobienia.map((t) => (
                <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={isOwner ? () => deleteTask(t.id) : undefined} />
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
                <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={isOwner ? () => deleteTask(t.id) : undefined} />
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
                <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={isOwner ? () => deleteTask(t.id) : undefined} />
              ))}
            </>
          )}

          {/* Pending Approval — only on "Do zatwierdzenia" tab */}
          {activeTab === 'czeka_na_zatwierdzenie' && canApprove && (
            pendingApproval.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-outline" size={48} color={theme.colors.border} />
                <Text style={styles.emptyTitle}>Wszystko zatwierdzone!</Text>
                <Text style={styles.emptySub}>Brak zadań oczekujących na zatwierdzenie</Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionRow}>
                  <View style={[styles.sectionDot, { backgroundColor: theme.colors.orange }]} />
                  <Text style={styles.sectionLabel}>Oczekujące na zatwierdzenie</Text>
                  <Text style={styles.sectionCount}>{pendingApproval.length}</Text>
                </View>
                {pendingApproval.map((t) => {
                  const p = PRIORITY_CONFIG[t.priority as TaskPriority] ?? PRIORITY_CONFIG.normalny;
                  return (
                    <View key={t.id} style={[tStyles.card, { flexDirection: 'column' }]}>
                      <View style={{ flexDirection: 'row' }}>
                        <View style={[tStyles.priorityAccent, { backgroundColor: p.color }]} />
                        <View style={[tStyles.body, { paddingBottom: 8 }]}>
                          <View style={tStyles.topRow}>
                            <View style={[tStyles.priorityBadge, { backgroundColor: p.bg }]}>
                              <Text style={[tStyles.priorityText, { color: p.color }]}>{p.label}</Text>
                            </View>
                          </View>
                          <Text style={tStyles.title}>{t.title}</Text>
                          {t.description ? <Text style={tStyles.desc}>{t.description}</Text> : null}
                          {(t as any).proof_comment && <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>Komentarz: {(t as any).proof_comment}</Text>}
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.greenLight, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                          onPress={() => approveTask(t.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle" size={16} color={theme.colors.green} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.green }}>Zatwierdź</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.errorLight, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                          onPress={() => rejectTask(t.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.error }}>Odrzuć</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )
          )}
        </View>
      </ScrollView>

      {/* Create Task Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>
            <View style={mStyles.header}>
              <Text style={mStyles.headerTitle}>Nowe zadanie</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={mStyles.body}>
              <Text style={mStyles.label}>Tytuł *</Text>
              <TextInput style={mStyles.input} value={newTitle} onChangeText={setNewTitle} placeholder="np. Przygotowanie sali" placeholderTextColor={theme.colors.textMuted} />

              <Text style={mStyles.label}>Opis</Text>
              <TextInput style={[mStyles.input, mStyles.inputMulti]} value={newDesc} onChangeText={setNewDesc} placeholder="Szczegóły zadania..." placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={3} />

              <View style={mStyles.row}>
                <View style={mStyles.half}>
                  <Text style={mStyles.label}>Godzina</Text>
                  <TextInput style={mStyles.input} value={newTime} onChangeText={setNewTime} placeholder="08:00" placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={mStyles.half}>
                  <Text style={mStyles.label}>Czas (min)</Text>
                  <TextInput style={mStyles.input} value={newDuration} onChangeText={setNewDuration} keyboardType="numeric" placeholder="30" placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>

              <Text style={mStyles.label}>Priorytet</Text>
              <View style={mStyles.chips}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity key={p} style={[mStyles.chip, newPriority === p && mStyles.chipActive]} onPress={() => setNewPriority(p)} activeOpacity={0.7}>
                    <Text style={[mStyles.chipText, newPriority === p && mStyles.chipTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={mStyles.label}>Potwierdzenie</Text>
              <View style={mStyles.chips}>
                {CONFIRM_TYPES.map((c) => (
                  <TouchableOpacity key={String(c.value)} style={[mStyles.chip, newConfirm === c.value && mStyles.chipActive]} onPress={() => setNewConfirm(c.value)} activeOpacity={0.7}>
                    <Text style={[mStyles.chipText, newConfirm === c.value && mStyles.chipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={mStyles.footer}>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setShowModal(false)} activeOpacity={0.7}>
                <Text style={mStyles.cancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[mStyles.saveBtn, !newTitle.trim() && mStyles.saveBtnDisabled]} onPress={handleCreate} activeOpacity={0.85} disabled={saving || !newTitle.trim()}>
                {saving ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Text style={mStyles.saveText}>Dodaj zadanie</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    backgroundColor: theme.colors.card,
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
  tabActive: { backgroundColor: theme.colors.primary },
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.white },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textMuted },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheetDesktop: { maxWidth: 560, alignSelf: 'center', width: '100%', borderRadius: 24, marginBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  inputMulti: { height: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.white },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  cancelBtn: { flex: 1, height: 50, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  saveBtn: { flex: 2, height: 50, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
});
