import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getConversations, getEmployees } from '../../lib/db';
import type { DbConversation, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, DbProfile>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [convs, emps] = await Promise.all([getConversations(user.id), getEmployees(rid)]);
    const map: Record<string, DbProfile> = {};
    emps.forEach((e) => { map[e.id] = e; });
    setProfiles(map);
    setConversations(convs);
    setLoading(false);
  }, [user, rid]);

  useEffect(() => { load(); }, [load]);

  const getOther = (c: DbConversation) => {
    const otherId = c.participant_a === user?.id ? c.participant_b : c.participant_a;
    return profiles[otherId];
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wiadomości</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={56} color={theme.colors.border} />
          <Text style={styles.emptyText}>Brak rozmów</Text>
          <Text style={styles.emptySubtext}>Rozpocznij rozmowę z profilu pracownika</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const other = getOther(item);
            const initials = other
              ? (other.first_name[0] + other.last_name[0]).toUpperCase()
              : '??';
            const name = other ? `${other.first_name} ${other.last_name}` : 'Nieznany';
            const time = item.last_message_at
              ? new Date(item.last_message_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
              : '';
            return (
              <TouchableOpacity
                style={styles.convRow}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: item.id } } as any)}
              >
                <View style={[styles.avatar, { backgroundColor: other?.avatar_color ?? '#94A3B8' }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.convInfo}>
                  <Text style={styles.convName}>{name}</Text>
                  <Text style={styles.convJob}>{other?.job_title ?? ''}</Text>
                </View>
                <Text style={styles.convTime}>{time}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600', color: theme.colors.textSecondary },
  emptySubtext: { fontSize: 13, color: theme.colors.textMuted },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  convInfo: { flex: 1 },
  convName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  convJob: { fontSize: 12, color: theme.colors.textMuted },
  convTime: { fontSize: 11, color: theme.colors.textMuted },
});
