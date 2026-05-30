import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';

type CheckEntry = {
  id: string; name: string; initials: string; color: string; role: string;
  checkIn: string; checkOut: string | null; hours: number | null;
  gps: boolean; status: 'active' | 'done' | 'late';
};

const ENTRIES: CheckEntry[] = [
  { id: '1', name: 'Jan Kowalski', initials: 'JK', color: '#2563EB', role: 'Kucharz', checkIn: '07:58', checkOut: '16:03', hours: 8.1, gps: true, status: 'done' },
  { id: '2', name: 'Anna Malinowska', initials: 'AM', color: '#7C3AED', role: 'Kelnerka', checkIn: '14:02', checkOut: null, hours: null, gps: true, status: 'active' },
  { id: '3', name: 'Piotr Sikora', initials: 'PS', color: '#059669', role: 'Barman', checkIn: '16:15', checkOut: null, hours: null, gps: false, status: 'late' },
  { id: '4', name: 'Marta Nowak', initials: 'MN', color: '#D97706', role: 'Obsługa', checkIn: '08:01', checkOut: '12:05', hours: 4.1, gps: true, status: 'done' },
  { id: '5', name: 'Krzysztof Wiśniewski', initials: 'KW', color: '#DC2626', role: 'Kucharz', checkIn: '08:00', checkOut: '16:00', hours: 8.0, gps: true, status: 'done' },
];

const WEEKLY_DATA = [
  { day: 'Pon', hours: 42.5, target: 40 },
  { day: 'Wt', hours: 38.0, target: 40 },
  { day: 'Śr', hours: 44.0, target: 40 },
  { day: 'Czw', hours: 40.5, target: 40 },
  { day: 'Pt', hours: 38.5, target: 40 },
  { day: 'Sob', hours: 28.0, target: 32 },
  { day: 'Nd', hours: 0, target: 0 },
];

const OVERTIME_EMPLOYEES = [
  { name: 'Jan Kowalski', regular: 40, overtime: 4.5, color: '#2563EB' },
  { name: 'Marta Nowak', regular: 32, overtime: 2.0, color: '#D97706' },
];

const STATUS_CONFIG = {
  active: { label: 'Na zmianie', color: '#059669', bg: '#D1FAE5', icon: 'radio-button-on' },
  done: { label: 'Zakończono', color: theme.colors.textSecondary, bg: theme.colors.surface, icon: 'checkmark-circle' },
  late: { label: 'Spóźnienie', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' },
};

export default function TimeTrackingScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'reports'>('today');
  const [period, setPeriod] = useState<'tydzień' | 'miesiąc'>('tydzień');

  const activeNow = ENTRIES.filter(e => e.status === 'active').length;
  const totalHoursToday = ENTRIES.filter(e => e.hours).reduce((s, e) => s + (e.hours ?? 0), 0);
  const lateCount = ENTRIES.filter(e => e.status === 'late').length;
  const totalOvertimeWeek = OVERTIME_EMPLOYEES.reduce((s, e) => s + e.overtime, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Ewidencja czasu</Text>
          <Text style={s.subtitle}>Piątek, 30 maja 2025</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.periodToggle} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={s.periodText}>{period}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.exportBtn} activeOpacity={0.85}>
            <Ionicons name="download-outline" size={16} color={theme.colors.primary} />
            <Text style={s.exportText}>Eksport</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preview banner */}
      <View style={s.previewBanner}>
        <Ionicons name="flask-outline" size={14} color="#92400E" />
        <Text style={s.previewBannerText}>Wersja podglądowa — dane testowe, których nie można edytować. Pełna funkcjonalność zostanie uruchomiona wkrótce.</Text>
      </View>

      {/* Stats */}
      <View style={s.stats}>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="time" size={18} color={theme.colors.primary} />
          </View>
          <Text style={s.statNum}>{totalHoursToday.toFixed(1)}h</Text>
          <Text style={s.statLabel}>Dzisiaj łącznie</Text>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="person" size={18} color="#059669" />
          </View>
          <Text style={[s.statNum, { color: '#059669' }]}>{activeNow}</Text>
          <Text style={s.statLabel}>Na zmianie</Text>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="trending-up" size={18} color="#D97706" />
          </View>
          <Text style={[s.statNum, { color: '#D97706' }]}>{totalOvertimeWeek.toFixed(1)}h</Text>
          <Text style={s.statLabel}>Nadgodz. tyg.</Text>
        </View>
        {lateCount > 0 && (
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
            </View>
            <Text style={[s.statNum, { color: '#DC2626' }]}>{lateCount}</Text>
            <Text style={s.statLabel}>Spóźnienia</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['today', 'week', 'reports'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'today' ? 'Dzisiaj' : tab === 'week' ? 'Ten tydzień' : 'Raporty'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {activeTab === 'today' && (
          <>
            {/* QR prompt */}
            <View style={s.qrBanner}>
              <View style={s.qrBannerLeft}>
                <View style={[s.qrIcon, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="qr-code" size={22} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={s.qrTitle}>Rejestracja QR / GPS</Text>
                  <Text style={s.qrSub}>Skanuj kod lub użyj GPS do rejestracji wejścia</Text>
                </View>
              </View>
              <TouchableOpacity style={s.qrBtn} activeOpacity={0.85}>
                <Text style={s.qrBtnText}>Skanuj</Text>
              </TouchableOpacity>
            </View>

            {/* Entry list */}
            {ENTRIES.map(entry => {
              const st = STATUS_CONFIG[entry.status];
              return (
                <View key={entry.id} style={s.entryCard}>
                  <View style={[s.entryAvatar, { backgroundColor: entry.color + '18' }]}>
                    <Text style={[s.entryAvatarText, { color: entry.color }]}>{entry.initials}</Text>
                  </View>
                  <View style={s.entryInfo}>
                    <View style={s.entryRow}>
                      <Text style={s.entryName}>{entry.name}</Text>
                      <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                        <Ionicons name={st.icon as any} size={11} color={st.color} />
                        <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={s.entryRole}>{entry.role}</Text>
                    <View style={s.entryTimes}>
                      <View style={s.timeBlock}>
                        <Ionicons name="log-in-outline" size={13} color={theme.colors.textMuted} />
                        <Text style={s.timeText}>{entry.checkIn}</Text>
                      </View>
                      <View style={s.timeSep} />
                      <View style={s.timeBlock}>
                        <Ionicons name="log-out-outline" size={13} color={theme.colors.textMuted} />
                        <Text style={s.timeText}>{entry.checkOut ?? '—'}</Text>
                      </View>
                      {entry.hours && (
                        <>
                          <View style={s.timeSep} />
                          <View style={s.timeBlock}>
                            <Ionicons name="timer-outline" size={13} color={theme.colors.textMuted} />
                            <Text style={[s.timeText, { fontWeight: '700', color: theme.colors.text }]}>{entry.hours.toFixed(1)}h</Text>
                          </View>
                        </>
                      )}
                      {entry.gps && (
                        <View style={s.gpsBadge}>
                          <Ionicons name="location" size={11} color="#059669" />
                          <Text style={s.gpsText}>GPS</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {activeTab === 'week' && (
          <>
            <View style={s.weekChart}>
              <Text style={s.sectionTitle}>Godziny dzienne (ten tydzień)</Text>
              <View style={s.chartBars}>
                {WEEKLY_DATA.map((d, i) => {
                  const maxH = 50;
                  const barH = Math.max(4, (d.hours / maxH) * 100);
                  const isOver = d.hours > d.target;
                  return (
                    <View key={i} style={s.chartBarCol}>
                      {isOver && <View style={s.overBadge}><Text style={s.overBadgeText}>+{(d.hours - d.target).toFixed(0)}h</Text></View>}
                      <View style={s.chartBarBg}>
                        <View style={[s.chartBarFill, { height: `${barH}%`, backgroundColor: isOver ? '#D97706' : theme.colors.primary }]} />
                        {d.target > 0 && <View style={[s.chartTarget, { bottom: `${(d.target / maxH) * 100}%` }]} />}
                      </View>
                      <Text style={s.chartBarLabel}>{d.day}</Text>
                      <Text style={s.chartBarHours}>{d.hours > 0 ? `${d.hours}h` : '—'}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={s.chartLegend}>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: theme.colors.primary }]} /><Text style={s.legendText}>Przepracowane</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#D97706' }]} /><Text style={s.legendText}>Nadgodziny</Text></View>
              </View>
            </View>

            <Text style={s.sectionTitle}>Nadgodziny pracowników</Text>
            {OVERTIME_EMPLOYEES.map((emp, i) => (
              <View key={i} style={s.overtimeRow}>
                <Text style={s.overtimeName}>{emp.name}</Text>
                <View style={s.overtimeBar}>
                  <View style={[s.overtimeRegular, { flex: emp.regular, backgroundColor: emp.color + '30' }]}>
                    <Text style={[s.overtimeBarText, { color: emp.color }]}>{emp.regular}h</Text>
                  </View>
                  <View style={[s.overtimeExtra, { flex: emp.overtime, backgroundColor: '#FEF3C7' }]}>
                    <Text style={[s.overtimeBarText, { color: '#D97706' }]}>+{emp.overtime}h</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'reports' && (
          <>
            <View style={s.reportCard}>
              <View style={s.reportHeader}>
                <Ionicons name="document-text" size={18} color={theme.colors.primary} />
                <Text style={s.reportTitle}>Raport miesięczny — maj 2025</Text>
              </View>
              <View style={s.reportGrid}>
                {[
                  { label: 'Łączne godziny', value: '842h' },
                  { label: 'Nadgodziny', value: '28h' },
                  { label: 'Spóźnienia', value: '4' },
                  { label: 'Pracownicy', value: '5' },
                ].map((item, i) => (
                  <View key={i} style={s.reportStat}>
                    <Text style={s.reportStatNum}>{item.value}</Text>
                    <Text style={s.reportStatLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={s.exportFullBtn} activeOpacity={0.85}>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={s.exportFullText}>Eksport do księgowości (CSV/PDF)</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionTitle}>Zestawienie pracowników</Text>
            {ENTRIES.map(entry => (
              <View key={entry.id} style={s.reportRow}>
                <View style={[s.entryAvatar, { backgroundColor: entry.color + '18', marginRight: 12 }]}>
                  <Text style={[s.entryAvatarText, { color: entry.color }]}>{entry.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.entryName}>{entry.name}</Text>
                  <Text style={s.entryRole}>{entry.role}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.text }}>168h</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>w maju</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  periodToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  periodText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  exportText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  stats: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statCard: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.card, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary },
  content: { padding: 16, gap: 12 },
  qrBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.card, borderRadius: 14, padding: 14, ...theme.shadows.card },
  qrBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  qrIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qrTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  qrSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  qrBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22 },
  qrBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 14, padding: 14, ...theme.shadows.card },
  entryAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  entryAvatarText: { fontSize: 13, fontWeight: '800' },
  entryInfo: { flex: 1, gap: 3 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  entryRole: { fontSize: 12, color: theme.colors.textSecondary },
  entryTimes: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 12, color: theme.colors.textSecondary },
  timeSep: { width: 1, height: 12, backgroundColor: theme.colors.border },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D1FAE5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  gpsText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  weekChart: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, gap: 12, ...theme.shadows.card },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120 },
  chartBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartBarBg: { flex: 1, width: '100%', backgroundColor: theme.colors.surface, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
  chartBarFill: { width: '100%', borderRadius: 6 },
  chartTarget: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: theme.colors.border },
  chartBarLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary },
  chartBarHours: { fontSize: 9, color: theme.colors.textMuted },
  overBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6 },
  overBadgeText: { fontSize: 9, fontWeight: '800', color: '#D97706' },
  chartLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: theme.colors.textSecondary },
  overtimeRow: { backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, gap: 8, ...theme.shadows.card },
  overtimeName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  overtimeBar: { flexDirection: 'row', height: 28, borderRadius: 8, overflow: 'hidden' },
  overtimeRegular: { justifyContent: 'center', alignItems: 'center' },
  overtimeExtra: { justifyContent: 'center', alignItems: 'center' },
  overtimeBarText: { fontSize: 11, fontWeight: '700' },
  reportCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, gap: 14, ...theme.shadows.card },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reportStat: { flex: 1, minWidth: '40%', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, alignItems: 'center' },
  reportStatNum: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  reportStatLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  exportFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 13, borderRadius: 12 },
  exportFullText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  reportRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, ...theme.shadows.card },
  previewBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  previewBannerText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 16 },
});
