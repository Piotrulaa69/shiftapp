import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { roleColors } from '../data/mockData';

type Props = {
  employeeName: string;
  role: string;
  startTime: string;
  endTime: string;
  initials?: string;
};

export default function ShiftCard({ employeeName, role, startTime, endTime, initials }: Props) {
  const roleColor = roleColors[role] ?? theme.colors.primary;
  const avatarInitials = initials ?? employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: roleColor + '22' }]}>
        <Text style={[styles.avatarText, { color: roleColor }]}>{avatarInitials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{employeeName}</Text>
        <View style={styles.roleBadge}>
          <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{startTime}</Text>
        <View style={styles.timeDivider} />
        <Text style={styles.time}>{endTime}</Text>
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
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    ...theme.typography.label,
    fontSize: 14,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  roleText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  timeContainer: {
    alignItems: 'center',
  },
  time: {
    ...theme.typography.label,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  timeDivider: {
    width: 1,
    height: 10,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
});
