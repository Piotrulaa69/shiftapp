import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

type Notification = {
  id: string;
  type: 'shift' | 'task' | 'leave' | 'swap' | 'message' | 'system';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  reference_id?: string;
};

const ICON_MAP: Record<string, { name: string; color: string; bg: string }> = {
  shift: { name: 'calendar', color: theme.colors.primary, bg: '#E3F2FD' },
  task: { name: 'list', color: '#F97316', bg: '#FFF7ED' },
  leave: { name: 'airplane', color: '#22C55E', bg: '#F0FDF4' },
  swap: { name: 'swap-horizontal', color: '#A855F7', bg: '#FAF5FF' },
  message: { name: 'chatbubble', color: '#6366F1', bg: '#EEF2FF' },
  system: { name: 'information-circle', color: '#64748B', bg: '#F1F5F9' },
};

function generateMockNotifications(): Notification[] {
  const now = new Date();
  return [
    { id: '1', type: 'shift', title: 'Nowa zmiana', body: 'Zaplanowano zmianę na jutro 08:00–16:00', read: false, created_at: new Date(now.getTime() - 30 * 60000).toISOString() },
    { id: '2', type: 'task', title: 'Zadanie przydzielone', body: 'Sprawdź nowe zadanie: Uzupełnij magazyn', read: false, created_at: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { id: '3', type: 'leave', title: 'Urlop zatwierdzony', body: 'Twój wniosek urlopowy 15–20 czerwca został zatwierdzony', read: true, created_at: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: '4', type: 'message', title: 'Nowa wiadomość', body: 'Anna K. wysłała Ci wiadomość', read: true, created_at: new Date(now.getTime() - 48 * 3600000).toISOString() },
    { id: '5', type: 'system', title: 'Witaj w ShiftApp!', body: 'Twoje konto zostało pomyślnie skonfigurowane.', read: true, created_at: new Date(now.getTime() - 72 * 3600000).toISOString() },
  ];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  return `${days}d temu`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production this would fetch from a notifications table
    setTimeout(() => {
      setNotifications(generateMockNotifications());
      setLoading(false);
    }, 300);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const ROUTE_MAP: Record<string, string> = {
    shift: '/(tabs)/schedule',
    task: '/(tabs)/tasks',
    leave: '/leave-requests',
    swap: '/shift-swap',
    message: '/chat',
    system: '/(tabs)/dashboard',
  };

  const handleNotificationPress = (item: Notification) => {
    setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n));
    const route = ROUTE_MAP[item.type] ?? '/(tabs)/dashboard';
    router.push(route as any);
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = ICON_MAP[item.type] ?? ICON_MAP.system;
    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.itemUnread]}
        activeOpacity={0.8}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <Ionicons name={`${icon.name}-outline` as any} size={20} color={icon.color} />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}>{item.title}</Text>
            {!item.read && <View style={styles.dot} />}
          </View>
          <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Powiadomienia</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Oznacz wszystkie</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 80 }} />}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color={theme.colors.border} />
          <Text style={styles.emptyTitle}>Brak powiadomień</Text>
          <Text style={styles.emptyBody}>Będziesz tu widzieć ważne informacje o zmianach, zadaniach i wiadomościach.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  markAllText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  list: { padding: 16, gap: 8 },
  item: { flexDirection: 'row', gap: 12, backgroundColor: theme.colors.card, borderRadius: 14, padding: 14 },
  itemUnread: { backgroundColor: '#F0F7FF', borderWidth: 1, borderColor: theme.colors.primary + '30' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  itemTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  itemTitleUnread: { fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary },
  itemBody: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
  itemTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  emptyBody: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
