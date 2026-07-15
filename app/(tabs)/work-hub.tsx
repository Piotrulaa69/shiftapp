import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../lib/i18n';
import { theme } from '../../styles/theme';

type HubTile = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  route: string;
  tab?: string;
  badge?: string;
  badgeColor?: string;
};

const MANAGEMENT_TILES: HubTile[] = [
  {
    id: 'team',
    title: 'Zespół',
    subtitle: 'Statystyki, zaproszenia, pełne zarządzanie',
    icon: 'people',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
    route: '/(tabs)/team-full',
  },
  {
    id: 'groups',
    title: 'Grupy',
    subtitle: 'Twórz grupy pracowników',
    icon: 'people-circle',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    route: '/(tabs)/groups',
  },
  {
    id: 'invites',
    title: 'Zaproszenia',
    subtitle: 'Wyślij zaproszenia do zespołu',
    icon: 'mail',
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    route: '/(tabs)/invites',
  },
  {
    id: 'leaves',
    title: 'Urlopy',
    subtitle: 'Zarządzaj wnioskami urlopowymi',
    icon: 'airplane',
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
    route: '/(tabs)/leaves',
  },
  {
    id: 'absences',
    title: 'Nieobecności',
    subtitle: 'Przeglądaj i zatwierdzaj nieobecności',
    icon: 'calendar-clear',
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
    route: '/(tabs)/absences',
  },
  {
    id: 'settings',
    title: 'Ustawienia',
    subtitle: 'Konfiguracja restauracji',
    icon: 'settings',
    iconColor: '#6B7280',
    iconBg: '#F3F4F6',
    route: '/(tabs)/settings',
  },
  {
    id: 'subscription',
    title: 'Subskrypcja',
    subtitle: 'Zarządzaj płatnościami',
    icon: 'card',
    iconColor: '#DB2777',
    iconBg: '#FDF2F8',
    route: '/(tabs)/subscription',
  },
  {
    id: 'courses',
    title: 'Kursy i szkolenia',
    subtitle: 'Twórz kursy, lekcje i tematy z video',
    icon: 'play-circle',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    route: '/(tabs)/kursy/manage',
  },
  {
    id: 'kiosk',
    title: 'Kiosk',
    subtitle: 'QR kod do logowania pracowników',
    icon: 'qr-code',
    iconColor: '#059669',
    iconBg: '#F0FDF4',
    route: '/kiosk',
  },
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
    title: 'Raporty',
    subtitle: 'Nadgodziny, nieobecności, statystyki',
    icon: 'bar-chart',
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
    route: '/reports',
  },
];

export default function WorkHubScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, isOwner, isManager } = useAuth();
  const isAdmin = isOwner || isManager;

  const tiles = MANAGEMENT_TILES;

  const navigate = (route: string, tab?: string) => {
    if (route === '/kiosk') {
      router.push({ pathname: '/kiosk', params: { rid: user?.restaurantId ?? '', mode: 'qr' } } as any);
      return;
    }
    if (tab) {
      router.push({ pathname: route as any, params: { tab } } as any);
    } else {
      router.push(route as any);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t('Zarządzanie')}</Text>
          <Text style={s.headerSub}>{user?.name}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <View style={s.grid}>
          {tiles.map((tile: HubTile) => (
            <TouchableOpacity
              key={tile.id}
              style={s.tile}
              onPress={() => navigate(tile.route, tile.tab)}
              activeOpacity={0.8}
            >
              <View style={[s.tileIconBox, { backgroundColor: tile.iconBg }]}>
                <Ionicons name={tile.icon as any} size={28} color={tile.iconColor} />
              </View>
              <Text style={s.tileTitle}>{t(tile.title)}</Text>
              <Text style={s.tileSub} numberOfLines={2}>{t(tile.subtitle)}</Text>
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
            {t('Tutaj zarządzasz wszystkim co dotyczy Twojej restauracji - zespół, grafik, urlopy i raporty.')}
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
