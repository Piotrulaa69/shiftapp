import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';
import { theme } from '../styles/theme';

export default function TrialBanner() {
  const { subscription } = useSubscription();

  if (!subscription) return null;

  // Hide banner for active paid subscriptions
  if (subscription.status === 'active') return null;

  // Trial expired — show blocked banner
  if (subscription.isTrialExpired) {
    return (
      <View style={[styles.banner, styles.expiredBanner]}>
        <Ionicons name="lock-closed" size={14} color="#fff" />
        <Text style={styles.expiredText}>
          Okres próbny wygasł — skontaktuj się z nami, aby aktywować subskrypcję
        </Text>
      </View>
    );
  }

  // Trial active — show watermark / days left
  if (subscription.status === 'trial') {
    const days = subscription.trialDaysLeft ?? 0;
    const isUrgent = days <= 7;
    return (
      <View style={[styles.banner, isUrgent ? styles.urgentBanner : styles.trialBanner]}>
        <View style={styles.left}>
          <Ionicons name="time-outline" size={14} color={isUrgent ? '#fff' : theme.colors.primary} />
          <Text style={[styles.label, isUrgent && styles.labelUrgent]}>
            Okres próbny · Pakiet Basic
          </Text>
        </View>
        <View style={[styles.daysBadge, isUrgent ? styles.daysBadgeUrgent : styles.daysBadgeTrial]}>
          <Text style={[styles.daysText, isUrgent && styles.daysTextUrgent]}>
            {days > 0 ? `${days} ${days === 1 ? 'dzień' : 'dni'}` : 'ostatni dzień'}
          </Text>
        </View>
      </View>
    );
  }

  // Overdue / cancelled / paused
  if (subscription.status === 'overdue' || subscription.status === 'paused') {
    return (
      <View style={[styles.banner, styles.expiredBanner]}>
        <Ionicons name="alert-circle" size={14} color="#fff" />
        <Text style={styles.expiredText}>
          {subscription.status === 'overdue'
            ? 'Subskrypcja przeterminowana — prosimy o uregulowanie płatności'
            : 'Subskrypcja zawieszona — skontaktuj się z obsługą'}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    // On web, stick below the header; on native it just renders in flow
    ...(Platform.OS === 'web' ? { position: 'relative' as const } : {}),
  },
  trialBanner: {
    backgroundColor: theme.colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary + '30',
  },
  urgentBanner: {
    backgroundColor: '#F97316',
  },
  expiredBanner: {
    backgroundColor: theme.colors.error,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  labelUrgent: {
    color: '#fff',
  },
  daysBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  daysBadgeTrial: {
    backgroundColor: theme.colors.primary,
  },
  daysBadgeUrgent: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  daysText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  daysTextUrgent: {
    color: '#fff',
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
});
