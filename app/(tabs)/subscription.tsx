import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const BASE_PRICE = 99;   // 99 zł za 5 pracowników
const BASE_EMP   = 5;    // minimalna obsada
const EXTRA_PRICE = 19;  // 19 zł za każdego dodatkowego

export default function SubscriptionScreen() {
  const { restaurant } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [employeeCount, setEmployeeCount] = useState(BASE_EMP);
  const [realEmpCount, setRealEmpCount] = useState(BASE_EMP);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  const loadedRestaurantId = useRef<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [updating, setUpdating] = useState(false);

  const calcPrice = (emp: number) => BASE_PRICE + Math.max(0, emp - BASE_EMP) * EXTRA_PRICE;
  const extraEmployees = Math.max(0, employeeCount - BASE_EMP);
  const totalPrice = calcPrice(employeeCount);

  const loadSubscription = useCallback(async () => {
    if (!restaurant?.id) return;
    setLoading(true);

    const [{ data, error }, { count: profileCount }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .eq('is_super_admin', false),
    ]);

    const actualEmp = Math.max(BASE_EMP, profileCount ?? BASE_EMP);
    setRealEmpCount(actualEmp);

    if (!error && data) {
      setSubscription(data);
      // Always use real headcount — ignore stale employee_count in DB
      setEmployeeCount(actualEmp);
    } else {
      setEmployeeCount(actualEmp);
    }
    setLoading(false);
  }, [restaurant?.id]);

  useEffect(() => {
    if (restaurant?.id && restaurant.id !== loadedRestaurantId.current) {
      loadedRestaurantId.current = restaurant.id;
      loadSubscription();
    }
  }, [restaurant?.id, loadSubscription]);

  useEffect(() => {
    if (params.success === 'true') {
      Alert.alert('Sukces', 'Płatność zakończona pomyślnie!');
      loadSubscription();
    } else if (params.canceled === 'true') {
      Alert.alert('Anulowano', 'Płatność została anulowana.');
    }
  }, [params, loadSubscription]);

  const handlePayment = async () => {
    if (!restaurant?.id) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { restaurant_id: restaurant.id, employee_count: employeeCount, platform: Platform.OS === 'web' ? 'web' : 'mobile' },
      });
      if (error) throw error;
      if (Platform.OS === 'web' && data?.checkoutUrl) {
        (window as any).location.href = data.checkoutUrl;
      } else {
        Alert.alert('Informacja', 'Płatności kartą dostępne w aplikacji mobilnej (iOS/Android)');
      }
    } catch (err: any) {
      Alert.alert('Błąd', err.message || 'Wystąpił błąd podczas przetwarzania płatności');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateEmployees = async () => {
    if (!restaurant?.id || !subscription) return;
    setUpdating(true);
    const newAmount = calcPrice(employeeCount);
    const { error } = await supabase
      .from('subscriptions')
      .update({ employee_count: employeeCount, amount: newAmount, updated_at: new Date().toISOString() })
      .eq('restaurant_id', restaurant.id);
    setUpdating(false);
    if (error) {
      Alert.alert('Błąd', 'Nie udało się zaktualizować subskrypcji.');
    } else {
      setEditMode(false);
      loadSubscription();
      Alert.alert('Zaktualizowano', `Subskrypcja zmieniona na ${employeeCount} pracowników — ${newAmount} zł/mies.`);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Zakończ subskrypcję',
      'Czy na pewno chcesz zakończyć subskrypcję? Dostęp będzie aktywny do końca opłaconego okresu.',
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Zakończ subskrypcję', style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            const { error } = await supabase
              .from('subscriptions')
              .update({ status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('restaurant_id', restaurant?.id);
            setCancelling(false);
            if (error) {
              Alert.alert('Błąd', 'Nie udało się zakończyć subskrypcji. Skontaktuj się z supportem.');
            } else {
              loadSubscription();
              Alert.alert('Subskrypcja zakończona', 'Twoja subskrypcja została zakończona. Dostęp wygasa z końcem okresu rozliczeniowego.');
            }
          },
        },
      ]
    );
  };

  const isActive = subscription?.status === 'active';
  const isTrial  = subscription?.status === 'trial';
  const isCancelled = subscription?.status === 'cancelled';
  const currentEmp = realEmpCount; // always from actual profiles count
  const currentAmount = calcPrice(currentEmp); // always auto-calculated

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    active:    { label: 'Aktywna',    color: '#059669', bg: '#F0FDF4' },
    trial:     { label: 'Okres próbny', color: '#D97706', bg: '#FFFBEB' },
    overdue:   { label: 'Zaległa',    color: '#DC2626', bg: '#FEF2F2' },
    cancelled: { label: 'Zakończona', color: '#6B7280', bg: '#F9FAFB' },
    paused:    { label: 'Wstrzymana', color: '#7C3AED', bg: '#F5F3FF' },
  };
  const statusCfg = STATUS_CFG[subscription?.status] ?? STATUS_CFG.trial;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
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

        {/* ── ACTIVE / TRIAL subscription ── */}
        {subscription && (
          <View style={s.activeCard}>
            <View style={s.activeTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.activeTitle}>Twoja subskrypcja</Text>
                <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                </View>
              </View>
              <View style={s.priceBox}>
                <Text style={s.priceAmount}>{currentAmount} zł</Text>
                <Text style={s.pricePeriod}>/miesiąc</Text>
              </View>
            </View>

            <View style={s.divider} />

            {/* Details */}
            <View style={s.detailRow}>
              <Ionicons name="people-outline" size={16} color={theme.colors.textMuted} />
              <Text style={s.detailText}>Kont pracowników: <Text style={{ fontWeight: '700' }}>{currentEmp}</Text> <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>(wykryto automatycznie)</Text></Text>
            </View>
            <View style={s.detailRow}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.textMuted} />
              <Text style={s.detailText}>
                {BASE_PRICE} zł (base){currentEmp > BASE_EMP ? ` + ${currentEmp - BASE_EMP} × ${EXTRA_PRICE} zł = ` : ' = '}<Text style={{ fontWeight: '700', color: theme.colors.primary }}>{currentAmount} zł</Text>
              </Text>
            </View>
            {subscription.next_payment_date && (
              <View style={s.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                <Text style={s.detailText}>Następna płatność: <Text style={{ fontWeight: '700' }}>{new Date(subscription.next_payment_date).toLocaleDateString('pl-PL')}</Text></Text>
              </View>
            )}
          </View>
        )}

        {/* ── EDIT employee count (for active/trial) ── */}
        {subscription && !isCancelled && (
          <View style={s.editCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={s.editCardTitle}>Zmień liczbę pracowników</Text>
              {!editMode && (
                <TouchableOpacity onPress={() => setEditMode(true)} style={s.editBtn} activeOpacity={0.7}>
                  <Ionicons name="pencil-outline" size={14} color={theme.colors.primary} />
                  <Text style={s.editBtnText}>Edytuj</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Pricing info */}
            <View style={s.pricingInfoRow}>
              <View style={s.pricingInfoItem}>
                <Text style={s.pricingInfoNum}>99 zł</Text>
                <Text style={s.pricingInfoLabel}>Base (5 prac.)</Text>
              </View>
              <View style={s.pricingInfoSep}><Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>+</Text></View>
              <View style={s.pricingInfoItem}>
                <Text style={s.pricingInfoNum}>{EXTRA_PRICE} zł</Text>
                <Text style={s.pricingInfoLabel}>każdy kolejny</Text>
              </View>
            </View>

            {editMode && (
              <>
                <View style={s.counterCard}>
                  <Text style={s.counterLabel}>Liczba pracowników</Text>
                  <View style={s.counterControls}>
                    <TouchableOpacity
                      style={[s.counterBtn, employeeCount <= BASE_EMP && s.counterBtnDisabled]}
                      onPress={() => setEmployeeCount(Math.max(BASE_EMP, employeeCount - 1))}
                      disabled={employeeCount <= BASE_EMP}
                    >
                      <Ionicons name="remove" size={20} color={employeeCount <= BASE_EMP ? theme.colors.textMuted : theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={s.counterValue}>{employeeCount}</Text>
                    <TouchableOpacity style={s.counterBtn} onPress={() => setEmployeeCount(employeeCount + 1)}>
                      <Ionicons name="add" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Summary */}
                <View style={s.summaryCard}>
                  <View style={s.summaryRow}>
                    <Text style={s.summaryText}>Base ({BASE_EMP} pracowników)</Text>
                    <Text style={s.summaryText}>{BASE_PRICE} zł</Text>
                  </View>
                  {extraEmployees > 0 && (
                    <View style={s.summaryRow}>
                      <Text style={s.summaryText}>Dodatkowi ({extraEmployees} × {EXTRA_PRICE} zł)</Text>
                      <Text style={s.summaryText}>{extraEmployees * EXTRA_PRICE} zł</Text>
                    </View>
                  )}
                  <View style={[s.summaryRow, s.summaryTotal]}>
                    <Text style={s.summaryTotalText}>Razem</Text>
                    <Text style={s.summaryTotalText}>{totalPrice} zł/miesiąc</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <TouchableOpacity style={s.cancelEditBtn} onPress={() => { setEditMode(false); setEmployeeCount(Math.max(BASE_EMP, currentEmp)); }} activeOpacity={0.7}>
                    <Text style={s.cancelEditText}>Anuluj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.saveBtn, updating && { opacity: 0.6 }]} onPress={handleUpdateEmployees} disabled={updating} activeOpacity={0.8}>
                    {updating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Zapisz zmiany</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── NO subscription — pricing + payment ── */}
        {!subscription && (
          <>
            <View style={s.pricingCard}>
              <Text style={s.pricingTitle}>Cennik</Text>
              <View style={s.pricingInfoRow}>
                <View style={s.pricingInfoItem}>
                  <Text style={[s.pricingInfoNum, { fontSize: 22 }]}>99 zł</Text>
                  <Text style={s.pricingInfoLabel}>Base (5 prac.)</Text>
                </View>
                <View style={s.pricingInfoSep}><Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>+</Text></View>
                <View style={s.pricingInfoItem}>
                  <Text style={[s.pricingInfoNum, { fontSize: 22 }]}>{EXTRA_PRICE} zł</Text>
                  <Text style={s.pricingInfoLabel}>każdy kolejny</Text>
                </View>
              </View>
              <Text style={s.pricingExtra}>Minimalna obsada restauracji: {BASE_EMP} pracowników</Text>
            </View>

            <View style={s.counterCard}>
              <Text style={s.counterLabel}>Liczba pracowników</Text>
              <View style={s.counterControls}>
                <TouchableOpacity
                  style={[s.counterBtn, employeeCount <= BASE_EMP && s.counterBtnDisabled]}
                  onPress={() => setEmployeeCount(Math.max(BASE_EMP, employeeCount - 1))}
                  disabled={employeeCount <= BASE_EMP}
                >
                  <Ionicons name="remove" size={20} color={employeeCount <= BASE_EMP ? theme.colors.textMuted : theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.counterValue}>{employeeCount}</Text>
                <TouchableOpacity style={s.counterBtn} onPress={() => setEmployeeCount(employeeCount + 1)}>
                  <Ionicons name="add" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Podsumowanie</Text>
              <View style={s.summaryRow}>
                <Text style={s.summaryText}>Base ({BASE_EMP} pracowników)</Text>
                <Text style={s.summaryText}>{BASE_PRICE} zł</Text>
              </View>
              {extraEmployees > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryText}>Dodatkowi ({extraEmployees} × {EXTRA_PRICE} zł)</Text>
                  <Text style={s.summaryText}>{extraEmployees * EXTRA_PRICE} zł</Text>
                </View>
              )}
              <View style={[s.summaryRow, s.summaryTotal]}>
                <Text style={s.summaryTotalText}>Razem</Text>
                <Text style={s.summaryTotalText}>{totalPrice} zł/miesiąc</Text>
              </View>
            </View>

            <TouchableOpacity style={[s.payBtn, processing && { opacity: 0.6 }]} onPress={handlePayment} disabled={processing} activeOpacity={0.85}>
              {processing ? <ActivityIndicator color="#fff" /> : <Text style={s.payBtnText}>Zapłać {totalPrice} zł/mies.</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── CANCEL subscription button ── */}
        {subscription && !isCancelled && (
          <TouchableOpacity style={s.cancelSubBtn} onPress={handleCancel} disabled={cancelling} activeOpacity={0.8}>
            {cancelling
              ? <ActivityIndicator color={theme.colors.error} size="small" />
              : <>
                  <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
                  <Text style={s.cancelSubText}>Zakończ subskrypcję</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {isCancelled && (
          <View style={[s.pricingCard, { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.error} />
              <Text style={{ fontSize: 14, color: theme.colors.error, flex: 1 }}>Subskrypcja została zakończona. Aby wznowić, skontaktuj się z supportem pod numerem +48 884 184 352.</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  // Active card
  activeCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, gap: 12, ...theme.shadows.card },
  activeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  activeTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  priceBox: { alignItems: 'flex-end' },
  priceAmount: { fontSize: 24, fontWeight: '800', color: theme.colors.primary },
  pricePeriod: { fontSize: 12, color: theme.colors.textMuted },
  divider: { height: 1, backgroundColor: theme.colors.border },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: theme.colors.text },
  // Edit card
  editCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, gap: 0, ...theme.shadows.card },
  editCardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.primaryLight },
  editBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  // Pricing info
  pricingInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 12 },
  pricingInfoItem: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, alignItems: 'center' },
  pricingInfoNum: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  pricingInfoLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  pricingInfoSep: { alignItems: 'center', justifyContent: 'center', width: 24 },
  // Pricing card (no sub)
  pricingCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, gap: 8, ...theme.shadows.card },
  pricingTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  pricingExtra: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 },
  // Counter
  counterCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, ...theme.shadows.card },
  counterLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  counterBtnDisabled: { opacity: 0.4 },
  counterValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text, minWidth: 40, textAlign: 'center' },
  // Summary
  summaryCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, gap: 10, marginTop: 10 },
  summaryLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryText: { fontSize: 14, color: theme.colors.text },
  summaryTotal: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, marginTop: 2 },
  summaryTotalText: { fontSize: 17, fontWeight: '800', color: theme.colors.primary },
  // Action buttons in edit mode
  cancelEditBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  cancelEditText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: theme.colors.primary },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Pay button
  payBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...theme.shadows.card },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  // Cancel subscription
  cancelSubBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.error, backgroundColor: '#FFF5F5' },
  cancelSubText: { fontSize: 15, fontWeight: '700', color: theme.colors.error },
  // Legacy (unused but kept for safety)
  cardSection: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, gap: 12 },
  cardLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardField: { backgroundColor: theme.colors.surface },
  cardContainer: { height: 50 },
  payBtnDisabled: { opacity: 0.6 },
});
