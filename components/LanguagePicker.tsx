import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LANGS, useI18n } from '../lib/i18n';
import { theme } from '../styles/theme';

/**
 * Language selector — shows PL / EN / UK as selectable cards.
 * Drop-in for both the admin settings screen and the user profile.
 */
export default function LanguagePicker() {
  const { lang, setLang, t } = useI18n();

  return (
    <View style={s.wrap} {...({ dataSet: { notranslate: 'true' } } as any)}>
      <Text style={s.sub}>{t('Wybierz język interfejsu')}</Text>
      <View style={s.row}>
        {LANGS.map((l) => {
          const active = lang === l.code;
          return (
            <TouchableOpacity
              key={l.code}
              style={[s.card, active && s.cardActive]}
              onPress={() => setLang(l.code)}
              activeOpacity={0.8}
            >
              <Text style={s.flag}>{l.flag}</Text>
              <Text style={[s.label, active && s.labelActive]}>{l.label}</Text>
              {active && (
                <View style={s.check}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  sub: { fontSize: 13, color: theme.colors.textSecondary },
  row: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  cardActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  flag: { fontSize: 24 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  labelActive: { color: theme.colors.primary, fontWeight: '700' },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
