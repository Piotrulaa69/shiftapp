import { Stack } from 'expo-router';
import { AlertProvider } from '../context/AlertContext';
import { AuthProvider } from '../context/AuthContext';
import { NotificationsProvider } from '../context/NotificationsContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="shift-detail" />
          <Stack.Screen name="availability" />
          <Stack.Screen name="leave-requests" />
          <Stack.Screen name="documents" />
          <Stack.Screen name="earnings" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="shift-swap" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="task/confirm-photo" />
          <Stack.Screen name="task/confirm-values" />
          <Stack.Screen name="task/confirm-description" />
          <Stack.Screen name="training/quiz" />
        </Stack>
        </NotificationsProvider>
      </AuthProvider>
    </AlertProvider>
  );
}
