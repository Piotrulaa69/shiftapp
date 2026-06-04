import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const BASE_PRICE = 99; // 99 zł za 5 pracowników
const EXTRA_PRICE = 19; // 19 zł za każdego dodatkowego

export default function SubscriptionScreen() {
  const { restaurant } = useAuth();
  const router = useRouter();
  const [employeeCount, setEmployeeCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  const extraEmployees = Math.max(0, employeeCount - 5);
  const totalPrice = BASE_PRICE + (extraEmployees * EXTRA_PRICE);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (data) setSubscription(data);
    setLoading(false);
  };

  const handlePayment = async () => {
    Alert.alert('Informacja', 'Płatności kartą dostępne tylko w aplikacji mobilnej (iOS/Android)');
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Subskrypcja</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {subscription?.status === 'active' ? (
          <View style={s.activeCard}>
            <Ionicons name="checkmark-circle" size={48} color={theme.colors.green} />
            <Text style={s.activeTitle}>Subskrypcja aktywna</Text>
            <Text style={s.activeText}>
              Płacisz {subscription.total_amount / 100} zł/miesiąc za {subscription.employee_count} pracowników
            </Text>
            <Text style={s.activePeriod}>
              Okres: {new Date(subscription.current_period_start).toLocaleDateString('pl-PL')} - {new Date(subscription.current_period_end).toLocaleDateString('pl-PL')}
            </Text>
          </View>
        ) : (
          <>
            <View style={s.pricingCard}>
              <Text style={s.pricingTitle}>Plan subskrypcji</Text>
              <Text style={s.pricingSubtitle}>99 zł/miesiąc za 5 pracowników</Text>
              <Text style={s.pricingExtra}>+19 zł za każdego dodatkowego pracownika</Text>
            </View>

            <View style={s.counterCard}>
              <Text style={s.counterLabel}>Liczba pracowników</Text>
              <View style={s.counterControls}>
                <TouchableOpacity
                  style={s.counterBtn}
                  onPress={() => setEmployeeCount(Math.max(5, employeeCount - 1))}
                  disabled={employeeCount <= 5}
                >
                  <Ionicons name="remove" size={20} color={employeeCount <= 5 ? theme.colors.textMuted : theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.counterValue}>{employeeCount}</Text>
                <TouchableOpacity
                  style={s.counterBtn}
                  onPress={() => setEmployeeCount(employeeCount + 1)}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Podsumowanie</Text>
              <View style={s.summaryRow}>
                <Text style={s.summaryText}>Base (5 pracowników)</Text>
                <Text style={s.summaryText}>{BASE_PRICE} zł</Text>
              </View>
              {extraEmployees > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryText}>Dodatkowi ({extraEmployees} pracowników)</Text>
                  <Text style={s.summaryText}>{extraEmployees * EXTRA_PRICE} zł</Text>
                </View>
              )}
              <View style={[s.summaryRow, s.summaryTotal]}>
                <Text style={s.summaryTotalText}>Razem</Text>
                <Text style={s.summaryTotalText}>{totalPrice} zł/miesiąc</Text>
              </View>
            </View>

            <View style={s.cardSection}>
              <Text style={s.cardLabel}>Płatności kartą dostępne tylko w aplikacji mobilnej (iOS/Android)</Text>
            </View>

            <TouchableOpacity
              style={s.payBtn}
              onPress={handlePayment}
            >
              <Text style={s.payBtnText}>Zapłać {totalPrice} zł</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  scroll: { padding: 16, gap: 16 },
  activeCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 24, alignItems: 'center', gap: 12 },
  activeTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  activeText: { fontSize: 16, color: theme.colors.text, textAlign: 'center' },
  activePeriod: { fontSize: 14, color: theme.colors.textMuted },
  pricingCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, gap: 8 },
  pricingTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  pricingSubtitle: { fontSize: 16, color: theme.colors.text },
  pricingExtra: { fontSize: 14, color: theme.colors.textMuted },
  counterCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text, minWidth: 40, textAlign: 'center' },
  summaryCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, gap: 12 },
  summaryLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryText: { fontSize: 14, color: theme.colors.text },
  summaryTotal: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 },
  summaryTotalText: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  cardSection: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, gap: 12 },
  cardLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardField: { backgroundColor: theme.colors.surface },
  cardContainer: { height: 50 },
  payBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
