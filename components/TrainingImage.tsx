import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp, View } from 'react-native';
import { getTrainingImageUrl } from '../lib/db';
import { theme } from '../styles/theme';

type Props = {
  path: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
};

export default function TrainingImage({ path, style, resizeMode = 'cover' }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const signed = await getTrainingImageUrl(path).catch(() => null);
      if (!active) return;
      setUrl(signed);
      setFailed(!signed);
      if (signed && !/^https?:\/\//i.test(path)) refresh = setTimeout(load, 50 * 60 * 1000);
    };
    setUrl(null);
    setFailed(false);
    void load();
    return () => { active = false; if (refresh) clearTimeout(refresh); };
  }, [path]);

  if (!url || failed) return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }]}>
      <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
    </View>
  );
  return <Image source={{ uri: url }} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} />;
}
