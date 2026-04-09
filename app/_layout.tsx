import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/confirm-photo" />
        <Stack.Screen name="task/confirm-values" />
        <Stack.Screen name="task/confirm-description" />
      </Stack>
    </AuthProvider>
  );
}
