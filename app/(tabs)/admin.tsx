import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileHeader from '../../components/MobileHeader';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { assignEmployeeToGroup, createEmployeeGroup, createQuizQuestion, createTraining, deleteEmployeeGroup, deleteQuizQuestion, deleteTraining, generateInvitation, getAbsences, getEmployeeGroupsWithMembers, getEmployees, getInvitations, getLeaveRequests, getQuizQuestions, getTrainings, removeEmployee, removeEmployeeFromGroup, reviewAbsence, reviewLeaveRequestWithNotes, updateEmployeeGroup, updateRestaurant, updateTraining } from '../../lib/db';
import type { DbAbsence, DbEmployeeGroup, DbInvitation, DbLeaveRequest, DbProfile, DbTraining } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const JOB_OPTIONS = ['Kelner', 'Kucharz', 'Barista', 'Lider zmiany', 'Hostessa', 'Pizzaiolo', 'Sprzątanie'];

export default function AdminScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, restaurant, refreshRestaurant, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert, showConfirm } = useAlert();
  const rid = user?.restaurantId ?? '';

  // Handle tab parameter from URL
  useEffect(() => {
    if (params.tab && typeof params.tab === 'string') {
      setTab(params.tab as any);
    }
  }, [params.tab]);

  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [invitations, setInvitations] = useState<DbInvitation[]>([]);
  const [trainings, setTrainings] = useState<DbTraining[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<DbLeaveRequest[]>([]);
  const [absences, setAbsences] = useState<DbAbsence[]>([]);
  const [groups, setGroups] = useState<(DbEmployeeGroup & { members: string[] })[]>([]);

  // Leave request review state (with notes)
  const [reviewingRequest, setReviewingRequest] = useState<DbLeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<(DbEmployeeGroup & { members: string[] }) | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('#2563EB');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Employee edit state
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<DbProfile | null>(null);
  const [empFirstName, setEmpFirstName] = useState('');
  const [empLastName, setEmpLastName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empJobTitle, setEmpJobTitle] = useState('Kelner');
  const [empRole, setEmpRole] = useState<'employee' | 'manager'>('employee');
  const [empLeaveDays, setEmpLeaveDays] = useState<string>('');
  const [empLeaveTypeSettings, setEmpLeaveTypeSettings] = useState<{type: string, enabled: boolean, days: string}[]>([]);
  const [jobTitle, setJobTitle] = useState('Kelner');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [tab, setTab] = useState<'team' | 'groups' | 'invites' | 'urlopy' | 'nieobecnosci' | 'settings'>('team');

  // Restaurant edit state
  const [rName, setRName] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rSaving, setRSaving] = useState(false);
  const [rSaved, setRSaved] = useState(false);

  // Training modal state
  const EMPTY_TRAINING = { title: '', category: 'BHP', duration_min: '30', required: false, points: '50', material_url: '', material_type: null as 'pdf' | 'video' | null, assigned_roles: [] as string[], deadline: '' };
  const EMPTY_QDRAFT = { question: '', options: ['', '', '', ''], correct_index: 0, explanation: '' };
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<DbTraining | null>(null);
  const [tForm, setTForm] = useState(EMPTY_TRAINING);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [pendingQs, setPendingQs] = useState<Array<{ question: string; options: string[]; correct_index: number; explanation: string }>>([]);
  const [qDraft, setQDraft] = useState(EMPTY_QDRAFT);
  const [addingQDraft, setAddingQDraft] = useState(false);

  const ALL_ROLES = ['Kelner', 'Kucharz', 'Barista', 'Lider zmiany', 'Hostessa', 'Pizzaiolo', 'Sprzątanie'];

  const toggleRole = (role: string) => {
    setTForm((f) => {
      const roles = f.assigned_roles;
      return { ...f, assigned_roles: roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role] };
    });
  };

  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    if (!rid) return;
    getEmployees(rid).then(setEmployees);
    getInvitations(rid).then(setInvitations);
    getTrainings(rid).then(setTrainings);
    getLeaveRequests(rid).then(setLeaveRequests);
    getAbsences(rid).then(setAbsences);
    getEmployeeGroupsWithMembers(rid).then(setGroups);
  };

  useFocusEffect(useCallback(() => { refresh(); }, [rid]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 800);
  }, [rid]);

  useEffect(() => {
    if (restaurant) {
      setRName(restaurant.name);
      setRAddress(restaurant.address ?? '');
      setRPhone(restaurant.phone ?? '');
    }
  }, [restaurant]);

  if (user && !isOwner && !isManager) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  const saveRestaurant = async () => {
    if (!restaurant || !rName.trim()) return;
    setRSaving(true);
    const ok = await updateRestaurant(restaurant.id, { name: rName.trim(), address: rAddress.trim(), phone: rPhone.trim() });
    if (ok) { await refreshRestaurant(); setRSaved(true); setTimeout(() => setRSaved(false), 2500); }
    setRSaving(false);
  };

  const generateInvite = async () => {
    if (!user) return;
    const inv = await generateInvitation(rid, user.id, jobTitle);
    if (inv) { setLastCode(inv.code); setShowInvite(false); refresh(); }
  };

  const copyToClipboard = (code: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      }).catch(() => {
        // fallback: create temp input
        const el = document.createElement('input');
        el.value = code;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      });
    } else {
      shareCode(code);
    }
  };

  const shareCode = async (code: string) => {
    const msg = `Dołącz do ${restaurant?.name} w ShiftApp!\n\nTwój kod aktywacyjny: ${code}\n\nPobierz aplikację i wpisz kod w sekcji „Dołącz do restauracji”.`;
    try {
      await Share.share({ message: msg });
    } catch {
      showAlert('Kod skopiowany', `Kod: ${code} — Udostępnij go pracownikowi.`);
    }
  };

  const removeEmp = (empId: string, empName: string) => {
    if (empId === user?.id) {
      showAlert('Błąd', 'Nie możesz usunąć własnego konta. Skontaktuj się z właścicielem.');
      return;
    }
    showConfirm(
      'Usuń pracownika',
      `Czy na pewno chcesz usunąć ${empName} z zespołu?`,
      async () => { await removeEmployee(empId); refresh(); },
      'Usuń'
    );
  };

  const owners = employees.filter((e) => e.role === 'owner');
  const staff = employees.filter((e) => e.role === 'employee');
  const activeInvites = invitations.filter((i) => !i.used && new Date(i.expires_at) > new Date());
  const usedInvites = invitations.filter((i) => i.used);

  const openNewTraining = () => {
    setEditingTraining(null);
    setTForm(EMPTY_TRAINING);
    setHasQuiz(false);
    setPendingQs([]);
    setQDraft(EMPTY_QDRAFT);
    setAddingQDraft(false);
    setShowTrainingModal(true);
  };

  const openEditTraining = async (tr: DbTraining) => {
    setEditingTraining(tr);
    setTForm({
      title: tr.title,
      category: tr.category,
      duration_min: String(tr.duration_min),
      required: tr.required,
      points: String(tr.points),
      material_url: tr.material_url ?? '',
      material_type: tr.material_type,
      assigned_roles: tr.assigned_roles ?? [],
      deadline: tr.deadline ?? '',
    });
    const existingQs = await getQuizQuestions(tr.id);
    const mapped = existingQs.map((q) => ({ question: q.question, options: q.options, correct_index: q.correct_index, explanation: q.explanation ?? '' }));
    setPendingQs(mapped);
    setHasQuiz(mapped.length > 0);
    setQDraft(EMPTY_QDRAFT);
    setAddingQDraft(false);
    setShowTrainingModal(true);
  };

  const saveTraining = async () => {
    if (!tForm.title.trim()) { showAlert('Błąd', 'Podaj tytuł szkolenia'); return; }
    if (addingQDraft) { showAlert('Uwaga', 'Dokończ dodawanie pytania lub kliknij Anuluj'); return; }
    const payload = {
      title: tForm.title.trim(),
      category: tForm.category,
      duration_min: parseInt(tForm.duration_min) || 30,
      required: tForm.required,
      points: parseInt(tForm.points) || 0,
      material_url: tForm.material_url.trim() || null,
      material_type: tForm.material_type,
      assigned_roles: tForm.assigned_roles,
      deadline: tForm.deadline.trim() || null,
    };
    if (editingTraining) {
      await updateTraining(editingTraining.id, payload);
      const oldQs = await getQuizQuestions(editingTraining.id);
      for (const oq of oldQs) await deleteQuizQuestion(oq.id);
      if (hasQuiz) for (let i = 0; i < pendingQs.length; i++) await createQuizQuestion(rid, editingTraining.id, { ...pendingQs[i], sort_order: i });
    } else {
      const newTr = await createTraining(rid, payload);
      if (newTr && hasQuiz) for (let i = 0; i < pendingQs.length; i++) await createQuizQuestion(rid, newTr.id, { ...pendingQs[i], sort_order: i });
    }
    setShowTrainingModal(false);
    refresh();
  };

  const deleteTrainingConfirm = (tr: DbTraining) => {
    showConfirm(
      'Usuń szkolenie',
      `Czy na pewno chcesz usunąć "${tr.title}"?`,
      async () => { await deleteTraining(tr.id); refresh(); },
      'Usuń'
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      {isDesktop ? (
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Zarządzanie</Text>
            <Text style={s.headerSub}>{restaurant?.name}</Text>
          </View>
          <View style={s.headerBadge}>
            <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
            <Text style={s.headerBadgeText}>Właściciel</Text>
          </View>
        </View>
      ) : (
        <MobileHeader
          left={
            <View>
              <Text style={s.headerTitle}>Zarządzanie</Text>
              <Text style={s.headerSub}>{restaurant?.name}</Text>
            </View>
          }
          center={
            <View style={s.headerBadge}>
              <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
              <Text style={s.headerBadgeText}>Właściciel</Text>
            </View>
          }
        />
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs}>
        {([
          { key: 'team', label: 'Zespół', icon: 'people' },
          { key: 'groups', label: 'Zespoły', icon: 'layers' },
          { key: 'invites', label: 'Zaproszenia', icon: 'mail' },
          { key: 'urlopy', label: 'Urlopy', icon: 'umbrella' },
          { key: 'nieobecnosci', label: 'Nieobecności', icon: 'alert-circle' },
          { key: 'settings', label: 'Restauracja', icon: 'restaurant' },
        ] as const).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={(tab === t.key ? t.icon : `${t.icon}-outline`) as any}
              size={16}
              color={tab === t.key ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}
        showsVerticalScrollIndicator={false}
        style={isDesktop ? { width: '100%' } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* ─── TEAM TAB ─── */}
        {tab === 'team' && (
          <>
            {/* Stats */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statNum}>{employees.length}</Text>
                <Text style={s.statLabel}>Łącznie</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: theme.colors.green }]}>{staff.length}</Text>
                <Text style={s.statLabel}>Pracownicy</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: theme.colors.primary }]}>{owners.length}</Text>
                <Text style={s.statLabel}>Właściciele</Text>
              </View>
            </View>

            {/* Invite button */}
            <TouchableOpacity style={s.inviteBtn} onPress={() => setShowInvite(true)} activeOpacity={0.85}>
              <Ionicons name="person-add" size={20} color={theme.colors.white} />
              <Text style={s.inviteBtnText}>Zaproś nowego pracownika</Text>
            </TouchableOpacity>

            {/* Last generated code */}
            {lastCode && (
              <View style={s.codeCard}>
                <View style={s.codeCardTop}>
                  <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
                  <Text style={s.codeCardTitle}>Ostatnio wygenerowany kod</Text>
                </View>
                <Text style={s.codeValue} selectable>{lastCode}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[s.shareBtn, { flex: 1, backgroundColor: copiedCode === lastCode ? theme.colors.greenLight : theme.colors.primary }]}
                    onPress={() => copyToClipboard(lastCode)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={copiedCode === lastCode ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color={copiedCode === lastCode ? theme.colors.green : theme.colors.white}
                    />
                    <Text style={[s.shareBtnText, { color: copiedCode === lastCode ? theme.colors.green : theme.colors.white }]}>
                      {copiedCode === lastCode ? 'Skopiowano!' : 'Kopiuj kod'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.shareBtn, { paddingHorizontal: 14 }]} onPress={() => shareCode(lastCode)} activeOpacity={0.75}>
                    <Ionicons name="share-social-outline" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Invite modal */}
            {showInvite && (
              <View style={s.inviteModal}>
                <View style={s.inviteModalHeader}>
                  <Text style={s.inviteModalTitle}>Nowe zaproszenie</Text>
                  <TouchableOpacity onPress={() => setShowInvite(false)}>
                    <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={s.inviteModalSub}>Wybierz stanowisko dla nowego pracownika</Text>
                <View style={s.jobGrid}>
                  {JOB_OPTIONS.map((j) => (
                    <TouchableOpacity
                      key={j}
                      style={[s.jobChip, jobTitle === j && s.jobChipActive]}
                      onPress={() => setJobTitle(j)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.jobChipText, jobTitle === j && s.jobChipTextActive]}>{j}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={s.generateBtn} onPress={generateInvite} activeOpacity={0.85}>
                  <Ionicons name="key" size={18} color={theme.colors.white} />
                  <Text style={s.generateBtnText}>Generuj kod zaproszenia</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Employee list */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Właściciele</Text>
              {owners.map((emp) => (
                <View key={emp.id} style={s.empRow}>
                  <View style={[s.empAvatar, { backgroundColor: emp.avatar_color }]}>
                    <Text style={s.empInitials}>{`${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase()}</Text>
                  </View>
                  <View style={s.empInfo}>
                    <Text style={s.empName}>{emp.first_name} {emp.last_name}</Text>
                    <Text style={s.empRole}>{emp.job_title}</Text>
                  </View>
                  <View style={s.ownerBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={theme.colors.primary} />
                    <Text style={s.ownerBadgeText}>Owner</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Pracownicy ({staff.length})</Text>
              {staff.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="people-outline" size={36} color={theme.colors.border} />
                  <Text style={s.emptyText}>Brak pracowników</Text>
                  <Text style={s.emptySub}>Zaproś pierwszego pracownika kodem aktywacyjnym</Text>
                </View>
              ) : (
                staff.map((emp) => (
                  <TouchableOpacity key={emp.id} style={s.empRow} onPress={() => {
                    setEditingEmployee(emp);
                    setEmpFirstName(emp.first_name || '');
                    setEmpLastName(emp.last_name || '');
                    setEmpPhone(emp.phone || '');
                    setEmpJobTitle(emp.job_title || 'Kelner');
                    setEmpRole(emp.role === 'manager' ? 'manager' : 'employee');
                    setEmpLeaveDays('20'); // Default, would fetch from API
                    setEmpLeaveTypeSettings([
                      { type: 'annual', enabled: true, days: '20' },
                      { type: 'sick', enabled: true, days: '' },
                      { type: 'unpaid', enabled: true, days: '' },
                    ]);
                    setShowEmployeeModal(true);
                  }} activeOpacity={0.7}>
                    <View style={[s.empAvatar, { backgroundColor: emp.avatar_color }]}>
                      <Text style={s.empInitials}>{`${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase()}</Text>
                    </View>
                    <View style={s.empInfo}>
                      <Text style={s.empName}>{emp.first_name} {emp.last_name}</Text>
                      <Text style={s.empRole}>{emp.job_title}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* ─── GROUPS TAB ─── */}
        {tab === 'groups' && (
          <>
            <TouchableOpacity
              style={[s.inviteBtn, { backgroundColor: '#2563EB' }]}
              onPress={() => {
                setEditingGroup(null);
                setGroupName('');
                setGroupColor('#2563EB');
                setSelectedMembers([]);
                setShowGroupModal(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={20} color={theme.colors.white} />
              <Text style={s.inviteBtnText}>Nowy zespół</Text>
            </TouchableOpacity>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Zespoły ({groups.length})</Text>
              {groups.length === 0 ? (
                <Text style={s.emptySub}>Brak zespołów. Utwórz pierwszy zespół używając przycisku powyżej.</Text>
              ) : (
                groups.map((g) => (
                  <View key={g.id} style={[s.groupRow, { borderLeftWidth: 4, borderLeftColor: g.color }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.groupName}>{g.name}</Text>
                      <Text style={s.groupMembers}>
                        {g.members.length} {g.members.length === 1 ? 'osoba' : g.members.length < 5 ? 'osoby' : 'osób'}
                      </Text>
                      <View style={s.memberChips}>
                        {g.members.slice(0, 5).map((mid) => {
                          const emp = employees.find((e) => e.id === mid);
                          return emp ? (
                            <View key={mid} style={[s.memberChip, { backgroundColor: g.color + '20' }]}>
                              <Text style={[s.memberChipText, { color: g.color }]}>
                                {emp.first_name} {emp.last_name}
                              </Text>
                            </View>
                          ) : null;
                        })}
                        {g.members.length > 5 && (
                          <Text style={s.moreMembers}>+{g.members.length - 5}</Text>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => {
                          setEditingGroup(g);
                          setGroupName(g.name);
                          setGroupColor(g.color);
                          setSelectedMembers(g.members);
                          setShowGroupModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => showConfirm('Usuń zespół', `Czy na pewno chcesz usunąć zespół "${g.name}"?`, async () => {
                          await deleteEmployeeGroup(g.id);
                          refresh();
                        }, 'Usuń', 'Anuluj')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* ─── INVITES TAB ─── */}
        {tab === 'invites' && (
          <>
            <TouchableOpacity style={s.inviteBtn} onPress={() => { setTab('team'); setShowInvite(true); }} activeOpacity={0.85}>
              <Ionicons name="add-circle" size={20} color={theme.colors.white} />
              <Text style={s.inviteBtnText}>Nowe zaproszenie</Text>
            </TouchableOpacity>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Aktywne zaproszenia ({activeInvites.length})</Text>
              {activeInvites.length === 0 ? (
                <Text style={s.emptySub}>Brak aktywnych zaproszeń</Text>
              ) : (
                activeInvites.map((inv) => (
                  <View key={inv.id} style={s.invRow}>
                    <View style={s.invCodeWrap}>
                      <Text style={s.invCode}>{inv.code}</Text>
                    </View>
                    <View style={s.invInfo}>
                      <Text style={s.invJob}>{inv.job_title}</Text>
                      <Text style={s.invExpiry}>Wygasa: {new Date(inv.expires_at).toLocaleDateString('pl-PL')}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(inv.code)}
                      style={[s.invShareBtn, copiedCode === inv.code && { backgroundColor: theme.colors.greenLight }]}
                    >
                      <Ionicons
                        name={copiedCode === inv.code ? 'checkmark' : 'copy-outline'}
                        size={18}
                        color={copiedCode === inv.code ? theme.colors.green : theme.colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Wykorzystane ({usedInvites.length})</Text>
              {usedInvites.map((inv) => (
                <View key={inv.id} style={s.invRow}>
                  <View style={[s.invCodeWrap, { backgroundColor: theme.colors.greenLight }]}>
                    <Text style={[s.invCode, { color: theme.colors.green }]}>{inv.code}</Text>
                  </View>
                  <View style={s.invInfo}>
                    <Text style={s.invJob}>{inv.job_title}</Text>
                    <Text style={[s.invExpiry, { color: theme.colors.green }]}>✓ Użyty</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.green} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* ─── SETTINGS TAB ─── */}
        {tab === 'settings' && (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Dane restauracji</Text>

              <Text style={s.mLabel}>Nazwa restauracji</Text>
              <TextInput
                style={s.mInput}
                value={rName}
                onChangeText={setRName}
                placeholder="Nazwa restauracji"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={s.mLabel}>Adres</Text>
              <TextInput
                style={s.mInput}
                value={rAddress}
                onChangeText={setRAddress}
                placeholder="ul. Przykładowa 1, Warszawa"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={s.mLabel}>Telefon</Text>
              <TextInput
                style={s.mInput}
                value={rPhone}
                onChangeText={setRPhone}
                placeholder="+48 000 000 000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="phone-pad"
              />

              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Plan</Text>
                <View style={[s.planBadge, restaurant?.plan === 'premium' && s.planPremium]}>
                  <Text style={[s.planText, restaurant?.plan === 'premium' && s.planPremiumText]}>
                    {restaurant?.plan === 'premium' ? '⭐ Premium' : 'Basic'}
                  </Text>
                </View>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Data utworzenia</Text>
                <Text style={s.settingValue}>{restaurant?.createdAt?.slice(0, 10)}</Text>
              </View>

              <TouchableOpacity
                style={[s.inviteBtn, { marginTop: 16 }, (!rName.trim() || rSaving) && { opacity: 0.6 }]}
                onPress={saveRestaurant}
                disabled={rSaving || !rName.trim()}
                activeOpacity={0.85}
              >
                {rSaving ? (
                  <Text style={s.inviteBtnText}>Zapisywanie...</Text>
                ) : rSaved ? (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.white} />
                    <Text style={s.inviteBtnText}>Zapisano!</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={theme.colors.white} />
                    <Text style={s.inviteBtnText}>Zapisz zmiany</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Statystyki</Text>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Pracownicy</Text>
                <Text style={s.settingValue}>{employees.length}</Text>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Aktywne zaproszenia</Text>
                <Text style={s.settingValue}>{activeInvites.length}</Text>
              </View>
            </View>
          </>
        )}

        {/* ─── URLOPY TAB ─── */}
        {tab === 'urlopy' && (
          <View style={{ gap: 0 }}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Wnioski urlopowe ({leaveRequests.filter((r) => r.status === 'pending').length} oczekujących)</Text>
              {leaveRequests.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="umbrella-outline" size={36} color={theme.colors.border} />
                  <Text style={s.emptyText}>Brak wniosków</Text>
                </View>
              ) : (
                leaveRequests.map((lr) => {
                  const emp = employees.find((e) => e.id === lr.employee_id);
                  const isPending = lr.status === 'pending';
                  return (
                    <View key={lr.id} style={s.approvalRow}>
                      <View style={[s.empAvatar, { backgroundColor: emp?.avatar_color ?? theme.colors.surface }]}>
                        <Text style={s.empInitials}>{emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.empName}>{emp ? `${emp.first_name} ${emp.last_name}` : lr.employee_id.slice(0, 8)}</Text>
                        <Text style={s.empRole}>{lr.date_from} — {lr.date_to} ({lr.days_count} dni)</Text>
                        {lr.comment ? <Text style={s.emptySub} numberOfLines={1}>{lr.comment}</Text> : null}
                      </View>
                      <View style={[s.statusChip, { backgroundColor: lr.status === 'approved' ? theme.colors.greenLight : lr.status === 'rejected' ? theme.colors.errorLight : theme.colors.primaryLight }]}>
                        <Text style={[s.statusChipText, { color: lr.status === 'approved' ? theme.colors.green : lr.status === 'rejected' ? theme.colors.error : theme.colors.primary }]}>
                          {lr.status === 'approved' ? 'Zatwierdzony' : lr.status === 'rejected' ? 'Odrzucony' : 'Oczekuje'}
                        </Text>
                      </View>
                      {isPending && user && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity style={s.approveBtn} onPress={() => { setReviewingRequest(lr); setReviewAction('approve'); setReviewNote(''); }} activeOpacity={0.7}>
                            <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                          </TouchableOpacity>
                          <TouchableOpacity style={s.rejectBtn} onPress={() => { setReviewingRequest(lr); setReviewAction('reject'); setReviewNote(''); }} activeOpacity={0.7}>
                            <Ionicons name="close" size={14} color={theme.colors.white} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ─── NIEOBECNOSCI TAB ─── */}
        {tab === 'nieobecnosci' && (
          <View style={{ gap: 0 }}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Zgłoszone nieobecności ({absences.filter((a) => a.status === 'pending').length} oczekujących)</Text>
              {absences.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="alert-circle-outline" size={36} color={theme.colors.border} />
                  <Text style={s.emptyText}>Brak nieobecności</Text>
                </View>
              ) : (
                absences.map((ab) => {
                  const emp = employees.find((e) => e.id === ab.employee_id);
                  const isPending = ab.status === 'pending';
                  const ABSENCE_LABELS: Record<string, string> = { l4: 'L4', child_care: 'Opieka nad dzieckiem', force_majeure: 'Siła wyższa', other: 'Inne' };
                  return (
                    <View key={ab.id} style={s.approvalRow}>
                      <View style={[s.empAvatar, { backgroundColor: emp?.avatar_color ?? theme.colors.surface }]}>
                        <Text style={s.empInitials}>{emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.empName}>{emp ? `${emp.first_name} ${emp.last_name}` : ab.employee_id.slice(0, 8)}</Text>
                        <Text style={s.empRole}>{ABSENCE_LABELS[ab.absence_type] ?? ab.absence_type}</Text>
                        {ab.description ? <Text style={s.emptySub} numberOfLines={1}>{ab.description}</Text> : null}
                      </View>
                      <View style={[s.statusChip, { backgroundColor: ab.status === 'approved' ? theme.colors.greenLight : ab.status === 'rejected' ? theme.colors.errorLight : theme.colors.primaryLight }]}>
                        <Text style={[s.statusChipText, { color: ab.status === 'approved' ? theme.colors.green : ab.status === 'rejected' ? theme.colors.error : theme.colors.primary }]}>
                          {ab.status === 'approved' ? 'Zatwierdzona' : ab.status === 'rejected' ? 'Odrzucona' : 'Oczekuje'}
                        </Text>
                      </View>
                      {isPending && user && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity style={s.approveBtn} onPress={async () => { await reviewAbsence(ab.id, user.id, 'approved'); refresh(); }} activeOpacity={0.7}>
                            <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                          </TouchableOpacity>
                          <TouchableOpacity style={s.rejectBtn} onPress={async () => { await reviewAbsence(ab.id, user.id, 'rejected'); refresh(); }} activeOpacity={0.7}>
                            <Ionicons name="close" size={14} color={theme.colors.white} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

      </ScrollView>

      {/* ─── TRAINING MODAL ─── */}
      <Modal visible={showTrainingModal} animationType="fade" transparent onRequestClose={() => setShowTrainingModal(false)}>
        <View style={s.mOverlay}>
          <View style={[s.mSheet, isDesktop && s.mSheetDesktop]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Header */}
              <View style={s.mHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.mTitle}>{editingTraining ? 'Edytuj szkolenie' : 'Nowe szkolenie'}</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                    {editingTraining ? 'Zmiany zostaną od razu zapisane' : 'Uzupełnij poniższe sekcje'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowTrainingModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={s.mBody}>

                {/* ── SEKCJA 1: PODSTAWOWE ── */}
                <View style={tm.section}>
                  <View style={tm.sectionHeader}>
                    <View style={[tm.sectionDot, { backgroundColor: theme.colors.primary }]} />
                    <Text style={tm.sectionLabel}>PODSTAWOWE INFO</Text>
                  </View>

                  <Text style={s.mLabel}>Tytuł *</Text>
                  <TextInput style={s.mInput} value={tForm.title} onChangeText={(v) => setTForm((f) => ({ ...f, title: v }))} placeholder="np. Obsługa kasy fiskalnej" placeholderTextColor={theme.colors.textMuted} />

                  <Text style={s.mLabel}>Kategoria</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                      {['BHP', 'Obsługa', 'Procedury', 'Kuchnia', 'Jakość', 'Sprzedaż', 'Inne'].map((cat) => (
                        <TouchableOpacity key={cat} style={[s.chip, tForm.category === cat && s.chipActive]} onPress={() => setTForm((f) => ({ ...f, category: cat }))} activeOpacity={0.7}>
                          <Text style={[s.chipText, tForm.category === cat && s.chipTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.mLabel}>Czas (min)</Text>
                      <TextInput style={s.mInput} value={tForm.duration_min} onChangeText={(v) => setTForm((f) => ({ ...f, duration_min: v }))} keyboardType="numeric" placeholder="30" placeholderTextColor={theme.colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.mLabel}>Punkty XP</Text>
                      <TextInput style={s.mInput} value={tForm.points} onChangeText={(v) => setTForm((f) => ({ ...f, points: v }))} keyboardType="numeric" placeholder="50" placeholderTextColor={theme.colors.textMuted} />
                    </View>
                  </View>

                  <Text style={s.mLabel}>Link do materiału (opcjonalnie)</Text>
                  <TextInput style={s.mInput} value={tForm.material_url} onChangeText={(v) => setTForm((f) => ({ ...f, material_url: v }))} placeholder="https://..." placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" keyboardType="url" />

                  <Text style={s.mLabel}>Typ materiału</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                    {(['pdf', 'video', null] as const).map((mt) => (
                      <TouchableOpacity key={String(mt)} style={[s.chip, tForm.material_type === mt && s.chipActive]} onPress={() => setTForm((f) => ({ ...f, material_type: mt }))} activeOpacity={0.7}>
                        <Text style={[s.chipText, tForm.material_type === mt && s.chipTextActive]}>{mt === 'pdf' ? 'PDF' : mt === 'video' ? 'Video' : 'Brak'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* ── SEKCJA 2: DLA KOGO ── */}
                <View style={tm.section}>
                  <View style={tm.sectionHeader}>
                    <View style={[tm.sectionDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={tm.sectionLabel}>DLA KOGO</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 10 }}>
                    Zaznacz stanowiska — puste = widoczne dla wszystkich
                  </Text>

                  <View style={tm.rolesWrap}>
                    <TouchableOpacity
                      style={[tm.roleChip, tForm.assigned_roles.length === 0 && tm.roleChipActive]}
                      onPress={() => setTForm((f) => ({ ...f, assigned_roles: [] }))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="people" size={13} color={tForm.assigned_roles.length === 0 ? '#fff' : theme.colors.textSecondary} />
                      <Text style={[tm.roleChipText, tForm.assigned_roles.length === 0 && tm.roleChipTextActive]}>Wszyscy</Text>
                    </TouchableOpacity>
                    {ALL_ROLES.map((role) => {
                      const active = tForm.assigned_roles.includes(role);
                      return (
                        <TouchableOpacity key={role} style={[tm.roleChip, active && tm.roleChipActive]} onPress={() => toggleRole(role)} activeOpacity={0.7}>
                          <Text style={[tm.roleChipText, active && tm.roleChipTextActive]}>{role}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[tm.requiredToggle, tForm.required && tm.requiredToggleActive]}
                    onPress={() => setTForm((f) => ({ ...f, required: !f.required }))}
                    activeOpacity={0.7}
                  >
                    <View style={[tm.requiredDot, tForm.required && { backgroundColor: theme.colors.error }]} />
                    <Text style={[tm.requiredText, tForm.required && { color: theme.colors.error, fontWeight: '700' }]}>
                      {tForm.required ? 'Obowiązkowe szkolenie' : 'Opcjonalne szkolenie'}
                    </Text>
                    <Ionicons name={tForm.required ? 'alert-circle' : 'checkmark-circle-outline'} size={16} color={tForm.required ? theme.colors.error : theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* ── SEKCJA 3: QUIZ ── */}
                <View style={tm.section}>
                  <View style={tm.sectionHeader}>
                    <View style={[tm.sectionDot, { backgroundColor: '#F97316' }]} />
                    <Text style={tm.sectionLabel}>PYTANIA QUIZOWE</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 10 }}>
                    Pracownicy odpowiadają na pytania po przeglądnięciu materiałów
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                    <TouchableOpacity
                      style={[tm.quizToggle, !hasQuiz && tm.quizToggleInactive]}
                      onPress={() => { setHasQuiz(false); setPendingQs([]); setAddingQDraft(false); }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={!hasQuiz ? theme.colors.textSecondary : theme.colors.textMuted} />
                      <Text style={[tm.quizToggleText, !hasQuiz && { color: theme.colors.text, fontWeight: '700' }]}>Bez quizu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[tm.quizToggle, hasQuiz && tm.quizToggleActive]}
                      onPress={() => setHasQuiz(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="help-circle" size={16} color={hasQuiz ? '#fff' : theme.colors.textMuted} />
                      <Text style={[tm.quizToggleText, hasQuiz && { color: '#fff', fontWeight: '700' }]}>Dodaj quiz</Text>
                    </TouchableOpacity>
                  </View>

                  {hasQuiz && (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      {pendingQs.map((q, i) => (
                        <View key={i} style={tm.qCard}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <View style={tm.qNum}><Text style={tm.qNumText}>{i + 1}</Text></View>
                            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text }}>{q.question}</Text>
                            <TouchableOpacity onPress={() => setPendingQs((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
                            </TouchableOpacity>
                          </View>
                          {q.options.map((opt, oi) => (
                            <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 30, marginBottom: 2 }}>
                              <Ionicons name={oi === q.correct_index ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={oi === q.correct_index ? theme.colors.green : theme.colors.textMuted} />
                              <Text style={{ fontSize: 12, color: oi === q.correct_index ? theme.colors.green : theme.colors.textSecondary, fontWeight: oi === q.correct_index ? '700' : '400' }}>{opt}</Text>
                            </View>
                          ))}
                        </View>
                      ))}

                      {addingQDraft ? (
                        <View style={tm.qDraftCard}>
                          <Text style={[s.mLabel, { marginBottom: 6 }]}>Treść pytania *</Text>
                          <TextInput style={[s.mInput, { minHeight: 60 }]} value={qDraft.question} onChangeText={(v) => setQDraft((f) => ({ ...f, question: v }))} placeholder="Wpisz pytanie..." placeholderTextColor={theme.colors.textMuted} multiline />

                          <Text style={[s.mLabel, { marginTop: 4 }]}>Odpowiedzi — kliknij kółko żeby zaznaczyć poprawną</Text>
                          {qDraft.options.map((opt, oi) => (
                            <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <TouchableOpacity
                                onPress={() => setQDraft((f) => ({ ...f, correct_index: oi }))}
                                style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: oi === qDraft.correct_index ? theme.colors.green : theme.colors.border, backgroundColor: oi === qDraft.correct_index ? theme.colors.green : 'transparent', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              >
                                {oi === qDraft.correct_index && <Ionicons name="checkmark" size={13} color="#fff" />}
                              </TouchableOpacity>
                              <TextInput
                                style={[s.mInput, { flex: 1, marginBottom: 0 }]}
                                value={opt}
                                onChangeText={(v) => setQDraft((f) => { const opts = [...f.options]; opts[oi] = v; return { ...f, options: opts }; })}
                                placeholder={`Odpowiedź ${String.fromCharCode(65 + oi)}`}
                                placeholderTextColor={theme.colors.textMuted}
                              />
                            </View>
                          ))}

                          <Text style={[s.mLabel, { marginTop: 4 }]}>Wyjaśnienie (opcjonalne)</Text>
                          <TextInput style={s.mInput} value={qDraft.explanation} onChangeText={(v) => setQDraft((f) => ({ ...f, explanation: v }))} placeholder="Dlaczego ta odpowiedź jest poprawna?" placeholderTextColor={theme.colors.textMuted} />

                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <TouchableOpacity
                              style={[s.inviteBtn, { flex: 1 }]}
                              onPress={() => {
                                if (!qDraft.question.trim()) { showAlert('Błąd', 'Wpisz treść pytania'); return; }
                                if (qDraft.options.some((o) => !o.trim())) { showAlert('Błąd', 'Wypełnij wszystkie 4 odpowiedzi'); return; }
                                setPendingQs((prev) => [...prev, { ...qDraft, options: qDraft.options.map((o) => o.trim()) }]);
                                setQDraft(EMPTY_QDRAFT);
                                setAddingQDraft(false);
                              }}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="checkmark-circle" size={18} color="#fff" />
                              <Text style={s.inviteBtnText}>Dodaj pytanie</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={{ paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10 }} onPress={() => { setQDraft(EMPTY_QDRAFT); setAddingQDraft(false); }} activeOpacity={0.7}>
                              <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>Anuluj</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={tm.addQBtn}
                          onPress={() => { setQDraft(EMPTY_QDRAFT); setAddingQDraft(true); }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.primary }}>
                            Dodaj pytanie{pendingQs.length > 0 ? ` (${pendingQs.length} dodanych)` : ''}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                <TouchableOpacity style={[s.inviteBtn, { marginTop: 4 }]} onPress={saveTraining} activeOpacity={0.85}>
                  <Ionicons name={editingTraining ? 'save-outline' : 'add-circle-outline'} size={20} color={theme.colors.white} />
                  <Text style={s.inviteBtnText}>{editingTraining ? 'Zapisz zmiany' : 'Utwórz szkolenie'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── GROUP MODAL ─── */}
      <Modal visible={showGroupModal} animationType="fade" transparent onRequestClose={() => setShowGroupModal(false)}>
        <View style={s.mOverlay}>
          <View style={[s.mSheet, isDesktop && s.mSheetDesktop, { maxHeight: '85%' }]}>
            <View style={s.mHeader}>
              <View>
                <Text style={s.mTitle}>{editingGroup ? 'Edytuj zespół' : 'Nowy zespół'}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                  {editingGroup ? 'Zmiany zostaną od razu zapisane' : 'Utwórz nowy zespół pracowniczy'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={s.mBody}>
              <Text style={s.mLabel}>Nazwa zespołu</Text>
              <TextInput
                style={s.mInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="np. Kuchnia, Kelnerzy, Bar"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={s.mLabel}>Kolor</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {['#2563EB', '#16A34A', '#DC2626', '#F59E0B', '#7C3AED', '#0891B2', '#EC4899'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setGroupColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: 18, backgroundColor: c,
                      borderWidth: groupColor === c ? 3 : 0, borderColor: '#fff',
                      shadowColor: c, shadowOpacity: groupColor === c ? 0.4 : 0, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                    }}
                  />
                ))}
              </View>

              <Text style={s.mLabel}>Członkowie zespołu</Text>
              <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 10 }}>
                Zaznacz pracowników, którzy należą do tego zespołu
              </Text>
              <View style={{ gap: 8 }}>
                {employees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                      borderRadius: 12, backgroundColor: selectedMembers.includes(emp.id) ? groupColor + '15' : theme.colors.surface,
                      borderWidth: 1.5, borderColor: selectedMembers.includes(emp.id) ? groupColor : theme.colors.border,
                    }}
                    onPress={() => {
                      setSelectedMembers((prev) =>
                        prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                      borderColor: selectedMembers.includes(emp.id) ? groupColor : theme.colors.border,
                      backgroundColor: selectedMembers.includes(emp.id) ? groupColor : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selectedMembers.includes(emp.id) && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>
                        {emp.first_name} {emp.last_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>{emp.job_title}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={s.footer}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowGroupModal(false)} activeOpacity={0.7}>
                <Text style={s.cancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, (!groupName.trim() || selectedMembers.length === 0) && s.saveBtnDisabled]}
                onPress={async () => {
                  if (!groupName.trim() || selectedMembers.length === 0) return;
                  if (editingGroup) {
                    await updateEmployeeGroup(editingGroup.id, { name: groupName, color: groupColor });
                    // Update members - remove old, add new
                    const oldMembers = editingGroup.members;
                    const toRemove = oldMembers.filter((m) => !selectedMembers.includes(m));
                    const toAdd = selectedMembers.filter((m) => !oldMembers.includes(m));
                    for (const m of toRemove) await removeEmployeeFromGroup(m, editingGroup.id);
                    for (const m of toAdd) await assignEmployeeToGroup(m, editingGroup.id);
                  } else {
                    const newGroup = await createEmployeeGroup(rid, groupName, groupColor);
                    if (newGroup) {
                      for (const m of selectedMembers) await assignEmployeeToGroup(m, newGroup.id);
                    }
                  }
                  setShowGroupModal(false);
                  refresh();
                }}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                activeOpacity={0.8}
              >
                <Text style={s.saveText}>{editingGroup ? 'Zapisz zmiany' : 'Utwórz zespół'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── EMPLOYEE EDIT MODAL ─── */}
      <Modal visible={showEmployeeModal} animationType="fade" transparent onRequestClose={() => setShowEmployeeModal(false)}>
        <View style={s.mOverlay}>
          <View style={[s.mSheet, isDesktop && s.mSheetDesktop, { maxHeight: '90%' }]}>
            <View style={s.mHeader}>
              <View>
                <Text style={s.mTitle}>Edytuj pracownika</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                  {editingEmployee ? `${editingEmployee.first_name} ${editingEmployee.last_name}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={s.mBody}>
              {/* Employee Data Section */}
              <View style={tm.section}>
                <View style={tm.sectionHeader}>
                  <View style={[tm.sectionDot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={tm.sectionLabel}>DANE PRACOWNIKA</Text>
                </View>

                <Text style={s.mLabel}>Imię</Text>
                <TextInput
                  style={s.mInput}
                  value={empFirstName}
                  onChangeText={setEmpFirstName}
                  placeholder="Imię"
                  placeholderTextColor={theme.colors.textMuted}
                />

                <Text style={[s.mLabel, { marginTop: 12 }]}>Nazwisko</Text>
                <TextInput
                  style={s.mInput}
                  value={empLastName}
                  onChangeText={setEmpLastName}
                  placeholder="Nazwisko"
                  placeholderTextColor={theme.colors.textMuted}
                />

                <Text style={[s.mLabel, { marginTop: 12 }]}>Stanowisko</Text>
                <TextInput
                  style={s.mInput}
                  value={empJobTitle}
                  onChangeText={setEmpJobTitle}
                  placeholder="np. Kelner"
                  placeholderTextColor={theme.colors.textMuted}
                />

                <Text style={[s.mLabel, { marginTop: 12 }]}>Telefon</Text>
                <TextInput
                  style={s.mInput}
                  value={empPhone}
                  onChangeText={setEmpPhone}
                  placeholder="+48 123 456 789"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="phone-pad"
                />

                <Text style={[s.mLabel, { marginTop: 12 }]}>Rola</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={[s.roleBtn, empRole === 'employee' && s.roleBtnActive]}
                    onPress={() => setEmpRole('employee')}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.roleText, empRole === 'employee' && s.roleTextActive]}>Pracownik</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.roleBtn, empRole === 'manager' && s.roleBtnActive]}
                    onPress={() => setEmpRole('manager')}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.roleText, empRole === 'manager' && s.roleTextActive]}>Manager</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ height: 16 }} />

              {/* Leave Quota Section */}
              <View style={tm.section}>
                <View style={tm.sectionHeader}>
                  <View style={[tm.sectionDot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={tm.sectionLabel}>NORMA URLOPOWA</Text>
                </View>

                <Text style={s.mLabel}>Dni urlopu wypoczynkowego (rocznie)</Text>
                <TextInput
                  style={s.mInput}
                  value={empLeaveDays}
                  onChangeText={setEmpLeaveDays}
                  keyboardType="numeric"
                  placeholder="np. 20"
                  placeholderTextColor={theme.colors.textMuted}
                />

                <Text style={[s.mLabel, { marginTop: 16 }]}>Typy urlopów</Text>
                {empLeaveTypeSettings.map((setting, idx) => (
                  <View key={setting.type} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}
                      onPress={() => {
                        setEmpLeaveTypeSettings(prev => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                        borderColor: setting.enabled ? theme.colors.primary : theme.colors.border,
                        backgroundColor: setting.enabled ? theme.colors.primary : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {setting.enabled && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>
                        {setting.type === 'annual' ? 'Urlop wypoczynkowy' :
                         setting.type === 'sick' ? 'Zwolnienie lekarskie' :
                         setting.type === 'unpaid' ? 'Urlop bezpłatny' : setting.type}
                      </Text>
                    </TouchableOpacity>

                    {setting.enabled && setting.type !== 'unpaid' && (
                      <TextInput
                        style={[s.mInput, { marginLeft: 32 }]}
                        value={setting.days}
                        onChangeText={(v) => {
                          setEmpLeaveTypeSettings(prev => prev.map((s, i) => i === idx ? { ...s, days: v } : s));
                        }}
                        keyboardType="numeric"
                        placeholder={setting.type === 'annual' ? 'Dni rocznie (np. 20)' : 'Dni rocznie (np. 14)'}
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    )}
                  </View>
                ))}
              </View>

              {/* Groups Section */}
              <View style={tm.section}>
                <View style={tm.sectionHeader}>
                  <View style={[tm.sectionDot, { backgroundColor: '#7C3AED' }]} />
                  <Text style={tm.sectionLabel}>PRZYPISANE ZESPOŁY</Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 10 }}>
                  Zarządzanie zespołami pracownika w zakładce "Zespoły"
                </Text>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={s.footer}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEmployeeModal(false)} activeOpacity={0.7}>
                <Text style={s.cancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.saveBtn}
                onPress={async () => {
                  if (!editingEmployee) return;
                  // TODO: Save leave quota and type settings via API
                  setShowEmployeeModal(false);
                  refresh();
                }}
                activeOpacity={0.8}
              >
                <Text style={s.saveText}>Zapisz zmiany</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── LEAVE REQUEST REVIEW MODAL ─── */}
      <Modal visible={!!reviewingRequest} animationType="fade" transparent onRequestClose={() => { setReviewingRequest(null); setReviewAction(null); }}>
        <View style={s.mOverlay}>
          <View style={[s.mSheet, isDesktop && s.mSheetDesktop]}>
            <View style={s.mHeader}>
              <View>
                <Text style={s.mTitle}>{reviewAction === 'approve' ? 'Zatwierdź wniosek' : 'Odrzuć wniosek'}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                  {reviewingRequest ? `${(reviewingRequest as any).employee_name || 'Pracownik'}: ${reviewingRequest.date_from} — ${reviewingRequest.date_to}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setReviewingRequest(null); setReviewAction(null); }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={s.mBody}>
              <Text style={s.mLabel}>{reviewAction === 'approve' ? 'Notatka (opcjonalna)' : 'Powód odrzucenia (opcjonalny)'}</Text>
              <TextInput
                style={[s.mInput, s.mInputMulti, { minHeight: 100 }]}
                value={reviewNote}
                onChangeText={setReviewNote}
                placeholder={reviewAction === 'approve' ? 'np. Wniosek zatwierdzony, życzymy udanych wakacji...' : 'np. Brak dostępnych dni urlopowych...'}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            <View style={s.footer}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setReviewingRequest(null); setReviewAction(null); }} activeOpacity={0.7}>
                <Text style={s.cancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, reviewAction === 'reject' && { backgroundColor: theme.colors.error }]}
                onPress={async () => {
                  if (!reviewingRequest || !user || !reviewAction) return;
                  setReviewing(true);
                  const status = reviewAction === 'approve' ? 'approved' : 'rejected';
                  await reviewLeaveRequestWithNotes(reviewingRequest.id, user.id, status, reviewNote.trim() || undefined);
                  setReviewing(false);
                  setReviewingRequest(null);
                  setReviewAction(null);
                  setReviewNote('');
                  refresh();
                }}
                activeOpacity={0.8}
                disabled={reviewing}
              >
                {reviewing ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={s.saveText}>{reviewAction === 'approve' ? 'Zatwierdź' : 'Odrzuć'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.card, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, flexShrink: 1 },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },

  tabsScroll: {
    flexGrow: 0,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    minWidth: 90,
  },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.primary },

  content: { padding: 16, gap: 14, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, alignSelf: 'center', width: '100%', paddingHorizontal: 32 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg,
    padding: 16, alignItems: 'center', ...theme.shadows.card,
  },
  statNum: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },

  inviteBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  inviteBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },

  codeCard: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.lg,
    padding: 18, borderWidth: 1.5, borderColor: theme.colors.primary, gap: 8,
  },
  codeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeCardTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  codeValue: {
    fontSize: 32, fontWeight: '800', color: theme.colors.accent, textAlign: 'center',
    letterSpacing: 6, paddingVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
    height: 40, borderWidth: 1, borderColor: theme.colors.primary,
  },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },

  inviteModal: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg,
    padding: 20, ...theme.shadows.card, gap: 12,
  },
  inviteModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inviteModalTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  inviteModalSub: { fontSize: 13, color: theme.colors.textSecondary },
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  jobChip: {
    borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.border,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  jobChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  jobChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  jobChipTextActive: { color: theme.colors.primary },
  generateBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  generateBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },

  section: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg,
    padding: 18, ...theme.shadows.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 14 },

  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  empAvatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  empInitials: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  empRole: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  ownerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  ownerBadgeText: { fontSize: 10, fontWeight: '700', color: theme.colors.primary },
  removeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.errorLight,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },

  invRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  invCodeWrap: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  invCode: { fontSize: 14, fontWeight: '800', color: theme.colors.primary, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  invInfo: { flex: 1 },
  invJob: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  invExpiry: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  invShareBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  settingLabel: { fontSize: 14, color: theme.colors.textSecondary },
  settingValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text, maxWidth: '60%', textAlign: 'right' },
  planBadge: {
    borderRadius: theme.borderRadius.full, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: theme.colors.background,
  },
  planPremium: { backgroundColor: theme.colors.yellowLight },
  planText: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
  planPremiumText: { color: theme.colors.yellow },

  trRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  trIconWrap: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  trInfo: { flex: 1, minWidth: 0 },
  trTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  trMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  trEditBtn: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mSheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxHeight: '90%', overflow: 'hidden' },
  mSheetDesktop: { maxWidth: 520 },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  mBody: { padding: 20, gap: 4 },
  mLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 },
  mInput: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    padding: 12, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface,
  },
  mInputMulti: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    padding: 12, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface,
    textAlignVertical: 'top',
  },
  chip: {
    borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.border,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.primary },

  roleBtn: {
    flex: 1, borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  roleBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  roleText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  roleTextActive: { color: theme.colors.primary, fontWeight: '700' },

  approvalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  statusChip: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  approveBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.error,
    alignItems: 'center', justifyContent: 'center',
  },

  // Groups
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderTopWidth: 1, borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  groupName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  groupMembers: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  memberChip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  memberChipText: { fontSize: 11, fontWeight: '600' },
  moreMembers: { fontSize: 11, color: theme.colors.textMuted, marginLeft: 4 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },

  // Modal footer
  footer: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    flex: 1, height: 44, borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  cancelText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  saveBtn: {
    flex: 2, height: 44, borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

const tm = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16,
    marginBottom: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 0.8 },
  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.border,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: theme.colors.card,
  },
  roleChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  roleChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  roleChipTextActive: { color: '#fff' },
  requiredToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  requiredToggleActive: { borderColor: theme.colors.error + '60', backgroundColor: '#FEF2F2' },
  requiredDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.border },
  requiredText: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  quizToggle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.border,
    paddingVertical: 12, backgroundColor: theme.colors.card,
  },
  quizToggleInactive: { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  quizToggleActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  quizToggleText: { fontSize: 14, color: theme.colors.textMuted },
  qCard: {
    backgroundColor: theme.colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  qNum: {
    width: 22, height: 22, borderRadius: 6, backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  qNumText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  qDraftCard: {
    backgroundColor: theme.colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: theme.colors.primary + '40', gap: 0,
  },
  addQBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.primary,
    borderStyle: 'dashed', paddingVertical: 12, backgroundColor: theme.colors.primaryLight + '50',
  },
});
