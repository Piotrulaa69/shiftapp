import { Stack } from 'expo-router';
import { AlertProvider } from '../context/AlertContext';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join" />
          <Stack.Screen name="task/confirm-photo" />
          <Stack.Screen name="task/confirm-values" />
          <Stack.Screen name="task/confirm-description" />
        </Stack>
      </AuthProvider>
    </AlertProvider>
  );
}
