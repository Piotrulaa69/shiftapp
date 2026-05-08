import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getEmployees, getMessages, markMessagesRead, sendMessage } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import type { DbMessage, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, DbProfile>>({});
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);
    const [msgs, emps] = await Promise.all([getMessages(conversationId), getEmployees(rid)]);
    const map: Record<string, DbProfile> = {};
    emps.forEach((e) => { map[e.id] = e; });
    setProfiles(map);
    setMessages(msgs);
    setLoading(false);
    markMessagesRead(conversationId, user.id);
  }, [conversationId, user, rid]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const msg = payload.new as DbMessage;
        setMessages((prev) => [...prev, msg]);
        if (user && msg.sender_id !== user.id) markMessagesRead(conversationId, user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!body.trim() || !user || !conversationId) return;
    setSending(true);
    const msg = await sendMessage(conversationId, user.id, body.trim());
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      setBody('');
    }
    setSending(false);
  };

  const otherProfile = useCallback((): DbProfile | undefined => {
    if (!conversationId || !user) return undefined;
    // We find the other from messages or profiles
    const otherId = messages.find((m) => m.sender_id !== user.id)?.sender_id;
    return otherId ? profiles[otherId] : undefined;
  }, [messages, profiles, user]);

  const other = otherProfile();
  const otherName = other ? `${other.first_name} ${other.last_name}` : 'Rozmowa';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {other && (
            <View style={[styles.headerAvatar, { backgroundColor: other.avatar_color ?? '#94A3B8' }]}>
              <Text style={styles.headerAvatarText}>{(other.first_name[0] + other.last_name[0]).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.headerTitle}>{otherName}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMine = item.sender_id === user?.id;
              return (
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
                  <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                    {new Date(item.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={body}
              onChangeText={setBody}
              placeholder="Wiadomość..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !body.trim()} activeOpacity={0.7}>
              <Ionicons name="send" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 12, fontWeight: '700', color: theme.colors.white },
  headerTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  msgList: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 10, paddingHorizontal: 14, marginBottom: 8 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: theme.colors.card, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  bubbleTextMine: { color: theme.colors.white },
  bubbleTime: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.card },
  input: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: theme.colors.text },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
});
