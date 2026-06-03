import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { theme } from '../../styles/theme';

const TAB_CONFIG: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Panel', icon: 'grid' },
  schedule: { label: 'Grafik', icon: 'calendar' },
  tasks: { label: 'Zadania', icon: 'list' },
  szkolenia: { label: 'Szkolenia', icon: 'school' },
  admin: { label: 'Zarządzanie', icon: 'settings' },
  documents: { label: 'Dokumenty', icon: 'folder-open' },
  'work-hub': { label: 'Zarządzanie', icon: 'settings' },
  // hidden tabs — keep for routing compatibility
  'schedule-ai': { label: 'Grafik AI', icon: 'sparkles' },
  'documents-ai': { label: 'Dokumenty AI', icon: 'document-text' },
  'time-tracking': { label: 'Ewidencja', icon: 'time' },
  team: { label: 'Zespół', icon: 'people' },
};

const NAV_ITEMS_BASE = [
  { key: 'dashboard', route: '/(tabs)/dashboard' as const },
  { key: 'schedule', route: '/(tabs)/schedule' as const },
  { key: 'tasks', route: '/(tabs)/tasks' as const },
  { key: 'szkolenia', route: '/(tabs)/szkolenia' as const },
];

const NAV_ITEMS_ADMIN_EXTRA: { key: string; route: any }[] = [
  { key: 'documents', route: '/documents' },
  { key: 'work-hub', route: '/work-hub' },
];

/* ─────────────── NOTIFICATION BELL ─────────────── */
function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  return (
    <TouchableOpacity
      style={bellStyles.btn}
      onPress={() => router.push('/notifications' as any)}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
      {unreadCount > 0 && (
        <View style={bellStyles.badge}>
          <Text style={bellStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const bellStyles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.card,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});

/* ─────────────── DESKTOP SIDEBAR ─────────────── */
function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, isOwner, isManager, restaurant, user } = useAuth();
  const NAV_ITEMS = (isOwner || isManager)
    ? [...NAV_ITEMS_BASE, ...NAV_ITEMS_ADMIN_EXTRA]
    : NAV_ITEMS_BASE;

  return (
    <View style={sideStyles.sidebar}>
      <View style={sideStyles.logoRow}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={sideStyles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView style={sideStyles.navScroll} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const cfg = TAB_CONFIG[item.key];
          const isActive = pathname.includes(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={[sideStyles.navItem, isActive && sideStyles.navItemActive]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[sideStyles.navIcon, isActive && sideStyles.navIconActive]}>
                <Ionicons
                  name={(isActive ? cfg.icon : `${cfg.icon}-outline`) as any}
                  size={20}
                  color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
              <Text style={[sideStyles.navLabel, isActive && sideStyles.navLabelActive]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={sideStyles.bottom}>
        <View style={sideStyles.userRow}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }} onPress={() => router.push('/profile' as any)} activeOpacity={0.7}>
            <View style={sideStyles.userAvatar}>
              <Text style={sideStyles.userInitials}>{user?.initials ?? '??'}</Text>
            </View>
            <View style={sideStyles.userInfo}>
              <Text style={sideStyles.userName} numberOfLines={1}>{user?.name}</Text>
              <Text style={sideStyles.userRole} numberOfLines={1}>{restaurant?.name ?? user?.jobTitle}</Text>
            </View>
          </TouchableOpacity>
          <NotificationBell />
        </View>
        <TouchableOpacity style={sideStyles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textMuted} />
          <Text style={sideStyles.logoutText}>Wyloguj</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sideStyles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: theme.colors.card,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    flexDirection: 'column',
  },
  logoRow: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  logo: { width: 236, height: 110 },
  navScroll: { flex: 1, paddingTop: 16 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    gap: 12,
  },
  navItemActive: { backgroundColor: theme.colors.primaryLight },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: { backgroundColor: theme.colors.primaryLight },
  navLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  navLabelActive: { color: theme.colors.primary },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitials: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  userRole: { fontSize: 11, color: theme.colors.textMuted },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  logoutText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  sideActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sideActionText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
});

/* ─────────────── MOBILE TAB BAR ─────────────── */
type FabAction = { icon: string; label: string; onPress: () => void };

function MobileTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isOwner, isManager } = useAuth();
  const isAdmin = isOwner || isManager;
  const [fabOpen, setFabOpen] = useState(false);

  // Only show Dashboard (Start) and Schedule in bottom nav, rest goes to FAB
  const MOBILE_VISIBLE = ['dashboard', 'schedule'];
  const visibleRoutes = state.routes.filter((r) =>
    MOBILE_VISIBLE.includes(r.name)
  );
  const leftRoutes = visibleRoutes.slice(0, 1); // Just Dashboard
  const rightRoutes = visibleRoutes.slice(1);  // Just Schedule

  const { unreadCount } = useNotifications();

  const renderTab = (route: (typeof state.routes)[0]) => {
    const cfg = TAB_CONFIG[route.name] ?? { label: route.name, icon: 'ellipse' };
    const focused = state.routes[state.index]?.name === route.name;
    const color = focused ? theme.colors.primary : theme.colors.textMuted;
    return (
      <TouchableOpacity
        key={route.key}
        style={tabStyles.tab}
        onPress={() => navigation.navigate(route.name)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={focused ? (cfg.icon as any) : (`${cfg.icon}-outline` as any)}
          size={22}
          color={color}
        />
        <Text style={[tabStyles.label, { color }]}>{cfg.label}</Text>
      </TouchableOpacity>
    );
  };

  const adminFocused = state.routes[state.index]?.name === 'admin';

  const adminActions: FabAction[] = [
    { icon: 'list-outline', label: 'Zadania', onPress: () => router.push('/(tabs)/tasks' as any) },
    { icon: 'school-outline', label: 'Szkolenia', onPress: () => router.push('/(tabs)/szkolenia' as any) },
    { icon: 'settings-outline', label: 'Zarządzanie', onPress: () => router.push('/work-hub' as any) },
    { icon: 'folder-open-outline', label: 'Dokumenty', onPress: () => router.push('/documents' as any) },
  ];

  const employeeActions: FabAction[] = [
    { icon: 'list-outline', label: 'Zadania', onPress: () => router.push('/(tabs)/tasks' as any) },
    { icon: 'school-outline', label: 'Szkolenia', onPress: () => router.push('/(tabs)/szkolenia' as any) },
    { icon: 'people-outline', label: 'Zespół', onPress: () => router.push('/(tabs)/team' as any) },
    { icon: 'finger-print-outline', label: 'Moja zmiana', onPress: () => router.push('/shift-detail' as any) },
    { icon: 'chatbubble-outline', label: 'Czat', onPress: () => router.push('/chat' as any) },
  ];

  const actions = isAdmin ? adminActions : employeeActions;

  const handleFabPress = () => {
    setFabOpen(true);
  };

  const handleAction = (action: FabAction) => {
    setFabOpen(false);
    setTimeout(() => action.onPress(), 150);
  };

  return (
    <>
      <Modal visible={fabOpen} transparent animationType="fade" onRequestClose={() => setFabOpen(false)}>
        <Pressable style={fabMenuStyles.overlay} onPress={() => setFabOpen(false)}>
          <View style={[fabMenuStyles.menu, { bottom: 90 + (insets.bottom || 8) }]}>
            {actions.map((a, i) => (
              <TouchableOpacity key={i} style={fabMenuStyles.menuItem} onPress={() => handleAction(a)} activeOpacity={0.7}>
                <View style={fabMenuStyles.menuIcon}>
                  <Ionicons name={a.icon as any} size={20} color={theme.colors.primary} />
                </View>
                <Text style={fabMenuStyles.menuLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
      <View style={[tabStyles.container, { paddingBottom: insets.bottom || 8 }]}>
        {leftRoutes.map((r) => renderTab(r))}
        <TouchableOpacity
          style={[tabStyles.fab, (adminFocused || fabOpen) && tabStyles.fabActive]}
          activeOpacity={0.85}
          onPress={handleFabPress}
        >
          <Ionicons name={fabOpen ? 'close' : (isAdmin ? 'add' : 'apps')} size={26} color={theme.colors.white} />
        </TouchableOpacity>
        {rightRoutes.map((r) => renderTab(r))}
      </View>
    </>
  );
}

const fabMenuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menu: {
    position: 'absolute',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 8,
    minWidth: 200,
    ...theme.shadows.medium,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
});

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    paddingHorizontal: 4,
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    gap: 3,
  },
  label: { fontSize: 10, fontWeight: '600' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...theme.shadows.fab,
  },
  fabActive: {
    backgroundColor: '#1a56db',
  },
  fabLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: theme.colors.white,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});

const topbarStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    height: 52,
  },
});

/* ─────────────── ROOT ─────────────── */
export default function TabLayout() {
  const { isAuthenticated, isOwner, isManager, isSuperAdmin, isLoading } = useAuth();
  const showAdmin = isOwner || isManager;
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (isSuperAdmin) return <Redirect href={'/super-admin' as any} />;

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
        <Sidebar />
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View style={{ flex: 1 }}>
          <Tabs
            tabBar={() => null}
            screenOptions={{ headerShown: false }}
          >
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="schedule" />
            <Tabs.Screen name="tasks" />
            <Tabs.Screen name="szkolenia" />
            <Tabs.Screen name="admin" options={{ href: showAdmin ? undefined : null }} />
            <Tabs.Screen name="schedule-ai" options={{ href: null }} />
            <Tabs.Screen name="time-tracking" options={{ href: null }} />
            <Tabs.Screen name="documents-ai" options={{ href: null }} />
            <Tabs.Screen name="team" options={{ href: null }} />
            <Tabs.Screen name="documents" options={{ href: null }} />
            <Tabs.Screen name="work-hub" options={{ href: null }} />
            <Tabs.Screen name="leave-requests" options={{ href: null }} />
            <Tabs.Screen name="reports" options={{ href: null }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
            <Tabs.Screen name="availability" options={{ href: null }} />
          </Tabs>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <MobileTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="szkolenia" />
      <Tabs.Screen name="admin" options={{ href: showAdmin ? undefined : null }} />
      <Tabs.Screen name="schedule-ai" options={{ href: null }} />
      <Tabs.Screen name="time-tracking" options={{ href: null }} />
      <Tabs.Screen name="documents-ai" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="work-hub" options={{ href: null }} />
      <Tabs.Screen name="leave-requests" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="availability" options={{ href: null }} />
    </Tabs>
  );
}
