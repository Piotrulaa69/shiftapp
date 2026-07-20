import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Clipboard, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { deleteInvitation, getEmployeeGroups, getEmployees, getInvitations } from '../../lib/db';
import type { DbEmployeeGroup, DbInvitation, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

export default function InvitesScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const { showAlert } = useAlert();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  const [invitations, setInvitations] = useState<DbInvitation[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [groups, setGroups] = useState<DbEmployeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const [inv, em, gr] = await Promise.all([getInvitations(rid), getEmployees(rid), getEmployeeGroups(rid)]);
    setInvitations(inv);
    setEmployees(em);
    setGroups(gr);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  // Groups replaced the old fixed job-title picker — show assigned group names.
  const groupLabel = (inv: DbInvitation): string => {
    const ids = inv.group_ids ?? [];
    if (!ids.length) return inv.job_title || 'Bez grupy';
    const names = groups.filter((g) => ids.includes(g.id)).map((g) => g.name);
    return names.length ? names.join(', ') : 'Bez grupy';
  };

  const activeInvites = invitations.filter((i) => !i.used && new Date(i.expires_at) > new Date());
  const usedInvites = invitations.filter((i) => i.used || new Date(i.expires_at) <= new Date());

  const copyToClipboard = async (code: string) => {
    await Clipboard.setString(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteInvitation(id);
    if (success) {
      load();
    } else {
      showAlert('Błąd', 'Nie udało się usunąć zaproszenia');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Zaproszenia</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/team-full')} style={s.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Aktywne ({activeInvites.length})</Text>
              {activeInvites.length === 0 ? (
                <Text style={s.emptyText}>Brak aktywnych zaproszeń</Text>
              ) : (
                activeInvites.map((inv) => (
                  <View key={inv.id} style={s.invRow}>
                    <View style={s.invCodeWrap}>
                      <Text style={s.invCode}>{inv.code}</Text>
                    </View>
                    <View style={s.invInfo}>
                      <Text style={s.invJob}>{groupLabel(inv)}</Text>
                      <Text style={s.invExpiry}>Wygasa: {new Date(inv.expires_at).toLocaleDateString('pl-PL')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(inv.code)}
                        style={[s.invShareBtn, copiedCode === inv.code && { backgroundColor: theme.colors.greenLight }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={copiedCode === inv.code ? 'checkmark' : 'copy-outline'}
                          size={18}
                          color={copiedCode === inv.code ? theme.colors.green : theme.colors.primary}
                        />
                      </TouchableOpacity>
                      {canManage && (
                        <TouchableOpacity
                          onPress={() => handleDelete(inv.id)}
                          style={[s.invDeleteBtn]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>

            {usedInvites.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Wykorzystane ({usedInvites.length})</Text>
                {usedInvites.map((inv) => (
                  <View key={inv.id} style={s.invRow}>
                    <View style={[s.invCodeWrap, { backgroundColor: theme.colors.greenLight }]}>
                      <Text style={[s.invCode, { color: theme.colors.green }]}>{inv.code}</Text>
                    </View>
                    <View style={s.invInfo}>
                      <Text style={s.invJob}>{groupLabel(inv)}</Text>
                      <Text style={[s.invExpiry, { color: theme.colors.green }]}>
                        {inv.used ? '✓ Użyty' : '✗ Wygasł'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Ionicons name={inv.used ? 'checkmark-circle' : 'close-circle'} size={20} color={inv.used ? theme.colors.green : theme.colors.error} />
                      {canManage && (
                        <TouchableOpacity
                          onPress={() => handleDelete(inv.id)}
                          style={[s.invDeleteBtn]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  emptyText: { fontSize: 13, color: theme.colors.textMuted, fontStyle: 'italic' },
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8, ...theme.shadows.card },
  invCodeWrap: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  invCode: { fontSize: 14, fontWeight: '700', color: theme.colors.primary, letterSpacing: 1 },
  invInfo: { flex: 1 },
  invJob: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  invExpiry: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  invShareBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  invDeleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.errorLight, alignItems: 'center', justifyContent: 'center' },
});
