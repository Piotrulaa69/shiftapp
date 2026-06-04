import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getEmployees } from '../../lib/db';
import type { DbProfile } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { theme } from '../../styles/theme';

type ReportType = 'shifts' | 'attendance' | 'tasks' | 'hours';

const REPORTS: { key: ReportType; icon: string; label: string; desc: string; color: string }[] = [
  { key: 'hours', icon: 'bar-chart-outline', label: 'Godziny pracowników', desc: 'Przepracowane godziny i zarobki per osoba', color: '#A855F7' },
  { key: 'shifts', icon: 'calendar-outline', label: 'Zmiany', desc: 'Podsumowanie zmian w okresie', color: theme.colors.primary },
  { key: 'attendance', icon: 'time-outline', label: 'Frekwencja', desc: 'Zameldowania i spóźnienia', color: '#22C55E' },
  { key: 'tasks', icon: 'list-outline', label: 'Zadania', desc: 'Wykonanie zadań przez zespół', color: '#F97316' },
];

const fmt2 = (n: number) => String(n).padStart(2, '0');

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`;
}

function monthLabel(iso: string) {
  const [y, m] = iso.split('-');
  const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
}

type EmpHourRow = {
  emp: DbProfile;
  totalMinutes: number;
  shiftsCount: number;
  earnings: number | null;
};

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';

  const [selected, setSelected] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Hours report specific state
  const [hoursMonth, setHoursMonth] = useState(getCurrentMonth());
  const [empRows, setEmpRows] = useState<EmpHourRow[]>([]);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [empShifts, setEmpShifts] = useState<Record<string, any[]>>({});
  const [loadingEmp, setLoadingEmp] = useState<string | null>(null);

  const prevMonth = () => {
    const [y, m] = hoursMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setHoursMonth(`${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`);
  };
  const nextMonth = () => {
    const [y, m] = hoursMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setHoursMonth(`${d.getFullYear()}-${fmt2(d.getMonth() + 1)}`);
  };

  const loadHoursReport = useCallback(async (month: string) => {
    setLoading(true);
    setEmpRows([]);
    setExpandedEmp(null);
    setEmpShifts({});
    try {
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const from = `${month}-01`;
      const to = `${month}-${fmt2(lastDay)}`;

      const [employees, { data: shifts }] = await Promise.all([
        getEmployees(rid),
        supabase.from('shifts').select('*').eq('restaurant_id', rid).gte('day', from).lte('day', to),
      ]);

      const rows: EmpHourRow[] = employees.map((emp) => {
        const myShifts = (shifts ?? []).filter((s: any) => s.employee_id === emp.id);
        let totalMinutes = 0;
        myShifts.forEach((s: any) => {
          if (s.start_time && s.end_time) {
            const [sh, sm] = s.start_time.split(':').map(Number);
            const [eh, em] = s.end_time.split(':').map(Number);
            let mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins < 0) mins += 24 * 60;
            totalMinutes += mins;
          }
        });
        const hours = totalMinutes / 60;
        const rate = (emp as any).hourly_rate;
        const earnings = rate != null ? Math.round(hours * rate * 100) / 100 : null;
        return { emp, totalMinutes, shiftsCount: myShifts.length, earnings };
      });

      rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
      setEmpRows(rows);
    } catch (e) {
      console.error('Hours report error', e);
    }
    setLoading(false);
  }, [rid]);

  const toggleEmpExpand = async (empId: string, month: string) => {
    if (expandedEmp === empId) { setExpandedEmp(null); return; }
    setExpandedEmp(empId);
    if (empShifts[empId]) return;
    setLoadingEmp(empId);
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const { data } = await supabase.from('shifts').select('*').eq('restaurant_id', rid).eq('employee_id', empId).gte('day', `${month}-01`).lte('day', `${month}-${fmt2(lastDay)}`).order('day');
    setEmpShifts((prev) => ({ ...prev, [empId]: data ?? [] }));
    setLoadingEmp(null);
  };

  const loadReport = useCallback(async (type: ReportType) => {
    setSelected(type);
    if (type === 'hours') {
      loadHoursReport(hoursMonth);
      return;
    }
    setLoading(true);
    setReportData(null);
    try {
      if (type === 'shifts') {
        const { data, count } = await supabase.from('shifts').select('*', { count: 'exact' }).eq('restaurant_id', rid);
        const confirmed = (data ?? []).filter((s: any) => s.status === 'potwierdzona').length;
        setReportData({ total: count ?? 0, confirmed, pending: (count ?? 0) - confirmed });
      } else if (type === 'attendance') {
        const { data, count } = await supabase.from('clock_ins').select('*', { count: 'exact' }).eq('restaurant_id', rid);
        const completed = (data ?? []).filter((c: any) => c.status === 'completed').length;
        setReportData({ total: count ?? 0, completed, active: (count ?? 0) - completed });
      } else if (type === 'tasks') {
        const { data, count } = await supabase.from('tasks').select('*', { count: 'exact' }).eq('restaurant_id', rid);
        const done = (data ?? []).filter((t: any) => t.completed).length;
        setReportData({ total: count ?? 0, done, pending: (count ?? 0) - done, rate: count ? Math.round((done / (count as number)) * 100) : 0 });
      }
    } catch (e) {
      console.error('Report error', e);
    }
    setLoading(false);
  }, [rid, hoursMonth, loadHoursReport]);

  const totalTeamHours = empRows.reduce((s, r) => s + r.totalMinutes, 0) / 60;
  const totalTeamEarnings = empRows.every((r) => r.earnings !== null)
    ? empRows.reduce((s, r) => s + (r.earnings ?? 0), 0)
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raporty</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} style={isDesktop ? { width: '100%' } : undefined}>
        {/* Report type cards */}
        <View style={styles.grid}>
          {REPORTS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.reportCard, selected === r.key && styles.reportCardActive, selected === r.key && { borderColor: r.color }]}
              onPress={() => loadReport(r.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: r.color + '18' }]}>
                <Ionicons name={r.icon as any} size={22} color={r.color} />
              </View>
              <Text style={styles.reportLabel}>{r.label}</Text>
              <Text style={styles.reportDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── HOURS REPORT ── */}
        {selected === 'hours' && (
          <View style={{ gap: 12 }}>
            {/* Month selector */}
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthArrow} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthLabel(hoursMonth)}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthArrow} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reloadBtn}
                onPress={() => loadHoursReport(hoursMonth)}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator style={{ marginTop: 20 }} size="large" color={'#A855F7'} />}

            {!loading && empRows.length > 0 && (
              <>
                {/* Team summary */}
                <View style={styles.teamSummaryCard}>
                  <View style={styles.teamSummaryItem}>
                    <Text style={styles.teamSummaryValue}>{totalTeamHours.toFixed(1)}h</Text>
                    <Text style={styles.teamSummaryLabel}>Razem zespół</Text>
                  </View>
                  <View style={styles.teamSummaryDivider} />
                  <View style={styles.teamSummaryItem}>
                    <Text style={styles.teamSummaryValue}>{empRows.filter((r) => r.shiftsCount > 0).length}</Text>
                    <Text style={styles.teamSummaryLabel}>Aktywnych</Text>
                  </View>
                  <View style={styles.teamSummaryDivider} />
                  <View style={styles.teamSummaryItem}>
                    <Text style={[styles.teamSummaryValue, { color: '#A855F7' }]}>
                      {totalTeamEarnings != null ? `${totalTeamEarnings.toFixed(0)} zł` : '—'}
                    </Text>
                    <Text style={styles.teamSummaryLabel}>Szac. koszt</Text>
                  </View>
                </View>

                {/* Per-employee rows */}
                <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>Przepracowane godziny — {monthLabel(hoursMonth)}</Text>
                  {empRows.map((row, idx) => {
                    const hrs = row.totalMinutes / 60;
                    const hrsStr = `${Math.floor(hrs)}h ${fmt2(row.totalMinutes % 60)}m`;
                    const isExpanded = expandedEmp === row.emp.id;
                    const initials = `${row.emp.first_name?.[0] ?? ''}${row.emp.last_name?.[0] ?? ''}`.toUpperCase();
                    const rate = (row.emp as any).hourly_rate;
                    const hasData = row.shiftsCount > 0;
                    return (
                      <View key={row.emp.id} style={[styles.empBlock, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                        <TouchableOpacity
                          style={styles.empRow}
                          onPress={() => toggleEmpExpand(row.emp.id, hoursMonth)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.empAvatar, { backgroundColor: row.emp.avatar_color ?? theme.colors.primary }]}>
                            <Text style={styles.empAvatarText}>{initials}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.empName} numberOfLines={1}>{row.emp.first_name} {row.emp.last_name}</Text>
                            <Text style={styles.empJobTitle} numberOfLines={1}>{row.emp.job_title}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <Text style={[styles.empHours, !hasData && { color: theme.colors.textMuted }]}>{hasData ? hrsStr : '0h'}</Text>
                            {rate != null ? (
                              <Text style={styles.empEarnings}>{row.earnings != null ? `${row.earnings.toFixed(0)} zł` : '—'}</Text>
                            ) : (
                              <Text style={styles.empNoRate}>brak stawki</Text>
                            )}
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={theme.colors.textMuted}
                            style={{ marginLeft: 8 }}
                          />
                        </TouchableOpacity>

                        {/* Expanded: shift list */}
                        {isExpanded && (
                          <View style={styles.shiftList}>
                            {loadingEmp === row.emp.id
                              ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 8 }} />
                              : (empShifts[row.emp.id] ?? []).length === 0
                              ? <Text style={styles.noShiftsText}>Brak zmian w tym miesiącu</Text>
                              : (empShifts[row.emp.id] ?? []).map((s: any) => {
                                  let shiftMins = 0;
                                  if (s.start_time && s.end_time) {
                                    const [sh2, sm2] = s.start_time.split(':').map(Number);
                                    const [eh2, em2] = s.end_time.split(':').map(Number);
                                    shiftMins = (eh2 * 60 + em2) - (sh2 * 60 + sm2);
                                    if (shiftMins < 0) shiftMins += 24 * 60;
                                  }
                                  const shiftHrs = shiftMins / 60;
                                  const shiftEarnings = rate != null ? (shiftHrs * rate).toFixed(2) : null;
                                  const [, mm, dd] = (s.day ?? '').split('-');
                                  return (
                                    <View key={s.id} style={styles.shiftRow}>
                                      <View style={styles.shiftDateBox}>
                                        <Text style={styles.shiftDay}>{dd}</Text>
                                        <Text style={styles.shiftMon}>{mm ? ['','Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'][parseInt(mm)] : ''}</Text>
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.shiftTime}>{s.start_time} – {s.end_time}</Text>
                                        <Text style={styles.shiftDuration}>{Math.floor(shiftHrs)}h {fmt2(shiftMins % 60)}m</Text>
                                      </View>
                                      {shiftEarnings && (
                                        <Text style={styles.shiftEarnings}>{shiftEarnings} zł</Text>
                                      )}
                                    </View>
                                  );
                                })
                            }
                            {/* Row summary */}
                            {row.shiftsCount > 0 && (
                              <View style={styles.empSummaryRow}>
                                <Text style={styles.empSummaryText}>Razem: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{hrsStr}</Text></Text>
                                {row.earnings != null && (
                                  <Text style={styles.empSummaryText}>Szac. zarobki: <Text style={{ fontWeight: '700', color: '#A855F7' }}>{row.earnings.toFixed(2)} zł</Text></Text>
                                )}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {!loading && empRows.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="bar-chart-outline" size={40} color={theme.colors.border} />
                <Text style={styles.emptyText}>Brak danych dla tego miesiąca</Text>
              </View>
            )}
          </View>
        )}

        {/* ── OTHER REPORTS ── */}
        {loading && selected !== 'hours' && <ActivityIndicator style={{ marginTop: 30 }} size="large" color={theme.colors.primary} />}

        {!loading && reportData && selected === 'shifts' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Raport: Zmiany</Text>
            <StatRow label="Łącznie zmian" value={reportData.total} />
            <StatRow label="Potwierdzone" value={reportData.confirmed} color={theme.colors.green} />
            <StatRow label="Oczekujące" value={reportData.pending} color={theme.colors.orange} />
          </View>
        )}

        {!loading && reportData && selected === 'attendance' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Raport: Frekwencja</Text>
            <StatRow label="Łącznie wpisów" value={reportData.total} />
            <StatRow label="Zakończone" value={reportData.completed} color={theme.colors.green} />
            <StatRow label="Aktywne" value={reportData.active} color={theme.colors.primary} />
          </View>
        )}

        {!loading && reportData && selected === 'tasks' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Raport: Zadania</Text>
            <StatRow label="Łącznie zadań" value={reportData.total} />
            <StatRow label="Wykonane" value={reportData.done} color={theme.colors.green} />
            <StatRow label="Oczekujące" value={reportData.pending} color={theme.colors.orange} />
            <View style={styles.bigStat}>
              <Text style={styles.bigStatValue}>{reportData.rate}%</Text>
              <Text style={styles.bigStatLabel}>Wskaźnik realizacji</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={[styles.statRowValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16, gap: 0 },
  contentDesktop: { maxWidth: 720, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  reportCard: { width: '47%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, borderWidth: 2, borderColor: 'transparent', ...theme.shadows.card },
  reportCardActive: { borderWidth: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  reportLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  reportDesc: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 15 },

  monthRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, paddingHorizontal: 12, paddingVertical: 10, ...theme.shadows.card },
  monthArrow: { padding: 4 },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: theme.colors.text },
  reloadBtn: { padding: 6, backgroundColor: theme.colors.primaryLight, borderRadius: 8 },

  teamSummaryCard: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, ...theme.shadows.card },
  teamSummaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  teamSummaryDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  teamSummaryValue: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  teamSummaryLabel: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center' },

  resultCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, overflow: 'hidden', ...theme.shadows.card },
  resultTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },

  empBlock: { },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  empAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  empAvatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  empName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empJobTitle: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  empHours: { fontSize: 14, fontWeight: '700', color: theme.colors.text, textAlign: 'right' },
  empEarnings: { fontSize: 12, fontWeight: '600', color: '#A855F7', textAlign: 'right' },
  empNoRate: { fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic' },

  shiftList: { backgroundColor: theme.colors.surface, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  shiftDateBox: { width: 32, alignItems: 'center' },
  shiftDay: { fontSize: 16, fontWeight: '800', color: theme.colors.text, lineHeight: 18 },
  shiftMon: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },
  shiftTime: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  shiftDuration: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  shiftEarnings: { fontSize: 13, fontWeight: '700', color: '#A855F7' },
  noShiftsText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' },
  empSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, paddingTop: 10, marginTop: 4 },
  empSummaryText: { fontSize: 12, color: theme.colors.textSecondary },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statRowLabel: { fontSize: 14, color: theme.colors.textSecondary },
  statRowValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  bigStat: { alignItems: 'center', paddingVertical: 20 },
  bigStatValue: { fontSize: 42, fontWeight: '800', color: theme.colors.primary },
  bigStatLabel: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
});
