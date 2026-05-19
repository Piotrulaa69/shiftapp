import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Modal,
    Platform,
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
import { createQuizQuestion, createTraining, deleteQuizQuestion, deleteTraining, generateInvitation, getAbsences, getEmployees, getInvitations, getLeaveRequests, getQuizQuestions, getTrainings, removeEmployee, reviewAbsence, reviewLeaveRequest, updateRestaurant, updateTraining } from '../../lib/db';
import type { DbAbsence, DbInvitation, DbLeaveRequest, DbProfile, DbTraining } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const JOB_OPTIONS = ['Kelner', 'Kucharz', 'Barista', 'Lider zmiany', 'Hostessa', 'Pizzaiolo', 'Sprzątanie'];

export default function AdminScreen() {
  const router = useRouter();
  const { user, restaurant, refreshRestaurant, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert, showConfirm } = useAlert();
  const rid = user?.restaurantId ?? '';

  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [invitations, setInvitations] = useState<DbInvitation[]>([]);
  const [trainings, setTrainings] = useState<DbTraining[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<DbLeaveRequest[]>([]);
  const [absences, setAbsences] = useState<DbAbsence[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [jobTitle, setJobTitle] = useState('Kelner');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [tab, setTab] = useState<'team' | 'invites' | 'settings' | 'tools' | 'trainings' | 'urlopy' | 'nieobecnosci'>('team');

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

  const refresh = () => {
    if (!rid) return;
    getEmployees(rid).then(setEmployees);
    getInvitations(rid).then(setInvitations);
    getTrainings(rid).then(setTrainings);
    getLeaveRequests(rid).then(setLeaveRequests);
    getAbsences(rid).then(setAbsences);
  };

  useFocusEffect(useCallback(() => { refresh(); }, [rid]));

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
          { key: 'invites', label: 'Zaproszenia', icon: 'mail' },
          { key: 'urlopy', label: 'Urlopy', icon: 'umbrella' },
          { key: 'nieobecnosci', label: 'Nieobecności', icon: 'alert-circle' },
          { key: 'trainings', label: 'Szkolenia', icon: 'school' },
          { key: 'tools', label: 'Narzędzia', icon: 'build' },
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
                <Text style={s.codeValue}>{lastCode}</Text>
                <TouchableOpacity style={s.shareBtn} onPress={() => shareCode(lastCode)} activeOpacity={0.75}>
                  <Ionicons name="share-social-outline" size={16} color={theme.colors.primary} />
                  <Text style={s.shareBtnText}>Udostępnij pracownikowi</Text>
                </TouchableOpacity>
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
                  <View key={emp.id} style={s.empRow}>
                    <View style={[s.empAvatar, { backgroundColor: emp.avatar_color }]}>
                      <Text style={s.empInitials}>{`${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase()}</Text>
                    </View>
                    <View style={s.empInfo}>
                      <Text style={s.empName}>{emp.first_name} {emp.last_name}</Text>
                      <Text style={s.empRole}>{emp.job_title}</Text>
                    </View>
                    {emp.id !== user?.id && (
                      <TouchableOpacity
                        style={s.removeBtn}
                        onPress={() => removeEmp(emp.id, `${emp.first_name} ${emp.last_name}`)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="person-remove-outline" size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    )}
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
                    <TouchableOpacity onPress={() => shareCode(inv.code)} style={s.invShareBtn}>
                      <Ionicons name="share-social-outline" size={18} color={theme.colors.primary} />
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

        {/* ─── TRAININGS TAB ─── */}
        {tab === 'trainings' && (
          <>
            <TouchableOpacity style={s.inviteBtn} onPress={openNewTraining} activeOpacity={0.85}>
              <Ionicons name="add-circle" size={20} color={theme.colors.white} />
              <Text style={s.inviteBtnText}>Dodaj nowe szkolenie</Text>
            </TouchableOpacity>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Szkolenia ({trainings.length})</Text>
              {trainings.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="school-outline" size={36} color={theme.colors.border} />
                  <Text style={s.emptyText}>Brak szkoleń</Text>
                  <Text style={s.emptySub}>Dodaj pierwsze szkolenie dla zespołu</Text>
                </View>
              ) : (
                trainings.map((tr) => (
                  <View key={tr.id} style={s.trRow}>
                    <View style={[s.trIconWrap, { backgroundColor: tr.required ? theme.colors.errorLight : theme.colors.primaryLight }]}>
                      <Ionicons name="school-outline" size={18} color={tr.required ? theme.colors.error : theme.colors.primary} />
                    </View>
                    <View style={s.trInfo}>
                      <Text style={s.trTitle} numberOfLines={1}>{tr.title}</Text>
                      <Text style={s.trMeta}>{tr.category} · {tr.duration_min} min · {tr.points} pkt{tr.required ? ' · Obowiązkowe' : ''}</Text>
                    </View>
                    <TouchableOpacity style={s.trEditBtn} onPress={() => openEditTraining(tr)} activeOpacity={0.7}>
                      <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.removeBtn} onPress={() => deleteTrainingConfirm(tr)} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
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
                          <TouchableOpacity style={s.approveBtn} onPress={async () => { await reviewLeaveRequest(lr.id, user.id, 'approved'); refresh(); }} activeOpacity={0.7}>
                            <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                          </TouchableOpacity>
                          <TouchableOpacity style={s.rejectBtn} onPress={async () => { await reviewLeaveRequest(lr.id, user.id, 'rejected'); refresh(); }} activeOpacity={0.7}>
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

        {/* ─── TOOLS TAB ─── */}
        {tab === 'tools' && (
          <View style={{ gap: 12 }}>
            {[
              { icon: 'bar-chart', label: 'Raporty', desc: 'Statystyki i analizy pracy zespołu', route: '/reports', color: '#22C55E' },
              { icon: 'swap-horizontal', label: 'Wymiany zmian', desc: 'Przeglądaj i zatwierdzaj wymiany', route: '/shift-swap', color: '#A855F7' },
              { icon: 'folder-open', label: 'Dokumenty', desc: 'Umowy, certyfikaty i zaświadczenia', route: '/documents', color: '#0EA5E9' },
              { icon: 'calendar-number', label: 'Dyspozycyjność', desc: 'Dostępność całego zespołu', route: '/availability', color: '#8B5CF6' },
            ].map((tool) => (
              <TouchableOpacity
                key={tool.label}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.card, borderRadius: 14, padding: 16 }}
                onPress={() => router.push(tool.route as any)}
                activeOpacity={0.8}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tool.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={`${tool.icon}-outline` as any} size={22} color={tool.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>{tool.label}</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>{tool.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
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
                    {editingTraining ? 'Zmiany zostan\u0105 od razu zapisane' : 'Uzupe\u0142nij poni\u017csze sekcje'}
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

                  <Text style={s.mLabel}>Tytu\u0142 *</Text>
                  <TextInput style={s.mInput} value={tForm.title} onChangeText={(v) => setTForm((f) => ({ ...f, title: v }))} placeholder="np. Obs\u0142uga kasy fiskalnej" placeholderTextColor={theme.colors.textMuted} />

                  <Text style={s.mLabel}>Kategoria</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                      {['BHP', 'Obs\u0142uga', 'Procedury', 'Kuchnia', 'Jako\u015b\u0107', 'Sprzeda\u017c', 'Inne'].map((cat) => (
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

                  <Text style={s.mLabel}>Link do materia\u0142u (opcjonalnie)</Text>
                  <TextInput style={s.mInput} value={tForm.material_url} onChangeText={(v) => setTForm((f) => ({ ...f, material_url: v }))} placeholder="https://..." placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" keyboardType="url" />

                  <Text style={s.mLabel}>Typ materia\u0142u</Text>
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
                      {tForm.required ? 'Obowi\u0105zkowe szkolenie' : 'Opcjonalne szkolenie'}
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
                    Pracownicy odpowiadaj\u0105 na pytania po przegl\u0105dni\u0119ciu materia\u0142\u00f3w
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
                          <Text style={[s.mLabel, { marginBottom: 6 }]}>Tre\u015b\u0107 pytania *</Text>
                          <TextInput style={[s.mInput, { minHeight: 60 }]} value={qDraft.question} onChangeText={(v) => setQDraft((f) => ({ ...f, question: v }))} placeholder="Wpisz pytanie..." placeholderTextColor={theme.colors.textMuted} multiline />

                          <Text style={[s.mLabel, { marginTop: 4 }]}>Odpowiedzi — kliknij k\u00f3\u0142ko \u017ceby zaznaczy\u0107 poprawn\u0105</Text>
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
                                placeholder={`Odpowied\u017a ${String.fromCharCode(65 + oi)}`}
                                placeholderTextColor={theme.colors.textMuted}
                              />
                            </View>
                          ))}

                          <Text style={[s.mLabel, { marginTop: 4 }]}>Wyja\u015bnienie (opcjonalne)</Text>
                          <TextInput style={s.mInput} value={qDraft.explanation} onChangeText={(v) => setQDraft((f) => ({ ...f, explanation: v }))} placeholder="Dlaczego ta odpowied\u017a jest poprawna?" placeholderTextColor={theme.colors.textMuted} />

                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <TouchableOpacity
                              style={[s.inviteBtn, { flex: 1 }]}
                              onPress={() => {
                                if (!qDraft.question.trim()) { showAlert('B\u0142\u0105d', 'Wpisz tre\u015b\u0107 pytania'); return; }
                                if (qDraft.options.some((o) => !o.trim())) { showAlert('B\u0142\u0105d', 'Wype\u0142nij wszystkie 4 odpowiedzi'); return; }
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
                  <Text style={s.inviteBtnText}>{editingTraining ? 'Zapisz zmiany' : 'Utw\u00f3rz szkolenie'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  chip: {
    borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.border,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.primary },

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
