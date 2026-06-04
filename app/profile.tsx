import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getNotifPrefs, upsertNotifPrefs } from '../lib/db';
import { supabase } from '../lib/supabase';
import { theme } from '../styles/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, restaurant, logout } = useAuth();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);

  // personal/payroll fields
  const [pPhone, setPPhone] = useState('');
  const [pBirth, setPBirth] = useState('');
  const [pAddr, setPAddr] = useState('');
  const [pPesel, setPPesel] = useState('');
  const [pCitizen, setPCitizen] = useState('');
  const [pIdNum, setPIdNum] = useState('');
  const [pIdCard, setPIdCard] = useState('');
  const [pIban, setPIban] = useState('');
  const [pBank, setPBank] = useState('');
  const [pNfz, setPNfz] = useState('');
  const [pTax, setPTax] = useState('');
  const [pPit, setPPit] = useState(false);
  const [pSaving, setPSaving] = useState(false);
  const [pSaved, setPSaved] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    shift_reminder: true,
    task_assigned: true,
    leave_approved: true,
    shift_swap: true,
    announcement: true,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('phone,birth_date,address,pesel,citizenship,id_series_number,id_card_number,bank_account_number,bank_name,nfz_branch,tax_office,pit_electronic').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setPPhone(data.phone ?? '');
          setPBirth(data.birth_date ?? '');
          setPAddr(data.address ?? '');
          setPPesel(data.pesel ?? '');
          setPCitizen(data.citizenship ?? '');
          setPIdNum(data.id_series_number ?? '');
          setPIdCard(data.id_card_number ?? '');
          setPIban(data.bank_account_number ?? '');
          setPBank(data.bank_name ?? '');
          setPNfz(data.nfz_branch ?? '');
          setPTax(data.tax_office ?? '');
          setPPit(data.pit_electronic ?? false);
        }
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      getNotifPrefs(user.id).then((prefs) => {
        if (prefs) {
          setNotifPrefs({
            shift_reminder: prefs.shift_reminder !== 'false',
            task_assigned: prefs.task_assigned !== 'false',
            leave_approved: prefs.leave_approved !== 'false',
            shift_swap: prefs.shift_swap !== 'false',
            announcement: prefs.announcement !== 'false',
          });
        }
      });
    }
  }, [user?.id]);

  const savePersonalData = async () => {
    if (!user?.id) return;
    if (!pPhone.trim() || !pBirth.trim() || !pAddr.trim() || !pPesel.trim() || !pCitizen.trim() || !pIdNum.trim() || !pIban.trim() || !pBank.trim() || !pNfz.trim() || !pTax.trim()) {
      Alert.alert('Brakujące dane', 'Uzupełnij wszystkie wymagane pola (oznaczone *).');
      return;
    }
    if (pPesel.trim().length !== 11) {
      Alert.alert('Nieprawidłowy PESEL', 'PESEL musi mieć dokładnie 11 cyfr.');
      return;
    }
    setPSaving(true);
    await supabase.from('profiles').update({
      phone: pPhone || null,
      birth_date: pBirth || null,
      address: pAddr || null,
      pesel: pPesel || null,
      citizenship: pCitizen || null,
      id_series_number: pIdNum || null,
      id_card_number: pIdCard || null,
      bank_account_number: pIban.replace(/\s/g, '') || null,
      bank_name: pBank || null,
      nfz_branch: pNfz || null,
      tax_office: pTax || null,
      pit_electronic: pPit,
    }).eq('id', user.id);
    setPSaving(false);
    setPSaved(true);
    setTimeout(() => { setPSaved(false); setShowPersonalModal(false); }, 1200);
  };

  const saveNotifPrefs = async () => {
    if (!user?.id) return;
    setNotifSaving(true);
    const serialized: Record<string, string> = {};
    Object.entries(notifPrefs).forEach(([k, v]) => { serialized[k] = String(v); });
    await upsertNotifPrefs(user.id, serialized);
    setNotifSaving(false);
    setShowNotifModal(false);
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (newPw.length < 8) { setPwError('Hasło musi mieć min. 8 znaków'); return; }
    if (newPw !== confirmPw) { setPwError('Hasła nie są identyczne'); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) { setPwError('Błąd: ' + error.message); return; }
    setPwSuccess(true);
    setTimeout(() => { setShowPasswordModal(false); setPwSuccess(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }, 1500);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (confirm('Czy na pewno chcesz się wylogować?')) { logout(); router.replace('/login' as any); }
    } else {
      Alert.alert('Wylogowanie', 'Czy na pewno chcesz się wylogować?', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Wyloguj', style: 'destructive', onPress: () => { logout(); router.replace('/login' as any); } },
      ]);
    }
  };

  if (!user) return null;

  const ROLE_LABELS: Record<string, string> = { owner: 'Właściciel', manager: 'Manager', employee: 'Pracownik' };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mój profil</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Avatar + Name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={styles.avatarText}>{user.initials}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dane osobowe</Text>
          <InfoRow icon="person-outline" label="Imię i nazwisko" value={user.name} />
          <InfoRow icon="mail-outline" label="E-mail" value={user.email} />
          <InfoRow icon="briefcase-outline" label="Stanowisko" value={user.jobTitle} />
          <InfoRow icon="business-outline" label="Firma" value={restaurant?.name ?? '—'} />
        </View>

        {/* Personal data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dane kadrowe</Text>
          <ActionRow icon="id-card-outline" label="Uzupełnij / edytuj dane osobowe" onPress={() => setShowPersonalModal(true)} />
        </View>

        {/* Documents Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dokumenty</Text>
          <ActionRow icon="document-text-outline" label="Moje dokumenty" onPress={() => router.push('/documents' as any)} />
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ustawienia konta</Text>
          <ActionRow icon="lock-closed-outline" label="Zmień hasło" onPress={() => setShowPasswordModal(true)} />
          <ActionRow icon="notifications-outline" label="Preferencje powiadomień" onPress={() => setShowNotifModal(true)} />
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
            <Text style={styles.logoutText}>Wyloguj się</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>ShiftApp v1.0 · © 2025</Text>
      </ScrollView>

      {/* Personal Data Modal */}
      <Modal visible={showPersonalModal} animationType="slide" transparent onRequestClose={() => setShowPersonalModal(false)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, { maxHeight: '92%' }]}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Dane kadrowe</Text>
              <TouchableOpacity onPress={() => setShowPersonalModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={[mStyles.body, { paddingBottom: 32 }]} keyboardShouldPersistTaps="handled">
              <Text style={pStyles.sect}>Dane kontaktowe</Text>
              <Text style={mStyles.label}>Telefon *</Text>
              <TextInput style={mStyles.input} value={pPhone} onChangeText={setPPhone} placeholder="+48 500 000 000" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" />
              <Text style={mStyles.label}>Data urodzenia * (RRRR-MM-DD)</Text>
              <TextInput style={mStyles.input} value={pBirth} onChangeText={setPBirth} placeholder="1990-01-15" placeholderTextColor={theme.colors.textMuted} />
              <Text style={mStyles.label}>Adres zamieszkania *</Text>
              <TextInput style={mStyles.input} value={pAddr} onChangeText={setPAddr} placeholder="ul. Kwiatowa 1, 00-001 Warszawa" placeholderTextColor={theme.colors.textMuted} />

              <Text style={pStyles.sect}>Dokumenty tożsamości</Text>
              <Text style={mStyles.label}>PESEL *</Text>
              <TextInput style={mStyles.input} value={pPesel} onChangeText={setPPesel} placeholder="00000000000" placeholderTextColor={theme.colors.textMuted} keyboardType="number-pad" maxLength={11} />
              <Text style={mStyles.label}>Obywatelstwo *</Text>
              <TextInput style={mStyles.input} value={pCitizen} onChangeText={setPCitizen} placeholder="polskie" placeholderTextColor={theme.colors.textMuted} />
              <Text style={mStyles.label}>Seria i numer dowodu osobistego *</Text>
              <TextInput style={mStyles.input} value={pIdNum} onChangeText={setPIdNum} placeholder="ABC 123456" placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />
              <Text style={mStyles.label}>Numer legitymacji (opcjonalnie)</Text>
              <TextInput style={mStyles.input} value={pIdCard} onChangeText={setPIdCard} placeholder="np. 1234567" placeholderTextColor={theme.colors.textMuted} />

              <Text style={pStyles.sect}>Dane bankowe</Text>
              <Text style={mStyles.label}>Numer rachunku bankowego *</Text>
              <TextInput style={mStyles.input} value={pIban} onChangeText={setPIban} placeholder="PL00 0000 0000 0000 0000 0000 0000" placeholderTextColor={theme.colors.textMuted} />
              <Text style={mStyles.label}>Nazwa banku *</Text>
              <TextInput style={mStyles.input} value={pBank} onChangeText={setPBank} placeholder="np. PKO BP" placeholderTextColor={theme.colors.textMuted} />

              <Text style={pStyles.sect}>Dane kadrowe</Text>
              <Text style={mStyles.label}>Oddział NFZ *</Text>
              <TextInput style={mStyles.input} value={pNfz} onChangeText={setPNfz} placeholder="np. Mazowiecki" placeholderTextColor={theme.colors.textMuted} />
              <Text style={mStyles.label}>Urząd skarbowy *</Text>
              <TextInput style={mStyles.input} value={pTax} onChangeText={setPTax} placeholder="np. US Warszawa-Śródmieście" placeholderTextColor={theme.colors.textMuted} />
              <View style={pStyles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.switchLabel}>Zgoda na e-PIT</Text>
                  <Text style={pStyles.switchSub}>Przesyłanie PIT elektronicznie</Text>
                </View>
                <Switch value={pPit} onValueChange={setPPit} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor={theme.colors.white} />
              </View>

              <TouchableOpacity style={[mStyles.saveBtn, { marginTop: 24 }, pSaving && { opacity: 0.6 }]} onPress={savePersonalData} disabled={pSaving} activeOpacity={0.85}>
                {pSaving ? <ActivityIndicator color={theme.colors.white} /> : pSaved
                  ? <><Ionicons name="checkmark" size={18} color={theme.colors.white} /><Text style={mStyles.saveBtnText}>Zapisano!</Text></>
                  : <Text style={mStyles.saveBtnText}>Zapisz dane</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notification Preferences Modal */}
      <Modal visible={showNotifModal} animationType="fade" transparent onRequestClose={() => setShowNotifModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Powiadomienia</Text>
              <TouchableOpacity onPress={() => setShowNotifModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={mStyles.body}>
              {([
                { key: 'shift_reminder', label: 'Przypomnienie o zmianie', icon: 'alarm-outline' },
                { key: 'task_assigned', label: 'Nowe zadanie', icon: 'checkbox-outline' },
                { key: 'leave_approved', label: 'Decyzja o urlopie', icon: 'umbrella-outline' },
                { key: 'shift_swap', label: 'Wymiana zmiany', icon: 'swap-horizontal-outline' },
                { key: 'announcement', label: 'Ogłoszenia managera', icon: 'megaphone-outline' },
              ] as const).map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
                  onPress={() => setNotifPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.text }}>{item.label}</Text>
                  <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: notifPrefs[item.key] ? theme.colors.primary : theme.colors.border, justifyContent: 'center', paddingHorizontal: 2 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.white, alignSelf: notifPrefs[item.key] ? 'flex-end' : 'flex-start' }} />
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[mStyles.saveBtn, { marginTop: 16 }]} onPress={saveNotifPrefs} disabled={notifSaving} activeOpacity={0.85}>
                {notifSaving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>Zapisz ustawienia</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="fade" transparent onRequestClose={() => setShowPasswordModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Zmień hasło</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {pwSuccess ? (
              <View style={mStyles.successBox}>
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                <Text style={mStyles.successText}>Hasło zostało zmienione!</Text>
              </View>
            ) : (
              <View style={mStyles.body}>
                {pwError ? <Text style={mStyles.error}>{pwError}</Text> : null}

                <Text style={mStyles.label}>Aktualne hasło</Text>
                <TextInput style={mStyles.input} value={currentPw} onChangeText={setCurrentPw} secureTextEntry placeholder="••••••••" placeholderTextColor={theme.colors.textMuted} />

                <Text style={mStyles.label}>Nowe hasło (min. 8 znaków)</Text>
                <TextInput style={mStyles.input} value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="••••••••" placeholderTextColor={theme.colors.textMuted} />

                <Text style={mStyles.label}>Powtórz nowe hasło</Text>
                <TextInput style={mStyles.input} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry placeholder="••••••••" placeholderTextColor={theme.colors.textMuted} />

                <TouchableOpacity style={mStyles.saveBtn} onPress={handleChangePassword} activeOpacity={0.85} disabled={pwLoading}>
                  {pwLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>Zapisz</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={theme.colors.textMuted} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={18} color={theme.colors.primary} />
      <Text style={styles.actionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800', color: theme.colors.white },
  name: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  roleBadge: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  section: { marginHorizontal: 16, marginBottom: 24, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  logoutText: { fontSize: 14, fontWeight: '600', color: theme.colors.error },
  version: { textAlign: 'center', fontSize: 12, color: theme.colors.textMuted, paddingVertical: 24 },
});

const pStyles = StyleSheet.create({
  sect: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 20, marginBottom: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginTop: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  switchSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  error: { color: theme.colors.error, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  successBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  successText: { fontSize: 16, fontWeight: '600', color: theme.colors.success },
});
