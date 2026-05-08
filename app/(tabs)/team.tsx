import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmployeeCard from '../../components/EmployeeCard';
import { useAuth } from '../../context/AuthContext';
import { getEmployees } from '../../lib/db';
import type { DbProfile } from '../../lib/supabase';
import { theme } from '../../styles/theme';

export default function TeamScreen() {
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    getEmployees(rid).then((data) => { setEmployees(data); setLoading(false); });
  }, [rid]);

  if (loading) return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </SafeAreaView>
  );

  const filtered = employees.filter(
    (e) => {
      const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
      return fullName.includes(search.toLowerCase()) || e.job_title.toLowerCase().includes(search.toLowerCase());
    }
  );

  const roleGroups = Array.from(new Set(employees.map((e) => e.job_title)));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.screenTitle}>Zespół</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{employees.length}</Text>
            <Text style={styles.statLabel}>Łącznie</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{roleGroups.length}</Text>
            <Text style={styles.statLabel}>Stanowiska</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{employees.length}</Text>
            <Text style={styles.statLabel}>Aktywni</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj po imieniu lub stanowisku..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textMuted}
              onPress={() => setSearch('')}
            />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeader}>
            <Text style={styles.listCount}>
              {filtered.length} member{filtered.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {filtered.length > 0 ? (
            filtered.map((employee) => (
              <EmployeeCard
                key={employee.id}
                name={`${employee.first_name} ${employee.last_name}`}
                role={employee.job_title}
                initials={`${employee.first_name[0] ?? ''}${employee.last_name[0] ?? ''}`.toUpperCase()}
                avatarColor={employee.avatar_color}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>Brak wyników</Text>
              <Text style={styles.emptySubtitle}>
                Brak osób pasujących do "{search}"
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  screenTitle: {
    ...theme.typography.h2,
    color: theme.colors.white,
    marginBottom: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.white,
    marginBottom: 2,
  },
  statLabel: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 4,
  },
  body: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    marginTop: -theme.borderRadius.xl,
    paddingTop: theme.spacing.lg,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  listContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  listHeader: {
    marginBottom: theme.spacing.md,
  },
  listCount: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: 10,
  },
  emptyTitle: {
    ...theme.typography.h4,
    color: theme.colors.textSecondary,
  },
  emptySubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
