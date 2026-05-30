import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Platform, ScrollView, StyleSheet, Text,
    TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';

type DocType = {
  id: string; label: string; icon: string; color: string; bg: string;
  subtitle: string;
};

const DOC_TYPES: DocType[] = [
  { id: 'umowa_praca', label: 'Umowa o pracę', icon: 'document-text', color: theme.colors.primary, bg: theme.colors.primaryLight, subtitle: 'Czas nieokreślony / określony' },
  { id: 'umowa_zlecenie', label: 'Umowa zlecenie', icon: 'clipboard', color: '#059669', bg: '#D1FAE5', subtitle: 'Zleceniobiorca / zleceniodawca' },
  { id: 'umowa_dzielo', label: 'Umowa o dzieło', icon: 'construct', color: '#D97706', bg: '#FEF3C7', subtitle: 'Jednorazowe wykonanie dzieła' },
  { id: 'aneks', label: 'Aneks do umowy', icon: 'create', color: '#7C3AED', bg: '#EDE9FE', subtitle: 'Zmiana warunków zatrudnienia' },
  { id: 'wypowiedzenie', label: 'Wypowiedzenie', icon: 'close-circle', color: '#DC2626', bg: '#FEE2E2', subtitle: 'Rozwiązanie stosunku pracy' },
  { id: 'zaswiadczenie', label: 'Zaświadczenie', icon: 'ribbon', color: '#0891B2', bg: '#E0F2FE', subtitle: 'Potwierdzenie zatrudnienia' },
  { id: 'swiadectwo', label: 'Świadectwo pracy', icon: 'medal', color: '#65A30D', bg: '#ECFCCB', subtitle: 'Przy rozwiązaniu umowy' },
  { id: 'regulamin', label: 'Regulamin pracy', icon: 'list', color: '#9333EA', bg: '#F3E8FF', subtitle: 'Przepisy wewnętrzne' },
];

const MOCK_EMPLOYEES = [
  { id: '1', name: 'Jan Kowalski', role: 'Kucharz', initials: 'JK', color: '#2563EB' },
  { id: '2', name: 'Anna Malinowska', role: 'Kelnerka', initials: 'AM', color: '#7C3AED' },
  { id: '3', name: 'Piotr Sikora', role: 'Barman', initials: 'PS', color: '#059669' },
  { id: '4', name: 'Marta Nowak', role: 'Obsługa', initials: 'MN', color: '#D97706' },
  { id: '5', name: 'Krzysztof Wiśniewski', role: 'Kucharz', initials: 'KW', color: '#DC2626' },
];

export default function DocumentsAIScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pesel, setPesel] = useState('');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [contractPeriod, setContractPeriod] = useState<'nieokreślony' | 'określony'>('nieokreślony');

  const docType = DOC_TYPES.find(d => d.id === selectedDocType);
  const employee = MOCK_EMPLOYEES.find(e => e.id === selectedEmployee);

  const employeeName = newEmployee
    ? (firstName || lastName ? `${firstName} ${lastName}`.trim() : null)
    : employee?.name ?? null;

  const canGenerate = selectedDocType && (selectedEmployee || (newEmployee && firstName && lastName));

  const handleGenerate = () => {
    if (!canGenerate) return;
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2000);
  };

  const step1Done = !!selectedDocType;
  const step2Done = !!(selectedEmployee || (newEmployee && firstName && lastName));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.aiBadge}>
            <Ionicons name="sparkles" size={13} color="#7C3AED" />
            <Text style={s.aiBadgeText}>AI</Text>
          </View>
          <View>
            <Text style={s.title}>Dokumenty AI</Text>
            <Text style={s.subtitle}>Generowanie umów i dokumentów kadrowych</Text>
          </View>
        </View>
        <TouchableOpacity style={s.historyBtn} activeOpacity={0.7}>
          <Ionicons name="folder-open-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={s.historyText}>Historia</Text>
        </TouchableOpacity>
      </View>

      {/* Preview banner */}
      <View style={s.previewBanner}>
        <Ionicons name="flask-outline" size={14} color="#92400E" />
        <Text style={s.previewBannerText}>Wersja podglądowa — dane testowe, których nie można edytować. Generowanie dokumentów zostanie uruchomione wkrótce.</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        {/* STEP 1 — Document type */}
        <View style={s.step}>
          <View style={s.stepHeader}>
            <View style={[s.stepNum, step1Done && s.stepNumDone]}>
              {step1Done
                ? <Ionicons name="checkmark" size={14} color="#fff" />
                : <Text style={s.stepNumText}>1</Text>}
            </View>
            <Text style={s.stepTitle}>Wybierz typ dokumentu</Text>
          </View>

          <View style={s.docGrid}>
            {DOC_TYPES.map(dt => (
              <TouchableOpacity
                key={dt.id}
                style={[s.docCard, selectedDocType === dt.id && s.docCardActive, selectedDocType === dt.id && { borderColor: dt.color }]}
                onPress={() => { setSelectedDocType(dt.id); setGenerated(false); }}
                activeOpacity={0.8}
              >
                <View style={[s.docIcon, { backgroundColor: dt.bg }]}>
                  <Ionicons name={dt.icon as any} size={20} color={dt.color} />
                </View>
                <Text style={[s.docLabel, selectedDocType === dt.id && { color: dt.color }]}>{dt.label}</Text>
                <Text style={s.docSub} numberOfLines={1}>{dt.subtitle}</Text>
                {selectedDocType === dt.id && (
                  <View style={[s.docCheck, { backgroundColor: dt.color }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* STEP 2 — Employee */}
        <View style={s.step}>
          <View style={s.stepHeader}>
            <View style={[s.stepNum, step2Done && s.stepNumDone]}>
              {step2Done
                ? <Ionicons name="checkmark" size={14} color="#fff" />
                : <Text style={s.stepNumText}>2</Text>}
            </View>
            <Text style={s.stepTitle}>Pracownik</Text>
          </View>

          {/* Toggle */}
          <View style={s.empToggle}>
            <TouchableOpacity style={[s.empToggleBtn, !newEmployee && s.empToggleBtnActive]} onPress={() => { setNewEmployee(false); setGenerated(false); }} activeOpacity={0.8}>
              <Ionicons name="people-outline" size={15} color={!newEmployee ? theme.colors.primary : theme.colors.textMuted} />
              <Text style={[s.empToggleText, !newEmployee && s.empToggleTextActive]}>Z listy pracowników</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.empToggleBtn, newEmployee && s.empToggleBtnActive]} onPress={() => { setNewEmployee(true); setSelectedEmployee(null); setGenerated(false); }} activeOpacity={0.8}>
              <Ionicons name="person-add-outline" size={15} color={newEmployee ? theme.colors.primary : theme.colors.textMuted} />
              <Text style={[s.empToggleText, newEmployee && s.empToggleTextActive]}>Wpisz dane ręcznie</Text>
            </TouchableOpacity>
          </View>

          {!newEmployee ? (
            <View style={s.empList}>
              {MOCK_EMPLOYEES.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  style={[s.empChip, selectedEmployee === emp.id && s.empChipActive, selectedEmployee === emp.id && { borderColor: emp.color }]}
                  onPress={() => { setSelectedEmployee(emp.id); setGenerated(false); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.empAvatar, { backgroundColor: emp.color + '20' }]}>
                    <Text style={[s.empInitials, { color: emp.color }]}>{emp.initials}</Text>
                  </View>
                  <View>
                    <Text style={[s.empName, selectedEmployee === emp.id && { color: emp.color }]}>{emp.name}</Text>
                    <Text style={s.empRole}>{emp.role}</Text>
                  </View>
                  {selectedEmployee === emp.id && <Ionicons name="checkmark-circle" size={18} color={emp.color} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={s.manualForm}>
              <View style={s.formRow}>
                <View style={s.formHalf}>
                  <Text style={s.formLabel}>Imię *</Text>
                  <TextInput style={s.formInput} value={firstName} onChangeText={setFirstName} placeholder="Jan" placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={s.formHalf}>
                  <Text style={s.formLabel}>Nazwisko *</Text>
                  <TextInput style={s.formInput} value={lastName} onChangeText={setLastName} placeholder="Kowalski" placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>
              <View style={s.formRow}>
                <View style={s.formHalf}>
                  <Text style={s.formLabel}>PESEL</Text>
                  <TextInput style={s.formInput} value={pesel} onChangeText={setPesel} placeholder="00000000000" keyboardType="numeric" placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={s.formHalf}>
                  <Text style={s.formLabel}>Data urodzenia</Text>
                  <TextInput style={s.formInput} value={dateFrom} onChangeText={setDateFrom} placeholder="DD.MM.RRRR" placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>
              <Text style={s.formLabel}>Adres zamieszkania</Text>
              <TextInput style={s.formInput} value={address} onChangeText={setAddress} placeholder="ul. Przykładowa 1, 00-001 Warszawa" placeholderTextColor={theme.colors.textMuted} />
            </View>
          )}
        </View>

        {/* STEP 3 — Parameters */}
        <View style={s.step}>
          <View style={s.stepHeader}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>3</Text>
            </View>
            <Text style={s.stepTitle}>Parametry dokumentu</Text>
          </View>

          {selectedDocType === 'umowa_praca' && (
            <View style={s.periodToggle}>
              {(['nieokreślony', 'określony'] as const).map(p => (
                <TouchableOpacity key={p} style={[s.periodBtn, contractPeriod === p && s.periodBtnActive]} onPress={() => setContractPeriod(p)} activeOpacity={0.8}>
                  <Text style={[s.periodBtnText, contractPeriod === p && s.periodBtnTextActive]}>Czas {p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={s.formRow}>
            <View style={s.formHalf}>
              <Text style={s.formLabel}>Data od *</Text>
              <TextInput style={s.formInput} value={dateFrom} onChangeText={setDateFrom} placeholder="DD.MM.RRRR" placeholderTextColor={theme.colors.textMuted} />
            </View>
            {(selectedDocType !== 'umowa_praca' || contractPeriod === 'określony') && (
              <View style={s.formHalf}>
                <Text style={s.formLabel}>Data do</Text>
                <TextInput style={s.formInput} value={dateTo} onChangeText={setDateTo} placeholder="DD.MM.RRRR" placeholderTextColor={theme.colors.textMuted} />
              </View>
            )}
          </View>
          <View style={s.formRow}>
            <View style={s.formHalf}>
              <Text style={s.formLabel}>Stanowisko</Text>
              <TextInput style={s.formInput} value={position} onChangeText={setPosition} placeholder="np. Kucharz" placeholderTextColor={theme.colors.textMuted} />
            </View>
            <View style={s.formHalf}>
              <Text style={s.formLabel}>Wynagrodzenie (zł/mies.)</Text>
              <TextInput style={s.formInput} value={salary} onChangeText={setSalary} placeholder="np. 4500" keyboardType="numeric" placeholderTextColor={theme.colors.textMuted} />
            </View>
          </View>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[s.generateBtn, !canGenerate && s.generateBtnDisabled, generating && s.generateBtnLoading]}
          onPress={handleGenerate}
          activeOpacity={0.85}
          disabled={!canGenerate || generating}
        >
          <Ionicons name={generating ? 'hourglass' : 'sparkles'} size={18} color="#fff" />
          <Text style={s.generateBtnText}>
            {generating ? 'AI generuje dokument...' : 'Generuj dokument AI'}
          </Text>
        </TouchableOpacity>

        {/* Generated document preview */}
        {generated && docType && (
          <View style={s.previewWrapper}>
            {/* Preview header */}
            <View style={s.previewHeader}>
              <View style={[s.previewBadge, { backgroundColor: docType.bg }]}>
                <Ionicons name={docType.icon as any} size={14} color={docType.color} />
                <Text style={[s.previewBadgeText, { color: docType.color }]}>{docType.label}</Text>
              </View>
              <View style={[s.aiDoneBadge]}>
                <Ionicons name="sparkles" size={12} color="#7C3AED" />
                <Text style={s.aiDoneText}>Wygenerowano przez AI</Text>
              </View>
            </View>

            {/* Mock document */}
            <View style={s.documentPage}>
              <Text style={s.docPageTitle}>{docType.label.toUpperCase()}</Text>
              <Text style={s.docPageSubtitle}>
                Zawarta w dniu {dateFrom || '____.____.______'} w ____________________
              </Text>
              <View style={s.docDivider} />

              <Text style={s.docSection}>§ 1. Strony umowy</Text>
              <Text style={s.docText}>
                <Text style={s.docBold}>Pracodawca:</Text> Restauracja „ShiftApp" Sp. z o.o.,{'\n'}
                ul. Przykładowa 1, 00-001 Warszawa, NIP: 000-000-00-00
              </Text>
              <Text style={s.docText}>
                <Text style={s.docBold}>Pracownik:</Text> {employeeName ?? '________________________________'},{'\n'}
                PESEL: {pesel || '___________'},{'\n'}
                zamieszkały/a: {address || '________________________________'}
              </Text>

              <Text style={s.docSection}>§ 2. Przedmiot umowy</Text>
              <Text style={s.docText}>
                Pracodawca zatrudnia Pracownika na stanowisku{' '}
                <Text style={s.docBold}>{position || '________________'}</Text>
                {selectedDocType === 'umowa_praca'
                  ? ` na czas ${contractPeriod}${contractPeriod === 'określony' ? ` od ${dateFrom || '____'} do ${dateTo || '____'}` : ''}.`
                  : '.'}
              </Text>

              {salary ? (
                <>
                  <Text style={s.docSection}>§ 3. Wynagrodzenie</Text>
                  <Text style={s.docText}>
                    Strony ustalają wynagrodzenie miesięczne w wysokości{' '}
                    <Text style={s.docBold}>{salary} zł brutto</Text>.
                  </Text>
                </>
              ) : null}

              <Text style={s.docSection}>§ 4. Przepisy ogólne</Text>
              <Text style={s.docText}>
                W sprawach nieuregulowanych niniejszą umową zastosowanie mają przepisy Kodeksu Pracy
                oraz inne właściwe przepisy prawa polskiego.
              </Text>

              <View style={s.docSignatures}>
                <View style={s.docSignatureBlock}>
                  <View style={s.docSignatureLine} />
                  <Text style={s.docSignatureLabel}>Pracodawca</Text>
                </View>
                <View style={s.docSignatureBlock}>
                  <View style={s.docSignatureLine} />
                  <Text style={s.docSignatureLabel}>{employeeName ?? 'Pracownik'}</Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View style={s.docActions}>
              <TouchableOpacity style={[s.docActionBtn, { backgroundColor: theme.colors.primary }]} activeOpacity={0.85}>
                <Ionicons name="download-outline" size={17} color="#fff" />
                <Text style={s.docActionText}>Pobierz PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.docActionBtn, { backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border }]} activeOpacity={0.85}>
                <Ionicons name="print-outline" size={17} color={theme.colors.text} />
                <Text style={[s.docActionText, { color: theme.colors.text }]}>Drukuj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.docActionBtn, { backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border }]} activeOpacity={0.85}>
                <Ionicons name="mail-outline" size={17} color={theme.colors.text} />
                <Text style={[s.docActionText, { color: theme.colors.text }]}>Wyślij</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent documents */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ostatnio wygenerowane</Text>
          {[
            { name: 'Jan Kowalski', doc: 'Umowa o pracę', date: '28.05.2025', color: theme.colors.primary },
            { name: 'Anna Malinowska', doc: 'Zaświadczenie o zatrudnieniu', date: '20.05.2025', color: '#7C3AED' },
            { name: 'Piotr Sikora', doc: 'Aneks do umowy', date: '15.05.2025', color: '#059669' },
          ].map((item, i) => (
            <View key={i} style={s.historyRow}>
              <View style={[s.historyIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name="document-text" size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.historyDoc}>{item.doc}</Text>
                <Text style={s.historyName}>{item.name} · {item.date}</Text>
              </View>
              <TouchableOpacity style={s.historyDl} activeOpacity={0.7}>
                <Ionicons name="download-outline" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  aiBadgeText: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  historyText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  step: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, gap: 14, ...theme.shadows.card },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  stepNumDone: { backgroundColor: '#059669' },
  stepNumText: { fontSize: 13, fontWeight: '800', color: theme.colors.textSecondary },
  stepTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  docCard: {
    width: '47%', backgroundColor: theme.colors.surface,
    borderRadius: 12, padding: 12, gap: 6,
    borderWidth: 1.5, borderColor: 'transparent',
    position: 'relative',
  },
  docCardActive: { backgroundColor: theme.colors.card },
  docIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  docSub: { fontSize: 10, color: theme.colors.textMuted },
  docCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  empToggle: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 4, gap: 4 },
  empToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  empToggleBtnActive: { backgroundColor: theme.colors.card, ...theme.shadows.card },
  empToggleText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  empToggleTextActive: { color: theme.colors.primary },
  empList: { gap: 8 },
  empChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: 'transparent' },
  empChipActive: { backgroundColor: theme.colors.card },
  empAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 13, fontWeight: '800' },
  empName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empRole: { fontSize: 12, color: theme.colors.textMuted },
  manualForm: { gap: 10 },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1, gap: 4 },
  formLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  formInput: {
    backgroundColor: theme.colors.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: theme.colors.text,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  periodToggle: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 4, gap: 4, marginBottom: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: theme.colors.card, ...theme.shadows.card },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  periodBtnTextActive: { color: theme.colors.primary },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#7C3AED', paddingVertical: 15, borderRadius: 14,
  },
  generateBtnDisabled: { backgroundColor: theme.colors.border },
  generateBtnLoading: { backgroundColor: '#A78BFA' },
  generateBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  previewWrapper: { gap: 14 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  previewBadgeText: { fontSize: 12, fontWeight: '700' },
  aiDoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  aiDoneText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  documentPage: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    shadowColor: '#1A1D23', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
  },
  docPageTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, textAlign: 'center', letterSpacing: 1 },
  docPageSubtitle: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 18 },
  docDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  docSection: { fontSize: 13, fontWeight: '800', color: theme.colors.text, marginTop: 6 },
  docText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 20 },
  docBold: { fontWeight: '700', color: theme.colors.text },
  docSignatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 24 },
  docSignatureBlock: { flex: 1, alignItems: 'center', gap: 8 },
  docSignatureLine: { width: '100%', height: 1, backgroundColor: theme.colors.text },
  docSignatureLabel: { fontSize: 11, color: theme.colors.textMuted },
  docActions: { flexDirection: 'row', gap: 10 },
  docActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12 },
  docActionText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, ...theme.shadows.card },
  historyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  historyDoc: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  historyName: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  historyDl: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  previewBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  previewBannerText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 16 },
});
