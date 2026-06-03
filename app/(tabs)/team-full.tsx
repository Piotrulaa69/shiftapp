import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Clipboard, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { generateInvitation, getEmployees, getPointsForEmployee, updateProfile } from '../../lib/db';
import type { DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const JOB_OPTIONS = ['Kelner', 'Kucharz', 'Barista', 'Lider zmiany', 'Hostessa', 'Pizzaiolo', 'Sprzątanie'];
const ROLE_LABELS: Record<string, string> = { owner: 'Właściciel', manager: 'Manager', employee: 'Pracownik' };
const EMP_TYPE_LABELS: Record<string, string> = { full_time: 'Pełny etat', part_time: 'Część etatu', contract: 'Umowa zlecenie' };

export default function TeamFullScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert } = useAlert();
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [jobTitle, setJobTitle] = useState('Kelner');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Employee edit state
  const [selectedEmp, setSelectedEmp] = useState<DbProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmpType, setEditEmpType] = useState<'full_time' | 'part_time' | 'contract'>('full_time');
  const [editMinWeekly, setEditMinWeekly] = useState('');
  const [editMaxWeekly, setEditMaxWeekly] = useState('');
  const [editMinMonthly, setEditMinMonthly] = useState('');
  const [editMaxMonthly, setEditMaxMonthly] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const em = await getEmployees(rid);
    setEmployees(em);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  const owners = employees.filter((e) => e.role === 'owner');
  const managers = employees.filter((e) => e.role === 'manager');
  const staff = employees.filter((e) => e.role === 'employee');
  const [empPoints, setEmpPoints] = useState(0);

  const openEmployeeEdit = async (emp: DbProfile) => {
    setSelectedEmp(emp);
    setEditing(false);
    setEditJobTitle(emp.job_title || '');
    setEditPhone(emp.phone || '');
    setEditEmpType(emp.employment_type || 'full_time');
    setEditMinWeekly(emp.min_hours_weekly?.toString() || '');
    setEditMaxWeekly(emp.max_hours_weekly?.toString() || '');
    setEditMinMonthly(emp.min_hours_monthly?.toString() || '');
    setEditMaxMonthly(emp.max_hours_monthly?.toString() || '');
    setEditActive(emp.is_active !== false);
    const pointsLedger = await getPointsForEmployee(rid, emp.id);
    const totalPoints = pointsLedger.reduce((sum, p) => sum + (p.points || 0), 0);
    setEmpPoints(totalPoints);
  };

  const saveEmployee = async () => {
    if (!selectedEmp) return;
    setSaving(true);
    const success = await updateProfile(selectedEmp.id, {
      job_title: editJobTitle,
      phone: editPhone,
      employment_type: editEmpType,
      min_hours_weekly: editMinWeekly ? parseInt(editMinWeekly) : null,
      max_hours_weekly: editMaxWeekly ? parseInt(editMaxWeekly) : null,
      min_hours_monthly: editMinMonthly ? parseInt(editMinMonthly) : null,
      max_hours_monthly: editMaxMonthly ? parseInt(editMaxMonthly) : null,
      is_active: editActive,
    });
    setSaving(false);
    if (success) {
      setEditing(false);
      load();
    } else {
      showAlert('Błąd', 'Nie udało się zapisać zmian');
    }
  };

  const generateInvite = async () => {
    if (!rid || !user?.id) return;
    setGenerating(true);
    const invitation = await generateInvitation(rid, user.id, jobTitle);
    setGenerating(false);
    if (invitation) {
      setLastCode(invitation.code);
      setShowInvite(false);
    } else {
      showAlert('Błąd', 'Nie udało się wygenerować kodu');
    }
  };

  const copyToClipboard = async (code: string) => {
    await Clipboard.setString(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const shareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Dołącz do zespołu używając kodu: ${code}`,
      });
    } catch (error) {
      // Ignore
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Zarządzanie zespołem</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : (
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

            {canManage && (
              <TouchableOpacity style={s.inviteBtn} onPress={() => setShowInvite(true)} activeOpacity={0.85}>
                <Ionicons name="person-add" size={20} color={theme.colors.white} />
                <Text style={s.inviteBtnText}>Zaproś nowego pracownika</Text>
              </TouchableOpacity>
            )}

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
                <TouchableOpacity style={s.generateBtn} onPress={generateInvite} disabled={generating} activeOpacity={0.85}>
                  {generating ? <ActivityIndicator color={theme.colors.white} /> : (
                    <>
                      <Ionicons name="key" size={18} color={theme.colors.white} />
                      <Text style={s.generateBtnText}>Generuj kod zaproszenia</Text>
                    </>
                  )}
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

            {managers.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Managerowie</Text>
                {managers.map((emp) => (
                  <View key={emp.id} style={s.empRow}>
                    <View style={[s.empAvatar, { backgroundColor: emp.avatar_color }]}>
                      <Text style={s.empInitials}>{`${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase()}</Text>
                    </View>
                    <View style={s.empInfo}>
                      <Text style={s.empName}>{emp.first_name} {emp.last_name}</Text>
                      <Text style={s.empRole}>{emp.job_title}</Text>
                    </View>
                    <View style={s.managerBadge}>
                      <Ionicons name="shield-outline" size={12} color={theme.colors.primary} />
                      <Text style={s.managerBadgeText}>Manager</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

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
                  <TouchableOpacity key={emp.id} style={s.empRow} onPress={() => openEmployeeEdit(emp)} activeOpacity={0.7}>
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
      </ScrollView>

      {/* Employee Edit Modal */}
      <Modal visible={!!selectedEmp} animationType="slide" transparent onRequestClose={() => setSelectedEmp(null)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, isDesktop && mStyles.sheetDesktop]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Profile Header */}
              <View style={mStyles.profileHeader}>
                <TouchableOpacity onPress={() => setSelectedEmp(null)} style={mStyles.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={[mStyles.bigAvatar, { backgroundColor: selectedEmp?.avatar_color || theme.colors.primary }]}>
                  <Text style={mStyles.bigAvatarText}>{selectedEmp ? `${selectedEmp.first_name?.[0] ?? ''}${selectedEmp.last_name?.[0] ?? ''}`.toUpperCase() : ''}</Text>
                </View>
                <Text style={mStyles.profileName}>{selectedEmp?.first_name} {selectedEmp?.last_name}</Text>
                <Text style={mStyles.profileTitle}>{selectedEmp?.job_title}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={[mStyles.rolePill, { backgroundColor: selectedEmp?.role === 'owner' ? '#FEF3C7' : selectedEmp?.role === 'manager' ? '#EFF6FF' : theme.colors.surface }]}>
                    <Text style={[mStyles.rolePillText, { color: selectedEmp?.role === 'owner' ? '#D97706' : selectedEmp?.role === 'manager' ? theme.colors.primary : theme.colors.textSecondary }]}>{ROLE_LABELS[selectedEmp?.role ?? ''] ?? selectedEmp?.role}</Text>
                  </View>
                  <View style={[mStyles.rolePill, { backgroundColor: empPoints > 0 ? '#F5F3FF' : theme.colors.surface }]}>
                    <Ionicons name="trophy-outline" size={12} color="#7C3AED" />
                    <Text style={[mStyles.rolePillText, { color: '#7C3AED' }]}>{empPoints} pkt</Text>
                  </View>
                </View>
              </View>

              {/* Info Section */}
              <View style={mStyles.section}>
                <View style={mStyles.sectionTitleRow}>
                  <Text style={mStyles.sectionTitle}>Dane pracownika</Text>
                  {canManage && !editing && (
                    <TouchableOpacity onPress={() => setEditing(true)} style={mStyles.editBtn}>
                      <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                      <Text style={mStyles.editBtnText}>Edytuj</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {editing ? (
                  <>
                    <Text style={mStyles.fieldLabel}>Stanowisko</Text>
                    <TextInput style={mStyles.input} value={editJobTitle} onChangeText={setEditJobTitle} placeholder="np. Kelner" placeholderTextColor={theme.colors.textMuted} />
                    <Text style={mStyles.fieldLabel}>Telefon</Text>
                    <TextInput style={mStyles.input} value={editPhone} onChangeText={setEditPhone} placeholder="+48 000 000 000" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" />
                    <Text style={mStyles.fieldLabel}>Typ zatrudnienia</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      {(['full_time', 'part_time', 'contract'] as const).map((t) => (
                        <TouchableOpacity key={t} style={[mStyles.chip, editEmpType === t && mStyles.chipActive]} onPress={() => setEditEmpType(t)} activeOpacity={0.7}>
                          <Text style={[mStyles.chipText, editEmpType === t && mStyles.chipTextActive]}>{EMP_TYPE_LABELS[t]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={mStyles.fieldLabel}>Min godziny tygodniowo</Text>
                    <TextInput style={mStyles.input} value={editMinWeekly} onChangeText={setEditMinWeekly} placeholder="np. 20" placeholderTextColor={theme.colors.textMuted} keyboardType="number-pad" />
                    <Text style={mStyles.fieldLabel}>Max godziny tygodniowo</Text>
                    <TextInput style={mStyles.input} value={editMaxWeekly} onChangeText={setEditMaxWeekly} placeholder="np. 40" placeholderTextColor={theme.colors.textMuted} keyboardType="number-pad" />
                    <Text style={mStyles.fieldLabel}>Min godziny miesięcznie</Text>
                    <TextInput style={mStyles.input} value={editMinMonthly} onChangeText={setEditMinMonthly} placeholder="np. 80" placeholderTextColor={theme.colors.textMuted} keyboardType="number-pad" />
                    <Text style={mStyles.fieldLabel}>Max godziny miesięcznie</Text>
                    <TextInput style={mStyles.input} value={editMaxMonthly} onChangeText={setEditMaxMonthly} placeholder="np. 160" placeholderTextColor={theme.colors.textMuted} keyboardType="number-pad" />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                      <TouchableOpacity onPress={() => setEditActive(!editActive)} style={[mStyles.toggle, editActive ? mStyles.toggleOn : mStyles.toggleOff]}>
                        <View style={[mStyles.toggleDot, editActive && mStyles.toggleDotOn]} />
                      </TouchableOpacity>
                      <Text style={mStyles.toggleLabel}>Aktywny</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                      <TouchableOpacity style={[mStyles.actionBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setEditing(false)} activeOpacity={0.7}>
                        <Text style={[mStyles.actionBtnText, { color: theme.colors.text }]}>Anuluj</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[mStyles.actionBtn, { backgroundColor: theme.colors.primary }]} onPress={saveEmployee} disabled={saving} activeOpacity={0.7}>
                        {saving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.actionBtnText}>Zapisz</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={mStyles.fieldRow}>
                      <Text style={mStyles.fieldLabel}>Stanowisko</Text>
                      <Text style={mStyles.fieldValue}>{selectedEmp?.job_title}</Text>
                    </View>
                    <View style={mStyles.fieldRow}>
                      <Text style={mStyles.fieldLabel}>Telefon</Text>
                      <Text style={mStyles.fieldValue}>{selectedEmp?.phone || 'Brak'}</Text>
                    </View>
                    <View style={mStyles.fieldRow}>
                      <Text style={mStyles.fieldLabel}>Typ zatrudnienia</Text>
                      <Text style={mStyles.fieldValue}>{EMP_TYPE_LABELS[selectedEmp?.employment_type || 'full_time']}</Text>
                    </View>
                    <View style={mStyles.fieldRow}>
                      <Text style={mStyles.fieldLabel}>Min/Max godziny tygodniowo</Text>
                      <Text style={mStyles.fieldValue}>{selectedEmp?.min_hours_weekly || '-'} / {selectedEmp?.max_hours_weekly || '-'}</Text>
                    </View>
                    <View style={mStyles.fieldRow}>
                      <Text style={mStyles.fieldLabel}>Min/Max godziny miesięcznie</Text>
                      <Text style={mStyles.fieldValue}>{selectedEmp?.min_hours_monthly || '-'} / {selectedEmp?.max_hours_monthly || '-'}</Text>
                    </View>
                    <View style={mStyles.fieldRow}>
                      <Text style={mStyles.fieldLabel}>Status</Text>
                      <View style={[mStyles.statusBadge, { backgroundColor: selectedEmp?.is_active ? theme.colors.greenLight : theme.colors.errorLight }]}>
                        <Text style={[mStyles.statusText, { color: selectedEmp?.is_active ? theme.colors.green : theme.colors.error }]}>
                          {selectedEmp?.is_active ? 'Aktywny' : 'Nieaktywny'}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 16, alignItems: 'center', ...theme.shadows.card },
  statNum: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, marginBottom: 16 },
  inviteBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  codeCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 16, marginBottom: 16, ...theme.shadows.card },
  codeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  codeCardTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  codeValue: { fontSize: 20, fontWeight: '700', color: theme.colors.primary, letterSpacing: 2, marginBottom: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 10 },
  shareBtnText: { fontSize: 13, fontWeight: '600' },
  inviteModal: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 16, ...theme.shadows.card },
  inviteModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inviteModalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  inviteModalSub: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 16 },
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  jobChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
  jobChipActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  jobChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  jobChipTextActive: { color: theme.colors.primary },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14 },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8, ...theme.shadows.card },
  empAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empRole: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  ownerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.colors.primaryLight },
  ownerBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  managerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.colors.surface },
  managerBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  emptySub: { fontSize: 12, color: theme.colors.textSecondary },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', overflow: 'hidden' },
  sheetDesktop: { maxWidth: 560, alignSelf: 'center' as const, width: '100%', borderRadius: 20, marginVertical: 40 },
  profileHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 24, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
  bigAvatar: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  bigAvatarText: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  profileName: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  profileTitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  section: { padding: 20 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary },
  toggle: { width: 44, height: 24, borderRadius: 12, padding: 2 },
  toggleOn: { backgroundColor: theme.colors.primary },
  toggleOff: { backgroundColor: theme.colors.border },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.white },
  toggleDotOn: { marginLeft: 'auto' as any },
  toggleLabel: { fontSize: 14, color: theme.colors.text },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  fieldValue: { fontSize: 14, color: theme.colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
});
