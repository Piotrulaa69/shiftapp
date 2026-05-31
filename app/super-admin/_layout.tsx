import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../styles/theme';

export default function SuperAdminLayout() {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!isSuperAdmin) return <Redirect href={'/(tabs)/dashboard' as any} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
