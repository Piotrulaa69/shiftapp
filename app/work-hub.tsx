import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

type HubTile = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  route: string;
  badge?: string;
  badgeColor?: string;
};

const EMPLOYEE_TILES: HubTile[] = [
  {
    id: 'schedule',
    title: 'Grafik',
    subtitle: 'Zobacz swój harmonogram zmian',
    icon: 'calendar',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
    route: '/(tabs)/schedule',
  },
  {
    id: 'availability',
    title: 'Dyspozycyjność',
    subtitle: 'Ustaw dni i godziny, w których możesz pracować',
    icon: 'calendar-number',
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    route: '/availability',
  },
  {
    id: 'leave',
    title: 'Wnioski urlopowe',
    subtitle: 'Złóż wniosek lub sprawdź status',
    icon: 'airplane',
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
    route: '/leave-requests',
  },
  {
    id: 'time',
    title: 'Ewidencja czasu',
    subtitle: 'Sprawdź swoje godziny pracy',
    icon: 'time',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    route: '/(tabs)/time-tracking',
  },
];

const MANAGER_EXTRA_TILES: HubTile[] = [
  {
    id: 'schedule-editor',
    title: 'Edycja grafiku',
    subtitle: 'Zarządzaj zmianami zespołu',
    icon: 'create',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
    route: '/schedule-editor',
  },
  {
    id: 'reports',
    title: 'Raporty czasu',
    subtitle: 'Nadgodziny, nieobecności, statystyki',
    icon: 'bar-chart',
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
    route: '/reports',
  },
];

export default function WorkHubScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const isAdmin = isOwner || isManager;

  const tiles = isAdmin ? [...EMPLOYEE_TILES, ...MANAGER_EXTRA_TILES] : EMPLOYEE_TILES;

  const navigate = (route: string) => router.push(route as any);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Czas pracy</Text>
          <Text style={s.headerSub}>{user?.name}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <View style={s.grid}>
          {tiles.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={s.tile}
              onPress={() => navigate(tile.route)}
              activeOpacity={0.8}
            >
              <View style={[s.tileIconBox, { backgroundColor: tile.iconBg }]}>
                <Ionicons name={tile.icon as any} size={28} color={tile.iconColor} />
              </View>
              <Text style={s.tileTitle}>{tile.title}</Text>
              <Text style={s.tileSub} numberOfLines={2}>{tile.subtitle}</Text>
              <View style={s.tileArrow}>
                <Ionicons name="chevron-forward" size={16} color={tile.iconColor} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick info strip */}
        <View style={s.infoStrip}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
          <Text style={s.infoText}>
            Dyspozycyjność i wnioski urlopowe są rozpatrywane przez managera w ciągu 2 dni roboczych.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47.5%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    gap: 8,
    position: 'relative',
    ...theme.shadows.card,
  },
  tileIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tileSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  tileArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  infoStrip: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
});
