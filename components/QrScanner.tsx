import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onScanned: (data: string) => void;
  onClose: () => void;
  error?: string;
  onRetry?: () => void;
};

export default function QrScanner({ onClose }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <Ionicons name="qr-code-outline" size={64} color="rgba(255,255,255,0.4)" />
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
        Skanowanie QR niedostępne w przeglądarce
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
        Użyj aplikacji mobilnej Reztro (Expo Go), aby skanować kody QR.
      </Text>
      <TouchableOpacity
        onPress={onClose}
        style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Zamknij</Text>
      </TouchableOpacity>
    </View>
  );
}
