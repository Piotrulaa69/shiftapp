import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onScanned: (data: string) => void;
  onClose: () => void;
  error?: string;
  onRetry?: () => void;
};

export default function QrScanner({ onScanned, onClose, error, onRetry }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.4)" />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Brak dostępu do kamery</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' }}>Zezwól na dostęp do kamery w ustawieniach urządzenia</Text>
        <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>Zezwól</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 8 }}>Anuluj</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(result) => onScanned(result.data)}
      />
      {/* Celownik */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' } as any}>
        <View style={{ width: 240, height: 240, borderWidth: 3, borderColor: '#fff', borderRadius: 16, opacity: 0.7 }} />
      </View>
      {/* Nagłówek */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 60, paddingHorizontal: 20, alignItems: 'center', gap: 8 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>
          Zeskanuj kod QR kiosku
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' }}>
          Nakieruj aparat na kod QR wyświetlony w kiosku restauracji
        </Text>
      </View>
      {/* Błąd */}
      {!!error && (
        <View style={{ position: 'absolute', bottom: 120, left: 24, right: 24, backgroundColor: '#DC2626', borderRadius: 12, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={onRetry} style={{ marginTop: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Anuluj */}
      <TouchableOpacity
        style={{ position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Anuluj</Text>
      </TouchableOpacity>
    </View>
  );
}
