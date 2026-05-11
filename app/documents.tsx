import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createDocument, deleteDocument, getDocuments, getEmployees, updateDocument, uploadDocumentFile } from '../lib/db';
import type { DbDocument, DbProfile } from '../lib/supabase';
import { theme } from '../styles/theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  active: { label: 'Aktywny', color: '#22C55E', bg: '#E8F8ED', icon: 'checkmark-circle' },
  expiring: { label: 'Wygasa', color: '#F97316', bg: '#FFF4E5', icon: 'warning' },
  expired: { label: 'Wygasł', color: '#EF4444', bg: '#FFF0EF', icon: 'close-circle' },
};

const DOC_TYPES = [
  { key: 'contract', label: 'Umowa' },
  { key: 'certificate', label: 'Certyfikat' },
  { key: 'attestation', label: 'Zaświadczenie' },
  { key: 'other', label: 'Inny' },
] as const;

const TYPE_ICON: Record<string, string> = {
  contract: 'document-text', certificate: 'ribbon', attestation: 'shield-checkmark', other: 'attach',
};

const computeStatus = (expiresAt?: string | null): 'active' | 'expiring' | 'expired' => {
  if (!expiresAt) return 'active';
  const diff = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired';
  if (diff < 30) return 'expiring';
  return 'active';
};

export default function DocumentsScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const canManage = isOwner || isManager;
  const rid = user?.restaurantId ?? '';
  const uid = user?.id ?? '';

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [docs, setDocs] = useState<DbDocument[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DbDocument | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<'contract' | 'certificate' | 'attestation' | 'other'>('contract');
  const [docExpiry, setDocExpiry] = useState('');
  const [selEmployee, setSelEmployee] = useState('');
  const [pickedFile, setPickedFile] = useState<{ name: string; uri: string; mimeType: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const [d, emps] = await Promise.all([
      getDocuments(rid),
      canManage ? getEmployees(rid) : Promise.resolve([]),
    ]);
    setDocs(d);
    setEmployees(emps);
    setLoading(false);
  }, [rid, user]);

  useEffect(() => { load(); }, [load]);

  const myDocs = docs.filter((d) => d.employee_id === uid);
  const displayDocs = viewMode === 'my' ? myDocs : docs;
  const filtered = filter === 'all' ? displayDocs : displayDocs.filter((d) => d.status === filter);

  const expiringCount = (viewMode === 'my' ? myDocs : docs).filter((d) => d.status === 'expiring').length;
  const expiredCount = (viewMode === 'my' ? myDocs : docs).filter((d) => d.status === 'expired').length;

  const openCreate = () => {
    setEditingDoc(null);
    setDocName('');
    setDocType('contract');
    setDocExpiry('');
    setSelEmployee(canManage && employees.length > 0 ? employees[0].id : uid);
    setPickedFile(null);
    setShowModal(true);
  };

  const openEdit = (doc: DbDocument) => {
    setEditingDoc(doc);
    setDocName(doc.name);
    setDocType(doc.doc_type as any);
    setDocExpiry(doc.expires_at ?? '');
    setSelEmployee(doc.employee_id);
    setPickedFile(null);
    setShowModal(true);
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setPickedFile({ name: asset.name, uri: asset.uri, mimeType: asset.mimeType ?? 'application/octet-stream' });
        if (!docName) setDocName(asset.name.replace(/\.[^.]+$/, ''));
      }
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się wybrać pliku');
    }
  };

  const handleSave = async () => {
    if (!docName.trim()) return;
    setSaving(true);
    try {
      let fileUrl = editingDoc?.file_url ?? null;
      if (pickedFile) {
        const uploaded = await uploadDocumentFile(rid, pickedFile.name, pickedFile.uri, pickedFile.mimeType);
        if (uploaded) fileUrl = uploaded;
      }
      const status = computeStatus(docExpiry || null);
      if (editingDoc) {
        await updateDocument(editingDoc.id, {
          name: docName.trim(),
          doc_type: docType,
          file_url: fileUrl ?? undefined,
          expires_at: docExpiry || null,
          status,
        });
      } else {
        await createDocument(rid, {
          employee_id: canManage ? selEmployee : uid,
          name: docName.trim(),
          doc_type: docType,
          file_url: fileUrl ?? undefined,
          expires_at: docExpiry || undefined,
          uploaded_by: uid,
        });
      }
    } finally {
      setSaving(false);
      setShowModal(false);
      load();
    }
  };

  const handleDelete = (doc: DbDocument) => {
    Alert.alert('Usuń dokument', `Czy na pewno chcesz usunąć "${doc.name}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteDocument(doc.id); load(); } },
    ]);
  };

  const openFile = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Błąd', 'Nie można otworzyć pliku');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dokumenty</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Ionicons name="add" size={20} color={theme.colors.white} />
          <Text style={styles.addBtnText}>Dodaj</Text>
        </TouchableOpacity>
      </View>

      {canManage && (
        <View style={[styles.modeRow, isDesktop && styles.modeRowDesktop]}>
          {(['my', 'all'] as const).map((m) => (
            <TouchableOpacity key={m} style={[styles.modeBtn, viewMode === m && styles.modeBtnActive]} onPress={() => setViewMode(m)}>
              <Text style={[styles.modeBtnText, viewMode === m && styles.modeBtnTextActive]}>
                {m === 'my' ? 'Moje' : 'Wszystkich'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(expiringCount > 0 || expiredCount > 0) && (
        <View style={[styles.alertBox, isDesktop && styles.alertBoxDesktop]}>
          {expiringCount > 0 && (
            <View style={styles.alertRow}>
              <Ionicons name="warning" size={16} color="#F97316" />
              <Text style={styles.alertText}>{expiringCount} dokument(ów) wygasa wkrótce</Text>
            </View>
          )}
          {expiredCount > 0 && (
            <View style={styles.alertRow}>
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.alertText}>{expiredCount} dokument(ów) wygasło</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, isDesktop && styles.filtersDesktop]}>
        {[{ key: 'all', label: 'Wszystkie' }, { key: 'active', label: 'Aktywne' }, { key: 'expiring', label: 'Wygasające' }, { key: 'expired', label: 'Wygasłe' }].map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterBtn, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} style={isDesktop ? { width: '100%' } : undefined}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>Brak dokumentów</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
              <Text style={styles.emptyBtnText}>Dodaj dokument</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.map((doc) => {
          const st = STATUS_MAP[doc.status] ?? STATUS_MAP.active;
          const emp = employees.find((e) => e.id === doc.employee_id);
          const empName = emp ? `${emp.first_name} ${emp.last_name}` : '';
          return (
            <View key={doc.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={TYPE_ICON[doc.doc_type] as any ?? 'document-text'} size={20} color={st.color} />
              </View>
              <View style={styles.cardInfo}>
                {viewMode === 'all' && empName ? (
                  <Text style={styles.cardEmp}>{empName}</Text>
                ) : null}
                <Text style={styles.cardName}>{doc.name}</Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.typePill, { backgroundColor: theme.colors.background }]}>
                    <Text style={styles.typePillText}>{DOC_TYPES.find((t) => t.key === doc.doc_type)?.label ?? doc.doc_type}</Text>
                  </View>
                  {doc.expires_at && (
                    <Text style={[styles.cardExpiry, { color: st.color }]}>
                      <Ionicons name="time-outline" size={10} /> {doc.expires_at}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                <View style={styles.cardActions}>
                  {doc.file_url && (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openFile(doc.file_url!)}>
                      <Ionicons name="download-outline" size={17} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(doc)}>
                    <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(doc)}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={showModal} animationType="fade" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>{editingDoc ? 'Edytuj dokument' : 'Nowy dokument'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled">

              {/* Employee picker — managers only, create only */}
              {canManage && !editingDoc && employees.length > 0 && (
                <>
                  <Text style={mStyles.label}>PRACOWNIK</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {employees.map((e) => {
                      const active = selEmployee === e.id;
                      return (
                        <TouchableOpacity key={e.id} style={[mStyles.empChip, active && mStyles.empChipActive]} onPress={() => setSelEmployee(e.id)}>
                          <View style={[mStyles.empAvatar, { backgroundColor: active ? theme.colors.primary : e.avatar_color }]}>
                            <Text style={mStyles.empInitials}>{(e.first_name[0] + e.last_name[0]).toUpperCase()}</Text>
                          </View>
                          <View>
                            <Text style={[mStyles.empName, active && { color: theme.colors.primary }]}>{e.first_name} {e.last_name}</Text>
                            <Text style={mStyles.empJob}>{e.job_title}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text style={mStyles.label}>NAZWA DOKUMENTU</Text>
              <TextInput
                style={mStyles.input}
                value={docName}
                onChangeText={setDocName}
                placeholder="np. Umowa o pracę 2026"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={mStyles.label}>TYP DOKUMENTU</Text>
              <View style={mStyles.typeGrid}>
                {DOC_TYPES.map((t) => (
                  <TouchableOpacity key={t.key} style={[mStyles.typeBtn, docType === t.key && mStyles.typeBtnActive]} onPress={() => setDocType(t.key)}>
                    <Ionicons name={TYPE_ICON[t.key] as any} size={18} color={docType === t.key ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[mStyles.typeBtnText, docType === t.key && mStyles.typeBtnTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={mStyles.label}>DATA WAŻNOŚCI (opcjonalnie)</Text>
              <TextInput
                style={mStyles.input}
                value={docExpiry}
                onChangeText={setDocExpiry}
                placeholder="RRRR-MM-DD"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={mStyles.label}>PLIK</Text>
              <TouchableOpacity style={mStyles.filePicker} onPress={pickFile} activeOpacity={0.8}>
                <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.filePickerText}>
                    {pickedFile ? pickedFile.name : editingDoc?.file_url ? 'Kliknij, aby zmienić plik' : 'Wybierz plik z urządzenia'}
                  </Text>
                  {editingDoc?.file_url && !pickedFile && (
                    <Text style={mStyles.filePickerSub}>Aktualnie: plik załadowany</Text>
                  )}
                </View>
                {(pickedFile || editingDoc?.file_url) && (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.green} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[mStyles.saveBtn, (!docName.trim()) && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving || !docName.trim()}
                activeOpacity={0.85}
              >
                {saving ? (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <ActivityIndicator color={theme.colors.white} size="small" />
                    <Text style={mStyles.saveBtnText}>Zapisywanie...</Text>
                  </View>
                ) : (
                  <Text style={mStyles.saveBtnText}>{editingDoc ? 'Zapisz zmiany' : 'Dodaj dokument'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerDesktop: { maxWidth: 720, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.white },
  modeRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  modeRowDesktop: { maxWidth: 720, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32, marginHorizontal: 0 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  modeBtnActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  modeBtnTextActive: { color: theme.colors.primary },
  alertBox: { marginHorizontal: 16, padding: 12, backgroundColor: '#FFF8EE', borderRadius: theme.borderRadius.md, gap: 6, marginBottom: 8 },
  alertBoxDesktop: { maxWidth: 720, alignSelf: 'center' as const, width: '100%', marginHorizontal: 0, paddingHorizontal: 32 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertText: { fontSize: 13, color: theme.colors.text },
  filters: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filtersDesktop: { paddingHorizontal: 32 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.white },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  emptyBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardEmp: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, marginBottom: 2 },
  cardName: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border },
  typePillText: { fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary },
  cardExpiry: { fontSize: 11, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6, borderRadius: 8, backgroundColor: theme.colors.background },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '92%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  typeBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  typeBtnTextActive: { color: theme.colors.primary },
  filePicker: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.primary, borderStyle: 'dashed', backgroundColor: theme.colors.primaryLight },
  filePickerText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  filePickerSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  empChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: theme.colors.border },
  empChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  empAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  empJob: { fontSize: 11, color: theme.colors.textMuted },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 30 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});
