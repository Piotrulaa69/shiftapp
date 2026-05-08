import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getDocuments } from '../lib/db';
import type { DbDocument } from '../lib/supabase';
import { theme } from '../styles/theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  active: { label: 'Aktywny', color: '#22C55E', bg: '#E8F8ED', icon: 'checkmark-circle' },
  expiring: { label: 'Wygasa', color: '#F97316', bg: '#FFF4E5', icon: 'warning' },
  expired: { label: 'Wygasł', color: '#EF4444', bg: '#FFF0EF', icon: 'close-circle' },
};

const TYPE_LABELS: Record<string, string> = {
  contract: 'Umowa', certificate: 'Certyfikat', attestation: 'Zaświadczenie', other: 'Inny',
};

export default function DocumentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [docs, setDocs] = useState<DbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    if (!rid || !user) return;
    setLoading(true);
    const d = await getDocuments(rid, user.id);
    setDocs(d);
    setLoading(false);
  }, [rid, user]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? docs : docs.filter((d) => d.status === filter);

  const expiringCount = docs.filter((d) => d.status === 'expiring').length;
  const expiredCount = docs.filter((d) => d.status === 'expired').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dokumenty</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Alerts */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <View style={styles.alertBox}>
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

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {[{ key: 'all', label: 'Wszystkie' }, { key: 'active', label: 'Aktywne' }, { key: 'expiring', label: 'Wygasające' }, { key: 'expired', label: 'Wygasłe' }].map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterBtn, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} /> : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>Brak dokumentów</Text>
          </View>
        ) : filtered.map((doc) => {
          const st = STATUS_MAP[doc.status] ?? STATUS_MAP.active;
          return (
            <View key={doc.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon as any} size={20} color={st.color} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{doc.name}</Text>
                <Text style={styles.cardType}>{TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</Text>
                {doc.expires_at && <Text style={[styles.cardExpiry, { color: st.color }]}>Wygasa: {doc.expires_at}</Text>}
              </View>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
              </View>
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
  alertBox: { marginHorizontal: 16, padding: 12, backgroundColor: '#FFF8EE', borderRadius: theme.borderRadius.md, gap: 6, marginBottom: 8 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertText: { fontSize: 13, color: theme.colors.text },
  filters: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.white },
  content: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 10 },
  cardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  cardType: { fontSize: 12, color: theme.colors.textMuted },
  cardExpiry: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
