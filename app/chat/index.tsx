import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getConversations, getEmployees, getOrCreateConversation } from '../../lib/db';
import type { DbConversation, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, DbProfile>>({});
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [convs, emps] = await Promise.all([getConversations(user.id), getEmployees(rid)]);
    const map: Record<string, DbProfile> = {};
    emps.forEach((e) => { map[e.id] = e; });
    setProfiles(map);
    setEmployees(emps.filter((e) => e.id !== user.id));
    setConversations(convs);
    setLoading(false);
  }, [user, rid]);

  useEffect(() => { load(); }, [load]);

  const getOther = (c: DbConversation) => {
    const otherId = c.participant_a === user?.id ? c.participant_b : c.participant_a;
    return profiles[otherId];
  };

  const startConversation = async (emp: DbProfile) => {
    if (!user) return;
    setStarting(emp.id);
    const conv = await getOrCreateConversation(rid, user.id, emp.id);
    setStarting(null);
    setShowPicker(false);
    if (conv) {
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conv.id } } as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wiadomości</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowPicker(true)} activeOpacity={0.75}>
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={56} color={theme.colors.border} />
          <Text style={styles.emptyText}>Brak rozmów</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={theme.colors.white} />
            <Text style={styles.emptyBtnText}>Rozpocznij rozmowę</Text>
          </TouchableOpacity>
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

      {/* New Conversation Picker */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Nowa wiadomość</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pickerSub}>Wybierz osobę z zespołu</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {employees.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Brak pracowników w zespole</Text>
                </View>
              ) : (
                employees.map((emp) => {
                  const initials = `${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase();
                  const isLoading = starting === emp.id;
                  return (
                    <TouchableOpacity
                      key={emp.id}
                      style={styles.pickerRow}
                      onPress={() => startConversation(emp)}
                      activeOpacity={0.75}
                      disabled={!!starting}
                    >
                      <View style={[styles.avatar, { backgroundColor: emp.avatar_color ?? '#94A3B8' }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={styles.convInfo}>
                        <Text style={styles.convName}>{emp.first_name} {emp.last_name}</Text>
                        <Text style={styles.convJob}>{emp.job_title}</Text>
                      </View>
                      {isLoading
                        ? <ActivityIndicator size="small" color={theme.colors.primary} />
                        : <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                      }
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  newBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyText: { fontSize: 16, fontWeight: '600', color: theme.colors.textSecondary },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  convInfo: { flex: 1 },
  convName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  convJob: { fontSize: 12, color: theme.colors.textMuted },
  convTime: { fontSize: 11, color: theme.colors.textMuted },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 30 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  pickerSub: { fontSize: 13, color: theme.colors.textMuted, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
});
