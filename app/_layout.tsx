import { Stack } from 'expo-router';
import { AlertProvider } from '../context/AlertContext';
import { AuthProvider } from '../context/AuthContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { I18nProvider } from '../lib/i18n';

export default function RootLayout() {
  return (
    <I18nProvider>
    <AlertProvider>
      <AuthProvider>
        <SubscriptionProvider>
        <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="landing" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="shift-detail" />
          <Stack.Screen name="earnings" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="task/confirm-photo" />
          <Stack.Screen name="task/confirm-values" />
          <Stack.Screen name="task/confirm-description" />
          <Stack.Screen name="training/quiz" />
          <Stack.Screen name="help" />
          <Stack.Screen name="kiosk" />
        </Stack>
        </NotificationsProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </AlertProvider>
    </I18nProvider>
  );
}
