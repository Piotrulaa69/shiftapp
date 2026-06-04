import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import type { RestaurantSettings, ShiftTypeRow } from '../../lib/db';
import { deleteShiftType, getEmployees, getRestaurantSettings, getShiftTypes, updateRestaurant, upsertRestaurantSettings, upsertShiftType } from '../../lib/db';
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

const PRIORITY_STEPS = [
  { value: 0,   label: 'Wył.' },
  { value: 25,  label: 'Niski' },
  { value: 50,  label: 'Średni' },
  { value: 75,  label: 'Wysoki' },
  { value: 100, label: 'Max' },
];

function SliderRow({ label, sub, icon, value, onChange }: { label: string; sub?: string; icon?: string; value: number; onChange: (v: number) => void }) {
  const cur = PRIORITY_STEPS.reduce((best, s) => Math.abs(s.value - value) < Math.abs(best.value - value) ? s : best, PRIORITY_STEPS[0]);
  const labelColor = value >= 75 ? theme.colors.green : value >= 50 ? theme.colors.primary : value >= 25 ? theme.colors.orange : theme.colors.textMuted;
  const labelBg = value >= 75 ? theme.colors.greenLight : value >= 50 ? theme.colors.primaryLight : value >= 25 ? theme.colors.orangeLight : theme.colors.surface;
  return (
    <View style={s.sliderRow}>
      <View style={s.sliderTop}>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={s.toggleLabel}>{label}</Text>
          {sub ? <Text style={s.toggleSub}>{sub}</Text> : null}
        </View>
        <View style={[s.sliderBadge, { backgroundColor: labelBg }]}>
          <Text style={[s.sliderBadgeText, { color: labelColor }]}>{cur.label}</Text>
        </View>
      </View>
      <View style={s.sliderSteps}>
        {PRIORITY_STEPS.map((step) => (
          <TouchableOpacity key={step.value} onPress={() => onChange(step.value)} activeOpacity={0.7}
            style={[s.sliderStep, value >= step.value && step.value > 0 && s.sliderStepActive, value === step.value && s.sliderStepCurrent]}>
            <Text style={[s.sliderStepText, value === step.value && s.sliderStepTextActive]}>{step.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function StaffingSection({ value, onChange, existingRoles, isDesktop }: { value: Record<string, any>; onChange: (v: Record<string, any>) => void; existingRoles: string[]; isDesktop: boolean }) {
  const [showAddRole, setShowAddRole] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [showDateException, setShowDateException] = useState(false);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionCounts, setExceptionCounts] = useState<Record<string, number>>({});

  const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
  const weekly = value.weekly ?? {};
  const dates = value.dates ?? {};

  const updateWeekly = (role: string, dayIdx: number, count: number) => {
    const newWeekly = { ...weekly };
    if (!newWeekly[role]) newWeekly[role] = [0, 0, 0, 0, 0, 0, 0];
    newWeekly[role][dayIdx] = count;
    onChange({ ...value, weekly: newWeekly });
  };

  const addRole = () => {
    if (!newRole.trim()) return;
    const newWeekly = { ...weekly };
    newWeekly[newRole.trim()] = [0, 0, 0, 0, 0, 0, 0];
    onChange({ ...value, weekly: newWeekly });
    setNewRole('');
    setShowAddRole(false);
  };

  const removeRole = (role: string) => {
    const newWeekly = { ...weekly };
    delete newWeekly[role];
    onChange({ ...value, weekly: newWeekly });
  };

  const addDateException = () => {
    if (!exceptionDate || Object.keys(exceptionCounts).length === 0) return;
    const newDates = { ...dates };
    newDates[exceptionDate] = { ...exceptionCounts };
    onChange({ ...value, dates: newDates });
    setExceptionDate('');
    setExceptionCounts({});
    setShowDateException(false);
  };

  const removeDateException = (date: string) => {
    const newDates = { ...dates };
    delete newDates[date];
    onChange({ ...value, dates: newDates });
  };

  const availableRoles = existingRoles.filter(r => !weekly[r]);

  return (
    <View style={{ gap: 16 }}>
      <Text style={s.infoValue}>Konfiguracja minimalnej obsady per stanowisko i dzień tygodnia. Używana przez AI przy generowaniu grafiku.</Text>

      {/* Weekly staffing */}
      <View style={s.staffingContainer}>
        <View style={s.staffingHeader}>
          <Text style={s.staffingHeaderTitle}>Obsada tygodniowa</Text>
          {availableRoles.length > 0 && (
            <TouchableOpacity style={s.addSmallBtn} onPress={() => setShowAddRole(true)} activeOpacity={0.7}>
              <Ionicons name="add" size={14} color={theme.colors.primary} />
              <Text style={s.addSmallText}>Dodaj stanowisko</Text>
            </TouchableOpacity>
          )}
        </View>

        {showAddRole && (
          <View style={s.addRow}>
            <TouchableOpacity
              style={[s.rolePickerBtn, newRole && s.rolePickerBtnSelected]}
              onPress={() => setShowRolePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[s.rolePickerText, newRole && s.rolePickerTextSelected]}>
                {newRole || 'Wybierz stanowisko'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={newRole ? theme.colors.text : theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={s.addConfirmBtn} onPress={addRole} activeOpacity={0.7} disabled={!newRole}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.addCancelBtn} onPress={() => { setShowAddRole(false); setNewRole(''); }} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {Object.keys(weekly).length === 0 && (
          <Text style={s.emptyText}>Brak skonfigurowanych stanowisk. Dodaj pierwsze stanowisko.</Text>
        )}

        {Object.entries(weekly).map(([role, counts]) => (
          <View key={role} style={s.roleRow}>
            <View style={s.roleHeader}>
              <Text style={s.roleName}>{role}</Text>
              <TouchableOpacity onPress={() => removeRole(role)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            <View style={s.daysGrid}>
              {DAYS.map((day, idx) => (
                <View key={day} style={s.dayCell}>
                  <Text style={s.dayLabel}>{day}</Text>
                  <View style={s.dayControls}>
                    <TouchableOpacity
                      style={s.dayBtn}
                      onPress={() => updateWeekly(role, idx, Math.max(0, (counts as number[])[idx] - 1))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={12} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={s.dayCount}>{(counts as number[])[idx]}</Text>
                    <TouchableOpacity
                      style={s.dayBtn}
                      onPress={() => updateWeekly(role, idx, (counts as number[])[idx] + 1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={12} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Date exceptions */}
      <View style={s.staffingContainer}>
        <View style={s.staffingHeader}>
          <Text style={s.staffingHeaderTitle}>Wyjątki datowe</Text>
          <TouchableOpacity style={s.addSmallBtn} onPress={() => setShowDateException(true)} activeOpacity={0.7}>
            <Ionicons name="add" size={14} color={theme.colors.primary} />
            <Text style={s.addSmallText}>Dodaj wyjątek</Text>
          </TouchableOpacity>
        </View>

        {showDateException && (
          <View style={s.exceptionRow}>
            <TextInput
              style={s.dateInput}
              value={exceptionDate}
              onChangeText={setExceptionDate}
              placeholder="RRRR-MM-DD (np. 2026-03-08)"
              placeholderTextColor={theme.colors.textMuted}
            />
            <View style={s.exceptionCounts}>
              {Object.keys(weekly).map((role) => (
                <View key={role} style={s.exceptionCountCell}>
                  <Text style={s.exceptionCountLabel}>{role}</Text>
                  <View style={s.exceptionCountControls}>
                    <TouchableOpacity
                      style={s.exceptionCountBtn}
                      onPress={() => setExceptionCounts((prev) => ({ ...prev, [role]: Math.max(0, (prev[role] || 0) - 1) }))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={12} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={s.exceptionCountValue}>{exceptionCounts[role] || 0}</Text>
                    <TouchableOpacity
                      style={s.exceptionCountBtn}
                      onPress={() => setExceptionCounts((prev) => ({ ...prev, [role]: (prev[role] || 0) + 1 }))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={12} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.addConfirmBtn} onPress={addDateException} activeOpacity={0.7}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.addCancelBtn} onPress={() => { setShowDateException(false); setExceptionDate(''); setExceptionCounts({}); }} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {Object.keys(dates).length === 0 && (
          <Text style={s.emptyText}>Brak wyjątków datowych. Dodaj wyjątek dla konkretnej daty.</Text>
        )}

        {Object.entries(dates).map(([date, counts]) => (
          <View key={date} style={s.exceptionItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.exceptionDate}>{date}</Text>
              <Text style={s.exceptionCountsText}>
                {Object.entries(counts as Record<string, number>).map(([role, count]) => `${role}: ${count}`).join(', ')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeDateException(date)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Role picker modal */}
      <Modal visible={showRolePicker} animationType="fade" transparent onRequestClose={() => setShowRolePicker(false)}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.header}>
              <Text style={m.title}>Wybierz stanowisko</Text>
              <TouchableOpacity onPress={() => setShowRolePicker(false)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={m.body}>
              {availableRoles.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[m.optionItem, newRole === role && m.optionItemSelected]}
                  onPress={() => { setNewRole(role); setShowRolePicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[m.optionText, newRole === role && m.optionTextSelected]}>{role}</Text>
                  {newRole === role && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
              {availableRoles.length === 0 && (
                <Text style={s.emptyText}>Brak dostępnych stanowisk. Wszystkie są już dodane.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // ── Employees (for job titles) ──
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (restaurant) {
      setRName(restaurant.name || '');
      setRAddress(restaurant.address || '');
      setRPhone(restaurant.phone || '');
    }
  }, [restaurant]);

  useEffect(() => {
    if (!rid) return;
    Promise.all([getRestaurantSettings(rid), getShiftTypes(rid), getEmployees(rid)]).then(([cfg, st, emps]) => {
      setRs(cfg);
      setShiftTypes(st);
      setEmployees(emps);
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
              <StaffingSection
                value={rs.min_staffing ?? {}}
                onChange={(v) => update('min_staffing', v)}
                existingRoles={[...new Set(employees.map((e: any) => e.job_title).filter(Boolean))]}
                isDesktop={isDesktop}
              />
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
            <SectionCard {...SECTION_ICONS.ai} title="AI Grafik">
              <Text style={[s.infoValue, { marginBottom: 4 }]}>Ustaw priorytety dla automatycznego generowania grafików.</Text>

              {/* ── Priorytety ── */}
              <Text style={s.aiSubHeader}>Priorytety planowania</Text>
              <SliderRow
                label="Priorytet pełnej obsady"
                sub="Ważność zapewnienia minimalnej obsady na każdą zmianę"
                icon="people-outline"
                value={rs.ai_priority_full_staffing}
                onChange={(v) => update('ai_priority_full_staffing', v)}
              />
              <SliderRow
                label="Priorytet preferencji pracowników"
                sub="Uwzględnianie deklarowanej dyspozycyjności i prefer. dni"
                icon="person-outline"
                value={rs.ai_priority_preferences}
                onChange={(v) => update('ai_priority_preferences', v)}
              />
              <SliderRow
                label="Priorytet równomiernego rozłożenia godzin"
                sub="Sprawiedliwy podział godzin między pracowników"
                icon="bar-chart-outline"
                value={rs.ai_priority_equal_hours}
                onChange={(v) => update('ai_priority_equal_hours', v)}
              />
              <SliderRow
                label="Preferowanie stałych zmian"
                sub="Przydzielanie tych samych zmian co poprzednie tygodnie"
                icon="repeat-outline"
                value={rs.ai_priority_fixed_shifts}
                onChange={(v) => update('ai_priority_fixed_shifts', v)}
              />
              <SliderRow
                label="Minimalna liczba godzin dla pracownika"
                sub="Gwarantowanie min. godzin z umowy każdemu pracownikowi"
                icon="time-outline"
                value={rs.ai_priority_min_hours}
                onChange={(v) => update('ai_priority_min_hours', v)}
              />

              {/* ── Zachowania AI ── */}
              <Text style={[s.aiSubHeader, { marginTop: 8 }]}>Zachowania AI</Text>
              <ToggleRow
                label="Preferuj te same zmiany co tydzień"
                sub="AI stara się przydzielić te same dni/godziny co poprzednio"
                value={rs.ai_prefer_same_shifts}
                onChange={(v) => update('ai_prefer_same_shifts', v)}
              />
              <ToggleRow
                label="Respektuj prośby o dni wolne"
                sub="Nie planuj zmian w dniach oznaczonych jako niedostępne"
                value={rs.ai_respect_day_off_requests}
                onChange={(v) => update('ai_respect_day_off_requests', v)}
              />
              <ToggleRow
                label="Równomiernie rozłoż weekendy"
                sub="Naprzemienne weekendy wolne wśród pracowników"
                value={rs.ai_balance_weekends}
                onChange={(v) => update('ai_balance_weekends', v)}
              />
              <ToggleRow
                label="Unikaj pojedynczych dni pracy"
                sub="Nie planuj jednego dnia pracy między dniami wolnymi"
                value={rs.ai_avoid_single_day_gaps}
                onChange={(v) => update('ai_avoid_single_day_gaps', v)}
              />
              <ToggleRow
                label="Używaj typów zmian"
                sub="AI dobiera typy zmian (Poranna/Popołudniowa/etc.) z konfiguracji"
                value={rs.ai_use_shift_types}
                onChange={(v) => update('ai_use_shift_types', v)}
              />

              {/* ── Parametry godzinowe ── */}
              <Text style={[s.aiSubHeader, { marginTop: 8 }]}>Parametry domyślne</Text>
              <NumericRow
                label="Min. godzin dla pracownika/tydzień"
                sub="Minimalna tygodniowa liczba godzin przy generowaniu"
                value={rs.ai_min_hours_per_employee}
                onChange={(v) => update('ai_min_hours_per_employee', v)}
                unit="h" min={0} max={60}
              />
              <NumericRow
                label="Maks. dni z rzędu (AI)"
                sub="AI nie planuje dłuższych bloków pracy niż ta wartość"
                value={rs.ai_max_consecutive_days}
                onChange={(v) => update('ai_max_consecutive_days', v)}
                unit="dni" min={1} max={10}
              />
              <View style={s.aiTimeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Domyślna godzina startu</Text>
                  <TextInput
                    style={s.input}
                    value={rs.ai_default_shift_start}
                    onChangeText={(v) => update('ai_default_shift_start', v)}
                    placeholder="08:00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Domyślna godzina końca</Text>
                  <TextInput
                    style={s.input}
                    value={rs.ai_default_shift_end}
                    onChangeText={(v) => update('ai_default_shift_end', v)}
                    placeholder="16:00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              {/* ── Notatki dla AI ── */}
              <Text style={[s.label, { marginTop: 12 }]}>Notatki dla AI (opcjonalnie)</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={rs.ai_notes}
                onChangeText={(v) => update('ai_notes', v)}
                placeholder="np. Marta nie może pracować w poniedziałek rano, zawsze planuj min. 2 kelnerów na weekendy..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
            </SectionCard>

            {/* Global save button */}
            <TouchableOpacity style={[s.saveBtn, rsSaving && { opacity: 0.6 }]} onPress={saveSettings} disabled={rsSaving} activeOpacity={0.85}>
              {rsSaving ? <ActivityIndicator color={theme.colors.white} /> : rsSaved
                ? <><Ionicons name="checkmark" size={18} color={theme.colors.white} /><Text style={s.saveBtnText}>Zapisano konfigurację</Text></>
                : <><Ionicons name="save-outline" size={18} color={theme.colors.white} /><Text style={s.saveBtnText}>Zapisz konfigurację</Text></>}
            </TouchableOpacity>

            {/* Generate AI schedule shortcut */}
            <TouchableOpacity
              style={s.generateBtn}
              onPress={async () => { await saveSettings(); router.push('/(tabs)/schedule-ai'); }}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={18} color={theme.colors.white} />
              <Text style={s.saveBtnText}>Wygeneruj grafik automatycznie</Text>
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
  generateBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, backgroundColor: '#DB2777', borderRadius: theme.borderRadius.md, paddingVertical: 16, marginTop: 4 },
  // AI section
  aiSubHeader: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 16, marginBottom: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  aiTimeRow: { flexDirection: 'row' as const, gap: 12 },
  // legacy
  sectionTitle2: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  settingLabel: { fontSize: 14, color: theme.colors.text },
  settingValue: { fontSize: 14, color: theme.colors.textMuted },
  // Staffing section
  staffingContainer: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, gap: 12 },
  staffingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  staffingHeaderTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.primaryLight },
  addSmallText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  addInput: { flex: 1, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 8, padding: 8, fontSize: 13, color: theme.colors.text, backgroundColor: theme.colors.card },
  addConfirmBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.green, alignItems: 'center', justifyContent: 'center' },
  addCancelBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  roleRow: { backgroundColor: theme.colors.card, borderRadius: 10, padding: 12, gap: 12 },
  roleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayCell: { width: 48, alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase' },
  dayControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  dayCount: { fontSize: 13, fontWeight: '700', color: theme.colors.text, minWidth: 20, textAlign: 'center' },
  exceptionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
  dateInput: { flex: 1, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 8, padding: 8, fontSize: 13, color: theme.colors.text, backgroundColor: theme.colors.card },
  exceptionCounts: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exceptionCountCell: { alignItems: 'center', gap: 4 },
  exceptionCountLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  exceptionCountControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exceptionCountBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  exceptionCountValue: { fontSize: 12, fontWeight: '700', color: theme.colors.text, minWidth: 20, textAlign: 'center' },
  exceptionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  exceptionDate: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  exceptionCountsText: { fontSize: 12, color: theme.colors.textMuted },
  // Role picker
  rolePickerBtn: { flex: 1, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.card },
  rolePickerBtnSelected: { borderColor: theme.colors.primary },
  rolePickerText: { fontSize: 14, color: theme.colors.textMuted },
  rolePickerTextSelected: { color: theme.colors.text },
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
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionItemSelected: { backgroundColor: theme.colors.primaryLight },
  optionText: { fontSize: 15, color: theme.colors.text },
  optionTextSelected: { fontWeight: '700', color: theme.colors.primary },
});
