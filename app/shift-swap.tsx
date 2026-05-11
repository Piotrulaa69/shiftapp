import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getEmployees, getShifts, getShiftSwaps, updateSwapStatus } from '../lib/db';
import type { DbProfile, DbShift, DbShiftSwap } from '../lib/supabase';
import { theme } from '../styles/theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending_responder: { label: 'Oczekuje', color: '#F97316', bg: '#FFF4E5' },
  accepted_by_responder: { label: 'Zaakceptowane', color: theme.colors.primary, bg: '#E3F2FD' },
  manager_approved: { label: 'Zatwierdzone', color: '#22C55E', bg: '#E8F8ED' },
  rejected: { label: 'Odrzucone', color: '#EF4444', bg: '#FFF0EF' },
  cancelled: { label: 'Anulowane', color: '#6B7280', bg: '#F3F4F6' },
};

export default function ShiftSwapScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  const [swaps, setSwaps] = useState<DbShiftSwap[]>([]);
  const [shifts, setShifts] = useState<DbShift[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const [sw, sh, em] = await Promise.all([getShiftSwaps(rid), getShifts(rid), getEmployees(rid)]);
    setSwaps(sw);
    setShifts(sh);
    setEmployees(em);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  const getName = (id: string) => {
    const e = employees.find((em) => em.id === id);
    return e ? `${e.first_name} ${e.last_name}` : 'Nieznany';
  };

  const getShiftInfo = (id: string) => {
    const s = shifts.find((sh) => sh.id === id);
    return s ? `${s.day} ${s.start_time}–${s.end_time}` : '—';
  };

  const handleApprove = async (id: string) => {
    await updateSwapStatus(id, 'manager_approved', user?.id);
    load();
  };

  const handleReject = async (id: string) => {
    await updateSwapStatus(id, 'rejected', user?.id);
    load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wymiana zmian</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} style={isDesktop ? { width: '100%' } : undefined}>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} /> : swaps.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="swap-horizontal-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>Brak wniosków o wymianę</Text>
          </View>
        ) : swaps.map((sw) => {
          const st = STATUS_MAP[sw.status] ?? STATUS_MAP.pending_responder;
          return (
            <View key={sw.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                <Text style={styles.swapType}>{sw.swap_type === 'swap' ? 'Wymiana' : 'Oddanie'}</Text>
              </View>
              <View style={styles.swapRow}>
                <View style={styles.swapSide}>
                  <Text style={styles.swapLabel}>Od</Text>
                  <Text style={styles.swapName}>{getName(sw.requester_id)}</Text>
                  <Text style={styles.swapShift}>{getShiftInfo(sw.requester_shift)}</Text>
                </View>
                <Ionicons name="swap-horizontal" size={22} color={theme.colors.primary} />
                <View style={styles.swapSide}>
                  <Text style={styles.swapLabel}>Do</Text>
                  <Text style={styles.swapName}>{getName(sw.responder_id)}</Text>
                  {sw.responder_shift && <Text style={styles.swapShift}>{getShiftInfo(sw.responder_shift)}</Text>}
                </View>
              </View>
              {canManage && (sw.status as string) === 'accepted_by_responder' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.greenLight }]} onPress={() => handleApprove(sw.id)}>
                    <Ionicons name="checkmark" size={16} color={theme.colors.green} />
                    <Text style={[styles.actionBtnText, { color: theme.colors.green }]}>Zatwierdź</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.errorLight }]} onPress={() => handleReject(sw.id)}>
                    <Ionicons name="close" size={16} color={theme.colors.error} />
                    <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Odrzuć</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16 },
  contentDesktop: { maxWidth: 720, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  swapType: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swapSide: { flex: 1 },
  swapLabel: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 2 },
  swapName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  swapShift: { fontSize: 12, color: theme.colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});
