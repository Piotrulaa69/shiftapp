import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FEATURES = [
  { icon: 'calendar-outline', color: '#2563EB', bg: '#EFF6FF', title: 'Grafik pracy', desc: 'Twórz i zarządzaj grafikami dla całego zespołu w kilka minut.' },
  { icon: 'checkmark-circle-outline', color: '#059669', bg: '#F0FDF4', title: 'Zadania i checklista', desc: 'Przypisuj zadania, monitoruj postęp i zbieraj potwierdzenia.' },
  { icon: 'umbrella-outline', color: '#D97706', bg: '#FFFBEB', title: 'Urlopy i nieobecności', desc: 'Pracownicy składają wnioski, manager zatwierdza jednym kliknięciem.' },
  { icon: 'school-outline', color: '#7C3AED', bg: '#F5F3FF', title: 'Szkolenia i quizy', desc: 'Twórz kursy e-learning z testami wiedzy dla nowych pracowników.' },
  { icon: 'chatbubbles-outline', color: '#0891B2', bg: '#F0F9FF', title: 'Komunikacja', desc: 'Wiadomości i ogłoszenia dostępne bezpośrednio w aplikacji.' },
  { icon: 'people-outline', color: '#DC2626', bg: '#FFF1F2', title: 'Zarządzanie zespołem', desc: 'Profile pracowników, role i grupy w jednym miejscu.' },
];

const BLOG_POSTS = [
  { tag: 'Poradnik', title: 'Jak zoptymalizować grafik w restauracji?', date: 'Maj 2025' },
  { tag: 'Trendy', title: '5 błędów w zarządzaniu personelem gastronomicznym', date: 'Kwiecień 2025' },
  { tag: 'Nowości', title: 'ShiftApp 1.0 — co nowego w platformie?', date: 'Marzec 2025' },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={st.safe}>
      {/* ── Header ── */}
      <View style={st.header}>
        <View style={st.logoRow}>
          <View style={st.logoIcon}><Ionicons name="grid" size={16} color="#fff" /></View>
          <Text style={st.logoText}>ShiftApp</Text>
        </View>
        <View style={st.headerActions}>
          <TouchableOpacity style={st.loginBtn} onPress={() => router.push('/login')} activeOpacity={0.8}>
            <Text style={st.loginBtnText}>Zaloguj się</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.registerBtn} onPress={() => router.push('/register')} activeOpacity={0.8}>
            <Text style={st.registerBtnText}>Zarejestruj</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {/* ── Hero ── */}
        <View style={st.hero}>
          <View style={st.heroBadge}>
            <Ionicons name="flash" size={12} color="#2563EB" />
            <Text style={st.heroBadgeText}>Platforma dla gastronomii</Text>
          </View>
          <Text style={st.heroTitle}>Zarządzaj restauracją{'\n'}bez chaosu</Text>
          <Text style={st.heroSub}>
            Grafiki, zadania, urlopy, szkolenia i komunikacja — wszystko w jednym miejscu dla Twojego zespołu.
          </Text>
          <TouchableOpacity style={st.ctaBtn} onPress={() => router.push('/register')} activeOpacity={0.88}>
            <Text style={st.ctaBtnText}>Dołącz teraz — 14 dni gratis</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.ctaSecondary} onPress={() => router.push('/join')} activeOpacity={0.8}>
            <Ionicons name="key-outline" size={16} color="#2563EB" />
            <Text style={st.ctaSecondaryText}>Mam kod aktywacyjny</Text>
          </TouchableOpacity>

          {/* Stats row */}
          <View style={st.statsRow}>
            {[['500+', 'restauracji'], ['12k+', 'pracowników'], ['99.9%', 'uptime']].map(([n, l]) => (
              <View key={l} style={st.statItem}>
                <Text style={st.statNum}>{n}</Text>
                <Text style={st.statLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Features ── */}
        <View style={st.section}>
          <Text style={st.sectionLabel}>FUNKCJE</Text>
          <Text style={st.sectionTitle}>Wszystko czego potrzebujesz</Text>
          <View style={st.featuresGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={st.featureCard}>
                <View style={[st.featureIcon, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon as any} size={22} color={f.color} />
                </View>
                <Text style={st.featureTitle}>{f.title}</Text>
                <Text style={st.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Blog / Nowości ── */}
        <View style={st.section}>
          <Text style={st.sectionLabel}>BLOG</Text>
          <Text style={st.sectionTitle}>Wiedza dla managerów</Text>
          <View style={{ gap: 12 }}>
            {BLOG_POSTS.map((post) => (
              <View key={post.title} style={st.blogCard}>
                <View style={st.blogTag}><Text style={st.blogTagText}>{post.tag}</Text></View>
                <Text style={st.blogTitle}>{post.title}</Text>
                <Text style={st.blogDate}>{post.date}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA Bottom ── */}
        <View style={st.ctaSection}>
          <Text style={st.ctaSectionTitle}>Gotowy żeby zacząć?</Text>
          <Text style={st.ctaSectionSub}>Rejestracja zajmuje mniej niż 2 minuty. Bez karty płatniczej.</Text>
          <TouchableOpacity style={st.ctaBtn} onPress={() => router.push('/register')} activeOpacity={0.88}>
            <Text style={st.ctaBtnText}>Załóż darmowe konto</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={st.footer}>
          <View style={st.footerLogoRow}>
            <View style={st.logoIcon}><Ionicons name="grid" size={14} color="#fff" /></View>
            <Text style={st.footerLogoText}>ShiftApp</Text>
          </View>
          <Text style={st.footerCopy}>© 2025 ShiftApp. Wszelkie prawa zastrzeżone.</Text>
          <View style={st.footerLinks}>
            {['Regulamin', 'Prywatność', 'Kontakt', 'Pomoc'].map((lbl) => (
              <Text key={lbl} style={st.footerLink}>{lbl}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F4EF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E4DC',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 17, fontWeight: '800', color: '#111827' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  loginBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#2563EB' },
  loginBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  registerBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#2563EB' },
  registerBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  scroll: { paddingBottom: 40 },

  hero: {
    alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { paddingVertical: 72 } : {}),
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#111827', textAlign: 'center', lineHeight: 40, marginBottom: 16 },
  heroSub: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 28, maxWidth: 380 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563EB', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 36 },
  ctaSecondaryText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  statsRow: { flexDirection: 'row', gap: 32 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '900', color: '#111827' },
  statLbl: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  section: { paddingHorizontal: 20, paddingVertical: 36 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#2563EB', letterSpacing: 1.5, marginBottom: 8 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 24 },
  featuresGrid: { gap: 12 },
  featureCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    shadowColor: '#1A1D23', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  featureDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  blogCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    shadowColor: '#1A1D23', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  blogTag: { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  blogTagText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  blogTitle: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 22, marginBottom: 6 },
  blogDate: { fontSize: 12, color: '#9CA3AF' },

  ctaSection: {
    alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48,
    backgroundColor: '#FFFFFF', marginHorizontal: 0,
  },
  ctaSectionTitle: { fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 10 },
  ctaSectionSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 20 },

  footer: { backgroundColor: '#111827', padding: 28, alignItems: 'center', gap: 12 },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLogoText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  footerCopy: { fontSize: 12, color: '#6B7280' },
  footerLinks: { flexDirection: 'row', gap: 16 },
  footerLink: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
});
