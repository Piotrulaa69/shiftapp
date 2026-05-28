import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../styles/theme';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View style={sk.card}>
      <View style={sk.row}>
        <Skeleton width={80} height={12} borderRadius={6} />
        <Skeleton width={50} height={12} borderRadius={6} />
      </View>
      <Skeleton width="70%" height={18} borderRadius={8} style={{ marginTop: 10 }} />
      <Skeleton width="90%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
      <View style={[sk.row, { marginTop: 12 }]}>
        <Skeleton width={60} height={12} borderRadius={6} />
        <Skeleton width={40} height={12} borderRadius={6} />
      </View>
    </View>
  );
}

export function StatCardSkeleton() {
  return (
    <View style={sk.statCard}>
      <Skeleton width={36} height={36} borderRadius={10} />
      <Skeleton width={40} height={20} borderRadius={6} style={{ marginTop: 8 }} />
      <Skeleton width={60} height={12} borderRadius={6} style={{ marginTop: 4 }} />
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View style={sk.listItem}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={14} borderRadius={6} />
        <Skeleton width="40%" height={12} borderRadius={6} />
      </View>
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={sk.container}>
      <View style={sk.row}>
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="50%" height={20} borderRadius={8} />
          <Skeleton width="30%" height={14} borderRadius={6} />
        </View>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>
      <View style={[sk.row, { marginTop: 20, gap: 10 }]}>
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </View>
      <Skeleton width="40%" height={18} borderRadius={8} style={{ marginTop: 24 }} />
      {[1, 2, 3].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

export function TasksSkeleton() {
  return (
    <View style={sk.container}>
      <CardSkeleton />
      <Skeleton width="30%" height={16} borderRadius={6} style={{ marginTop: 16 }} />
      {[1, 2, 3, 4].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

export function TeamSkeleton() {
  return (
    <View style={sk.container}>
      <Skeleton width="100%" height={40} borderRadius={10} />
      <Skeleton width="25%" height={14} borderRadius={6} style={{ marginTop: 16 }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <ListItemSkeleton key={i} />
      ))}
    </View>
  );
}

const sk = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    ...theme.shadows.card,
  },
});
