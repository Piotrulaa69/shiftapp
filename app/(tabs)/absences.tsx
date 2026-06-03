import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getAbsences, getEmployees, reviewAbsence } from '../../lib/db';
import type { DbAbsence, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const ABSENCE_LABELS: Record<string, string> = {
  l4: 'L4',
  child_care: 'Opieka nad dzieckiem',
  force_majeure: 'Siła wyższa',
  other: 'Inne',
};

export default function AbsencesScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  // Redirect non-admin users
  if (!canManage) {
    router.replace('/(tabs)/dashboard' as any);
    return null;
  }

  const [absences, setAbsences] = useState<DbAbsence[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const [ab, em] = await Promise.all([getAbsences(rid), getEmployees(rid)]);
    setAbsences(ab);
    setEmployees(em);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    if (!user?.id) return;
    await reviewAbsence(id, user.id, status);
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Zarządzanie nieobecnościami</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : absences.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.colors.border} />
            <Text style={s.emptyText}>Brak zgłoszonych nieobecności</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {absences.map((ab) => {
              const emp = employees.find((e) => e.id === ab.employee_id);
              const isPending = ab.status === 'pending';
              return (
                <View key={ab.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <View style={[s.empAvatar, { backgroundColor: emp?.avatar_color ?? theme.colors.surface }]}>
                      <Text style={s.empInitials}>{emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.empName}>{emp ? `${emp.first_name} ${emp.last_name}` : ab.employee_id.slice(0, 8)}</Text>
                      <Text style={s.empRole}>{ABSENCE_LABELS[ab.absence_type] ?? ab.absence_type}</Text>
                      {ab.description ? <Text style={s.comment} numberOfLines={2}>{ab.description}</Text> : null}
                    </View>
                    <View style={[s.statusChip, { backgroundColor: ab.status === 'approved' ? theme.colors.greenLight : ab.status === 'rejected' ? theme.colors.errorLight : theme.colors.primaryLight }]}>
                      <Text style={[s.statusChipText, { color: ab.status === 'approved' ? theme.colors.green : ab.status === 'rejected' ? theme.colors.error : theme.colors.primary }]}>
                        {ab.status === 'approved' ? 'Zatwierdzona' : ab.status === 'rejected' ? 'Odrzucona' : 'Oczekuje'}
                      </Text>
                    </View>
                  </View>
                  {isPending && canManage && (
                    <View style={s.actions}>
                      <TouchableOpacity style={s.approveBtn} onPress={() => handleReview(ab.id, 'approved')} activeOpacity={0.7}>
                        <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                        <Text style={s.btnText}>Zatwierdź</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.rejectBtn} onPress={() => handleReview(ab.id, 'rejected')} activeOpacity={0.7}>
                        <Ionicons name="close" size={14} color={theme.colors.white} />
                        <Text style={s.btnText}>Odrzuć</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, ...theme.shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  empAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  empName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  empRole: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  comment: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, backgroundColor: theme.colors.greenLight, borderRadius: 8, paddingVertical: 8, justifyContent: 'center' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, backgroundColor: theme.colors.errorLight, borderRadius: 8, paddingVertical: 8, justifyContent: 'center' },
  btnText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
});
