import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { theme } from '../styles/theme';

type Props = {
  /** Leftmost content — typically title or greeting */
  left: React.ReactNode;
  /** Optional extra content between left and action icons */
  center?: React.ReactNode;
};

export default function MobileHeader({ left, center }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <View style={styles.header}>
      <View style={styles.left}>{left}</View>
      {center && <View style={styles.center}>{center}</View>}
      <View style={styles.right}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/chat' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/notifications' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/profile' as any)} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.initials ?? '?'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  left: { flex: 1, minWidth: 0 },
  center: { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.card,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
