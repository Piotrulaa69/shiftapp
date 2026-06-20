import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';

const FAQ = [
  {
    q: 'Jak dodać pracownika do systemu?',
    a: 'Przejdź do zakładki Zespół, kliknij „Dodaj pracownika" i wypełnij formularz. Pracownik otrzyma e-mail z kodem aktywacyjnym, który pozwoli mu założyć konto i dołączyć do restauracji.',
  },
  {
    q: 'Jak działa okres próbny?',
    a: 'Po rejestracji restauracji automatycznie uruchamiany jest 30-dniowy okres próbny w pakiecie Basic. W tym czasie masz dostęp do wszystkich funkcji bez żadnych opłat. Po zakończeniu okresu próbnego skontaktuj się z nami, aby aktywować subskrypcję.',
  },
  {
    q: 'Jak wygenerować grafik za pomocą AI?',
    a: 'Przejdź do zakładki Grafik, kliknij przycisk „AI Grafik" i wybierz okres. System wygeneruje propozycję grafiku na podstawie dyspozycyjności pracowników i reguł ustawionych w Ustawieniach restauracji.',
  },
  {
    q: 'Jak pracownik zgłasza swoją dyspozycyjność?',
    a: 'Pracownik loguje się do aplikacji mobilnej lub webowej, przechodzi do zakładki „Dyspozycyjność" i zaznacza dostępne godziny na dany tydzień/miesiąc. Manager widzi te informacje podczas tworzenia grafiku.',
  },
  {
    q: 'Jak złożyć wniosek urlopowy?',
    a: 'Przejdź do zakładki „Urlopy", kliknij „Nowy wniosek", wybierz typ urlopu i daty. Wniosek trafi do managera, który może go zatwierdzić lub odrzucić z komentarzem.',
  },
  {
    q: 'Czy mogę zarządzać kilkoma restauracjami?',
    a: 'Tak. Każda restauracja to oddzielne konto z własnym zespołem i grafikiem. Skontaktuj się z nami, jeśli chcesz zarządzać wieloma lokalami z jednego panelu — oferujemy dedykowane rozwiązania dla sieci restauracyjnych.',
  },
  {
    q: 'Jak zmienić dane restauracji (nazwa, adres, telefon)?',
    a: 'Przejdź do Ustawień restauracji (Praca Hub → Ustawienia). W sekcji „Dane restauracji" możesz edytować nazwę, adres i numer telefonu.',
  },
  {
    q: 'Co zrobić, jeśli pracownik zapomniał hasła?',
    a: 'Na stronie logowania należy kliknąć „Nie pamiętam hasła". System wyśle link resetujący na adres e-mail powiązany z kontem.',
  },
];

const CONTACT_HOURS = 'Pon–Pt: 8:00–18:00 · Sob: 9:00–14:00';

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <View style={s.faqItem}>
      <View style={s.faqQ}>
        <View style={s.faqIcon}>
          <Ionicons name="help" size={14} color={theme.colors.primary} />
        </View>
        <Text style={s.faqQText}>{q}</Text>
      </View>
      <Text style={s.faqA}>{a}</Text>
    </View>
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Centrum pomocy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="headset-outline" size={36} color={theme.colors.primary} />
          </View>
          <Text style={s.heroTitle}>Jak możemy Ci pomóc?</Text>
          <Text style={s.heroSub}>
            Jesteśmy tutaj, żeby pomóc Ci w pełni wykorzystać możliwości ShiftApp.
            Przeglądaj FAQ lub skontaktuj się bezpośrednio z naszym zespołem wsparcia.
          </Text>
        </View>

        {/* Contact cards */}
        <Text style={s.sectionLabel}>Skontaktuj się z nami</Text>
        <View style={s.contactGrid}>
          <View style={s.contactCard}>
            <View style={[s.contactIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="call-outline" size={22} color="#2563EB" />
            </View>
            <Text style={s.contactCardTitle}>Telefon</Text>
            <Text style={s.contactCardValue}>884 184 352</Text>
            <Text style={s.contactCardSub}>{CONTACT_HOURS}</Text>
          </View>

          <View style={s.contactCard}>
            <View style={[s.contactIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="mail-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={s.contactCardTitle}>E-mail</Text>
            <Text style={s.contactCardValue}>pomoc@shiftapp.pl</Text>
            <Text style={s.contactCardSub}>Odpowiadamy w ciągu 24h</Text>
          </View>

          <View style={s.contactCard}>
            <View style={[s.contactIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="chatbubbles-outline" size={22} color="#059669" />
            </View>
            <Text style={s.contactCardTitle}>Chat online</Text>
            <Text style={s.contactCardValue}>shiftapp.pl/chat</Text>
            <Text style={s.contactCardSub}>Dostępny w godzinach pracy</Text>
          </View>
        </View>

        {/* Info box */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
          <Text style={s.infoText}>
            Przed kontaktem sprawdź sekcję FAQ poniżej — większość pytań ma tam gotową odpowiedź.
            Jeśli potrzebujesz pomocy technicznej, przygotuj numer ID restauracji widoczny w ustawieniach.
          </Text>
        </View>

        {/* FAQ */}
        <Text style={s.sectionLabel}>Najczęściej zadawane pytania</Text>
        <View style={s.faqList}>
          {FAQ.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={s.bottomCta}>
          <Text style={s.bottomCtaTitle}>Nie znalazłeś odpowiedzi?</Text>
          <Text style={s.bottomCtaSub}>
            Napisz do nas na adres{' '}
            <Text style={s.bottomCtaLink}>pomoc@shiftapp.pl</Text>
            {' '}lub zadzwoń na{' '}
            <Text style={s.bottomCtaLink}>884 184 352</Text>.
            Nasz zespół odpowie najszybciej jak to możliwe.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { padding: 20, paddingBottom: 60, maxWidth: 720, width: '100%', alignSelf: 'center' as const },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, textAlign: 'center' as const },
  heroSub: {
    fontSize: 14, color: theme.colors.textSecondary,
    textAlign: 'center' as const, lineHeight: 22, maxWidth: 380,
  },

  // Section label
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: theme.colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: 0.6,
    marginBottom: 12, marginTop: 8,
  },

  // Contact grid
  contactGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' as const, marginBottom: 16 },
  contactCard: {
    flex: 1, minWidth: 140,
    backgroundColor: theme.colors.card,
    borderRadius: 16, padding: 16, gap: 6,
    ...theme.shadows.card,
  },
  contactIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  contactCardTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
  contactCardValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  contactCardSub: { fontSize: 11, color: theme.colors.textMuted },

  // Info box
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD',
    padding: 14, marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: '#0369A1', lineHeight: 20 },

  // FAQ
  faqList: { gap: 0 },
  faqItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 12, padding: 16, marginBottom: 8,
    ...theme.shadows.card,
  },
  faqQ: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  faqIcon: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  faqQText: { fontSize: 14, fontWeight: '700', color: theme.colors.text, flex: 1, lineHeight: 20 },
  faqA: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, paddingLeft: 34 },

  // Bottom CTA
  bottomCta: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 16, padding: 20, marginTop: 8,
    alignItems: 'center', gap: 8,
  },
  bottomCtaTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  bottomCtaSub: { fontSize: 13, color: theme.colors.primary, textAlign: 'center' as const, lineHeight: 20 },
  bottomCtaLink: { fontWeight: '700', textDecorationLine: 'underline' as const },
});
