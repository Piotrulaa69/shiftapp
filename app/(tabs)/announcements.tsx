import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { createAnnouncement, deleteAnnouncement, getAnnouncements } from '../../lib/db';
import type { DbAnnouncement } from '../../lib/supabase';
import { theme } from '../../styles/theme';

const PRIORITY_CONFIG: Record<'low' | 'normal' | 'high', { label: string; color: string; bg: string }> = {
  low: { label: 'NISKI', color: theme.colors.textMuted, bg: theme.colors.surface },
  normal: { label: 'NORMALNY', color: theme.colors.primary, bg: theme.colors.primaryLight },
  high: { label: 'WYSOKI', color: theme.colors.error, bg: theme.colors.errorLight },
};

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const canManage = isOwner || isManager;
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const rid = user?.restaurantId ?? '';
  const uid = user?.id ?? '';

  const [announcements, setAnnouncements] = useState<DbAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const data = await getAnnouncements(rid);
    setAnnouncements(data);
    setLoading(false);
  }, [rid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!rid || !uid) return;
    if (!title.trim() || !content.trim()) {
      Alert.alert('Błąd', 'Wypełnij tytuł i treść ogłoszenia');
      return;
    }
    setSaving(true);
    const result = await createAnnouncement(rid, uid, title.trim(), content.trim(), priority, expiryDate || null);
    setSaving(false);
    if (result) {
      setShowModal(false);
      setTitle('');
      setContent('');
      setPriority('normal');
      setExpiryDate('');
      load();
      Alert.alert('Sukces', 'Ogłoszenie zostało utworzone');
    } else {
      Alert.alert('Błąd', 'Nie udało się utworzyć ogłoszenia');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Usuń ogłoszenie', 'Czy na pewno chcesz usunąć to ogłoszenie?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteAnnouncement(id);
          if (success) {
            load();
          } else {
            Alert.alert('Błąd', 'Nie udało się usunąć ogłoszenia');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ogłoszenia</Text>
        {canManage && (
          <TouchableOpacity onPress={() => setShowModal(true)} style={s.addBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color={theme.colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : announcements.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="megaphone-outline" size={48} color={theme.colors.border} />
            <Text style={s.emptyText}>Brak ogłoszeń</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {announcements.map((a) => {
              const p = PRIORITY_CONFIG[a.priority];
              return (
                <View key={a.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <View style={[s.priorityBadge, { backgroundColor: p.bg }]}>
                      <Text style={[s.priorityBadgeText, { color: p.color }]}>{p.label}</Text>
                    </View>
                    {canManage && (
                      <TouchableOpacity onPress={() => handleDelete(a.id)} style={s.deleteBtn} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={s.title}>{a.title}</Text>
                  <Text style={s.announcementContent}>{a.content}</Text>
                  {a.expiry_date && (
                    <Text style={s.expiryDate}>Wygasa: {new Date(a.expiry_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                  )}
                  <Text style={s.date}>{new Date(a.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showModal} animationType="fade" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.mHeader}>
              <Text style={mStyles.mTitle}>Nowe ogłoszenie</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <View style={mStyles.body}>
              <Text style={mStyles.label}>Tytuł *</Text>
              <TextInput style={mStyles.input} value={title} onChangeText={setTitle} placeholder="Wpisz tytuł..." placeholderTextColor={theme.colors.textMuted} />
              
              <Text style={mStyles.label}>Treść *</Text>
              <TextInput style={[mStyles.input, mStyles.textArea]} value={content} onChangeText={setContent} placeholder="Wpisz treść ogłoszenia..." placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={4} />
              
              <Text style={mStyles.label}>Data wygaśnięcia (opcjonalne)</Text>
              <TextInput 
                style={mStyles.input} 
                value={expiryDate} 
                onChangeText={setExpiryDate} 
                placeholder="RRRR-MM-DD (np. 2024-12-31)" 
                placeholderTextColor={theme.colors.textMuted} 
              />
              
              <Text style={mStyles.label}>Priorytet</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['low', 'normal', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[mStyles.priorityBtn, priority === p && mStyles.priorityBtnActive]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[mStyles.priorityBtnText, priority === p && mStyles.priorityBtnTextActive]}>{PRIORITY_CONFIG[p].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity style={mStyles.saveBtn} onPress={handleCreate} activeOpacity={0.85} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={mStyles.saveBtnText}>Opublikuj</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { paddingHorizontal: 20 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  addBtn: { backgroundColor: theme.colors.primary, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { padding: 20, paddingBottom: 48, maxWidth: 600, marginHorizontal: 'auto', width: '100%' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, ...theme.shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityBadgeText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  announcementContent: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  expiryDate: { fontSize: 12, color: theme.colors.orange, marginBottom: 8 },
  date: { fontSize: 12, color: theme.colors.textMuted },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80%', overflow: 'hidden' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, color: theme.colors.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  priorityBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  priorityBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  priorityBtnText: { fontSize: 13, color: theme.colors.text },
  priorityBtnTextActive: { color: theme.colors.primary, fontWeight: '600' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
