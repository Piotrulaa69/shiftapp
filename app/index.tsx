import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) return <Redirect href={'/landing' as any} />;
  if (user && !user.onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/dashboard" />;
}
