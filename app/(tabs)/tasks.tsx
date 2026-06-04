import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileHeader from '../../components/MobileHeader';
import { TasksSkeleton } from '../../components/Skeleton';
import TimePickerRow from '../../components/TimePickerRow';
import { useAuth } from '../../context/AuthContext';
import { createTask, approveTask as dbApproveTask, deleteTask as dbDeleteTask, rejectTask as dbRejectTask, toggleTask as dbToggleTask, getEmployeeGroupsWithMembers, getEmployees, getTasks, submitTaskForApproval } from '../../lib/db';
import type { DbProfile, DbTask } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { theme } from '../../styles/theme';

type ConfirmationType = 'photo' | 'values' | 'description';
type TaskPriority = 'wysoki' | 'normalny' | 'niski';
type TaskStatus = 'do_zrobienia' | 'w_trakcie' | 'czeka_na_zatwierdzenie' | 'zatwierdzone' | 'odrzucone' | 'zamkniete';

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
  { key: 'all', label: 'Zadania' },
  { key: 'zamkniete', label: 'Zamknięte' },
];

const TAB_APPROVAL = { key: 'czeka_na_zatwierdzenie', label: 'Do zatwierdzenia' };

function TaskCard({ task, onToggle, onDelete, onDetail, onStart, onFinish, assigneeName }: {
  task: DbTask;
  onToggle: () => void;
  onDelete?: () => void;
  onDetail?: () => void;
  onStart?: () => void;
  onFinish?: () => void;
  assigneeName?: string;
}) {
  const p = PRIORITY_CONFIG[task.priority as TaskPriority] ?? PRIORITY_CONFIG.normalny;
  const router = useRouter();
  const confirmCfg = task.confirmation_type ? CONFIRM_CONFIG[task.confirmation_type as ConfirmationType] : null;
  const inProgress = task.status === 'w_trakcie';
  const isActionable = task.status === 'do_zrobienia' || task.status === 'w_trakcie';

  return (
    <TouchableOpacity style={[tStyles.card, inProgress && tStyles.cardInProgress]} activeOpacity={0.85} onPress={onDetail ?? onToggle}>
      <View style={[tStyles.priorityAccent, { backgroundColor: inProgress ? theme.colors.primary : p.color }]} />
      <View style={tStyles.body}>
        <View style={tStyles.topRow}>
          <View style={[tStyles.priorityBadge, { backgroundColor: inProgress ? theme.colors.primaryLight : p.bg }]}>
            {inProgress
              ? <Text style={[tStyles.priorityText, { color: theme.colors.primary }]}>W TRAKCIE</Text>
              : <Text style={[tStyles.priorityText, { color: p.color }]}>{p.label}</Text>
            }
          </View>
          <View style={tStyles.timeRow}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
            <Text style={tStyles.timeText}>{task.assigned_time}</Text>
          </View>
        </View>
        <Text style={[tStyles.title, task.completed && tStyles.titleDone]}>{task.title}</Text>
        {task.status === 'do_zrobienia' && task.proof_comment ? (
          <View style={tStyles.rejectionBanner}>
            <Ionicons name="alert-circle" size={13} color={theme.colors.error} />
            <Text style={tStyles.rejectionText} numberOfLines={2}>Odrzucono: {task.proof_comment}</Text>
          </View>
        ) : null}
        <Text style={tStyles.desc} numberOfLines={2}>{task.description}</Text>
        <View style={tStyles.footer}>
          <View style={tStyles.duration}>
            <Ionicons name="timer-outline" size={12} color={theme.colors.textMuted} />
            <Text style={tStyles.durationText}>{task.duration_min} min</Text>
          </View>
          {(task.points || 0) > 0 && (
            <View style={tStyles.pointsBadge}>
              <Ionicons name="star" size={10} color={theme.colors.yellow} />
              <Text style={tStyles.pointsText}>{task.points} pkt</Text>
            </View>
          )}
          {assigneeName && (
            <View style={tStyles.assigneeTag}>
              <Ionicons name="person-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={tStyles.assigneeText}>{assigneeName}</Text>
            </View>
          )}
          {isActionable && onStart && !inProgress && (
            <TouchableOpacity
              style={[tStyles.actionBtn, { backgroundColor: theme.colors.primaryLight }]}
              onPress={(e) => { e.stopPropagation?.(); onStart(); }}
              activeOpacity={0.75}
            >
              <Ionicons name="play" size={11} color={theme.colors.primary} />
              <Text style={[tStyles.actionBtnText, { color: theme.colors.primary }]}>Rozpocznij</Text>
            </TouchableOpacity>
          )}
          {isActionable && onFinish && inProgress && !confirmCfg && (
            <TouchableOpacity
              style={[tStyles.actionBtn, { backgroundColor: theme.colors.greenLight }]}
              onPress={(e) => { e.stopPropagation?.(); onFinish(); }}
              activeOpacity={0.75}
            >
              <Ionicons name="checkmark" size={11} color={theme.colors.green} />
              <Text style={[tStyles.actionBtnText, { color: theme.colors.green }]}>Zakończ</Text>
            </TouchableOpacity>
          )}
          {confirmCfg && isActionable && (
            <TouchableOpacity
              style={[tStyles.actionBtn, { backgroundColor: confirmCfg.bg }]}
              onPress={(e) => { e.stopPropagation?.(); router.push({ pathname: confirmCfg.route as any, params: { taskId: task.id } }); }}
              activeOpacity={0.75}
            >
              <Ionicons name={confirmCfg.icon as any} size={11} color={confirmCfg.color} />
              <Text style={[tStyles.actionBtnText, { color: confirmCfg.color }]}>Potwierdź</Text>
            </TouchableOpacity>
          )}
          {onDetail && (
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onDetail(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
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
  cardInProgress: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
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
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  assigneeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  assigneeText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  rejectionBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0EF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4, marginBottom: 2, borderLeftWidth: 3, borderLeftColor: theme.colors.error },
  rejectionText: { fontSize: 12, fontWeight: '600', color: theme.colors.error, flex: 1 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: theme.colors.yellowLight, borderRadius: theme.borderRadius.full, paddingHorizontal: 7, paddingVertical: 2 },
  pointsText: { fontSize: 11, fontWeight: '700', color: theme.colors.yellow },
});

type CfgValueItem = { id: string; name: string; unit: string; min: string; max: string };
type CfgCheckItem = { id: string; label: string };

const PRIORITIES: Array<'wysoki' | 'normalny' | 'niski'> = ['wysoki', 'normalny', 'niski'];
const CONFIRM_TYPES: Array<{ value: 'photo' | 'values' | 'description' | null; label: string }> = [
  { value: null, label: 'Brak' },
  { value: 'photo', label: 'Zdjęcie' },
  { value: 'values', label: 'Wartości' },
  { value: 'description', label: 'Opis' },
];

export default function TasksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isOwner, isManager } = useAuth();
  const canApprove = isOwner || isManager;
  const TABS = canApprove ? [...TABS_EMPLOYEE, TAB_APPROVAL] : TABS_EMPLOYEE;
  const rid = user?.restaurantId ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [groups, setGroups] = useState<(any & { members: string[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<DbTask | null>(null);
  const [showMineOnly, setShowMineOnly] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newPriority, setNewPriority] = useState<'wysoki' | 'normalny' | 'niski'>('normalny');
  const [newDuration, setNewDuration] = useState('30');
  const [newConfirm, setNewConfirm] = useState<'photo' | 'values' | 'description' | null>(null);
  const [newAssignedTo, setNewAssignedTo] = useState<string>('ALL');
  const [newAssignedGroup, setNewAssignedGroup] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approvalDetailTask, setApprovalDetailTask] = useState<DbTask | null>(null);
  const [approvalConfirmation, setApprovalConfirmation] = useState<any | null>(null);
  const [loadingConfirmation, setLoadingConfirmation] = useState(false);
  const [rejectingTask, setRejectingTask] = useState<DbTask | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cfgValueItems, setCfgValueItems] = useState<CfgValueItem[]>([]);
  const [cfgCheckItems, setCfgCheckItems] = useState<CfgCheckItem[]>([]);
  const [cfgPrompt, setCfgPrompt] = useState('');

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'>('daily');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Points (admin/manager only)
  const [points, setPoints] = useState<string>('');

  // Task start date
  const [taskDate, setTaskDate] = useState<string>('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDateInput, setCustomDateInput] = useState('');

  // Modal step: 1 = basic info, 2 = recurrence settings
  const [modalStep, setModalStep] = useState(1);
  // Weekly quick-select for step 1 summary
  const [recurrenceTime, setRecurrenceTime] = useState('10:00');
  const [recurrenceEndNoLimit, setRecurrenceEndNoLimit] = useState(true);

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const offsetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const formatDateDisplay = (iso: string) => {
    if (!iso) return '';
    const [y, m, day] = iso.split('-');
    return `${day}.${m}.${y}`;
  };

  useFocusEffect(useCallback(() => {
    if (!rid) return;
    setLoading(true);
    Promise.all([
      getTasks(rid),
      canApprove ? getEmployees(rid) : Promise.resolve([]),
      canApprove ? getEmployeeGroupsWithMembers(rid) : Promise.resolve([]),
    ]).then(([taskData, empData, groupData]) => {
      setTasks(taskData);
      setEmployees(empData);
      setGroups(groupData);
      setLoading(false);
    });
  }, [rid, canApprove]));

  // Auto-open create modal if ?new=true in URL
  useFocusEffect(useCallback(() => {
    if (params.new === 'true' && canApprove) {
      setShowModal(true);
    }
  }, [params.new, canApprove]));

  const [refreshing, setRefreshing] = useState(false);

  const reload = async () => {
    if (!rid) return;
    const taskData = await getTasks(rid);
    setTasks(taskData);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [rid]);

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    if (newCompleted && task.confirmation_type && (task.status as string) !== 'zatwierdzone') return;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: newCompleted, status: newCompleted ? 'zamkniete' : 'do_zrobienia' } : t));
    await dbToggleTask(id, newCompleted);
  };

  const startTask = async (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'w_trakcie' as TaskStatus } : t));
    await supabase.from('tasks').update({ status: 'w_trakcie' }).eq('id', id);
  };

  const finishTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.confirmation_type) {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'czeka_na_zatwierdzenie' as TaskStatus } : t));
      await submitTaskForApproval(id);
    } else {
      const success = await dbToggleTask(id, true);
      if (success) {
        reload();
      }
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await dbDeleteTask(id);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const assignTo = newAssignedTo === 'ALL' ? null : (newAssignedTo || user?.id || null);
    let confirmationConfig: any = null;
    if (newConfirm === 'values' && cfgValueItems.length > 0) {
      confirmationConfig = { items: cfgValueItems.map(i => ({ id: i.id, name: i.name, unit: i.unit, min: parseFloat(i.min) || 0, max: parseFloat(i.max) || 100 })) };
    } else if (newConfirm === 'description') {
      confirmationConfig = { prompt: cfgPrompt.trim() || null, checklist: cfgCheckItems.map(i => ({ id: i.id, label: i.label })) };
    } else if (newConfirm === 'photo') {
      confirmationConfig = { prompt: cfgPrompt.trim() || null };
    }
    const recurrenceDays = (recurrencePattern === 'weekly' || recurrencePattern === 'biweekly' || recurrencePattern === 'custom')
      ? (selectedDays.length > 0 ? selectedDays : [1])
      : null;

    const created = await createTask(rid, {
      title: newTitle.trim(),
      description: newDesc.trim(),
      assigned_to: assignTo,
      assigned_time: newTime,
      scheduled_date: taskDate || todayStr(),
      priority: newPriority,
      duration_min: parseInt(newDuration) || 30,
      confirmation_type: newConfirm,
      confirmation_config: confirmationConfig,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null,
      recurrence_days: isRecurring ? recurrenceDays : null,
      recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      points: canApprove && points ? parseInt(points) || 0 : 0,
      target_group_id: newAssignedGroup,
    });
    if (created) setTasks((prev) => [...prev, created]);
    setSaving(false);
    setShowModal(false);
    setModalStep(1);
    setNewTitle(''); setNewDesc(''); setNewTime('08:00'); setNewPriority('normalny'); setNewDuration('30'); setNewConfirm(null); setNewAssignedTo(''); setNewAssignedGroup(null);
    setCfgValueItems([]); setCfgCheckItems([]); setCfgPrompt('');
    setIsRecurring(false); setRecurrencePattern('daily'); setRecurrenceEndDate(''); setSelectedDays([]);
    setPoints('');
    setTaskDate(''); setShowCustomDate(false); setCustomDateInput('');
    setRecurrenceTime('10:00'); setRecurrenceEndNoLimit(true);
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <TasksSkeleton />
    </SafeAreaView>
  );

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const todoCount = tasks.filter((t) => !t.completed).length;

  const empFiltered = !canApprove
    ? showMineOnly ? tasks.filter((t) => t.assigned_to === user?.id) : tasks
    : selectedEmployeeId
    ? tasks.filter((t) => t.assigned_to === selectedEmployeeId)
    : tasks;

  const filtered = activeTab === 'all'
    ? empFiltered.filter((t) => (t.status as string) !== 'czeka_na_zatwierdzenie')
    : activeTab === 'zamkniete'
    ? empFiltered.filter((t) => t.completed)
    : empFiltered.filter((t) => (t.status as string) === activeTab);

  const pendingApproval = tasks.filter((t) => (t.status as string) === 'czeka_na_zatwierdzenie');

  const doZrobienia = filtered.filter((t) => !t.completed && t.status === 'do_zrobienia');
  const wTrakcie = filtered.filter((t) => t.status === 'w_trakcie' && !t.completed);
  const zamkniete = filtered.filter((t) => t.completed);

  const approveTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'zatwierdzone' as TaskStatus, completed: true } : t));
    await dbApproveTask(id, rid, task.assigned_to ?? '', task.points ?? 20);
  };

  const rejectTask = async (id: string, comment?: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'do_zrobienia' as TaskStatus, proof_comment: comment ?? null } : t));
    await dbRejectTask(id, comment);
    setRejectingTask(null);
    setRejectReason('');
  };

  const openRejectModal = (task: DbTask) => {
    setRejectingTask(task);
    setRejectReason('');
  };

  const openApprovalDetail = async (task: DbTask) => {
    setApprovalDetailTask(task);
    setApprovalConfirmation(null);
    setLoadingConfirmation(true);
    const { data, error } = await supabase.from('task_confirmations').select('*').eq('task_id', task.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) console.error('[openApprovalDetail] task_confirmations fetch error:', error);
    setApprovalConfirmation(data);
    setLoadingConfirmation(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      {isDesktop ? (
        <View style={styles.header}>
          <Text style={styles.title}>Moje Zadania</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={theme.colors.white} />
              <Text style={styles.addBtnText}>Nowe zadanie</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <MobileHeader
          left={<Text style={styles.title}>Moje Zadania</Text>}
          center={
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={theme.colors.white} />
              <Text style={styles.addBtnText}>Nowe</Text>
            </TouchableOpacity>
          }
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
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

        {/* Employee filter */}
        {!canApprove && (
          <View style={styles.filterToggleWrap}>
            <TouchableOpacity
              style={[styles.filterToggle, !showMineOnly && styles.filterToggleActive]}
              onPress={() => setShowMineOnly(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterToggleText, !showMineOnly && styles.filterToggleTextActive]}>Wszystkie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterToggle, showMineOnly && styles.filterToggleActive]}
              onPress={() => setShowMineOnly(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterToggleText, showMineOnly && styles.filterToggleTextActive]}>Moje</Text>
            </TouchableOpacity>
          </View>
        )}
        {canApprove && employees.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.empRow}>
              <TouchableOpacity
                style={[styles.empChip, selectedEmployeeId === null && styles.empChipActive]}
                onPress={() => setSelectedEmployeeId(null)}
                activeOpacity={0.75}
              >
                <View style={styles.empAvatar}><Text style={styles.empAvatarText}>Ws</Text></View>
                <Text style={[styles.empName, selectedEmployeeId === null && styles.empNameActive]}>Wszyscy</Text>
                <View style={styles.empCountBadge}>
                  <Text style={styles.empCountText}>{tasks.length}</Text>
                </View>
              </TouchableOpacity>
            {employees.map((emp) => {
              const empTaskCount = tasks.filter((t) => t.assigned_to === emp.id).length;
              const initials = `${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`;
              const isSelected = selectedEmployeeId === emp.id;
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={[styles.empChip, isSelected && styles.empChipActive]}
                  onPress={() => setSelectedEmployeeId(emp.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.empAvatar, isSelected && styles.empAvatarActive]}>
                    <Text style={[styles.empAvatarText, isSelected && { color: theme.colors.white }]}>{initials}</Text>
                  </View>
                  <Text style={[styles.empName, isSelected && styles.empNameActive]} numberOfLines={1}>{emp.first_name}</Text>
                  <View style={styles.empCountBadge}>
                    <Text style={styles.empCountText}>{empTaskCount}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Tab filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBarWrap}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tasks */}
        <View style={styles.body}>
          {tasks.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>Brak zadań</Text>
              {isOwner && <Text style={styles.emptySub}>Dodaj pierwsze zadanie przyciskiem „Nowe zadanie”</Text>}
            </View>
          )}

          {wTrakcie.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.sectionLabel}>W trakcie</Text>
                <Text style={styles.sectionCount}>{wTrakcie.length}</Text>
              </View>
              {wTrakcie.map((t) => {
                const emp = employees.find((e) => e.id === t.assigned_to);
                const name = emp ? `${emp.first_name} ${emp.last_name}` : undefined;
                return <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={isOwner ? () => deleteTask(t.id) : undefined} onDetail={() => setDetailTask(t)} onFinish={() => finishTask(t.id)} assigneeName={canApprove && !selectedEmployeeId ? name : undefined} />;
              })}
            </>
          )}

          {doZrobienia.length > 0 && (
            <>
              <View style={[styles.sectionRow, wTrakcie.length > 0 ? { marginTop: 8 } : {}]}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.textMuted }]} />
                <Text style={styles.sectionLabel}>Do zrobienia</Text>
                <Text style={styles.sectionCount}>{doZrobienia.length}</Text>
              </View>
              {doZrobienia.map((t) => {
                const emp = employees.find((e) => e.id === t.assigned_to);
                const name = emp ? `${emp.first_name} ${emp.last_name}` : undefined;
                return <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={isOwner ? () => deleteTask(t.id) : undefined} onDetail={() => setDetailTask(t)} onStart={() => startTask(t.id)} assigneeName={canApprove && !selectedEmployeeId ? name : undefined} />;
              })}
            </>
          )}

          {zamkniete.length > 0 && (
            <>
              <View style={[styles.sectionRow, { marginTop: 8 }]}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.green }]} />
                <Text style={styles.sectionLabel}>Zamknięte</Text>
                <Text style={styles.sectionCount}>{zamkniete.length}</Text>
              </View>
              {zamkniete.map((t) => {
                const emp = employees.find((e) => e.id === t.assigned_to);
                const name = emp ? `${emp.first_name} ${emp.last_name}` : undefined;
                return <TaskCard key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={isOwner ? () => deleteTask(t.id) : undefined} onDetail={() => setDetailTask(t)} assigneeName={canApprove && !selectedEmployeeId ? name : undefined} />;
              })}
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
                    <TouchableOpacity key={t.id} style={[tStyles.card, { flexDirection: 'column' }]} onPress={() => openApprovalDetail(t)} activeOpacity={0.85}>
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
                          onPress={(e) => { e.stopPropagation?.(); openRejectModal(t); }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.error }}>Odrzuć</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )
          )}
        </View>
      </ScrollView>

      {/* Create Task Modal – 2-step */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => { if (modalStep === 2) setModalStep(1); else setShowModal(false); }}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>

            {/* ── STEP 1: Basic info ── */}
            {modalStep === 1 && (
              <>
                <View style={mStyles.header}>
                  <Text style={mStyles.headerTitle}>Nowe zadanie</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={mStyles.body}>

                  {/* Assignee */}
                  {canApprove && employees.length > 0 && (
                    <>
                      <Text style={mStyles.label}>Przypisz do *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                        <TouchableOpacity key="all" style={[mStyles.empChipModal, newAssignedTo === 'ALL' && mStyles.empChipModalActive]} onPress={() => setNewAssignedTo('ALL')} activeOpacity={0.75}>
                          <View style={[mStyles.empAvatarSmall, { backgroundColor: newAssignedTo === 'ALL' ? theme.colors.primary : theme.colors.textMuted }]}><Text style={mStyles.empAvatarSmallText}>Ws</Text></View>
                          <Text style={[mStyles.empChipModalText, newAssignedTo === 'ALL' && mStyles.empChipModalTextActive]}>Wszyscy</Text>
                        </TouchableOpacity>
                        {employees.map((e) => {
                          const active = newAssignedTo === e.id;
                          const initials = `${e.first_name?.[0] ?? ''}${e.last_name?.[0] ?? ''}`.toUpperCase();
                          return (
                            <TouchableOpacity key={e.id} style={[mStyles.empChipModal, active && mStyles.empChipModalActive]} onPress={() => setNewAssignedTo(e.id)} activeOpacity={0.75}>
                              <View style={[mStyles.empAvatarSmall, { backgroundColor: active ? theme.colors.primary : (e.avatar_color ?? theme.colors.primary) }]}><Text style={mStyles.empAvatarSmallText}>{initials}</Text></View>
                              <Text style={[mStyles.empChipModalText, active && mStyles.empChipModalTextActive]} numberOfLines={1}>{e.first_name} {e.last_name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  )}
                  {canApprove && groups.length > 0 && (
                    <>
                      <Text style={mStyles.label}>Lub przypisz do grupy</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                        <TouchableOpacity key="none" style={[mStyles.empChipModal, newAssignedGroup === null && mStyles.empChipModalActive]} onPress={() => setNewAssignedGroup(null)} activeOpacity={0.75}>
                          <View style={[mStyles.empAvatarSmall, { backgroundColor: newAssignedGroup === null ? theme.colors.textMuted : theme.colors.border }]}><Text style={mStyles.empAvatarSmallText}>--</Text></View>
                          <Text style={[mStyles.empChipModalText, newAssignedGroup === null && mStyles.empChipModalTextActive]}>Brak</Text>
                        </TouchableOpacity>
                        {groups.map((g) => {
                          const active = newAssignedGroup === g.id;
                          return (
                            <TouchableOpacity key={g.id} style={[mStyles.empChipModal, active && mStyles.empChipModalActive]} onPress={() => setNewAssignedGroup(g.id)} activeOpacity={0.75}>
                              <View style={[mStyles.empAvatarSmall, { backgroundColor: active ? g.color : theme.colors.border }]}><Text style={mStyles.empAvatarSmallText}>{g.name.substring(0, 2).toUpperCase()}</Text></View>
                              <Text style={[mStyles.empChipModalText, active && mStyles.empChipModalTextActive]} numberOfLines={1}>{g.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  )}

                  {/* Title */}
                  <Text style={mStyles.label}>Nazwa zadania *</Text>
                  <TextInput style={mStyles.input} value={newTitle} onChangeText={setNewTitle} placeholder="np. Przygotowanie sali na catering" placeholderTextColor={theme.colors.textMuted} />

                  {/* Confirmation type */}
                  <Text style={mStyles.label}>Potwierdzenie wykonania</Text>
                  <View style={mStyles.confirmRow}>
                    {CONFIRM_TYPES.map((c) => {
                      const iconMap: Record<string, string> = { photo: 'camera-outline', values: 'thermometer-outline', description: 'document-text-outline' };
                      const isActive = newConfirm === c.value;
                      const isNone = c.value === null;
                      return (
                        <TouchableOpacity key={String(c.value)} style={[mStyles.confirmBtn, isActive && mStyles.confirmBtnActive]} onPress={() => { setNewConfirm(c.value); setCfgValueItems([]); setCfgCheckItems([]); setCfgPrompt(''); }} activeOpacity={0.75}>
                          <Ionicons name={(isNone ? 'ban-outline' : iconMap[c.value as string] ?? 'checkmark-circle-outline') as any} size={20} color={isActive ? theme.colors.primary : theme.colors.textMuted} />
                          <Text style={[mStyles.confirmBtnText, isActive && mStyles.confirmBtnTextActive]}>{c.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Confirmation config editors */}
                  {newConfirm === 'values' && (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={mStyles.label}>Definiuj pomiary</Text>
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }} onPress={() => setCfgValueItems(prev => [...prev, { id: Date.now().toString(), name: '', unit: '°C', min: '0', max: '100' }])} activeOpacity={0.7}>
                          <Ionicons name="add" size={14} color={theme.colors.primary} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Dodaj pomiar</Text>
                        </TouchableOpacity>
                      </View>
                      {cfgValueItems.length === 0 && <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' }}>Pozostaw puste aby użyć domyślnych (HACCP).</Text>}
                      {cfgValueItems.map((item, idx) => (
                        <View key={item.id} style={{ backgroundColor: theme.colors.surface, borderRadius: 10, padding: 10, gap: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>Pomiar {idx + 1}</Text>
                            <TouchableOpacity onPress={() => setCfgValueItems(prev => prev.filter(i => i.id !== item.id))}><Ionicons name="trash-outline" size={15} color={theme.colors.error} /></TouchableOpacity>
                          </View>
                          <TextInput style={mStyles.input} value={item.name} onChangeText={v => setCfgValueItems(prev => prev.map(i => i.id === item.id ? { ...i, name: v } : i))} placeholder="Nazwa (np. Lodówka 1)" placeholderTextColor={theme.colors.textMuted} />
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TextInput style={[mStyles.input, { flex: 1 }]} value={item.unit} onChangeText={v => setCfgValueItems(prev => prev.map(i => i.id === item.id ? { ...i, unit: v } : i))} placeholder="Jed." placeholderTextColor={theme.colors.textMuted} />
                            <TextInput style={[mStyles.input, { flex: 1 }]} value={item.min} onChangeText={v => setCfgValueItems(prev => prev.map(i => i.id === item.id ? { ...i, min: v } : i))} placeholder="Min" keyboardType="numeric" placeholderTextColor={theme.colors.textMuted} />
                            <TextInput style={[mStyles.input, { flex: 1 }]} value={item.max} onChangeText={v => setCfgValueItems(prev => prev.map(i => i.id === item.id ? { ...i, max: v } : i))} placeholder="Max" keyboardType="numeric" placeholderTextColor={theme.colors.textMuted} />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {newConfirm === 'description' && (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      <Text style={mStyles.label}>Polecenie (opcjonalne)</Text>
                      <TextInput style={[mStyles.input, mStyles.inputMulti]} value={cfgPrompt} onChangeText={setCfgPrompt} placeholder="np. Opisz co zostało zrobione..." placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={2} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={mStyles.label}>Lista kontrolna</Text>
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }} onPress={() => setCfgCheckItems(prev => [...prev, { id: Date.now().toString(), label: '' }])} activeOpacity={0.7}>
                          <Ionicons name="add" size={14} color={theme.colors.primary} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Dodaj punkt</Text>
                        </TouchableOpacity>
                      </View>
                      {cfgCheckItems.map((item, idx) => (
                        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="checkbox-outline" size={16} color={theme.colors.textMuted} />
                          <TextInput style={[mStyles.input, { flex: 1 }]} value={item.label} onChangeText={v => setCfgCheckItems(prev => prev.map(i => i.id === item.id ? { ...i, label: v } : i))} placeholder={`Punkt ${idx + 1}...`} placeholderTextColor={theme.colors.textMuted} />
                          <TouchableOpacity onPress={() => setCfgCheckItems(prev => prev.filter(i => i.id !== item.id))}><Ionicons name="close-circle-outline" size={18} color={theme.colors.error} /></TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  {newConfirm === 'photo' && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={mStyles.label}>Wskazówka (opcjonalne)</Text>
                      <TextInput style={[mStyles.input, mStyles.inputMulti]} value={cfgPrompt} onChangeText={setCfgPrompt} placeholder="np. Zrób zdjęcie czystej kuchni..." placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={2} />
                    </View>
                  )}

                  {/* Task type: recurring / one-time */}
                  <Text style={[mStyles.label, { marginTop: 16 }]}>Typ zadania</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setIsRecurring(true)} activeOpacity={0.7}>
                      <View style={[mStyles.checkbox, isRecurring && mStyles.checkboxActive]}>{isRecurring && <Ionicons name="checkmark" size={14} color="#fff" />}</View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>Zadanie cykliczne</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setIsRecurring(false)} activeOpacity={0.7}>
                      <View style={[mStyles.checkbox, !isRecurring && mStyles.checkboxActive]}>{!isRecurring && <Ionicons name="checkmark" size={14} color="#fff" />}</View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>Jednorazowe</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Start date quick-select */}
                  <Text style={[mStyles.label, { marginTop: 14 }]}>Rozpocznij</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    {[
                      { label: 'Dziś', value: todayStr() },
                      { label: 'Jutro', value: offsetDate(1) },
                      { label: 'Za 3 dni', value: offsetDate(3) },
                    ].map((opt) => (
                      <TouchableOpacity key={opt.label} style={[mStyles.startChip, taskDate === opt.value && !showCustomDate && mStyles.startChipActive]}
                        onPress={() => { setTaskDate(opt.value); setShowCustomDate(false); setCustomDateInput(''); }} activeOpacity={0.7}>
                        <Text style={[mStyles.startChipText, taskDate === opt.value && !showCustomDate && mStyles.startChipTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={[mStyles.startChip, showCustomDate && mStyles.startChipActive]} onPress={() => setShowCustomDate(v => !v)} activeOpacity={0.7}>
                      <Ionicons name="calendar-outline" size={14} color={showCustomDate ? '#fff' : theme.colors.textSecondary} />
                      <Text style={[mStyles.startChipText, showCustomDate && mStyles.startChipTextActive]}>{showCustomDate && taskDate ? formatDateDisplay(taskDate) : 'Wybierz datę'}</Text>
                    </TouchableOpacity>
                  </View>
                  {showCustomDate && (
                    <TextInput style={[mStyles.input, { marginBottom: 4 }]} value={customDateInput}
                      onChangeText={(v) => { setCustomDateInput(v); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) setTaskDate(v); }}
                      placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textMuted} keyboardType="numbers-and-punctuation" />
                  )}
                  {!!taskDate && !showCustomDate && (
                    <View style={mStyles.dateInfoBadge}>
                      <Ionicons name="calendar" size={13} color={theme.colors.primary} />
                      <Text style={mStyles.dateInfoText}>Wybrana: {formatDateDisplay(taskDate)}</Text>
                    </View>
                  )}

                  {/* Recurrence summary row (only if recurring) */}
                  {isRecurring && (
                    <View style={mStyles.recurrenceSummaryRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={mStyles.recurrenceSummaryLabel}>Powtarzaj</Text>
                        <Text style={mStyles.recurrenceSummaryValue}>
                          {(() => {
                            const DAY_SHORT = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'];
                            const daysStr = selectedDays.length > 0 ? selectedDays.map(d => DAY_SHORT[d]).join(', ') : '';
                            if (recurrencePattern === 'daily') return 'Codziennie';
                            if (recurrencePattern === 'weekly') return daysStr ? `Co tydzień: ${daysStr}` : 'Co tydzień (wybierz dni →)';
                            if (recurrencePattern === 'biweekly') return daysStr ? `Co 2 tygodnie: ${daysStr}` : 'Co 2 tygodnie (wybierz dni →)';
                            if (recurrencePattern === 'monthly') return 'Co miesiąc';
                            return daysStr ? `Niestandardowe: ${daysStr}` : 'Niestandardowe (wybierz dni →)';
                          })()}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setModalStep(2)} style={mStyles.changeBtn}>
                        <Text style={mStyles.changeBtnText}>Zmień</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* End date for recurrence */}
                  {isRecurring && (
                    <>
                      <Text style={mStyles.label}>Data zakończenia (opcjonalna)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, height: 46 }}>
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                        <TextInput style={{ flex: 1, fontSize: 14, color: theme.colors.text }}
                          value={recurrenceEndDate} onChangeText={setRecurrenceEndDate}
                          placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textMuted} />
                      </View>
                    </>
                  )}

                  <TimePickerRow label="Godzina" value={newTime} onChange={setNewTime} />
                  <View style={[mStyles.row, { marginTop: 8 }]}>
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
                  {canApprove && (
                    <>
                      <Text style={mStyles.label}>Punkty (opcjonalnie)</Text>
                      <TextInput style={mStyles.input} value={points} onChangeText={setPoints} keyboardType="numeric" placeholder="np. 10" placeholderTextColor={theme.colors.textMuted} />
                    </>
                  )}
                </ScrollView>

                <View style={mStyles.footer}>
                  <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setShowModal(false)} activeOpacity={0.7}>
                    <Text style={mStyles.cancelText}>Anuluj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[mStyles.saveBtn, !newTitle.trim() && mStyles.saveBtnDisabled]} onPress={handleCreate} activeOpacity={0.85} disabled={saving || !newTitle.trim()}>
                    {saving ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Text style={mStyles.saveText}>Dodaj zadanie</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── STEP 2: Recurrence settings ── */}
            {modalStep === 2 && (
              <>
                <View style={mStyles.header}>
                  <TouchableOpacity onPress={() => setModalStep(1)} style={{ padding: 4 }}>
                    <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={mStyles.headerTitle}>Ustawienia cykliczności</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={mStyles.body}>
                  <Text style={mStyles.label}>Powtarzaj</Text>
                  {[
                    { key: 'daily', label: 'Codziennie' },
                    { key: 'weekly', label: 'Co tydzień' },
                    { key: 'biweekly', label: 'Co 2 tygodnie' },
                    { key: 'monthly', label: 'Co miesiąc' },
                    { key: 'custom', label: 'Niestandardowe' },
                  ].map((opt) => (
                    <TouchableOpacity key={opt.key} style={mStyles.radioRow} onPress={() => setRecurrencePattern(opt.key as any)} activeOpacity={0.7}>
                      <View style={[mStyles.radioOuter, recurrencePattern === opt.key && mStyles.radioOuterActive]}>
                        {recurrencePattern === opt.key && <View style={mStyles.radioInner} />}
                      </View>
                      <Text style={[mStyles.radioLabel, recurrencePattern === opt.key && { color: theme.colors.primary, fontWeight: '700' }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {(recurrencePattern === 'weekly' || recurrencePattern === 'biweekly' || recurrencePattern === 'custom') && (
                    <>
                      <Text style={[mStyles.label, { marginTop: 16 }]}>Dni tygodnia</Text>
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((day, idx) => (
                          <TouchableOpacity key={idx} style={[mStyles.dayCircle, selectedDays.includes(idx) && mStyles.dayCircleActive]}
                            onPress={() => setSelectedDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])} activeOpacity={0.7}>
                            <Text style={[mStyles.dayCircleText, selectedDays.includes(idx) && mStyles.dayCircleTextActive]}>{day}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <Text style={[mStyles.label, { marginTop: 20 }]}>Dodatkowe opcje</Text>
                  <Text style={[mStyles.label, { fontSize: 12 }]}>Czas wykonania (opcjonalnie)</Text>
                  <TextInput style={mStyles.input} value={recurrenceTime} onChangeText={setRecurrenceTime} placeholder="10:00" placeholderTextColor={theme.colors.textMuted} />

                  <Text style={[mStyles.label, { marginTop: 14 }]}>Termin wykonania</Text>
                  <TouchableOpacity style={mStyles.radioRow} onPress={() => setRecurrenceEndNoLimit(true)} activeOpacity={0.7}>
                    <View style={[mStyles.radioOuter, recurrenceEndNoLimit && mStyles.radioOuterActive]}>
                      {recurrenceEndNoLimit && <View style={mStyles.radioInner} />}
                    </View>
                    <Text style={[mStyles.radioLabel, recurrenceEndNoLimit && { color: theme.colors.primary, fontWeight: '700' }]}>Bez terminu końcowego</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={mStyles.radioRow} onPress={() => setRecurrenceEndNoLimit(false)} activeOpacity={0.7}>
                    <View style={[mStyles.radioOuter, !recurrenceEndNoLimit && mStyles.radioOuterActive]}>
                      {!recurrenceEndNoLimit && <View style={mStyles.radioInner} />}
                    </View>
                    <Text style={[mStyles.radioLabel, !recurrenceEndNoLimit && { color: theme.colors.primary, fontWeight: '700' }]}>Zakończ dnia</Text>
                    {!recurrenceEndNoLimit && (
                      <TextInput style={[mStyles.input, { flex: 1, marginLeft: 12, marginBottom: 0 }]} value={recurrenceEndDate} onChangeText={setRecurrenceEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </ScrollView>

                <View style={mStyles.footer}>
                  <TouchableOpacity style={mStyles.saveBtn} onPress={() => setModalStep(1)} activeOpacity={0.85}>
                    <Text style={mStyles.saveText}>Zapisz</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal visible={!!detailTask} animationType="fade" transparent onRequestClose={() => setDetailTask(null)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>
            {detailTask && (() => {
              const p = PRIORITY_CONFIG[detailTask.priority as TaskPriority] ?? PRIORITY_CONFIG.normalny;
              const confirmCfg = detailTask.confirmation_type ? CONFIRM_CONFIG[detailTask.confirmation_type as ConfirmationType] : null;
              return (
                <>
                  <View style={mStyles.header}>
                    <View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: p.color }]} />
                    <Text style={mStyles.headerTitle} numberOfLines={1}>{detailTask.title}</Text>
                    <TouchableOpacity onPress={() => setDetailTask(null)}>
                      <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={mStyles.body}>
                    {detailTask.status === 'do_zrobienia' && detailTask.proof_comment ? (
                      <View style={{ backgroundColor: '#FFF0EF', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: theme.colors.error, gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.error }}>Zadanie odrzucone — wymaga poprawy</Text>
                        </View>
                        <Text style={{ fontSize: 13, color: '#C0392B', lineHeight: 18 }}>{detailTask.proof_comment}</Text>
                      </View>
                    ) : null}
                    <View style={[mStyles.detailRow, { flexWrap: 'wrap', gap: 8 }]}>
                      <View style={[mStyles.badge, { backgroundColor: p.bg }]}>
                        <Text style={[mStyles.badgeText, { color: p.color }]}>{p.label}</Text>
                      </View>
                      {confirmCfg && (
                        <View style={[mStyles.badge, { backgroundColor: confirmCfg.bg }]}>
                          <Ionicons name={confirmCfg.icon as any} size={11} color={confirmCfg.color} />
                          <Text style={[mStyles.badgeText, { color: confirmCfg.color }]}>{confirmCfg.label}</Text>
                        </View>
                      )}
                    </View>
                    {detailTask.description ? (
                      <View style={mStyles.detailSection}>
                        <Text style={mStyles.detailLabel}>Opis</Text>
                        <Text style={mStyles.detailText}>{detailTask.description}</Text>
                      </View>
                    ) : null}
                    <View style={mStyles.detailGrid}>
                      <View style={mStyles.detailCell}>
                        <Text style={mStyles.detailLabel}>Godzina</Text>
                        <Text style={mStyles.detailValue}>{detailTask.assigned_time}</Text>
                      </View>
                      <View style={mStyles.detailCell}>
                        <Text style={mStyles.detailLabel}>Czas trwania</Text>
                        <Text style={mStyles.detailValue}>{detailTask.duration_min} min</Text>
                      </View>
                    </View>
                  </ScrollView>
                  <View style={mStyles.footer}>
                    <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setDetailTask(null)} activeOpacity={0.7}>
                      <Text style={mStyles.cancelText}>Zamknij</Text>
                    </TouchableOpacity>
                    {detailTask.completed ? (
                      <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: theme.colors.green }]} onPress={() => { toggleTask(detailTask.id); setDetailTask(null); }} activeOpacity={0.85}>
                        <Text style={mStyles.saveText}>Otwórz ponownie</Text>
                      </TouchableOpacity>
                    ) : (detailTask.status as string) === 'czeka_na_zatwierdzenie' ? (
                      <View style={[mStyles.saveBtn, { backgroundColor: theme.colors.textMuted, flexDirection: 'row', gap: 6 }]}>
                        <Ionicons name="hourglass-outline" size={15} color="#fff" />
                        <Text style={mStyles.saveText}>Czeka na zatwierdzenie</Text>
                      </View>
                    ) : confirmCfg ? (
                      <TouchableOpacity
                        style={[mStyles.saveBtn, { backgroundColor: confirmCfg.color, flexDirection: 'row', gap: 6 }]}
                        onPress={() => { setDetailTask(null); router.push({ pathname: confirmCfg.route as any, params: { taskId: detailTask.id } }); }}
                        activeOpacity={0.85}
                      >
                        <Ionicons name={confirmCfg.icon as any} size={15} color="#fff" />
                        <Text style={mStyles.saveText}>Prześlij potwierdzenie</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={mStyles.saveBtn} onPress={() => { toggleTask(detailTask.id); setDetailTask(null); }} activeOpacity={0.85}>
                        <Text style={mStyles.saveText}>Oznacz jako zrobione</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Approval Detail Modal */}
      <Modal visible={!!approvalDetailTask} animationType="fade" transparent onRequestClose={() => setApprovalDetailTask(null)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>
            {approvalDetailTask && (() => {
              const p = PRIORITY_CONFIG[approvalDetailTask.priority as TaskPriority] ?? PRIORITY_CONFIG.normalny;
              const confirmCfg = approvalDetailTask.confirmation_type ? CONFIRM_CONFIG[approvalDetailTask.confirmation_type as ConfirmationType] : null;
              const assignee = employees.find((e) => e.id === approvalDetailTask.assigned_to);
              return (
                <>
                  <View style={mStyles.header}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: p.color }} />
                    <Text style={mStyles.headerTitle} numberOfLines={1}>{approvalDetailTask.title}</Text>
                    <TouchableOpacity onPress={() => setApprovalDetailTask(null)}>
                      <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={mStyles.body}>
                    <View style={[mStyles.detailRow, { flexWrap: 'wrap', gap: 8, marginBottom: 16 }]}>
                      <View style={[mStyles.badge, { backgroundColor: p.bg }]}>
                        <Text style={[mStyles.badgeText, { color: p.color }]}>{p.label}</Text>
                      </View>
                      {confirmCfg && (
                        <View style={[mStyles.badge, { backgroundColor: confirmCfg.bg }]}>
                          <Ionicons name={confirmCfg.icon as any} size={11} color={confirmCfg.color} />
                          <Text style={[mStyles.badgeText, { color: confirmCfg.color }]}>{confirmCfg.label}</Text>
                        </View>
                      )}
                      {assignee && (
                        <View style={[mStyles.badge, { backgroundColor: theme.colors.surface }]}>
                          <Ionicons name="person-outline" size={11} color={theme.colors.textSecondary} />
                          <Text style={[mStyles.badgeText, { color: theme.colors.textSecondary }]}>{assignee.first_name} {assignee.last_name}</Text>
                        </View>
                      )}
                    </View>
                    {approvalDetailTask.description ? (
                      <View style={mStyles.detailSection}>
                        <Text style={mStyles.detailLabel}>Opis zadania</Text>
                        <Text style={mStyles.detailText}>{approvalDetailTask.description}</Text>
                      </View>
                    ) : null}
                    {loadingConfirmation && <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />}
                    {!loadingConfirmation && (() => {
                      const photoUrl = approvalConfirmation?.photo_url ?? (approvalDetailTask as any).proof_photo_url;
                      const proofText = approvalConfirmation?.description ?? (approvalDetailTask as any).proof_comment;
                      const valuesData = approvalConfirmation?.values_data;
                      const checklistData = approvalConfirmation?.checklist_data;
                      const hasAny = photoUrl || proofText || (valuesData?.length > 0) || (checklistData?.length > 0);
                      if (!hasAny) return (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textMuted} />
                          <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 8 }}>Pracownik nie przesłał potwierdzenia</Text>
                        </View>
                      );
                      return (
                        <View style={{ marginTop: 16, gap: 12 }}>
                          <Text style={[mStyles.detailLabel, { marginBottom: 4 }]}>Potwierdzenie pracownika</Text>
                          {photoUrl && (
                            <Image source={{ uri: photoUrl }} style={{ width: '100%', height: 220, borderRadius: 12 }} resizeMode="cover" />
                          )}
                          {valuesData && valuesData.length > 0 && (
                            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, gap: 8 }}>
                              <Text style={[mStyles.detailLabel, { marginBottom: 4 }]}>Pomiary (HACCP)</Text>
                              {valuesData.map((row: any, i: number) => {
                                const isOk = row.status === 'ok';
                                const statusColor = isOk ? theme.colors.green : theme.colors.error;
                                return (
                                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: theme.colors.border }}>
                                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, flex: 1 }}>{row.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Text style={{ fontSize: 14, fontWeight: '700', color: statusColor }}>{row.value} {row.unit}</Text>
                                      <Ionicons name={isOk ? 'checkmark-circle' : 'alert-circle'} size={16} color={statusColor} />
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                          {proofText ? (
                            <View style={[mStyles.detailSection, { backgroundColor: theme.colors.surface }]}>
                              <Text style={mStyles.detailLabel}>Opis pracownika</Text>
                              <Text style={mStyles.detailText}>{proofText}</Text>
                            </View>
                          ) : null}
                          {checklistData && checklistData.length > 0 && (
                            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, gap: 8 }}>
                              <Text style={[mStyles.detailLabel, { marginBottom: 4 }]}>Lista kontrolna</Text>
                              {checklistData.map((item: any, i: number) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  <Ionicons name={item.checked ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={item.checked ? theme.colors.green : theme.colors.textMuted} />
                                  <Text style={{ fontSize: 13, color: item.checked ? theme.colors.text : theme.colors.textSecondary, flex: 1 }}>{item.label}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </ScrollView>
                  <View style={mStyles.footer}>
                    <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: theme.colors.error }]} onPress={() => { setApprovalDetailTask(null); openRejectModal(approvalDetailTask); }} activeOpacity={0.85}>
                      <Text style={mStyles.saveText}>Odrzuć</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: theme.colors.green }]} onPress={() => { approveTask(approvalDetailTask.id); setApprovalDetailTask(null); }} activeOpacity={0.85}>
                      <Text style={mStyles.saveText}>Zatwierdź ✓</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal visible={!!rejectingTask} animationType="fade" transparent onRequestClose={() => setRejectingTask(null)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>
            <View style={mStyles.header}>
              <Ionicons name="close-circle" size={20} color={theme.colors.error} />
              <Text style={mStyles.headerTitle}>Odrzuć zadanie</Text>
              <TouchableOpacity onPress={() => setRejectingTask(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={mStyles.body}>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
                Podaj powód odrzucenia. Zadanie wróci do listy pracownika z Twoim komentarzem.
              </Text>
              <Text style={mStyles.label}>Powód odrzucenia *</Text>
              <TextInput
                style={[mStyles.input, mStyles.inputMulti]}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="np. Zdjęcie niewyraźne, proszę powtórzyć..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
                autoFocus
              />
            </ScrollView>
            <View style={mStyles.footer}>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setRejectingTask(null)} activeOpacity={0.7}>
                <Text style={mStyles.cancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mStyles.saveBtn, { backgroundColor: theme.colors.error }, !rejectReason.trim() && mStyles.saveBtnDisabled]}
                onPress={() => rejectingTask && rejectTask(rejectingTask.id, rejectReason.trim())}
                activeOpacity={0.85}
                disabled={!rejectReason.trim()}
              >
                <Text style={mStyles.saveText}>Odrzuć zadanie</Text>
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
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },
  scrollContentDesktop: { maxWidth: 700, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },
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

  tabBarWrap: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    padding: 4,
    ...theme.shadows.card,
    gap: 2,
  },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
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

  empRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  empChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  empChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  empAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  empAvatarActive: { backgroundColor: theme.colors.primary },
  empAvatarText: { fontSize: 9, fontWeight: '800', color: theme.colors.textSecondary },
  empName: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, maxWidth: 70 },
  empNameActive: { color: theme.colors.primary },
  empCountBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  empCountText: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },

  filterToggleWrap: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterToggle: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 16, borderRadius: theme.borderRadius.full,
    borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  filterToggleActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  filterToggleText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  filterToggleTextActive: { color: '#fff' },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92%', overflow: 'hidden' },
  sheetDesktop: { maxWidth: 560, width: '100%' },
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
  detailRow: { flexDirection: 'row', marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '800' },
  detailSection: { marginBottom: 16 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  detailGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  detailCell: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 12 },
  detailValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.white },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  cancelBtn: { flex: 1, height: 50, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  saveBtn: { flex: 2, height: 50, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  empChipModal: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  empChipModalActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  empAvatarSmall: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empAvatarSmallText: { fontSize: 10, fontWeight: '700', color: theme.colors.white },
  empChipModalText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  empChipModalTextActive: { color: theme.colors.primary, fontWeight: '600' },

  confirmRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  confirmBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  confirmBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  confirmBtnText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  confirmBtnTextActive: { color: theme.colors.primary },

  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },

  startChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  startChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  startChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  startChipTextActive: { color: '#fff' },

  dateInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  dateInfoText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },

  recurrenceSummaryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 12, marginTop: 4, marginBottom: 4 },
  recurrenceSummaryLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 },
  recurrenceSummaryValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.primaryLight },
  changeBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },

  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: theme.colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  radioLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.text },

  dayCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayCircleText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  dayCircleTextActive: { color: '#fff' },
});
