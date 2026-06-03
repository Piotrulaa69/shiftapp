import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { assignEmployeeToGroup, createEmployeeGroup, deleteEmployeeGroup, getEmployeeGroupsWithMembers, getEmployees, removeEmployeeFromGroup, updateEmployeeGroup } from '../../lib/db';
import type { DbEmployeeGroup, DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

export default function GroupsScreen() {
  const router = useRouter();
  const { user, isOwner, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { showAlert, showConfirm } = useAlert();
  const rid = user?.restaurantId ?? '';
  const canManage = isOwner || isManager;

  const [groups, setGroups] = useState<(DbEmployeeGroup & { members: string[] })[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<(DbEmployeeGroup & { members: string[] }) | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('#2563EB');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const [gr, em] = await Promise.all([getEmployeeGroupsWithMembers(rid), getEmployees(rid)]);
    setGroups(gr);
    setEmployees(em);
    setLoading(false);
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupColor('#2563EB');
    setSelectedMembers([]);
    setShowModal(true);
  };

  const openEdit = (g: DbEmployeeGroup & { members: string[] }) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setGroupColor(g.color);
    setSelectedMembers(g.members);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      showAlert('Błąd', 'Podaj nazwę grupy');
      return;
    }
    setSaving(true);
    let success = false;
    if (editingGroup) {
      success = await updateEmployeeGroup(editingGroup.id, { name: groupName, color: groupColor });
      if (success) {
        // Update members
        for (const mid of editingGroup.members) {
          if (!selectedMembers.includes(mid)) {
            await removeEmployeeFromGroup(mid, editingGroup.id);
          }
        }
        for (const mid of selectedMembers) {
          if (!editingGroup.members.includes(mid)) {
            await assignEmployeeToGroup(mid, editingGroup.id);
          }
        }
      }
    } else {
      const newGroup = await createEmployeeGroup(rid, groupName, groupColor);
      if (newGroup) {
        for (const mid of selectedMembers) {
          await assignEmployeeToGroup(mid, newGroup.id);
        }
        success = true;
      }
    }
    setSaving(false);
    if (success) {
      setShowModal(false);
      load();
    } else {
      showAlert('Błąd', 'Nie udało się zapisać grupy');
    }
  };

  const handleDelete = async (g: DbEmployeeGroup & { members: string[] }) => {
    showConfirm('Usuń grupę', `Czy na pewno chcesz usunąć grupę "${g.name}"?`, async () => {
      const success = await deleteEmployeeGroup(g.id);
      if (success) {
        load();
      } else {
        showAlert('Błąd', 'Nie udało się usunąć grupy');
      }
    });
  };

  const toggleMember = (mid: string) => {
    setSelectedMembers(prev => prev.includes(mid) ? prev.filter(id => id !== mid) : [...prev, mid]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <TouchableOpacity onPress={() => router.push('/work-hub')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Zarządzanie grupami</Text>
        {canManage && (
          <TouchableOpacity onPress={openCreate} style={s.addBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color={theme.colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
        ) : groups.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-circle-outline" size={48} color={theme.colors.border} />
            <Text style={s.emptyText}>Brak grup</Text>
            {canManage && <Text style={s.emptySub}>Utwórz pierwszą grupę używając przycisku powyżej</Text>}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {groups.map((g) => (
              <View key={g.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: g.color }]}>
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.groupName}>{g.name}</Text>
                    <Text style={s.memberCount}>{g.members.length} {g.members.length === 1 ? 'osoba' : g.members.length < 5 ? 'osoby' : 'osób'}</Text>
                    <View style={s.memberChips}>
                      {g.members.slice(0, 5).map((mid) => {
                        const emp = employees.find((e) => e.id === mid);
                        return emp ? (
                          <View key={mid} style={[s.memberChip, { backgroundColor: g.color + '20' }]}>
                            <Text style={[s.memberChipText, { color: g.color }]}>
                              {emp.first_name} {emp.last_name}
                            </Text>
                          </View>
                        ) : null;
                      })}
                      {g.members.length > 5 && <Text style={s.moreMembers}>+{g.members.length - 5}</Text>}
                    </View>
                  </View>
                  {canManage && (
                    <View style={s.actions}>
                      <TouchableOpacity onPress={() => openEdit(g)} style={s.actionBtn} activeOpacity={0.7}>
                        <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(g)} style={s.actionBtn} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Group Modal */}
      <Modal visible={showModal} animationType="fade" transparent onRequestClose={() => setShowModal(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.header}>
              <Text style={mStyles.title}>{editingGroup ? 'Edytuj grupę' : 'Nowa grupa'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={mStyles.body}>
              <Text style={mStyles.label}>Nazwa grupy</Text>
              <TextInput style={mStyles.input} value={groupName} onChangeText={setGroupName} placeholder="np. Kelnerzy" />

              <Text style={mStyles.label}>Kolor</Text>
              <View style={mStyles.colorRow}>
                {['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#6B7280'].map((c) => (
                  <TouchableOpacity key={c} style={[mStyles.colorDot, { backgroundColor: c, borderWidth: groupColor === c ? 3 : 0, borderColor: theme.colors.text }]} onPress={() => setGroupColor(c)} />
                ))}
              </View>

              <Text style={mStyles.label}>Członkowie</Text>
              <View style={mStyles.memberList}>
                {employees.map((e) => {
                  const isSelected = selectedMembers.includes(e.id);
                  return (
                    <TouchableOpacity key={e.id} style={[mStyles.memberItem, isSelected && mStyles.memberItemSelected]} onPress={() => toggleMember(e.id)} activeOpacity={0.7}>
                      <View style={[mStyles.avatar, { backgroundColor: e.avatar_color }]}>
                        <Text style={mStyles.initials}>{e.first_name[0]}{e.last_name[0]}</Text>
                      </View>
                      <Text style={mStyles.memberName}>{e.first_name} {e.last_name}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={mStyles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={mStyles.saveBtnText}>{editingGroup ? 'Zapisz zmiany' : 'Utwórz grupę'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { maxWidth: 720, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  emptySub: { fontSize: 12, color: theme.colors.textSecondary },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, ...theme.shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  groupName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  memberCount: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  memberChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  memberChipText: { fontSize: 11, fontWeight: '600' },
  moreMembers: { fontSize: 11, color: theme.colors.textMuted, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  body: { padding: 20 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  memberList: { gap: 8, marginTop: 8 },
  memberItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
  memberItemSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 11, fontWeight: '700', color: theme.colors.white },
  memberName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  saveBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});
