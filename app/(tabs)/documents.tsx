import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { createDocument, createDocumentTemplate, deleteDocument, deleteDocumentTemplate, getDocumentTemplates, getDocuments, getEmployees, normalizeStorageUrl, updateDocument, updateDocumentTemplate, uploadDocumentFile, uploadTemplateFile } from '../../lib/db';
import type { DbDocument, DbDocumentTemplate, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

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
  const { user, restaurant, isOwner, isManager } = useAuth();
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

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<DbDocument | null>(null);

  // Section toggle
  const [section, setSection] = useState<'docs' | 'templates'>('docs');

  // Templates
  const [templates, setTemplates] = useState<DbDocumentTemplate[]>([]);
  const [showTplModal, setShowTplModal] = useState(false);
  const [editingTpl, setEditingTpl] = useState<DbDocumentTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplContent, setTplContent] = useState('');
  const [tplDocType, setTplDocType] = useState('contract');
  const [tplSaving, setTplSaving] = useState(false);
  const [tplFile, setTplFile] = useState<{ name: string; uri: string; mimeType: string } | null>(null);

  // Generate from template
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTemplate, setGenTemplate] = useState<DbDocumentTemplate | null>(null);
  const [genEmployee, setGenEmployee] = useState('');
  const [genVars, setGenVars] = useState<Record<string, string>>({});
  const [genPreview, setGenPreview] = useState('');
  const [genStep, setGenStep] = useState<'form' | 'preview'>('form');
  const [genSaving, setGenSaving] = useState(false);

  const load = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const [d, emps, tpls] = await Promise.all([
      getDocuments(rid),
      canManage ? getEmployees(rid) : Promise.resolve([]),
      canManage ? getDocumentTemplates(rid) : Promise.resolve([]),
    ]);
    setDocs(d);
    setEmployees(emps);
    setTemplates(tpls);
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
    if (!docName.trim()) {
      Alert.alert('Wymagane', 'Wpisz nazwę dokumentu.');
      return;
    }
    if (docExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(docExpiry)) {
      Alert.alert('Błędny format daty', 'Data ważności musi być w formacie RRRR-MM-DD, np. 2026-12-31');
      return;
    }
    setSaving(true);
    try {
      let fileUrl = editingDoc?.file_url ?? null;
      if (pickedFile) {
        const uploaded = await uploadDocumentFile(rid, pickedFile.name, pickedFile.uri, pickedFile.mimeType);
        if (uploaded) fileUrl = uploaded;
      }
      const status = computeStatus(docExpiry || null);
      let ok = false;
      if (editingDoc) {
        ok = await updateDocument(editingDoc.id, {
          name: docName.trim(),
          doc_type: docType,
          file_url: fileUrl ?? undefined,
          expires_at: docExpiry || null,
          status,
        });
      } else {
        const created = await createDocument(rid, {
          employee_id: canManage ? selEmployee : uid,
          name: docName.trim(),
          doc_type: docType,
          file_url: fileUrl ?? undefined,
          expires_at: docExpiry || undefined,
          uploaded_by: uid,
        });
        ok = !!created;
      }
      if (!ok) {
        Alert.alert('Błąd zapisu', 'Nie udało się zapisać dokumentu. Sprawdź uprawnienia i spróbuj ponownie.');
        return;
      }
      setShowModal(false);
      load();
    } catch (e) {
      Alert.alert('Błąd', 'Wystąpił nieoczekiwany błąd.');
    } finally {
      setSaving(false);
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
      await Linking.openURL(normalizeStorageUrl(url) ?? url);
    } catch {
      Alert.alert('Błąd', 'Nie można otworzyć pliku');
    }
  };

  // ── Template helpers ──────────────────────────────────────────────────────
  const extractVars = (content: string): string[] => {
    const matches = content.match(/\{\{([^}]+)\}\}/g) ?? [];
    const vars = matches.map((m) => m.replace(/^\{\{|\}\}$/g, '').trim());
    return [...new Set(vars)];
  };

  const autoFill = (vars: string[], emp: DbProfile): Record<string, string> => {
    const today = new Date().toLocaleDateString('pl-PL');
    const MAP: Record<string, string> = {
      imie_nazwisko: `${emp.first_name} ${emp.last_name}`,
      imie: emp.first_name,
      nazwisko: emp.last_name,
      stanowisko: emp.job_title ?? '',
      email: (emp as any).email ?? '',
      restauracja: restaurant?.name ?? '',
      data: today,
      data_dzisiaj: today,
      data_podpisania: today,
      rok: String(new Date().getFullYear()),
      miesiac: String(new Date().getMonth() + 1),
    };
    const result: Record<string, string> = {};
    vars.forEach((v) => { result[v] = MAP[v.toLowerCase()] ?? ''; });
    return result;
  };

  const fillTemplate = (content: string, vars: Record<string, string>): string => {
    let filled = content;
    Object.entries(vars).forEach(([k, v]) => {
      filled = filled.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    });
    return filled;
  };

  const openTplCreate = () => {
    setEditingTpl(null);
    setTplName('');
    setTplContent('');
    setTplDocType('contract');
    setTplFile(null);
    setShowTplModal(true);
  };

  const openTplEdit = (tpl: DbDocumentTemplate) => {
    setEditingTpl(tpl);
    setTplName(tpl.name);
    setTplContent(tpl.content);
    setTplDocType(tpl.doc_type);
    setTplFile(null);
    setShowTplModal(true);
  };

  const pickTplFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setTplFile({ name: asset.name, uri: asset.uri, mimeType: asset.mimeType ?? 'application/octet-stream' });
        if (!tplName) setTplName(asset.name.replace(/\.[^.]+$/, ''));
      }
    } catch {
      Alert.alert('Błąd', 'Nie udało się wybrać pliku');
    }
  };

  const handleTplSave = async () => {
    if (!tplName.trim()) {
      Alert.alert('Wymagane', 'Wpisz nazwę szablonu.');
      return;
    }
    if (!tplFile && !editingTpl?.file_url && !tplContent.trim()) {
      Alert.alert('Wymagane', 'Wgraj plik szablonu lub wpisz treść tekstową.');
      return;
    }
    setTplSaving(true);
    let fileUrl = editingTpl?.file_url ?? null;
    if (tplFile) {
      const uploaded = await uploadTemplateFile(rid, tplFile.name, tplFile.uri, tplFile.mimeType);
      if (uploaded) fileUrl = uploaded;
    }
    if (editingTpl) {
      await updateDocumentTemplate(editingTpl.id, { name: tplName.trim(), content: tplContent, doc_type: tplDocType, file_url: fileUrl ?? undefined });
    } else {
      await createDocumentTemplate(rid, { name: tplName.trim(), content: tplContent, doc_type: tplDocType, created_by: uid, file_url: fileUrl ?? undefined });
    }
    setTplSaving(false);
    setShowTplModal(false);
    load();
  };

  const handleTplDelete = (tpl: DbDocumentTemplate) => {
    Alert.alert('Usuń szablon', `Czy na pewno chcesz usunąć szablon "${tpl.name}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteDocumentTemplate(tpl.id); load(); } },
    ]);
  };

  const openGenerate = (tpl: DbDocumentTemplate) => {
    setGenTemplate(tpl);
    const vars = extractVars(tpl.content);
    const firstEmp = employees[0];
    const filled = firstEmp ? autoFill(vars, firstEmp) : Object.fromEntries(vars.map((v) => [v, '']));
    setGenEmployee(firstEmp?.id ?? '');
    setGenVars(filled);
    setGenPreview('');
    setGenStep('form');
    setShowGenModal(true);
  };

  const onGenEmpChange = (empId: string) => {
    setGenEmployee(empId);
    if (!genTemplate) return;
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    const vars = extractVars(genTemplate.content);
    setGenVars((prev) => {
      const auto = autoFill(vars, emp);
      const merged: Record<string, string> = {};
      vars.forEach((v) => {
        merged[v] = auto[v] || prev[v] || '';
      });
      return merged;
    });
  };

  const handleGeneratePreview = () => {
    if (!genTemplate) return;
    if (!genEmployee) { Alert.alert('Wymagane', 'Wybierz pracownika.'); return; }
    setGenPreview(genTemplate.content.trim() ? fillTemplate(genTemplate.content, genVars) : '');
    setGenStep('preview');
  };

  const handleSaveGenerated = async () => {
    if (!genTemplate || !genEmployee) return;
    setGenSaving(true);
    const emp = employees.find((e) => e.id === genEmployee);
    const docName = `${genTemplate.name} — ${emp ? `${emp.first_name} ${emp.last_name}` : ''} (${new Date().toLocaleDateString('pl-PL')})`;
    await createDocument(rid, {
      employee_id: genEmployee,
      name: docName,
      doc_type: genTemplate.doc_type as any,
      file_url: genTemplate.file_url ?? undefined,
      uploaded_by: uid,
    });
    setGenSaving(false);
    setShowGenModal(false);
    load();
    Alert.alert('Zapisano!', `Dokument "${docName}" jest dostępny w sekcji Dokumenty pracownika.${genTemplate.file_url ? '\n\nPlik szablonu został przypisany.' : ''}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dokumenty</Text>
        {canManage && (
          <TouchableOpacity
            onPress={section === 'templates' ? openTplCreate : openCreate}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={20} color={theme.colors.white} />
            <Text style={styles.addBtnText}>{section === 'templates' ? 'Szablon' : 'Dodaj'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section tabs */}
      {canManage && (
        <View style={styles.sectionTabs}>
          <TouchableOpacity
            style={[styles.sectionTab, section === 'docs' && styles.sectionTabActive]}
            onPress={() => setSection('docs')}
          >
            <Ionicons name="document-text-outline" size={15} color={section === 'docs' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.sectionTabText, section === 'docs' && styles.sectionTabTextActive]}>Dokumenty</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionTab, section === 'templates' && styles.sectionTabActive]}
            onPress={() => setSection('templates')}
          >
            <Ionicons name="copy-outline" size={15} color={section === 'templates' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.sectionTabText, section === 'templates' && styles.sectionTabTextActive]}>Szablony AI</Text>
            {templates.length > 0 && <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{templates.length}</Text></View>}
          </TouchableOpacity>
        </View>
      )}

      {section === 'docs' && (
        <>
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
        </>
      )}

      {/* ── Templates section ── */}
      {section === 'templates' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
          {/* Hint banner */}
          <View style={styles.tplHint}>
            <Ionicons name="sparkles" size={16} color="#7C3AED" />
            <Text style={styles.tplHintText}>Utwórz szablon z polami <Text style={{ fontWeight: '800' }}>{'{{'+'nazwa_pola'+'}}'}</Text>. AI automatycznie wypełni dane pracownika.</Text>
          </View>
          {templates.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="copy-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>Brak szablonów</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openTplCreate}>
                <Text style={styles.emptyBtnText}>Utwórz pierwszy szablon</Text>
              </TouchableOpacity>
            </View>
          ) : templates.map((tpl) => {
            const vars = extractVars(tpl.content);
            const typeLabel = DOC_TYPES.find((t) => t.key === tpl.doc_type)?.label ?? tpl.doc_type;
            return (
              <View key={tpl.id} style={styles.tplCard}>
                <View style={styles.tplCardTop}>
                  <View style={styles.tplIconWrap}>
                    <Ionicons name={TYPE_ICON[tpl.doc_type] as any ?? 'document-text'} size={20} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tplName}>{tpl.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={styles.tplMeta}>{typeLabel} · {vars.length} zmiennych</Text>
                      {tpl.file_url ? (
                        <View style={styles.tplFileBadge}>
                          <Ionicons name="attach" size={11} color="#7C3AED" />
                          <Text style={styles.tplFileBadgeText}>Plik</Text>
                        </View>
                      ) : (
                        <View style={[styles.tplFileBadge, { backgroundColor: '#FFF8EE', borderColor: '#FED7AA' }]}>
                          <Ionicons name="alert-circle-outline" size={11} color="#F97316" />
                          <Text style={[styles.tplFileBadgeText, { color: '#F97316' }]}>Brak pliku</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openTplEdit(tpl)}>
                    <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleTplDelete(tpl)}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                {vars.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tplVarsRow}>
                    {vars.map((v) => (
                      <View key={v} style={styles.tplVarChip}>
                        <Text style={styles.tplVarText}>{'{{'}{v}{'}}'}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity style={styles.tplGenBtn} onPress={() => openGenerate(tpl)} activeOpacity={0.85}>
                  <Ionicons name="sparkles" size={15} color="#fff" />
                  <Text style={styles.tplGenBtnText}>Generuj dokument dla pracownika</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Docs section ── */}
      {section === 'docs' && (
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
            <TouchableOpacity key={doc.id} style={styles.card} onPress={() => setPreviewDoc(doc)} activeOpacity={0.75}>
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
                    <TouchableOpacity style={styles.iconBtn} onPress={(e) => { (e as any).stopPropagation?.(); openFile(doc.file_url!); }}>
                      <Ionicons name="download-outline" size={17} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                  {canManage && (
                    <TouchableOpacity style={styles.iconBtn} onPress={(e) => { (e as any).stopPropagation?.(); openEdit(doc); }}>
                      <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  {canManage && (
                    <TouchableOpacity style={styles.iconBtn} onPress={(e) => { (e as any).stopPropagation?.(); handleDelete(doc); }}>
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      )}

      {/* Preview Modal */}
      <Modal visible={!!previewDoc} animationType="slide" transparent onRequestClose={() => setPreviewDoc(null)}>
        <View style={pStyles.overlay}>
          <View style={pStyles.sheet}>
            {previewDoc && (() => {
              const st = STATUS_MAP[previewDoc.status] ?? STATUS_MAP.active;
              const emp = employees.find((e) => e.id === previewDoc.employee_id);
              const uploader = employees.find((e) => e.id === previewDoc.uploaded_by);
              const typeName = DOC_TYPES.find((t) => t.key === previewDoc.doc_type)?.label ?? previewDoc.doc_type;
              return (
                <>
                  <View style={pStyles.handle} />
                  <View style={pStyles.iconWrap}>
                    <View style={[pStyles.bigIcon, { backgroundColor: st.bg }]}>
                      <Ionicons name={TYPE_ICON[previewDoc.doc_type] as any ?? 'document-text'} size={32} color={st.color} />
                    </View>
                    <View style={[pStyles.statusBadge, { backgroundColor: st.bg }]}>
                      <Ionicons name={st.icon as any} size={12} color={st.color} />
                      <Text style={[pStyles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>

                  <Text style={pStyles.docName}>{previewDoc.name}</Text>
                  <Text style={pStyles.docType}>{typeName}</Text>

                  <View style={pStyles.infoSection}>
                    {emp && (
                      <View style={pStyles.infoRow}>
                        <Ionicons name="person-outline" size={15} color={theme.colors.textMuted} />
                        <Text style={pStyles.infoLabel}>Pracownik</Text>
                        <Text style={pStyles.infoValue}>{emp.first_name} {emp.last_name}</Text>
                      </View>
                    )}
                    {uploader && (
                      <View style={pStyles.infoRow}>
                        <Ionicons name="cloud-upload-outline" size={15} color={theme.colors.textMuted} />
                        <Text style={pStyles.infoLabel}>Dodał</Text>
                        <Text style={pStyles.infoValue}>{uploader.first_name} {uploader.last_name}</Text>
                      </View>
                    )}
                    {previewDoc.expires_at && (
                      <View style={pStyles.infoRow}>
                        <Ionicons name="time-outline" size={15} color={st.color} />
                        <Text style={pStyles.infoLabel}>Ważny do</Text>
                        <Text style={[pStyles.infoValue, { color: st.color, fontWeight: '700' }]}>{previewDoc.expires_at}</Text>
                      </View>
                    )}
                    <View style={pStyles.infoRow}>
                      <Ionicons name="calendar-outline" size={15} color={theme.colors.textMuted} />
                      <Text style={pStyles.infoLabel}>Dodano</Text>
                      <Text style={pStyles.infoValue}>{new Date(previewDoc.created_at).toLocaleDateString('pl-PL')}</Text>
                    </View>
                    <View style={pStyles.infoRow}>
                      <Ionicons name="attach-outline" size={15} color={theme.colors.textMuted} />
                      <Text style={pStyles.infoLabel}>Plik</Text>
                      <Text style={pStyles.infoValue}>{previewDoc.file_url ? 'Załadowany' : 'Brak pliku'}</Text>
                    </View>
                  </View>

                  <View style={pStyles.actions}>
                    {previewDoc.file_url && (
                      <TouchableOpacity style={pStyles.btnPrimary} onPress={() => openFile(previewDoc.file_url!)} activeOpacity={0.85}>
                        <Ionicons name="download-outline" size={17} color="#fff" />
                        <Text style={pStyles.btnPrimaryText}>Otwórz plik</Text>
                      </TouchableOpacity>
                    )}
                    {canManage && (
                      <View style={pStyles.btnRow}>
                        <TouchableOpacity style={pStyles.btnSecondary} onPress={() => { setPreviewDoc(null); openEdit(previewDoc); }} activeOpacity={0.8}>
                          <Ionicons name="pencil-outline" size={15} color={theme.colors.primary} />
                          <Text style={pStyles.btnSecondaryText}>Edytuj</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={pStyles.btnDanger} onPress={() => { setPreviewDoc(null); handleDelete(previewDoc); }} activeOpacity={0.8}>
                          <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
                          <Text style={pStyles.btnDangerText}>Usuń</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TouchableOpacity style={pStyles.btnClose} onPress={() => setPreviewDoc(null)} activeOpacity={0.8}>
                      <Text style={pStyles.btnCloseText}>Zamknij</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

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
                style={[mStyles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving}
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
      {/* ── Template Editor Modal ── */}
      <Modal visible={showTplModal} animationType="fade" transparent onRequestClose={() => setShowTplModal(false)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, { maxHeight: '95%' }]}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>{editingTpl ? 'Edytuj szablon' : 'Nowy szablon'}</Text>
              <TouchableOpacity onPress={() => setShowTplModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled">
              <Text style={mStyles.label}>NAZWA SZABLONU</Text>
              <TextInput
                style={mStyles.input}
                value={tplName}
                onChangeText={setTplName}
                placeholder="np. Umowa o pracę"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={mStyles.label}>TYP DOKUMENTU</Text>
              <View style={mStyles.typeGrid}>
                {DOC_TYPES.map((t) => (
                  <TouchableOpacity key={t.key} style={[mStyles.typeBtn, tplDocType === t.key && mStyles.typeBtnActive]} onPress={() => setTplDocType(t.key)}>
                    <Ionicons name={TYPE_ICON[t.key] as any} size={18} color={tplDocType === t.key ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[mStyles.typeBtnText, tplDocType === t.key && mStyles.typeBtnTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={mStyles.label}>PLIK SZABLONU (PDF, DOCX, XLSX...)</Text>
              <TouchableOpacity style={mStyles.filePicker} onPress={pickTplFile} activeOpacity={0.8}>
                <Ionicons name="cloud-upload-outline" size={22} color="#7C3AED" />
                <View style={{ flex: 1 }}>
                  <Text style={[mStyles.filePickerText, { color: '#7C3AED' }]}>
                    {tplFile ? tplFile.name : editingTpl?.file_url ? 'Kliknij, aby zmienić plik' : 'Wgraj plik szablonu (PDF, DOCX, XLSX)'}
                  </Text>
                  {editingTpl?.file_url && !tplFile && (
                    <Text style={mStyles.filePickerSub}>Aktualnie: plik załadowany</Text>
                  )}
                </View>
                {(tplFile || editingTpl?.file_url) && (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.green} />
                )}
              </TouchableOpacity>
              {editingTpl?.file_url && !tplFile && (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }} onPress={() => openFile(editingTpl.file_url!)}>
                  <Ionicons name="eye-outline" size={14} color={theme.colors.primary} />
                  <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>Podgląd aktualnego pliku</Text>
                </TouchableOpacity>
              )}

              <Text style={mStyles.label}>TREŚĆ SZABLONU (opcjonalne — dla zmiennych)</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 8 }}>
                Użyj {'{{nazwa_pola}}'} dla zmiennych. Np. {'{{imie_nazwisko}}'}, {'{{stanowisko}}'}, {'{{wynagrodzenie}}'}.
              </Text>
              <TextInput
                style={[mStyles.input, { minHeight: 200, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 }]}
                value={tplContent}
                onChangeText={setTplContent}
                multiline
                placeholder={'Umowa o pracę\n\nZawarta dnia {{data}} pomiędzy:\n{{restauracja}}\na pracownikiem:\n{{imie_nazwisko}}, {{stanowisko}}\n\nWynagrodzenie: {{wynagrodzenie}} PLN brutto\n...'}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 6, marginTop: 2 }}>
                Opcjonalne: wpisz treść z {'{{zmiennymi}}'} jeśli chcesz wypełniać dane pracownika automatycznie.
              </Text>

              {tplContent.length > 0 && (() => {
                const vars = extractVars(tplContent);
                return vars.length > 0 ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[mStyles.label, { marginTop: 0 }]}>WYKRYTE ZMIENNE ({vars.length})</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {vars.map((v) => (
                        <View key={v} style={tplStyles.varChip}>
                          <Text style={tplStyles.varChipText}>{'{{'}{v}{'}}'}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null;
              })()}

              <TouchableOpacity
                style={[mStyles.saveBtn, tplSaving && { opacity: 0.5 }]}
                onPress={handleTplSave}
                disabled={tplSaving}
                activeOpacity={0.85}
              >
                {tplSaving ? <ActivityIndicator color={theme.colors.white} size="small" /> : (
                  <Text style={mStyles.saveBtnText}>{editingTpl ? 'Zapisz zmiany' : 'Zapisz szablon'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Generate Document Modal ── */}
      <Modal visible={showGenModal} animationType="fade" transparent onRequestClose={() => setShowGenModal(false)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, { maxHeight: '95%' }]}>
            <View style={mStyles.mHeader}>
              <TouchableOpacity onPress={() => genStep === 'preview' ? setGenStep('form') : setShowGenModal(false)}>
                <Ionicons name={genStep === 'preview' ? 'arrow-back' : 'close'} size={22} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={mStyles.mTitle}>{genStep === 'preview' ? 'Podgląd dokumentu' : 'Generuj dokument'}</Text>
              <View style={{ width: 28 }} />
            </View>

            {genStep === 'form' ? (
              <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled">
                {genTemplate && (
                  <View style={tplStyles.genTemplateInfo}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="copy-outline" size={15} color="#7C3AED" />
                        <Text style={tplStyles.genTemplateName}>{genTemplate.name}</Text>
                      </View>
                      {genTemplate.file_url ? (
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }} onPress={() => openFile(genTemplate.file_url!)}>
                          <Ionicons name="document-outline" size={13} color={theme.colors.primary} />
                          <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>Podgląd pliku szablonu</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ fontSize: 11, color: '#F97316', marginTop: 4 }}>Ten szablon nie ma wgranego pliku. Zostanie wygenerowany dokument tekstowy.</Text>
                      )}
                    </View>
                  </View>
                )}

                <Text style={mStyles.label}>WYBIERZ PRACOWNIKA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {employees.map((e) => {
                    const active = genEmployee === e.id;
                    return (
                      <TouchableOpacity key={e.id} style={[mStyles.empChip, active && mStyles.empChipActive]} onPress={() => onGenEmpChange(e.id)}>
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

                {Object.keys(genVars).length > 0 && (
                  <>
                    <Text style={mStyles.label}>UZUPEŁNIJ ZMIENNE</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 10 }}>Pola zaznaczone na zielono zostały wypełnione automatycznie.</Text>
                    {Object.entries(genVars).map(([key, val]) => (
                      <View key={key} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>{'{{'}{key}{'}}'}</Text>
                          {val ? <Ionicons name="checkmark-circle" size={13} color={theme.colors.green} /> : <Ionicons name="alert-circle" size={13} color="#F97316" />}
                        </View>
                        <TextInput
                          style={[mStyles.input, val ? { borderColor: theme.colors.green, borderWidth: 1.5 } : {}]}
                          value={val}
                          onChangeText={(t) => setGenVars((p) => ({ ...p, [key]: t }))}
                          placeholder={`Wpisz ${key}...`}
                          placeholderTextColor={theme.colors.textMuted}
                        />
                      </View>
                    ))}
                  </>
                )}

                <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: '#7C3AED' }]} onPress={handleGeneratePreview} activeOpacity={0.85}>
                  <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={mStyles.saveBtnText}>{genTemplate?.file_url && !genTemplate?.content?.trim() ? 'Dalej — przypisz plik' : 'Generuj podgląd'}</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView style={mStyles.body}>
                {genTemplate?.file_url && (
                  <TouchableOpacity
                    style={[pStyles.btnPrimary, { marginBottom: 12 }]}
                    onPress={() => openFile(genTemplate.file_url!)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-outline" size={17} color="#fff" />
                    <Text style={pStyles.btnPrimaryText}>Otwórz plik szablonu</Text>
                  </TouchableOpacity>
                )}
                {genPreview ? (
                  <View style={tplStyles.previewBox}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8 }}>WYPEŁNIONE DANE</Text>
                    <Text style={tplStyles.previewText}>{genPreview}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[mStyles.saveBtn, genSaving && { opacity: 0.5 }]}
                  onPress={handleSaveGenerated}
                  disabled={genSaving}
                  activeOpacity={0.85}
                >
                  {genSaving ? <ActivityIndicator color={theme.colors.white} size="small" /> : (
                    <Text style={mStyles.saveBtnText}>Zapisz dokument dla pracownika</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.white },
  modeRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  modeRowDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  modeBtnActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  modeBtnTextActive: { color: theme.colors.primary },
  alertBox: { marginHorizontal: 16, padding: 12, backgroundColor: '#FFF8EE', borderRadius: theme.borderRadius.md, gap: 6, marginBottom: 8 },
  alertBoxDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertText: { fontSize: 13, color: theme.colors.text },
  filters: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filtersDesktop: { paddingHorizontal: 32 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.white },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
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

  sectionTabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, gap: 6 },
  sectionTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 12, backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.border },
  sectionTabActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  sectionTabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  sectionTabTextActive: { color: theme.colors.primary },
  sectionBadge: { backgroundColor: theme.colors.primary, borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  sectionBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  tplHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F3F0FF', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#DDD6FE' },
  tplHintText: { flex: 1, fontSize: 12, color: '#5B21B6', lineHeight: 18 },
  tplCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 12, gap: 10 },
  tplCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tplIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center' },
  tplName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  tplMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  tplVarsRow: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  tplVarChip: { backgroundColor: '#F3F0FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#DDD6FE' },
  tplVarText: { fontSize: 11, fontWeight: '700', color: '#7C3AED', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  tplGenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', borderRadius: theme.borderRadius.md, paddingVertical: 11 },
  tplGenBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  tplFileBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F0FF', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#DDD6FE' },
  tplFileBadgeText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
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

const pStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, paddingHorizontal: 24, paddingTop: 12, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: 20 },
  iconWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  bigIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },
  docName: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  docType: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 20 },
  infoSection: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 4, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { fontSize: 13, color: theme.colors.textSecondary, width: 90 },
  infoValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text, flex: 1 },
  actions: { gap: 10 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: theme.borderRadius.md, paddingVertical: 12, borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  btnDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: theme.borderRadius.md, paddingVertical: 12, borderWidth: 1.5, borderColor: theme.colors.error, backgroundColor: theme.colors.errorLight },
  btnDangerText: { fontSize: 14, fontWeight: '600', color: theme.colors.error },
  btnClose: { alignItems: 'center', paddingVertical: 12 },
  btnCloseText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
});

const tplStyles = StyleSheet.create({
  varChip: { backgroundColor: '#F3F0FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#DDD6FE' },
  varChipText: { fontSize: 11, fontWeight: '700', color: '#7C3AED', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  genTemplateInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F0FF', borderRadius: 8, padding: 10, marginBottom: 8 },
  genTemplateName: { fontSize: 13, fontWeight: '700', color: '#5B21B6' },
  previewBox: { backgroundColor: theme.colors.background, borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  previewText: { fontSize: 13, color: theme.colors.text, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
