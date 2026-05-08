import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../styles/theme';

type Priority = 'high' | 'medium' | 'low';

type Props = {
  title: string;
  assignedTime: string;
  completed: boolean;
  priority: Priority;
  onToggle: () => void;
};

const priorityConfig: Record<Priority, { color: string; label: string }> = {
  high: { color: theme.colors.error, label: 'High' },
  medium: { color: theme.colors.warning, label: 'Medium' },
  low: { color: theme.colors.success, label: 'Low' },
};

export default function TaskItem({ title, assignedTime, completed, priority, onToggle }: Props) {
  const { color: priorityColor, label: priorityLabel } = priorityConfig[priority];

  return (
    <View style={[styles.container, completed && styles.containerCompleted]}>
      <TouchableOpacity
        style={[styles.checkbox, completed && styles.checkboxChecked]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {completed && <Ionicons name="checkmark" size={14} color={theme.colors.white} />}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, completed && styles.titleCompleted]}>{title}</Text>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
          <Text style={styles.time}>{assignedTime}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '1A' }]}>
            <Text style={[styles.priorityLabel, { color: priorityColor }]}>{priorityLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  containerCompleted: {
    opacity: 0.65,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  content: {
    flex: 1,
  },
  title: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    marginBottom: 5,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  time: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginRight: 4,
  },
  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  priorityLabel: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
});
