import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../styles/theme';

type Props = {
  name: string;
  role: string;
  initials: string;
  avatarColor: string;
};

export default function EmployeeCard({ name, role, initials, avatarColor }: Props) {
  const roleColor = avatarColor;

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: avatarColor + '22' }]}>
        <Text style={[styles.initials, { color: avatarColor }]}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '1A' }]}>
          <Text style={[styles.role, { color: roleColor }]}>{role}</Text>
        </View>
      </View>
      <View style={styles.indicator}>
        <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  initials: {
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    marginBottom: 5,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  role: {
    ...theme.typography.label,
    fontWeight: '600',
  },
  indicator: {
    paddingLeft: theme.spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
