import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppNotification, useNotifications } from '../context/NotificationsContext';
import { theme } from '../styles/theme';

const ICON_MAP: Record<string, { name: string; color: string; bg: string }> = {
  shift: { name: 'calendar', color: theme.colors.primary, bg: '#E3F2FD' },
  task: { name: 'list', color: '#F97316', bg: '#FFF7ED' },
  leave: { name: 'airplane', color: '#22C55E', bg: '#F0FDF4' },
  swap: { name: 'swap-horizontal', color: '#A855F7', bg: '#FAF5FF' },
  message: { name: 'chatbubble', color: '#6366F1', bg: '#EEF2FF' },
  system: { name: 'information-circle', color: '#64748B', bg: '#F1F5F9' },
};

const ROUTE_MAP: Record<string, string> = {
  shift: '/(tabs)/schedule',
  task: '/(tabs)/tasks',
  leave: '/leave-requests',
  swap: '/shift-swap',
  message: '/chat',
  system: '/(tabs)/dashboard',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  return `${days}d temu`;
}

type UndoState = { notification: AppNotification; timer: ReturnType<typeof setTimeout> } | null;

export default function NotificationsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { notifications, markAllRead, markRead, markUnread, deleteNotification, restoreNotification } = useNotifications();

  const [undoState, setUndoState] = useState<UndoState>(null);
  const snackAnim = useRef(new Animated.Value(0)).current;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const showSnack = () => {
    Animated.sequence([
      Animated.timing(snackAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const hideSnack = () => {
    Animated.timing(snackAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const handleDelete = (item: AppNotification) => {
    if (undoState) {
      clearTimeout(undoState.timer);
    }
    deleteNotification(item.id);
    showSnack();
    const timer = setTimeout(() => {
      setUndoState(null);
      hideSnack();
    }, 3000);
    setUndoState({ notification: item, timer });
  };

  const handleUndo = () => {
    if (!undoState) return;
    clearTimeout(undoState.timer);
    restoreNotification(undoState.notification);
    setUndoState(null);
    hideSnack();
  };

  const handlePress = (item: AppNotification) => {
    markRead(item.id);
    const route = ROUTE_MAP[item.type] ?? '/(tabs)/dashboard';
    router.push(`${route}?highlight=${item.reference_id ?? item.id}` as any);
  };

  const handleToggleRead = (item: AppNotification) => {
    if (item.read) {
      markUnread(item.id);
    } else {
      markRead(item.id);
    }
  };

  useEffect(() => {
    return () => {
      if (undoState) clearTimeout(undoState.timer);
    };
  }, [undoState]);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const icon = ICON_MAP[item.type] ?? ICON_MAP.system;
    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.itemUnread]}
        activeOpacity={0.8}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <Ionicons name={`${icon.name}-outline` as any} size={20} color={icon.color} />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>{item.title}</Text>
            {!item.read && <View style={styles.dot} />}
          </View>
          <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => { e.stopPropagation(); handleToggleRead(item); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={item.read ? 'mail-unread-outline' : 'checkmark-done-outline'}
              size={18}
              color={item.read ? theme.colors.textMuted : theme.colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => { e.stopPropagation(); handleDelete(item); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const snackTranslate = snackAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Powiadomienia</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Wszystkie przeczytane</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 120 }} />
        )}
      </View>

      {notifications.length === 0 && !undoState ? (
        <View style={[styles.empty, isDesktop && styles.desktopContainer]}>
          <Ionicons name="notifications-off-outline" size={48} color={theme.colors.border} />
          <Text style={styles.emptyTitle}>Brak powiadomień</Text>
          <Text style={styles.emptyBody}>Będziesz tu widzieć ważne informacje o zmianach, zadaniach i wiadomościach.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, isDesktop && styles.listDesktop]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Undo snackbar */}
      <Animated.View
        style={[
          styles.snack,
          isDesktop && styles.snackDesktop,
          { transform: [{ translateY: snackTranslate }], opacity: snackAnim },
        ]}
        pointerEvents={undoState ? 'auto' : 'none'}
      >
        <Text style={styles.snackText}>Powiadomienie usunięte</Text>
        <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
          <Text style={styles.undoText}>COFNIJ</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { padding: 4, width: 36 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  markAllBtn: { alignItems: 'flex-end' },
  markAllText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  listDesktop: { maxWidth: 700, alignSelf: 'center' as const, width: '100%', paddingHorizontal: 32 },
  desktopContainer: { maxWidth: 700, alignSelf: 'center' as const, width: '100%' },
  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  itemUnread: { backgroundColor: '#F0F7FF', borderWidth: 1, borderColor: theme.colors.primary + '30' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemContent: { flex: 1, minWidth: 0 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  itemTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, flex: 1 },
  itemTitleUnread: { fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary, flexShrink: 0 },
  itemBody: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
  itemTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 4, flexShrink: 0 },
  actionBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  emptyBody: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 19 },
  snack: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  snackDesktop: { maxWidth: 480, alignSelf: 'center' as const, left: undefined, right: undefined },
  snackText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  undoBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  undoText: { fontSize: 13, fontWeight: '800', color: theme.colors.primary, letterSpacing: 0.5 },
});
