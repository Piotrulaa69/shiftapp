import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import type { RestaurantSettings, ShiftTypeRow } from '../../lib/db';
import { deleteShiftType, getRestaurantSettings, getShiftTypes, updateRestaurant, upsertRestaurantSettings, upsertShiftType } from '../../lib/db';
import { theme } from '../../styles/theme';

const SECTION_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  restaurant: { icon: 'restaurant-outline', color: '#2563EB', bg: '#EFF6FF' },
  staffing: { icon: 'people-outline', color: '#0891B2', bg: '#ECFEFF' },
  availability: { icon: 'calendar-outline', color: '#7C3AED', bg: '#F5F3FF' },
  schedule: { icon: 'grid-outline', color: '#D97706', bg: '#FEF3C7' },
  shifts: { icon: 'time-outline', color: '#059669', bg: '#ECFDF5' },
  ai: { icon: 'sparkles-outline', color: '#DB2777', bg: '#FDF2F8' },
};

const SHIFT_COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#374151'];

function SectionCard({ icon, color, bg, title, children }: { icon: string; color: string; bg: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={s.sectionCard}>
      <TouchableOpacity style={s.sectionHeader} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <View style={[s.sectionIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
      {open && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
}

function ToggleRow({ label, sub, value, onChange, disabled }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        {sub ? <Text style={s.toggleSub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.white}
        disabled={disabled}
      />
    </View>
  );
}

function NumericRow({ label, sub, value, onChange, unit, min, max }: { label: string; sub?: string; value: number; onChange: (v: number) => void; unit?: string; min?: number; max?: number }) {
  return (
    <View style={s.numericRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        {sub ? <Text style={s.toggleSub}>{sub}</Text> : null}
      </View>
      <View style={s.numericControls}>
        <TouchableOpacity style={s.numBtn} onPress={() => onChange(Math.max(min ?? 0, value - 1))} activeOpacity={0.7}>
          <Ionicons name="remove" size={16} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.numValue}>{value}{unit ? ` ${unit}` : ''}</Text>
        <TouchableOpacity style={s.numBtn} onPress={() => onChange(Math.min(max ?? 999, value + 1))} activeOpacity={0.7}>
          <Ionicons name="add" size={16} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const steps = [0, 20, 40, 60, 80, 100];
  return (
    <View style={s.sliderRow}>
      <View style={s.sliderTop}>
        <Text style={s.toggleLabel}>{label}</Text>
        <View style={[s.sliderBadge, { backgroundColor: value >= 70 ? theme.colors.greenLight : value >= 40 ? theme.colors.primaryLight : theme.colors.surface }]}>
          <Text style={[s.sliderBadgeText, { color: value >= 70 ? theme.colors.green : value >= 40 ? theme.colors.primary : theme.colors.textMuted }]}>{value}</Text>
        </View>
      </View>
      <View style={s.sliderSteps}>
        {steps.map((step) => (
          <TouchableOpacity key={step} onPress={() => onChange(step)} activeOpacity={0.7}
            style={[s.sliderStep, value >= step && s.sliderStepActive, value === step && s.sliderStepCurrent]}>
            <Text style={[s.sliderStepText, value === step && s.sliderStepTextActive]}>{step}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, restaurant, refreshRestaurant, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert } = useAlert();
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  // ── Restaurant basic info ──
  const [rName, setRName] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rSaving, setRSaving] = useState(false);
  const [rSaved, setRSaved] = useState(false);

  // ── Restaurant settings ──
  const [rs, setRs] = useState<RestaurantSettings | null>(null);
  const [rsSaving, setRsSaving] = useState(false);
  const [rsSaved, setRsSaved] = useState(false);

  // ── Shift types ──
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeRow[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Partial<ShiftTypeRow> | null>(null);
  const [stName, setStName] = useState('');
  const [stColor, setStColor] = useState('#2563EB');
  const [stStart, setStStart] = useState('08:00');
  const [stEnd, setStEnd] = useState('16:00');

  useEffect(() => {
    if (restaurant) {
      setRName(restaurant.name || '');
      setRAddress(restaurant.address || '');
      setRPhone(restaurant.phone || '');
    }
  }, [restaurant]);

  useEffect(() => {
    if (!rid) return;
    Promise.all([getRestaurantSettings(rid), getShiftTypes(rid)]).then(([cfg, st]) => {
      setRs(cfg);
      setShiftTypes(st);
    });
  }, [rid]);

  const update = (key: keyof RestaurantSettings, val: any) => {
    setRs((prev) => prev ? { ...prev, [key]: val } : prev);
  };

  const saveRestaurant = async () => {
    if (!rName.trim()) { showAlert('Błąd', 'Nazwa restauracji jest wymagana'); return; }
    setRSaving(true);
    const ok = await updateRestaurant(rid, { name: rName, address: rAddress, phone: rPhone });
    setRSaving(false);
    if (ok) { setRSaved(true); refreshRestaurant(); setTimeout(() => setRSaved(false), 2000); }
    else showAlert('Błąd', 'Nie udało się zapisać ustawień');
  };

  const saveSettings = async () => {
    if (!rs) return;
    setRsSaving(true);
    const ok = await upsertRestaurantSettings(rid, rs);
    setRsSaving(false);
    if (ok) { setRsSaved(true); setTimeout(() => setRsSaved(false), 2000); }
    else showAlert('Błąd', 'Nie udało się zapisać konfiguracji');
  };

  const openNewShift = () => {
    setEditingShift(null);
    setStName(''); setStColor('#2563EB'); setStStart('08:00'); setStEnd('16:00');
    setShowShiftModal(true);
  };

  const openEditShift = (st: ShiftTypeRow) => {
    setEditingShift(st);
    setStName(st.name); setStColor(st.color); setStStart(st.start_time); setStEnd(st.end_time);
    setShowShiftModal(true);
  };

  const saveShift = async () => {
    if (!stName.trim()) return;
    setShiftLoading(true);
    const start = stStart, end = stEnd;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 10) / 10;
    const saved = await upsertShiftType(rid, { ...(editingShift?.id ? { id: editingShift.id } : {}), name: stName, color: stColor, start_time: start, end_time: end, hours: hours > 0 ? hours : 8 });
    setShiftLoading(false);
    if (saved) {
      setShiftTypes((prev) => editingShift?.id ? prev.map((x) => x.id === saved.id ? saved : x) : [...prev, saved]);
      setShowShiftModal(false);
    }
  };

  const removeShift = (id: string) => {
    Alert.alert('Usuń typ zmiany', 'Czy na pewno chcesz usunąć ten typ zmiany?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await deleteShiftType(id);
        setShiftTypes((prev) => prev.filter((x) => x.id !== id));
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ustawienia restauracji</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>

        {/* ── 1. Dane restauracji ── */}
        <SectionCard {...SECTION_ICONS.restaurant} title="Dane restauracji">
          <Text style={s.label}>Nazwa restauracji</Text>
          <TextInput style={s.input} value={rName} onChangeText={setRName} placeholder="Nazwa restauracji" placeholderTextColor={theme.colors.textMuted} />
          <Text style={s.label}>Adres</Text>
          <TextInput style={s.input} value={rAddress} onChangeText={setRAddress} placeholder="ul. Przykładowa 1, Warszawa" placeholderTextColor={theme.colors.textMuted} />
          <Text style={s.label}>Telefon</Text>
          <TextInput style={s.input} value={rPhone} onChangeText={setRPhone} placeholder="+48 000 000 000" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Plan</Text>
            <View style={[s.planBadge, restaurant?.plan === 'premium' && s.planPremium]}>
              <Text style={[s.planText, restaurant?.plan === 'premium' && s.planPremiumText]}>{restaurant?.plan === 'premium' ? '⭐ Premium' : 'Basic'}</Text>
            </View>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Data utworzenia</Text>
            <Text style={s.infoValue}>{restaurant?.createdAt?.slice(0, 10)}</Text>
          </View>
          {canManage && (
            <TouchableOpacity style={[s.saveBtn, (!rName.trim() || rSaving) && { opacity: 0.6 }]} onPress={saveRestaurant} disabled={rSaving || !rName.trim()} activeOpacity={0.85}>
              {rSaving ? <ActivityIndicator color={theme.colors.white} /> : rSaved
                ? <><Ionicons name="checkmark" size={18} color={theme.colors.white} /><Text style={s.saveBtnText}>Zapisano</Text></>
                : <><Ionicons name="save-outline" size={18} color={theme.colors.white} /><Text style={s.saveBtnText}>Zapisz dane</Text></>}
            </TouchableOpacity>
          )}
        </SectionCard>

        {rs && canManage && (
          <>
            {/* ── 2. Minimalna obsada ── */}
            <SectionCard {...SECTION_ICONS.staffing} title="Minimalna obsada">
              <Text style={s.infoValue}>Konfiguracja minimalnej obsady per stanowisko i dzień tygodnia. Używana przez AI przy generowaniu grafiku.</Text>
              <View style={[s.infoRow, { marginTop: 12 }]}>
                <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
                <Text style={[s.infoValue, { flex: 1 }]}>Zaawansowana konfiguracja obsady dostępna po uruchomieniu modułu AI Grafik.</Text>
              </View>
            </SectionCard>

            {/* ── 3. Zasady dyspozycyjności ── */}
            <SectionCard {...SECTION_ICONS.availability} title="Zasady dyspozycyjności">
              <ToggleRow
                label="Umowy — zawsze dostępni"
                sub="Pracownicy na umowie traktowani jako zawsze dostępni"
                value={rs.availability_contract_all_available}
                onChange={(v) => update('availability_contract_all_available', v)}
              />
              <ToggleRow
                label="Freelance — zawsze dostępni"
                sub="Freelancerzy traktowani jako zawsze dostępni"
                value={rs.availability_freelance_all_available}
                onChange={(v) => update('availability_freelance_all_available', v)}
              />
              <ToggleRow
                label="Wymagaj powodu niedostępności"
                sub="Pracownik musi podać powód przy zgłoszeniu niedostępności"
                value={rs.availability_require_unavailability_reason}
                onChange={(v) => update('availability_require_unavailability_reason', v)}
              />
              <ToggleRow
                label="Zatwierdzenie managera"
                sub="Niedostępność wymaga zatwierdzenia przez managera"
                value={rs.availability_require_manager_approval}
                onChange={(v) => update('availability_require_manager_approval', v)}
              />
              <ToggleRow
                label="Freelance — samodzielne raportowanie"
                sub="Freelancerzy mogą samodzielnie zgłaszać dostępność"
                value={rs.availability_freelance_self_report}
                onChange={(v) => update('availability_freelance_self_report', v)}
              />
              <ToggleRow
                label="Freelance — bez zatwierdzenia"
                sub="Dyspozycyjność freelancerów nie wymaga zatwierdzenia"
                value={rs.availability_freelance_no_approval}
                onChange={(v) => update('availability_freelance_no_approval', v)}
              />
            </SectionCard>

            {/* ── 4. Reguły grafiku ── */}
            <SectionCard {...SECTION_ICONS.schedule} title="Reguły grafiku">
              <NumericRow
                label="Maks. dni z rzędu"
                sub="Maksymalna liczba kolejnych dni pracy"
                value={rs.max_consecutive_days}
                onChange={(v) => update('max_consecutive_days', v)}
                unit="dni" min={1} max={14}
              />
              <NumericRow
                label="Min. dzień odpoczynku"
                sub="Minimalna liczba dni wolnych po bloku pracy"
                value={rs.min_rest_day_after}
                onChange={(v) => update('min_rest_day_after', v)}
                unit="dni" min={0} max={7}
              />
              <NumericRow
                label="Min. przerwa między zmianami"
                sub="Minimalna liczba godzin między końcem a początkiem zmiany"
                value={rs.min_hours_between_shifts}
                onChange={(v) => update('min_hours_between_shifts', v)}
                unit="h" min={6} max={24}
              />
              <NumericRow
                label="Maks. godzin tygodniowo"
                value={rs.max_hours_weekly}
                onChange={(v) => update('max_hours_weekly', v)}
                unit="h" min={8} max={168}
              />
              <NumericRow
                label="Maks. godzin miesięcznie"
                value={rs.max_hours_monthly}
                onChange={(v) => update('max_hours_monthly', v)}
                unit="h" min={40} max={720}
              />
              <ToggleRow
                label="Zakaz open+close"
                sub="Ten sam pracownik nie może mieć otwarcia i zamknięcia z rzędu"
                value={rs.prevent_opening_closing}
                onChange={(v) => update('prevent_opening_closing', v)}
              />
            </SectionCard>

            {/* ── 5. Typy zmian ── */}
            <SectionCard {...SECTION_ICONS.shifts} title="Typy zmian">
              {shiftTypes.length === 0 && (
                <Text style={s.emptyText}>Brak zdefiniowanych typów zmian. Dodaj pierwszy typ.</Text>
              )}
              {shiftTypes.map((st) => (
                <View key={st.id} style={s.shiftTypeRow}>
                  <View style={[s.shiftColorDot, { backgroundColor: st.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.shiftTypeName}>{st.name}</Text>
                    <Text style={s.shiftTypeSub}>{st.start_time} – {st.end_time} · {st.hours}h</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEditShift(st)} style={s.shiftAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeShift(st.id)} style={s.shiftAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.addShiftBtn} onPress={openNewShift} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
                <Text style={s.addShiftBtnText}>Dodaj typ zmiany</Text>
              </TouchableOpacity>
            </SectionCard>

            {/* ── 6. AI Grafik ── */}
            <SectionCard {...SECTION_ICONS.ai} title="AI Grafik — Priorytety">
              <Text style={[s.infoValue, { marginBottom: 12 }]}>Ustaw wagę każdego kryterium przy automatycznym generowaniu grafiku (0 = ignoruj, 100 = najważniejsze).</Text>
              <SliderRow label="Pełna obsada" value={rs.ai_priority_full_staffing} onChange={(v) => update('ai_priority_full_staffing', v)} />
              <SliderRow label="Preferencje pracowników" value={rs.ai_priority_preferences} onChange={(v) => update('ai_priority_preferences', v)} />
              <SliderRow label="Równa liczba godzin" value={rs.ai_priority_equal_hours} onChange={(v) => update('ai_priority_equal_hours', v)} />
              <SliderRow label="Stałe zmiany" value={rs.ai_priority_fixed_shifts} onChange={(v) => update('ai_priority_fixed_shifts', v)} />
              <SliderRow label="Min. godziny umowy" value={rs.ai_priority_min_hours} onChange={(v) => update('ai_priority_min_hours', v)} />
            </SectionCard>

            {/* Global save button */}
            <TouchableOpacity style={[s.saveBtn, rsSaving && { opacity: 0.6 }]} onPress={saveSettings} disabled={rsSaving} activeOpacity={0.85}>
              {rsSaving ? <ActivityIndicator color={theme.colors.white} /> : rsSaved
                ? <><Ionicons name="checkmark" size={18} color={theme.colors.white} /><Text style={s.saveBtnText}>Zapisano konfigurację</Text></>
                : <><Ionicons name="save-outline" size={18} color={theme.colors.white} /><Text style={s.saveBtnText}>Zapisz konfigurację</Text></>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Shift type modal */}
      <Modal visible={showShiftModal} animationType="fade" transparent onRequestClose={() => setShowShiftModal(false)}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.header}>
              <Text style={m.title}>{editingShift?.id ? 'Edytuj typ zmiany' : 'Nowy typ zmiany'}</Text>
              <TouchableOpacity onPress={() => setShowShiftModal(false)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={m.body}>
              <Text style={s.label}>Nazwa *</Text>
              <TextInput style={s.input} value={stName} onChangeText={setStName} placeholder="np. Zmiana poranna" placeholderTextColor={theme.colors.textMuted} />
              <Text style={s.label}>Godzina rozpoczęcia</Text>
              <TextInput style={s.input} value={stStart} onChangeText={setStStart} placeholder="08:00" placeholderTextColor={theme.colors.textMuted} keyboardType="numbers-and-punctuation" />
              <Text style={s.label}>Godzina zakończenia</Text>
              <TextInput style={s.input} value={stEnd} onChangeText={setStEnd} placeholder="16:00" placeholderTextColor={theme.colors.textMuted} keyboardType="numbers-and-punctuation" />
              <Text style={s.label}>Kolor</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {SHIFT_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setStColor(c)} style={[m.colorDot, { backgroundColor: c }, stColor === c && m.colorDotActive]} activeOpacity={0.8} />
                ))}
              </View>
              <TouchableOpacity style={[s.saveBtn, (!stName.trim() || shiftLoading) && { opacity: 0.6 }]} onPress={saveShift} disabled={!stName.trim() || shiftLoading} activeOpacity={0.85}>
                {shiftLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={s.saveBtnText}>Zapisz</Text>}
              </TouchableOpacity>
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
  headerDesktop: { maxWidth: 900, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 60, gap: 12 },
  contentDesktop: { maxWidth: 900, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  // Section card
  sectionCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, overflow: 'hidden', ...theme.shadows.card },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  sectionIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 0 },
  // Form fields
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 6, marginTop: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { fontSize: 14, color: theme.colors.text },
  infoValue: { fontSize: 13, color: theme.colors.textMuted },
  planBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.surface },
  planPremium: { backgroundColor: '#FEF3C7' },
  planText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  planPremiumText: { color: '#D97706' },
  // Toggle row
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  toggleSub: { fontSize: 12, color: theme.colors.textMuted },
  // Numeric row
  numericRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  numericControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  numValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text, minWidth: 50, textAlign: 'center' as const },
  // Slider row
  sliderRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sliderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sliderBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  sliderBadgeText: { fontSize: 12, fontWeight: '700' },
  sliderSteps: { flexDirection: 'row', gap: 4 },
  sliderStep: { flex: 1, height: 32, borderRadius: 6, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  sliderStepActive: { backgroundColor: theme.colors.primaryLight },
  sliderStepCurrent: { backgroundColor: theme.colors.primary },
  sliderStepText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  sliderStepTextActive: { color: theme.colors.white },
  // Shift types
  shiftTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  shiftColorDot: { width: 14, height: 14, borderRadius: 7 },
  shiftTypeName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  shiftTypeSub: { fontSize: 12, color: theme.colors.textMuted },
  shiftAction: { padding: 4 },
  addShiftBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, justifyContent: 'center' },
  addShiftBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  emptyText: { fontSize: 13, color: theme.colors.textMuted, fontStyle: 'italic', paddingVertical: 8 },
  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  // legacy
  sectionTitle2: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  settingLabel: { fontSize: 14, color: theme.colors.text },
  settingValue: { fontSize: 14, color: theme.colors.textMuted },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' as any },
  sheetDesktop: { maxWidth: 480, alignSelf: 'center' as const, borderRadius: 20, marginBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 16, paddingBottom: 32 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotActive: { borderWidth: 3, borderColor: theme.colors.text },
});
