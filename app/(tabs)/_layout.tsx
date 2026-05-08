import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../styles/theme';

const TAB_CONFIG: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Panel', icon: 'grid' },
  schedule: { label: 'Grafik', icon: 'calendar' },
  tasks: { label: 'Zadania', icon: 'list' },
  szkolenia: { label: 'Szkolenia', icon: 'school' },
  admin: { label: 'Zarządzanie', icon: 'settings' },
};

const NAV_ITEMS_BASE = [
  { key: 'dashboard', route: '/(tabs)/dashboard' as const },
  { key: 'schedule', route: '/(tabs)/schedule' as const },
  { key: 'tasks', route: '/(tabs)/tasks' as const },
  { key: 'szkolenia', route: '/(tabs)/szkolenia' as const },
];

const NAV_ITEM_ADMIN = { key: 'admin', route: '/(tabs)/admin' as const };

/* ─────────────── DESKTOP SIDEBAR ─────────────── */
function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, isOwner, isManager, restaurant, user } = useAuth();
  const NAV_ITEMS = (isOwner || isManager) ? [...NAV_ITEMS_BASE, NAV_ITEM_ADMIN] : NAV_ITEMS_BASE;

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
          <View style={sideStyles.userAvatar}>
            <Text style={sideStyles.userInitials}>{user?.initials ?? '??'}</Text>
          </View>
          <View style={sideStyles.userInfo}>
            <Text style={sideStyles.userName} numberOfLines={1}>{user?.name}</Text>
            <Text style={sideStyles.userRole} numberOfLines={1}>{restaurant?.name ?? user?.jobTitle}</Text>
          </View>
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
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  logo: { width: 220, height: 80 },
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
});

/* ─────────────── MOBILE TAB BAR ─────────────── */
function MobileTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const visibleRoutes = state.routes.filter((r) => r.name in TAB_CONFIG);
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);

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

  return (
    <View style={[tabStyles.container, { paddingBottom: insets.bottom || 8 }]}>
      {leftRoutes.map((r) => renderTab(r))}
      <TouchableOpacity
        style={tabStyles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/shift-detail' as any)}
      >
        <Ionicons name="finger-print" size={28} color={theme.colors.white} />
      </TouchableOpacity>
      {rightRoutes.map((r) => renderTab(r))}
    </View>
  );
}

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
});

/* ─────────────── ROOT ─────────────── */
export default function TabLayout() {
  const { isAuthenticated, isOwner, isManager, isLoading } = useAuth();
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

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
        <Sidebar />
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
            <Tabs.Screen name="team" options={{ href: null }} />
          </Tabs>
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
      <Tabs.Screen name="team" options={{ href: null }} />
    </Tabs>
  );
}
