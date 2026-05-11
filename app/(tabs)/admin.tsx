import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileHeader from '../../components/MobileHeader';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { generateInvitation, getEmployees, getInvitations, getTrainings, removeEmployee } from '../../lib/db';
import type { DbInvitation, DbProfile, DbTraining } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const JOB_OPTIONS = ['Kelner', 'Kucharz', 'Barista', 'Lider zmiany', 'Hostessa', 'Pizzaiolo', 'Sprzątanie'];

export default function AdminScreen() {
  const router = useRouter();
  const { user, restaurant } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert, showConfirm } = useAlert();
  const rid = user?.restaurantId ?? '';

  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [invitations, setInvitations] = useState<DbInvitation[]>([]);
  const [trainings, setTrainings] = useState<DbTraining[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [jobTitle, setJobTitle] = useState('Kelner');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [tab, setTab] = useState<'team' | 'invites' | 'settings' | 'tools' | 'trainings'>('team');

  // Training modal state
  const EMPTY_TRAINING = { title: '', category: 'BHP', duration_min: '30', required: false, points: '50', material_url: '', material_type: null as 'pdf' | 'video' | null, assigned_role: '', deadline: '' };
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<DbTraining | null>(null);
  const [tForm, setTForm] = useState(EMPTY_TRAINING);

  const refresh = () => {
    if (!rid) return;
    getEmployees(rid).then(setEmployees);
    getInvitations(rid).then(setInvitations);
    getTrainings(rid).then(setTrainings);
  };

  useEffect(() => { refresh(); }, [rid]);

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
    setShowTrainingModal(true);
  };

  const openEditTraining = (tr: DbTraining) => {
    setEditingTraining(tr);
    setTForm({
      title: tr.title,
      category: tr.category,
      duration_min: String(tr.duration_min),
      required: tr.required,
      points: String(tr.points),
      material_url: tr.material_url ?? '',
      material_type: tr.material_type,
      assigned_role: tr.assigned_role ?? '',
      deadline: tr.deadline ?? '',
    });
    setShowTrainingModal(true);
  };

  const saveTraining = async () => {
    if (!tForm.title.trim()) { showAlert('Błąd', 'Podaj tytuł szkolenia'); return; }
    const payload = {
      title: tForm.title.trim(),
      category: tForm.category,
      duration_min: parseInt(tForm.duration_min) || 30,
      required: tForm.required,
      points: parseInt(tForm.points) || 0,
      material_url: tForm.material_url.trim() || null,
      material_type: tForm.material_type,
      assigned_role: tForm.assigned_role.trim() || null,
      deadline: tForm.deadline.trim() || null,
    };
    if (editingTraining) {
      await updateTraining(editingTraining.id, payload);
    } else {
      await createTraining(rid, payload);
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
                    <TouchableOpacity
                      style={s.removeBtn}
                      onPress={() => removeEmp(emp.id, `${emp.first_name} ${emp.last_name}`)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="person-remove-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
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
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Nazwa</Text>
                <Text style={s.settingValue}>{restaurant?.name}</Text>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Adres</Text>
                <Text style={s.settingValue}>{restaurant?.address}</Text>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Telefon</Text>
                <Text style={s.settingValue}>{restaurant?.phone}</Text>
              </View>
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
                <Text style={s.settingValue}>{restaurant?.createdAt?.slice(0,10)}</Text>
              </View>
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
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Zmiany w tym tygodniu</Text>
                <Text style={s.settingValue}>—</Text>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Zadania aktywne</Text>
                <Text style={s.settingValue}>—</Text>
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

        {/* ─── TOOLS TAB ─── */}
        {tab === 'tools' && (
          <View style={{ gap: 12 }}>
            {[
              { icon: 'calendar', label: 'Edytor grafiku', desc: 'Planuj zmiany dla zespołu', route: '/schedule-editor', color: theme.colors.primary },
              { icon: 'bar-chart', label: 'Raporty', desc: 'Statystyki i analizy', route: '/reports', color: '#22C55E' },
              { icon: 'document-text', label: 'Urlopy', desc: 'Zarządzaj wnioskami urlopowymi', route: '/leave-requests', color: '#F97316' },
              { icon: 'swap-horizontal', label: 'Wymiany zmian', desc: 'Zatwierdź wymiany zmian', route: '/shift-swap', color: '#A855F7' },
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
              <View style={s.mHeader}>
                <Text style={s.mTitle}>{editingTraining ? 'Edytuj szkolenie' : 'Nowe szkolenie'}</Text>
                <TouchableOpacity onPress={() => setShowTrainingModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={s.mBody}>
                <Text style={s.mLabel}>Tytuł *</Text>
                <TextInput
                  style={s.mInput}
                  value={tForm.title}
                  onChangeText={(v) => setTForm((f) => ({ ...f, title: v }))}
                  placeholder="np. Obsługa kasy fiskalnej"
                  placeholderTextColor={theme.colors.textMuted}
                />

                <Text style={s.mLabel}>Kategoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                    {['BHP', 'Obsługa', 'Procedury', 'Jakość', 'Sprzedaż', 'Inne'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[s.chip, tForm.category === cat && s.chipActive]}
                        onPress={() => setTForm((f) => ({ ...f, category: cat }))}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.chipText, tForm.category === cat && s.chipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mLabel}>Czas (min)</Text>
                    <TextInput
                      style={s.mInput}
                      value={tForm.duration_min}
                      onChangeText={(v) => setTForm((f) => ({ ...f, duration_min: v }))}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mLabel}>Punkty XP</Text>
                    <TextInput
                      style={s.mInput}
                      value={tForm.points}
                      onChangeText={(v) => setTForm((f) => ({ ...f, points: v }))}
                      keyboardType="numeric"
                      placeholder="50"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>

                <Text style={s.mLabel}>Dla stanowiska (opcjonalnie)</Text>
                <TextInput
                  style={s.mInput}
                  value={tForm.assigned_role}
                  onChangeText={(v) => setTForm((f) => ({ ...f, assigned_role: v }))}
                  placeholder="np. Kelner, Kucharz — zostaw puste dla wszystkich"
                  placeholderTextColor={theme.colors.textMuted}
                />

                <Text style={s.mLabel}>Link do materiału (opcjonalnie)</Text>
                <TextInput
                  style={s.mInput}
                  value={tForm.material_url}
                  onChangeText={(v) => setTForm((f) => ({ ...f, material_url: v }))}
                  placeholder="https://..."
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={s.mLabel}>Typ materiału</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                  {(['pdf', 'video', null] as const).map((mt) => (
                    <TouchableOpacity
                      key={String(mt)}
                      style={[s.chip, tForm.material_type === mt && s.chipActive]}
                      onPress={() => setTForm((f) => ({ ...f, material_type: mt }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.chipText, tForm.material_type === mt && s.chipTextActive]}>{mt ?? 'Brak'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.mLabel}>Termin (YYYY-MM-DD, opcjonalnie)</Text>
                <TextInput
                  style={s.mInput}
                  value={tForm.deadline}
                  onChangeText={(v) => setTForm((f) => ({ ...f, deadline: v }))}
                  placeholder="np. 2025-12-31"
                  placeholderTextColor={theme.colors.textMuted}
                />

                <TouchableOpacity
                  style={[s.chip, tForm.required && s.chipActive, { alignSelf: 'flex-start', marginBottom: 4 }]}
                  onPress={() => setTForm((f) => ({ ...f, required: !f.required }))}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, tForm.required && s.chipTextActive]}>
                    {tForm.required ? '✓ Obowiązkowe' : 'Obowiązkowe?'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.inviteBtn, { marginTop: 12 }]} onPress={saveTraining} activeOpacity={0.85}>
                  <Ionicons name={editingTraining ? 'save-outline' : 'add-circle-outline'} size={20} color={theme.colors.white} />
                  <Text style={s.inviteBtnText}>{editingTraining ? 'Zapisz zmiany' : 'Dodaj szkolenie'}</Text>
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
  contentDesktop: { maxWidth: 700, alignSelf: 'center', width: '100%', paddingHorizontal: 32 },

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
});
