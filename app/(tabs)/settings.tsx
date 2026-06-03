import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { updateRestaurant } from '../../lib/db';
import { theme } from '../../styles/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, restaurant, refreshRestaurant, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert } = useAlert();
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  const [rName, setRName] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rSaving, setRSaving] = useState(false);
  const [rSaved, setRSaved] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setRName(restaurant.name || '');
      setRAddress(restaurant.address || '');
      setRPhone(restaurant.phone || '');
    }
  }, [restaurant]);

  const saveRestaurant = async () => {
    if (!rName.trim()) {
      showAlert('Błąd', 'Nazwa restauracji jest wymagana');
      return;
    }
    setRSaving(true);
    const success = await updateRestaurant(rid, { name: rName, address: rAddress, phone: rPhone });
    setRSaving(false);
    if (success) {
      setRSaved(true);
      refreshRestaurant();
      setTimeout(() => setRSaved(false), 2000);
    } else {
      showAlert('Błąd', 'Nie udało się zapisać ustawień');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ustawienia restauracji</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Dane restauracji</Text>

          <Text style={s.label}>Nazwa restauracji</Text>
          <TextInput
            style={s.input}
            value={rName}
            onChangeText={setRName}
            placeholder="Nazwa restauracji"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={s.label}>Adres</Text>
          <TextInput
            style={s.input}
            value={rAddress}
            onChangeText={setRAddress}
            placeholder="ul. Przykładowa 1, Warszawa"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={s.label}>Telefon</Text>
          <TextInput
            style={s.input}
            value={rPhone}
            onChangeText={setRPhone}
            placeholder="+48 000 000 000"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
          />

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Plan</Text>
            <View style={[s.planBadge, restaurant?.plan === 'premium' && s.planPremium]}>
              <Text style={[s.planText, restaurant?.plan === 'premium' && s.planPremiumText]}>
                {restaurant?.plan === 'premium' ? '⭐ Premium' : 'Basic'}
              </Text>
            </View>
          </View>

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Data utworzenia</Text>
            <Text style={s.settingValue}>{restaurant?.createdAt?.slice(0, 10)}</Text>
          </View>

          {canManage && (
            <TouchableOpacity
              style={[s.saveBtn, (!rName.trim() || rSaving) && { opacity: 0.6 }]}
              onPress={saveRestaurant}
              disabled={rSaving || !rName.trim()}
              activeOpacity={0.85}
            >
              {rSaving ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : rSaved ? (
                <>
                  <Ionicons name="checkmark" size={18} color={theme.colors.white} />
                  <Text style={s.saveBtnText}>Zapisano</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color={theme.colors.white} />
                  <Text style={s.saveBtnText}>Zapisz zmiany</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  settingLabel: { fontSize: 14, color: theme.colors.text },
  settingValue: { fontSize: 14, color: theme.colors.textMuted },
  planBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.surface },
  planPremium: { backgroundColor: '#FEF3C7' },
  planText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  planPremiumText: { color: '#D97706' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, marginTop: 24 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
});
