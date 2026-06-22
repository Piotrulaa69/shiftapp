import { Ionicons } from '@expo/vector-icons';
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onScanned: (data: string) => void;
  onClose: () => void;
  error?: string;
  onRetry?: () => void;
};

export default function QrScanner({ onScanned, onClose, error, onRetry }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannedRef = useRef(false);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    scannedRef.current = false;
    startCamera();
    return () => stopCamera();
  }, []);

  // reset scanned flag when parent clears error (retry)
  useEffect(() => {
    if (!error) scannedRef.current = false;
  }, [error]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        rafRef.current = requestAnimationFrame(scan);
      }
    } catch {
      setCamError('Brak dostępu do kamery. Zezwól na kamerę w ustawieniach przeglądarki.');
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const scan = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && !scannedRef.current) {
      scannedRef.current = true;
      stopCamera();
      onScanned(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scan);
  };

  if (camError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.4)" />
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{camError}</Text>
        <TouchableOpacity onPress={onClose} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 28 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Zamknij</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* @ts-ignore - web only video element */}
      <video ref={videoRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
      {/* @ts-ignore */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Celownik */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' } as any}>
        <View style={{ width: 240, height: 240, borderWidth: 3, borderColor: '#fff', borderRadius: 16, opacity: 0.8 }} />
      </View>

      {/* Nagłówek */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 60, paddingHorizontal: 20, alignItems: 'center', gap: 8 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }}>
          Zeskanuj kod QR kiosku
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' }}>
          Nakieruj kamerę na kod QR wyświetlony w kiosku restauracji
        </Text>
      </View>

      {/* Błąd */}
      {!!error && (
        <View style={{ position: 'absolute', bottom: 120, left: 24, right: 24, backgroundColor: '#DC2626', borderRadius: 12, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={() => { onRetry?.(); startCamera(); }} style={{ marginTop: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Anuluj */}
      <TouchableOpacity
        style={{ position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        onPress={() => { stopCamera(); onClose(); }}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Anuluj</Text>
      </TouchableOpacity>
    </View>
  );
}
