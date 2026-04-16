import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { AppUser, Invitation, store } from '../../data/store';
import { theme } from '../../styles/theme';

const JOB_OPTIONS = ['Kelner', 'Kucharz', 'Barista', 'Lider zmiany', 'Hostessa', 'Pizzaiolo', 'Sprzątanie'];

export default function AdminScreen() {
  const { user, restaurant } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert, showConfirm } = useAlert();
  const rid = user?.restaurantId ?? '';

  const [employees, setEmployees] = useState<AppUser[]>(store.getEmployees(rid));
  const [invitations, setInvitations] = useState<Invitation[]>(store.getInvitations(rid));
  const [showInvite, setShowInvite] = useState(false);
  const [jobTitle, setJobTitle] = useState('Kelner');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [tab, setTab] = useState<'team' | 'invites' | 'settings'>('team');

  const refresh = () => {
    setEmployees(store.getEmployees(rid));
    setInvitations(store.getInvitations(rid));
  };

  const generateInvite = () => {
    const inv = store.generateInvitation(rid, user!.id, jobTitle);
    setLastCode(inv.code);
    setShowInvite(false);
    refresh();
  };

  const shareCode = async (code: string) => {
    const msg = `Dołącz do ${restaurant?.name} w ShiftApp!\n\nTwój kod aktywacyjny: ${code}\n\nPobierz aplikację i wpisz kod w sekcji "Dołącz do restauracji".`;
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
      () => { store.removeEmployee(rid, empId); refresh(); },
      'Usuń'
    );
  };

  const owners = employees.filter((e) => e.role === 'owner');
  const staff = employees.filter((e) => e.role === 'employee');
  const activeInvites = invitations.filter((i) => !i.used && new Date(i.expiresAt) > new Date());
  const usedInvites = invitations.filter((i) => i.used);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
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

      {/* Tabs */}
      <View style={s.tabs}>
        {([
          { key: 'team', label: 'Zespół', icon: 'people' },
          { key: 'invites', label: 'Zaproszenia', icon: 'mail' },
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
      </View>

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
                  <View style={[s.empAvatar, { backgroundColor: emp.avatarColor }]}>
                    <Text style={s.empInitials}>{emp.initials}</Text>
                  </View>
                  <View style={s.empInfo}>
                    <Text style={s.empName}>{emp.name}</Text>
                    <Text style={s.empRole}>{emp.jobTitle}</Text>
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
                    <View style={[s.empAvatar, { backgroundColor: emp.avatarColor }]}>
                      <Text style={s.empInitials}>{emp.initials}</Text>
                    </View>
                    <View style={s.empInfo}>
                      <Text style={s.empName}>{emp.name}</Text>
                      <Text style={s.empRole}>{emp.jobTitle} · {emp.email}</Text>
                    </View>
                    <TouchableOpacity
                      style={s.removeBtn}
                      onPress={() => removeEmp(emp.id, emp.name)}
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
                      <Text style={s.invJob}>{inv.jobTitle}</Text>
                      <Text style={s.invExpiry}>Wygasa: {new Date(inv.expiresAt).toLocaleDateString('pl-PL')}</Text>
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
                    <Text style={s.invJob}>{inv.jobTitle}</Text>
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
                <Text style={s.settingValue}>{restaurant?.createdAt}</Text>
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
                <Text style={s.settingValue}>{store.getShifts(rid).length}</Text>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Zadania aktywne</Text>
                <Text style={s.settingValue}>{store.getTasks(rid).filter((t) => !t.completed).length}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.white, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },

  tabs: {
    flexDirection: 'row', backgroundColor: theme.colors.white,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.primary },

  content: { padding: 16, gap: 14, paddingBottom: 40 },
  contentDesktop: { maxWidth: 700, alignSelf: 'center', width: '100%', paddingHorizontal: 32 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
    padding: 16, alignItems: 'center', ...theme.shadows.card,
  },
  statNum: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },

  inviteBtn: {
    backgroundColor: theme.colors.navy, borderRadius: theme.borderRadius.md,
    height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, ...theme.shadows.medium,
  },
  inviteBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },

  codeCard: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.lg,
    padding: 18, borderWidth: 1.5, borderColor: theme.colors.primary, gap: 8,
  },
  codeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeCardTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  codeValue: {
    fontSize: 32, fontWeight: '800', color: theme.colors.navy, textAlign: 'center',
    letterSpacing: 6, paddingVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md,
    height: 40, borderWidth: 1, borderColor: theme.colors.primary,
  },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },

  inviteModal: {
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
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
    backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg,
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
});
