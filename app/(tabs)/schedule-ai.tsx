import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const DAYS_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

type ShiftBlock = { day: number; start: string; end: string; hours: number; color: string; bg: string };
type Employee = {
  id: string; name: string; role: string; initials: string; color: string;
  availability: ('ok' | 'limited' | 'off')[];
  shifts: ShiftBlock[];
};

const EMPLOYEES: Employee[] = [
  {
    id: '1', name: 'Jan Kowalski', role: 'Kucharz', initials: 'JK', color: '#2563EB',
    availability: ['ok', 'ok', 'limited', 'ok', 'ok', 'off', 'off'],
    shifts: [
      { day: 0, start: '08:00', end: '16:00', hours: 8, color: theme.colors.primary, bg: theme.colors.primaryLight },
      { day: 1, start: '08:00', end: '16:00', hours: 8, color: theme.colors.primary, bg: theme.colors.primaryLight },
      { day: 3, start: '10:00', end: '18:00', hours: 8, color: theme.colors.primary, bg: theme.colors.primaryLight },
      { day: 4, start: '08:00', end: '16:00', hours: 8, color: theme.colors.primary, bg: theme.colors.primaryLight },
    ],
  },
  {
    id: '2', name: 'Anna Malinowska', role: 'Kelnerka', initials: 'AM', color: '#7C3AED',
    availability: ['ok', 'ok', 'ok', 'ok', 'limited', 'ok', 'off'],
    shifts: [
      { day: 1, start: '14:00', end: '22:00', hours: 8, color: '#7C3AED', bg: '#EDE9FE' },
      { day: 2, start: '14:00', end: '22:00', hours: 8, color: '#7C3AED', bg: '#EDE9FE' },
      { day: 3, start: '14:00', end: '22:00', hours: 8, color: '#7C3AED', bg: '#EDE9FE' },
      { day: 5, start: '10:00', end: '18:00', hours: 8, color: '#7C3AED', bg: '#EDE9FE' },
    ],
  },
  {
    id: '3', name: 'Piotr Sikora', role: 'Barman', initials: 'PS', color: '#059669',
    availability: ['limited', 'ok', 'ok', 'off', 'ok', 'ok', 'ok'],
    shifts: [
      { day: 0, start: '16:00', end: '00:00', hours: 8, color: '#059669', bg: '#D1FAE5' },
      { day: 2, start: '16:00', end: '00:00', hours: 8, color: '#059669', bg: '#D1FAE5' },
      { day: 4, start: '16:00', end: '00:00', hours: 8, color: '#059669', bg: '#D1FAE5' },
      { day: 5, start: '16:00', end: '00:00', hours: 8, color: '#059669', bg: '#D1FAE5' },
    ],
  },
  {
    id: '4', name: 'Marta Nowak', role: 'Obsługa', initials: 'MN', color: '#D97706',
    availability: ['ok', 'off', 'ok', 'ok', 'ok', 'limited', 'off'],
    shifts: [
      { day: 0, start: '08:00', end: '12:00', hours: 4, color: '#D97706', bg: '#FEF3C7' },
      { day: 2, start: '08:00', end: '16:00', hours: 8, color: '#D97706', bg: '#FEF3C7' },
      { day: 3, start: '08:00', end: '16:00', hours: 8, color: '#D97706', bg: '#FEF3C7' },
      { day: 4, start: '12:00', end: '20:00', hours: 8, color: '#D97706', bg: '#FEF3C7' },
    ],
  },
  {
    id: '5', name: 'Krzysztof Wiśniewski', role: 'Kucharz', initials: 'KW', color: '#DC2626',
    availability: ['ok', 'ok', 'ok', 'ok', 'off', 'ok', 'ok'],
    shifts: [
      { day: 1, start: '08:00', end: '16:00', hours: 8, color: '#DC2626', bg: '#FEE2E2' },
      { day: 2, start: '08:00', end: '16:00', hours: 8, color: '#DC2626', bg: '#FEE2E2' },
      { day: 5, start: '10:00', end: '18:00', hours: 8, color: '#DC2626', bg: '#FEE2E2' },
      { day: 6, start: '10:00', end: '18:00', hours: 8, color: '#DC2626', bg: '#FEE2E2' },
    ],
  },
];

const AI_INSIGHTS = [
  { icon: 'sparkles', color: '#7C3AED', bg: '#EDE9FE', text: 'Środa ma za mało obsady — sugeruję dodanie zmiany dla Anny lub Piotra.' },
  { icon: 'alert-circle', color: '#D97706', bg: '#FEF3C7', text: 'Jan Kowalski przekroczy 40h tygodniowo jeśli weźmie wolontaryjną zmianę w sobotę.' },
  { icon: 'checkmark-circle', color: '#059669', bg: '#D1FAE5', text: 'Piątek — obsada optymalna, wszystkie zmiany pokryte.' },
];

const AVAIL_CONFIG = {
  ok: { color: '#059669', bg: '#D1FAE5', label: 'Dostępny' },
  limited: { color: '#D97706', bg: '#FEF3C7', label: 'Częściowo' },
  off: { color: '#9CA3AF', bg: '#F3F4F6', label: 'Niedostępny' },
};

export default function ScheduleAIScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [currentWeek, setCurrentWeek] = useState(22);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<'grafik' | 'dostepnosc' | 'preferencje'>('grafik');

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2200);
  };

  const totalHours = EMPLOYEES.reduce((sum, e) => sum + e.shifts.reduce((s, sh) => s + sh.hours, 0), 0);
  const coveredDays = [...new Set(EMPLOYEES.flatMap(e => e.shifts.map(s => s.day)))].length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#7C3AED" />
            <Text style={s.aiBadgeText}>AI</Text>
          </View>
          <Text style={s.title}>Grafik pracy AI</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.weekNav}>
            <TouchableOpacity style={s.weekBtn} onPress={() => setCurrentWeek(w => w - 1)} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={s.weekLabel}>Tydzień {currentWeek}</Text>
            <TouchableOpacity style={s.weekBtn} onPress={() => setCurrentWeek(w => w + 1)} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.generateBtn, generating && s.generateBtnLoading]}
            onPress={handleGenerate}
            activeOpacity={0.85}
            disabled={generating}
          >
            <Ionicons name={generating ? 'hourglass' : 'sparkles'} size={15} color="#fff" />
            <Text style={s.generateBtnText}>{generating ? 'Generowanie...' : 'Generuj AI'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preview banner */}
      <View style={s.previewBanner}>
        <Ionicons name="flask-outline" size={14} color="#92400E" />
        <Text style={s.previewBannerText}>Wersja podglądowa — dane testowe, których nie można edytować. Funkcjonalność zostanie uruchomiona wkrótce.</Text>
      </View>

      {/* Stats bar */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{totalHours}</Text>
          <Text style={s.statLbl}>godz. łącznie</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statNum}>{EMPLOYEES.length}</Text>
          <Text style={s.statLbl}>pracowników</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: '#059669' }]}>{coveredDays}</Text>
          <Text style={s.statLbl}>dni pokrytych</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: generated ? '#059669' : '#D97706' }]}>{generated ? 'Gotowy' : 'Szkic'}</Text>
          <Text style={s.statLbl}>status</Text>
        </View>
      </View>

      {/* AI Insight Banner */}
      {generated && (
        <View style={s.insightBanner}>
          <Ionicons name="sparkles" size={16} color="#7C3AED" />
          <Text style={s.insightText}>AI wygenerował grafik z uwzględnieniem dostępności i preferencji. Wykryto 1 konflikt — środa ma niewystarczającą obsadę.</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.insightBtn}>Napraw</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab navigation */}
      <View style={s.tabs}>
        {(['grafik', 'dostepnosc', 'preferencje'] as const).map((tab) => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'grafik' ? 'Grafik' : tab === 'dostepnosc' ? 'Dostępność' : 'Preferencje'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'grafik' && (
          <View style={s.content}>
            {/* Schedule grid */}
            <View style={s.grid}>
              {/* Header row */}
              <View style={s.gridHeader}>
                <View style={s.gridEmployeeCol} />
                {DAYS.map((d, i) => (
                  <View key={i} style={s.gridDayCol}>
                    <Text style={s.gridDayText}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Employee rows */}
              {EMPLOYEES.map((emp) => (
                <View key={emp.id} style={s.gridRow}>
                  <View style={s.gridEmployeeCol}>
                    <View style={[s.empAvatar, { backgroundColor: emp.color + '22' }]}>
                      <Text style={[s.empAvatarText, { color: emp.color }]}>{emp.initials}</Text>
                    </View>
                    {isDesktop && (
                      <View style={{ flex: 1 }}>
                        <Text style={s.empName} numberOfLines={1}>{emp.name}</Text>
                        <Text style={s.empRole}>{emp.role}</Text>
                      </View>
                    )}
                  </View>
                  {DAYS.map((_, dayIdx) => {
                    const shift = emp.shifts.find(sh => sh.day === dayIdx);
                    const avail = emp.availability[dayIdx];
                    return (
                      <View key={dayIdx} style={s.gridDayCol}>
                        {shift ? (
                          <TouchableOpacity style={[s.shiftBlock, { backgroundColor: shift.bg, borderColor: shift.color }]} activeOpacity={0.8}>
                            <Text style={[s.shiftTime, { color: shift.color }]}>{shift.start}</Text>
                            <Text style={[s.shiftHours, { color: shift.color }]}>{shift.hours}h</Text>
                          </TouchableOpacity>
                        ) : avail === 'off' ? (
                          <View style={s.offBlock}>
                            <Text style={s.offText}>—</Text>
                          </View>
                        ) : (
                          <TouchableOpacity style={s.addShiftBtn} activeOpacity={0.7}>
                            <Ionicons name="add" size={14} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* AI Insights */}
            <View style={s.insightsSection}>
              <Text style={s.sectionTitle}>Sugestie AI</Text>
              {AI_INSIGHTS.map((insight, i) => (
                <View key={i} style={[s.insightCard, { borderLeftColor: insight.color }]}>
                  <View style={[s.insightIcon, { backgroundColor: insight.bg }]}>
                    <Ionicons name={insight.icon as any} size={16} color={insight.color} />
                  </View>
                  <Text style={s.insightCardText}>{insight.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'dostepnosc' && (
          <View style={s.content}>
            <Text style={s.sectionTitle}>Dostępność pracowników</Text>
            {EMPLOYEES.map((emp) => (
              <View key={emp.id} style={s.availCard}>
                <View style={s.availHeader}>
                  <View style={[s.empAvatar, { backgroundColor: emp.color + '22' }]}>
                    <Text style={[s.empAvatarText, { color: emp.color }]}>{emp.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.empName}>{emp.name}</Text>
                    <Text style={s.empRole}>{emp.role}</Text>
                  </View>
                  <Text style={s.availHours}>{emp.shifts.reduce((s, sh) => s + sh.hours, 0)}h/tydz.</Text>
                </View>
                <View style={s.availDays}>
                  {DAYS.map((day, i) => {
                    const av = emp.availability[i];
                    const cfg = AVAIL_CONFIG[av];
                    return (
                      <View key={i} style={s.availDayItem}>
                        <View style={[s.availDot, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                          <Text style={[s.availDotText, { color: cfg.color }]}>{day[0]}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={s.availLegend}>
              {Object.entries(AVAIL_CONFIG).map(([key, cfg]) => (
                <View key={key} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: cfg.bg, borderColor: cfg.color }]} />
                  <Text style={s.legendText}>{cfg.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'preferencje' && (
          <View style={s.content}>
            <Text style={s.sectionTitle}>Ustawienia generowania</Text>
            {[
              { icon: 'time-outline', label: 'Minimalne godziny tygodniowe', value: '32h', color: theme.colors.primary },
              { icon: 'time', label: 'Maksymalne godziny tygodniowe', value: '48h', color: theme.colors.primary },
              { icon: 'moon-outline', label: 'Maksymalna liczba zmian nocnych', value: '2 / tydzień', color: '#7C3AED' },
              { icon: 'sunny-outline', label: 'Minimalne przerwy między zmianami', value: '11 godzin', color: '#D97706' },
              { icon: 'people-outline', label: 'Minimalna obsada w ciągu dnia', value: '3 osoby', color: '#059669' },
              { icon: 'calendar-outline', label: 'Automatyczne weekendy rotacyjne', value: 'Włączone', color: '#059669' },
            ].map((pref, i) => (
              <View key={i} style={s.prefRow}>
                <View style={[s.prefIcon, { backgroundColor: pref.color + '18' }]}>
                  <Ionicons name={pref.icon as any} size={18} color={pref.color} />
                </View>
                <Text style={s.prefLabel}>{pref.label}</Text>
                <View style={s.prefValueBox}>
                  <Text style={s.prefValue}>{pref.value}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.savePrefsBtn} activeOpacity={0.85}>
              <Text style={s.savePrefsText}>Zapisz preferencje i generuj</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  aiBadgeText: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, borderRadius: 20, paddingHorizontal: 4, paddingVertical: 2 },
  weekBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text, paddingHorizontal: 4 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22 },
  generateBtnLoading: { backgroundColor: '#A78BFA' },
  generateBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  statsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  statLbl: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: theme.colors.border },
  insightBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EDE9FE', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#DDD6FE' },
  insightText: { flex: 1, fontSize: 12, color: '#5B21B6', lineHeight: 16 },
  insightBtn: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.card, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#7C3AED' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: '#7C3AED' },
  content: { padding: 16, gap: 16 },
  grid: { backgroundColor: theme.colors.card, borderRadius: 16, overflow: 'hidden', ...theme.shadows.card },
  gridHeader: { flexDirection: 'row', backgroundColor: theme.colors.surface, paddingVertical: 8 },
  gridEmployeeCol: { width: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  gridDayCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, paddingHorizontal: 2 },
  gridDayText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  gridRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 6 },
  empAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { fontSize: 10, fontWeight: '800' },
  empName: { fontSize: 11, fontWeight: '700', color: theme.colors.text },
  empRole: { fontSize: 10, color: theme.colors.textMuted },
  shiftBlock: { width: '90%', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 4, alignItems: 'center', borderWidth: 1, borderLeftWidth: 3 },
  shiftTime: { fontSize: 9, fontWeight: '700' },
  shiftHours: { fontSize: 10, fontWeight: '800' },
  offBlock: { alignItems: 'center', opacity: 0.4 },
  offText: { fontSize: 12, color: theme.colors.textMuted },
  addShiftBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  insightsSection: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  insightCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, borderLeftWidth: 4, ...theme.shadows.card },
  insightIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insightCardText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  availCard: { backgroundColor: theme.colors.card, borderRadius: 14, padding: 14, gap: 12, ...theme.shadows.card },
  availHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availHours: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
  availDays: { flexDirection: 'row', justifyContent: 'space-between' },
  availDayItem: { flex: 1, alignItems: 'center' },
  availDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  availDotText: { fontSize: 11, fontWeight: '800' },
  availLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, backgroundColor: theme.colors.card, borderRadius: 12, padding: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, ...theme.shadows.card },
  prefIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  prefLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  prefValueBox: { backgroundColor: theme.colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  prefValue: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  savePrefsBtn: { backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  savePrefsText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  previewBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  previewBannerText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 16 },
});
