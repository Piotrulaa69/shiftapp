import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity,
    useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getAllReferrals, markReferralDiscountApplied, type Referral } from '../../lib/referral';
import {
    createPromoCode,
    createRestaurantWithInvite,
    deleteRestaurant,
    disableRestaurantAccounts,
    getAllRestaurantsWithStats,
    getPromoCodes,
    getRecentActivity,
    getSubscriptions,
    getSubscriptionsOverview,
    getSystemStats,
    markSubscriptionPaid,
    togglePromoCode,
    upsertSubscription,
    type PromoCode,
    type RestaurantWithStats,
    type Subscription,
    type SubscriptionStatus,
    type SystemStats
} from '../../lib/super-admin';
import { theme } from '../../styles/theme';

// ── Config ─────────────────────────────────────────────
const PLAN_CFG = {
  basic:      { label: 'Basic',      color: '#6B7280', bg: '#F3F4F6' },
  premium:    { label: 'Premium',    color: '#D97706', bg: '#FEF3C7' },
  enterprise: { label: 'Enterprise', color: '#7C3AED', bg: '#EDE9FE' },
};

const STATUS_CFG: Record<SubscriptionStatus, { label: string; color: string; bg: string }> = {
  trial:     { label: 'Próbny',    color: '#D97706', bg: '#FEF3C7' },
  active:    { label: 'Aktywny',   color: '#059669', bg: '#D1FAE5' },
  overdue:   { label: 'Zaległy',   color: '#DC2626', bg: '#FEF2F2' },
  cancelled: { label: 'Anulowany', color: '#6B7280', bg: '#F3F4F6' },
  paused:    { label: 'Wstrzym.',  color: '#0891B2', bg: '#E0F2FE' },
};

type NavItem = 'dashboard' | 'restaurants' | 'subscriptions' | 'users' | 'settings';

const NAV: { key: NavItem; icon: string; label: string }[] = [
  { key: 'dashboard',     icon: 'grid',          label: 'Panel główny'  },
  { key: 'restaurants',   icon: 'storefront',    label: 'Restauracje'   },
  { key: 'subscriptions', icon: 'card',          label: 'Subskrypcje'   },
  { key: 'users',         icon: 'people',        label: 'Użytkownicy'   },
  { key: 'settings',      icon: 'settings',      label: 'Ustawienia'    },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} min temu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h temu`;
  return `${Math.floor(h / 24)}d temu`;
}

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

// ── Mobile FAB for SuperAdmin ─────────────────────────────
function MobileFab({ nav, setNav }: { nav: NavItem; setNav: (n: NavItem) => void }) {
  const [fabOpen, setFabOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const actions = [
    { icon: 'storefront-outline', label: 'Restauracje', key: 'restaurants' as NavItem },
    { icon: 'card-outline', label: 'Subskrypcje', key: 'subscriptions' as NavItem },
    { icon: 'people-outline', label: 'Użytkownicy', key: 'users' as NavItem },
    { icon: 'settings-outline', label: 'Ustawienia', key: 'settings' as NavItem },
  ];

  const handleFabPress = () => setFabOpen(true);
  const handleAction = (key: NavItem) => {
    setFabOpen(false);
    setTimeout(() => setNav(key), 150);
  };

  return (
    <>
      <Modal visible={fabOpen} transparent animationType="fade" onRequestClose={() => setFabOpen(false)}>
        <Pressable style={s.fabOverlay} onPress={() => setFabOpen(false)}>
          <View style={s.fabMenu}>
            {actions.map((a, i) => (
              <TouchableOpacity key={i} style={s.fabMenuItem} onPress={() => handleAction(a.key)} activeOpacity={0.7}>
                <View style={s.fabMenuIcon}>
                  <Ionicons name={a.icon as any} size={20} color={theme.colors.primary} />
                </View>
                <Text style={s.fabMenuLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
      <View style={[s.mobileTabBar, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity
          key="dashboard"
          style={[s.mobileTabBarItem, nav === 'dashboard' && s.mobileTabBarItemActive]}
          onPress={() => setNav('dashboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="grid" size={20} color={nav === 'dashboard' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[s.mobileTabBarText, nav === 'dashboard' && s.mobileTabBarTextActive]}>Panel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.fab, fabOpen && s.fabActive]}
          activeOpacity={0.85}
          onPress={handleFabPress}
        >
          <Ionicons name={fabOpen ? 'close' : 'add'} size={26} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>
    </>
  );
}

// ── Root component ─────────────────────────────────────
export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;

  const [nav, setNav] = useState<NavItem>('dashboard');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantWithStats[]>([]);
  const [activity, setActivity] = useState<{ type: string; text: string; time: string; color: string }[]>([]);
  const [subscriptions, setSubscriptions] = useState<(Subscription & { restaurant_name: string })[]>([]);
  const [subOverview, setSubOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Promo codes state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('10');
  const [promoMaxUses, setPromoMaxUses] = useState('');

  // Impersonation state
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Create restaurant modal
  const [showCreate, setShowCreate] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Restaurant detail modal
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithStats | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [s, r, a, subs, subOvr, promos] = await Promise.all([
      getSystemStats(),
      getAllRestaurantsWithStats(),
      getRecentActivity(),
      getSubscriptions(),
      getSubscriptionsOverview(),
      getPromoCodes(),
    ]);
    setStats(s);
    setRestaurants(r);
    setActivity(a);
    setSubscriptions(subs);
    setSubOverview(subOvr);
    setPromoCodes(promos);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.owner_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const Sidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarLogo}>
        <View style={s.logoIcon}><Ionicons name="shield-checkmark" size={20} color="#fff" /></View>
        <View>
          <Text style={s.logoTitle}>ShiftApp</Text>
          <Text style={s.logoSub}>Admin Panel</Text>
        </View>
      </View>
      <View style={s.sidebarNav}>
        {NAV.map(item => (
          <TouchableOpacity key={item.key} style={[s.navItem, nav === item.key && s.navItemActive]} onPress={() => setNav(item.key)} activeOpacity={0.7}>
            <Ionicons name={item.icon as any} size={18} color={nav === item.key ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[s.navLabel, nav === item.key && s.navLabelActive]}>{item.label}</Text>
            {item.key === 'subscriptions' && (subOverview?.overdue ?? 0) > 0 && (
              <View style={s.navBadge}><Text style={s.navBadgeText}>{subOverview.overdue}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.sidebarFooter}>
        <View style={s.userRow}>
          <View style={[s.userAvatar, { backgroundColor: '#7C3AED' }]}><Text style={s.userAvatarText}>{user?.initials ?? 'SA'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{user?.name ?? 'ShiftApp Team'}</Text>
            <Text style={s.userRole}>Super Admin</Text>
          </View>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={16} color={theme.colors.error} />
          <Text style={s.logoutText}>Wyloguj</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={s.loaderText}>Ładowanie danych systemu...</Text>
      </View>
    );
    switch (nav) {
      case 'dashboard':     return <DashboardTab stats={stats} restaurants={restaurants} activity={activity} subOverview={subOverview} setNav={setNav} />;
      case 'restaurants':   return <RestaurantsTab restaurants={filtered} search={search} setSearch={setSearch} onAdd={() => setShowCreate(true)} onSelectRestaurant={setSelectedRestaurant} />;
      case 'subscriptions': return <SubscriptionsTab subscriptions={subscriptions} overview={subOverview} restaurants={restaurants} onRefresh={loadAll} />;
      case 'users':         return <UsersTab restaurants={restaurants} />;
      case 'settings':      return <SettingsTab promoCodes={promoCodes} onRefresh={loadAll} userId={user?.id ?? ''} />;
    }
  };

  const content = (
    <>
      {renderContent()}
      {/* Create Restaurant Modal */}
      <CreateRestaurantModal
        visible={showCreate}
        superAdminId={user?.id ?? ''}
        onClose={() => { setShowCreate(false); setCreatedCode(null); }}
        onCreated={(code) => { setCreatedCode(code); loadAll(); }}
      />
      {/* Restaurant Detail Modal */}
      <RestaurantDetailModal
        visible={!!selectedRestaurant}
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
        onRefresh={loadAll}
      />
      {/* Success: show invite code */}
      {createdCode && (
        <Modal transparent animationType="fade" visible>
          <View style={s.overlay}>
            <View style={s.codeModal}>
              <View style={[s.logoIcon, { marginBottom: 12 }]}><Ionicons name="checkmark" size={24} color="#fff" /></View>
              <Text style={s.codeModalTitle}>Restauracja utworzona!</Text>
              <Text style={s.codeModalSub}>Wyślij klientowi poniższy kod zaproszenia właściciela (ważny 7 dni):</Text>
              <TouchableOpacity style={s.codeBox} onPress={() => Alert.alert('Kod zaproszenia', createdCode, [{text: 'OK'}])} activeOpacity={0.7}>
                <Text style={s.codeText}>{createdCode}</Text>
                <Ionicons name="copy-outline" size={18} color="#7C3AED" />
              </TouchableOpacity>
              <Text style={s.codeHint}>Klient rejestruje się kodem przez opcję "Dołącz z kodem" w aplikacji.</Text>
              <TouchableOpacity style={s.codeDoneBtn} onPress={() => setCreatedCode(null)} activeOpacity={0.85}>
                <Text style={s.codeDoneBtnText}>Gotowe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <View style={s.root}>
        <Sidebar />
        <View style={s.main}>
          <View style={s.topbar}>
            <Text style={s.topbarTitle}>{NAV.find(n => n.key === nav)?.label}</Text>
            <View style={s.topbarRight}>
              {nav === 'restaurants' && (
                <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={s.addBtnText}>Nowa restauracja</Text>
                </TouchableOpacity>
              )}
              <View style={s.statusDot} />
              <Text style={s.statusText}>System operacyjny</Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.contentPad}>
            {content}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.mobileHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.logoIcon}><Ionicons name="shield-checkmark" size={16} color="#fff" /></View>
          <Text style={s.logoTitle}>ShiftApp Admin</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {nav === 'restaurants' && <TouchableOpacity onPress={() => setShowCreate(true)} activeOpacity={0.7}><Ionicons name="add-circle" size={22} color={theme.colors.primary} /></TouchableOpacity>}
          <TouchableOpacity onPress={logout} activeOpacity={0.7}><Ionicons name="log-out-outline" size={20} color={theme.colors.error} /></TouchableOpacity>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
        {content}
      </ScrollView>
      <MobileFab nav={nav} setNav={setNav} />
    </SafeAreaView>
  );
}

// ── Create Restaurant Modal ─────────────────────────────
function CreateRestaurantModal({ visible, superAdminId, onClose, onCreated }: {
  visible: boolean;
  superAdminId: string;
  onClose: () => void;
  onCreated: (code: string) => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<'basic' | 'premium'>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setName(''); setAddress(''); setPhone(''); setPlan('basic'); setError(''); };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Podaj nazwę restauracji.'); return; }
    setLoading(true); setError('');
    const result = await createRestaurantWithInvite(superAdminId, { name, address, phone, plan });
    setLoading(false);
    if ('error' in result) { setError(result.error); return; }
    reset();
    onClose();
    onCreated(result.invite_code);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.createModal}>
          <View style={s.createModalHeader}>
            <Text style={s.createModalTitle}>Nowa restauracja</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'Nazwa restauracji *', value: name, set: setName, placeholder: 'np. Trattoria Roma', icon: 'storefront' },
              { label: 'Adres', value: address, set: setAddress, placeholder: 'ul. Kwiatowa 5, Warszawa', icon: 'location' },
              { label: 'Telefon', value: phone, set: setPhone, placeholder: '+48 600 000 000', icon: 'call' },
            ].map(({ label, value, set, placeholder, icon }) => (
              <View key={label} style={{ gap: 4, marginBottom: 14 }}>
                <Text style={s.formLabel}>{label}</Text>
                <View style={s.inputRow}>
                  <Ionicons name={icon as any} size={16} color={theme.colors.textMuted} />
                  <TextInput style={s.formInput} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>
            ))}

            <Text style={s.formLabel}>Plan</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              {(['basic', 'premium'] as const).map(p => (
                <TouchableOpacity key={p} style={[s.planOption, plan === p && s.planOptionActive]} onPress={() => setPlan(p)} activeOpacity={0.7}>
                  <Text style={[s.planOptionText, plan === p && s.planOptionTextActive]}>{p === 'basic' ? 'Basic — 99 PLN/mies.' : 'Premium — 199 PLN/mies.'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!!error && <Text style={s.errorText}>{error}</Text>}

            <TouchableOpacity style={[s.createBtn, loading && { opacity: 0.6 }]} onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
              <Text style={s.createBtnText}>{loading ? 'Tworzenie...' : 'Utwórz i generuj kod zaproszenia'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 16 }}>
              Po utworzeniu otrzymasz 6-znakowy kod zaproszenia właściciela. Klient rejestruje się nim w aplikacji.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── TAB: Dashboard ──────────────────────────────────────
function DashboardTab({ stats, restaurants, activity, subOverview, setNav }: any) {
  const statCards = [
    { label: 'Restauracje',   value: stats?.total_restaurants ?? 0,     icon: 'storefront',    color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Użytkownicy',   value: stats?.total_users ?? 0,            icon: 'people',        color: '#059689', bg: '#D1FAE5' },
    { label: 'Zadania',       value: stats?.total_tasks ?? 0,            icon: 'list',          color: '#D97706', bg: '#FEF3C7' },
    { label: 'Nowe w mies.',  value: stats?.new_this_month ?? 0,         icon: 'trending-up',   color: '#7C3AED', bg: '#EDE9FE' },
  ];

  return (
    <View style={{ gap: 24 }}>
      <View style={s.statsRow}>
        {statCards.map((c, i) => (
          <View key={i} style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: c.bg }]}><Ionicons name={c.icon as any} size={20} color={c.color} /></View>
            <Text style={[s.statNum, { color: c.color }]}>{c.value}</Text>
            <Text style={s.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* Subscription summary */}
      {subOverview && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Subskrypcje</Text>
            <TouchableOpacity onPress={() => setNav('subscriptions')} activeOpacity={0.7}><Text style={s.sectionLink}>Szczegóły →</Text></TouchableOpacity>
          </View>
          <View style={s.statsRow}>
            {[
              { label: 'Aktywne', value: subOverview.active, color: '#059669', bg: '#D1FAE5' },
              { label: 'Trial', value: subOverview.trial, color: '#D97706', bg: '#FEF3C7' },
              { label: 'Zaległe', value: subOverview.overdue, color: '#DC2626', bg: '#FEF2F2' },
              { label: 'MRR', value: `${subOverview.monthly_revenue} PLN`, color: '#7C3AED', bg: '#EDE9FE' },
            ].map((c, i) => (
              <View key={i} style={[s.statCard, { flex: 0, minWidth: 80 }]}>
                <Text style={[s.statNum, { fontSize: typeof c.value === 'string' ? 13 : 22, color: c.color }]}>{c.value}</Text>
                <Text style={s.statLabel}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Ostatnio dołączyły</Text>
          <TouchableOpacity onPress={() => setNav('restaurants')} activeOpacity={0.7}><Text style={s.sectionLink}>Wszystkie →</Text></TouchableOpacity>
        </View>
        {restaurants.slice(0, 5).map((r: RestaurantWithStats) => <RestaurantRow key={r.id} r={r} />)}
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Ostatnia aktywność</Text>
          <TouchableOpacity onPress={() => setNav('activity')} activeOpacity={0.7}><Text style={s.sectionLink}>Pokaż więcej →</Text></TouchableOpacity>
        </View>
        {activity.slice(0, 5).map((a: any, i: number) => (
          <View key={i} style={s.activityRow}>
            <View style={[s.activityDot, { backgroundColor: a.color }]} />
            <Text style={s.activityText} numberOfLines={1}>{a.text}</Text>
            <Text style={s.activityTime}>{timeAgo(a.time)}</Text>
          </View>
        ))}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Stan systemu</Text>
        {['Baza danych', 'Autentykacja (Supabase)', 'Storage', 'API Gateway'].map((label, i) => (
          <View key={i} style={s.healthRow}>
            <View style={[s.healthDot, { backgroundColor: '#059669' }]} />
            <Text style={s.healthLabel}>{label}</Text>
            <Text style={[s.healthStatus, { color: '#059669' }]}>OK</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── TAB: Restaurants ─────────────────────────────────────
function RestaurantsTab({ restaurants, search, setSearch, onAdd, onSelectRestaurant }: any) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={[s.searchRow, { flex: 1 }]}>
          <Ionicons name="search" size={16} color={theme.colors.textMuted} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
          <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Szukaj restauracji..." placeholderTextColor={theme.colors.textMuted} />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>Nowa</Text>
        </TouchableOpacity>
      </View>
      {restaurants.length === 0 && <Text style={{ textAlign: 'center', color: theme.colors.textMuted, marginTop: 24 }}>Brak restauracji</Text>}
      {restaurants.map((r: RestaurantWithStats) => (
        <RestaurantRow
          key={r.id}
          r={r}
          expanded
          onPress={() => onSelectRestaurant(r)}
        />
      ))}
    </View>
  );
}

function RestaurantRow({ r, expanded = false, onPress, onImpersonate }: { r: RestaurantWithStats; expanded?: boolean; onPress?: () => void; onImpersonate?: (id: string) => void }) {
  const plan = PLAN_CFG[r.plan as keyof typeof PLAN_CFG] ?? PLAN_CFG.basic;
  const day = new Date(r.created_at).toLocaleDateString('pl-PL');
  return (
    <TouchableOpacity style={s.restRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.restAvatar, { backgroundColor: (r.logo_color ?? '#2563EB') + '22' }]}>
        <Text style={[s.restAvatarText, { color: r.logo_color ?? '#2563EB' }]}>{r.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.restName}>{r.name}</Text>
          <View style={[s.planBadge, { backgroundColor: plan.bg }]}><Text style={[s.planText, { color: plan.color }]}>{plan.label}</Text></View>
        </View>
        <Text style={s.restMeta}>{r.owner_name ?? 'brak właściciela'} · {day}</Text>
        {expanded && r.address ? <Text style={s.restAddress} numberOfLines={1}>{r.address}</Text> : null}
      </View>
      <View style={s.restStats}>
        <View style={s.restStatItem}><Ionicons name="people-outline" size={13} color={theme.colors.textMuted} /><Text style={s.restStatText}>{r.employee_count}</Text></View>
        <View style={s.restStatItem}><Ionicons name="list-outline" size={13} color={theme.colors.textMuted} /><Text style={s.restStatText}>{r.task_count}</Text></View>
      </View>
    </TouchableOpacity>
  );
}

// ── TAB: Subscriptions ──────────────────────────────────
const NEXT_DATE = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

function SubscriptionsTab({ subscriptions, overview, restaurants, onRefresh }: any) {
  const [editSub, setEditSub] = useState<(Subscription & { restaurant_name: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<SubscriptionStatus | 'all'>('all');

  // New subscription form
  const [showNew, setShowNew] = useState(false);
  const [newRestaurantId, setNewRestaurantId] = useState('');
  const [newPlan, setNewPlan] = useState<'basic' | 'premium' | 'enterprise'>('premium');
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>('active');
  const [newAmount, setNewAmount] = useState('299');
  const [newBilling, setNewBilling] = useState<'monthly' | 'annual'>('monthly');
  const [newNextDate, setNewNextDate] = useState(NEXT_DATE(1));
  const [newNotes, setNewNotes] = useState('');
  const [newSaving, setNewSaving] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState('');

  const visible = filter === 'all' ? subscriptions : subscriptions.filter((s: any) => s.status === filter);

  // Restaurants that don't yet have a subscription entry
  const existingRestaurantIds = new Set(subscriptions.map((s: any) => s.restaurant_id));
  const restaurantsWithoutSub = (restaurants as RestaurantWithStats[]).filter(r => !existingRestaurantIds.has(r.id));
  const allRestaurantsForNew = restaurants as RestaurantWithStats[];
  const filteredForPicker = allRestaurantsForNew.filter(r =>
    r.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!editSub) return;
    setSaving(true);
    await upsertSubscription(editSub);
    setSaving(false);
    setEditSub(null);
    onRefresh();
  };

  const handleNewSave = async () => {
    if (!newRestaurantId) { Alert.alert('Błąd', 'Wybierz restaurację'); return; }
    setNewSaving(true);
    const restaurant = allRestaurantsForNew.find(r => r.id === newRestaurantId);
    await upsertSubscription({
      restaurant_id: newRestaurantId,
      restaurant_name: restaurant?.name ?? '',
      plan: newPlan,
      status: newStatus,
      amount: parseFloat(newAmount) || 0,
      currency: 'PLN',
      billing_period: newBilling,
      next_payment_date: newNextDate || null,
      notes: newNotes || null,
    } as any);
    setNewSaving(false);
    setShowNew(false);
    setNewRestaurantId('');
    setNewPlan('premium');
    setNewStatus('active');
    setNewAmount('299');
    setNewBilling('monthly');
    setNewNextDate(NEXT_DATE(1));
    setNewNotes('');
    setRestaurantSearch('');
    onRefresh();
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Header with add button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.sectionTitle}>Subskrypcje</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
          onPress={() => setShowNew(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Nadaj subskrypcję</Text>
        </TouchableOpacity>
      </View>

      {/* Overview cards */}
      {overview && (
        <View style={s.statsRow}>
          {[
            { label: 'Łącznie',  v: overview.total,           color: '#2563EB' },
            { label: 'Aktywne',  v: overview.active,          color: '#059669' },
            { label: 'Trial',    v: overview.trial,           color: '#D97706' },
            { label: 'Zaległe',  v: overview.overdue,         color: '#DC2626' },
            { label: 'MRR',      v: `${overview.monthly_revenue} PLN`, color: '#7C3AED' },
          ].map((c, i) => (
            <View key={i} style={[s.statCard, { flex: 0, minWidth: 80 }]}>
              <Text style={[s.statNum, { fontSize: typeof c.v === 'string' ? 12 : 20, color: c.color }]}>{c.v}</Text>
              <Text style={s.statLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Filter bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'active', 'trial', 'overdue', 'paused', 'cancelled'] as const).map(f => (
            <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterChipActive]} onPress={() => setFilter(f)} activeOpacity={0.7}>
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === 'all' ? 'Wszystkie' : STATUS_CFG[f as SubscriptionStatus]?.label ?? f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {visible.length === 0 && (
        <Text style={{ textAlign: 'center', color: theme.colors.textMuted, marginTop: 24 }}>
          Brak subskrypcji. Każda nowa restauracja automatycznie otrzymuje 14-dniowy trial.
        </Text>
      )}

      {visible.map((sub: Subscription & { restaurant_name: string }) => {
        const cfg = STATUS_CFG[sub.status] ?? STATUS_CFG.active;
        const daysLeft = daysUntil(sub.next_payment_date ?? sub.trial_ends_at);
        const isOverdue = sub.status === 'overdue';
        return (
          <TouchableOpacity key={sub.id ?? sub.restaurant_id} style={[s.subCard, isOverdue && s.subCardOverdue]} onPress={() => setEditSub(sub)} activeOpacity={0.85}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.subName}>{sub.restaurant_name}</Text>
                <View style={[s.subStatusBadge, { backgroundColor: cfg.bg }]}><Text style={[s.subStatusText, { color: cfg.color }]}>{cfg.label}</Text></View>
                <View style={[s.planBadge, { backgroundColor: (PLAN_CFG[sub.plan as keyof typeof PLAN_CFG] ?? PLAN_CFG.basic).bg }]}>
                  <Text style={[s.planText, { color: (PLAN_CFG[sub.plan as keyof typeof PLAN_CFG] ?? PLAN_CFG.basic).color }]}>
                    {(PLAN_CFG[sub.plan as keyof typeof PLAN_CFG] ?? PLAN_CFG.basic).label}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Text style={s.subMeta}><Text style={{ fontWeight: '700' }}>{sub.amount} {sub.currency}</Text>/{sub.billing_period === 'monthly' ? 'mies.' : 'rok'}</Text>
                {sub.last_payment_date && <Text style={s.subMeta}>Ostatnia: {new Date(sub.last_payment_date).toLocaleDateString('pl-PL')}</Text>}
              </View>
              {daysLeft !== null && (
                <Text style={[s.subDays, { color: isOverdue ? '#DC2626' : daysLeft < 7 ? '#D97706' : '#6B7280' }]}>
                  {isOverdue ? `Zaległa ${Math.abs(daysLeft)} dni` : sub.status === 'trial' ? `Trial kończy się za ${daysLeft} dni` : `Następna płatność za ${daysLeft} dni`}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        );
      })}

      {/* ── New Subscription Modal ── */}
      <Modal visible={showNew} transparent animationType="slide" onRequestClose={() => setShowNew(false)}>
        <View style={s.overlay}>
          <View style={s.createModal}>
            <View style={s.createModalHeader}>
              <Text style={s.createModalTitle}>Nadaj subskrypcję</Text>
              <TouchableOpacity onPress={() => setShowNew(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Restaurant picker */}
              <Text style={s.formLabel}>Restauracja *</Text>
              <View style={[s.inputRow, { marginBottom: 8 }]}>
                <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
                <TextInput
                  style={s.formInput}
                  placeholder="Szukaj restauracji..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={restaurantSearch}
                  onChangeText={setRestaurantSearch}
                />
                {restaurantSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setRestaurantSearch('')}>
                    <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ maxHeight: 160, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {filteredForPicker.map(r => {
                    const sub = subscriptions.find((s: any) => s.restaurant_id === r.id);
                    const currentPlan = sub ? (PLAN_CFG[sub.plan as keyof typeof PLAN_CFG]?.label ?? sub.plan) : null;
                    const selected = newRestaurantId === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: selected ? theme.colors.primaryLight : 'transparent', borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
                        onPress={() => setNewRestaurantId(r.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? theme.colors.primary : theme.colors.text }}>{r.name}</Text>
                          {currentPlan && <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Obecny plan: {currentPlan}</Text>}
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                  {filteredForPicker.length === 0 && (
                    <Text style={{ textAlign: 'center', color: theme.colors.textMuted, padding: 16, fontSize: 13 }}>Brak wyników</Text>
                  )}
                </ScrollView>
              </View>

              {/* Plan */}
              <Text style={s.formLabel}>Plan</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {(['basic', 'premium', 'enterprise'] as const).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[s.filterChip, newPlan === p && s.filterChipActive, { flex: 1, justifyContent: 'center' }]}
                    onPress={() => setNewPlan(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.filterText, newPlan === p && s.filterTextActive]}>{PLAN_CFG[p].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status */}
              <Text style={s.formLabel}>Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {(['trial', 'active', 'overdue', 'paused', 'cancelled'] as SubscriptionStatus[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[s.filterChip, newStatus === st && s.filterChipActive]}
                    onPress={() => setNewStatus(st)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.filterText, newStatus === st && s.filterTextActive]}>{STATUS_CFG[st].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Billing period */}
              <Text style={s.formLabel}>Okres rozliczeniowy</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {([['monthly', 'Miesięczny'], ['annual', 'Roczny']] as const).map(([val, lbl]) => (
                  <TouchableOpacity
                    key={val}
                    style={[s.filterChip, newBilling === val && s.filterChipActive, { flex: 1, justifyContent: 'center' }]}
                    onPress={() => setNewBilling(val)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.filterText, newBilling === val && s.filterTextActive]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={s.formLabel}>Kwota (PLN)</Text>
              <View style={[s.inputRow, { marginBottom: 14 }]}>
                <Ionicons name="cash-outline" size={16} color={theme.colors.textMuted} />
                <TextInput
                  style={s.formInput}
                  value={newAmount}
                  keyboardType="numeric"
                  onChangeText={setNewAmount}
                  placeholder="299"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              {/* Next payment date */}
              <Text style={s.formLabel}>Data następnej płatności</Text>
              <View style={[s.inputRow, { marginBottom: 14 }]}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                <TextInput
                  style={s.formInput}
                  value={newNextDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                  onChangeText={setNewNextDate}
                />
              </View>

              {/* Notes */}
              <Text style={s.formLabel}>Notatki (opcjonalne)</Text>
              <TextInput
                style={[s.formInput, { height: 60, textAlignVertical: 'top', paddingTop: 10, marginBottom: 20 }]}
                value={newNotes}
                multiline
                placeholder="np. Zmiana planu na wniosek klienta"
                placeholderTextColor={theme.colors.textMuted}
                onChangeText={setNewNotes}
              />

              <TouchableOpacity
                style={[s.createBtn, (!newRestaurantId || newSaving) && { opacity: 0.5 }]}
                onPress={handleNewSave}
                disabled={!newRestaurantId || newSaving}
                activeOpacity={0.85}
              >
                {newSaving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                <Text style={s.createBtnText}>{newSaving ? 'Zapisywanie...' : 'Nadaj subskrypcję'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Subscription Modal */}
      <Modal visible={!!editSub} transparent animationType="slide" onRequestClose={() => setEditSub(null)}>
        <View style={s.overlay}>
          <View style={s.createModal}>
            <View style={s.createModalHeader}>
              <Text style={s.createModalTitle}>Edytuj subskrypcję</Text>
              <TouchableOpacity onPress={() => setEditSub(null)} activeOpacity={0.7}><Ionicons name="close" size={22} color={theme.colors.textMuted} /></TouchableOpacity>
            </View>
            {editSub && (
              <ScrollView>
                <Text style={s.formLabel}>Restauracja</Text>
                <Text style={[s.formInput, { paddingVertical: 12, color: theme.colors.text }]}>{editSub.restaurant_name}</Text>

                <Text style={[s.formLabel, { marginTop: 12 }]}>Status</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {(['trial','active','overdue','paused','cancelled'] as SubscriptionStatus[]).map(st => (
                    <TouchableOpacity key={st} style={[s.filterChip, editSub.status === st && s.filterChipActive]} onPress={() => setEditSub({ ...editSub, status: st })} activeOpacity={0.7}>
                      <Text style={[s.filterText, editSub.status === st && s.filterTextActive]}>{STATUS_CFG[st].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.formLabel}>Plan</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {(['basic','premium','enterprise'] as const).map(p => (
                    <TouchableOpacity key={p} style={[s.filterChip, editSub.plan === p && s.filterChipActive]} onPress={() => setEditSub({ ...editSub, plan: p })} activeOpacity={0.7}>
                      <Text style={[s.filterText, editSub.plan === p && s.filterTextActive]}>{PLAN_CFG[p].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.formLabel}>Kwota (PLN)</Text>
                <View style={[s.inputRow, { marginBottom: 14 }]}>
                  <Ionicons name="cash-outline" size={16} color={theme.colors.textMuted} />
                  <TextInput style={s.formInput} value={String(editSub.amount)} keyboardType="numeric" onChangeText={v => setEditSub({ ...editSub, amount: parseFloat(v) || 0 })} />
                </View>

                <Text style={s.formLabel}>Okres rozliczeniowy</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {([['monthly','Miesięczny'],['annual','Roczny']] as const).map(([val, lbl]) => (
                    <TouchableOpacity key={val} style={[s.filterChip, editSub.billing_period === val && s.filterChipActive]} onPress={() => setEditSub({ ...editSub, billing_period: val })} activeOpacity={0.7}>
                      <Text style={[s.filterText, editSub.billing_period === val && s.filterTextActive]}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.formLabel}>Data następnej płatności (YYYY-MM-DD)</Text>
                <View style={[s.inputRow, { marginBottom: 14 }]}>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                  <TextInput style={s.formInput} value={editSub.next_payment_date ?? ''} placeholder="np. 2026-07-01" placeholderTextColor={theme.colors.textMuted} onChangeText={v => setEditSub({ ...editSub, next_payment_date: v || null })} />
                </View>

                <Text style={s.formLabel}>Notatki</Text>
                <TextInput style={[s.formInput, { height: 70, textAlignVertical: 'top', paddingTop: 10, marginBottom: 16 }]} value={editSub.notes ?? ''} multiline placeholder="np. faktury wysyłane na faktura@firma.pl" placeholderTextColor={theme.colors.textMuted} onChangeText={v => setEditSub({ ...editSub, notes: v })} />

                <TouchableOpacity style={[s.createBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                  <Text style={s.createBtnText}>{saving ? 'Zapisywanie...' : 'Zapisz zmiany'}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── TAB: Users ──────────────────────────────────────────
function UsersTab({ restaurants }: any) {
  const total = restaurants.reduce((s: number, r: RestaurantWithStats) => s + r.employee_count, 0);
  return (
    <View style={{ gap: 14 }}>
      <View style={s.statsRow}>
        <View style={[s.statCard, { flex: 0, minWidth: 140 }]}>
          <View style={[s.statIcon, { backgroundColor: '#D1FAE5' }]}><Ionicons name="people" size={20} color="#059669" /></View>
          <Text style={[s.statNum, { color: '#059669' }]}>{total}</Text>
          <Text style={s.statLabel}>Wszystkich użytkowników</Text>
        </View>
        <View style={[s.statCard, { flex: 0, minWidth: 140 }]}>
          <View style={[s.statIcon, { backgroundColor: '#EDE9FE' }]}><Ionicons name="business" size={20} color="#7C3AED" /></View>
          <Text style={[s.statNum, { color: '#7C3AED' }]}>{restaurants.length}</Text>
          <Text style={s.statLabel}>Kont restauracji</Text>
        </View>
      </View>
      <Text style={s.sectionTitle}>Pracownicy wg restauracji</Text>
      {restaurants.map((r: RestaurantWithStats) => (
        <View key={r.id} style={s.restRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.restName}>{r.name}</Text>
            <Text style={s.restMeta}>{r.owner_name ?? '—'}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.text }}>{r.employee_count}</Text>
          <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginLeft: 4 }}>os.</Text>
        </View>
      ))}
    </View>
  );
}

// ── TAB: Activity ───────────────────────────────────────
function ActivityTab({ activity }: any) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.sectionTitle}>Ostatnia aktywność systemu</Text>
      {activity.length === 0 && <Text style={{ color: theme.colors.textMuted }}>Brak aktywności</Text>}
      {activity.map((a: any, i: number) => (
        <View key={i} style={[s.activityCard, { borderLeftColor: a.color }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.activityCardText}>{a.text}</Text>
            <Text style={s.activityTime}>{timeAgo(a.time)}</Text>
          </View>
          <View style={[s.activityTypeBadge, { backgroundColor: a.color + '18' }]}>
            <Text style={[s.activityTypeText, { color: a.color }]}>{a.type === 'restaurant' ? 'restauracja' : 'zadanie'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Restaurant Detail Modal ─────────────────────────────
function RestaurantDetailModal({ visible, restaurant, onClose, onRefresh }: {
  visible: boolean;
  restaurant: RestaurantWithStats | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { enterRestaurantMode } = useAuth();
  const router = useRouter();
  const handleEnter = async () => {
    if (!restaurant) return;
    setEntering(true);
    const ok = await enterRestaurantMode(restaurant.id);
    setEntering(false);
    if (ok) {
      onClose();
      router.replace('/(tabs)/dashboard' as any);
    } else {
      Alert.alert('Błąd', 'Nie udało się wejść w tryb wsparcia dla tej restauracji.');
    }
  };

  const [entering, setEntering] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!restaurant) return null;

  const plan = PLAN_CFG[restaurant.plan as keyof typeof PLAN_CFG] ?? PLAN_CFG.basic;

  const handleMarkPaid = async () => {
    setActionLoading('paid');
    await markSubscriptionPaid(restaurant.id);
    setActionLoading(null);
    onRefresh();
    Alert.alert('Gotowe', 'Subskrypcja oznaczona jako opłacona (aktywna).');
  };

  const handleDisable = () => {
    Alert.alert('Wyłącz konto', 'Wyłączyć dostęp pracownikom tej restauracji?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyłącz', style: 'destructive', onPress: async () => {
        setActionLoading('disable');
        await disableRestaurantAccounts(restaurant.id, true);
        setActionLoading(null);
        Alert.alert('Gotowe', 'Dostęp pracowników został wyłączony.');
      }},
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Usuń restaurację', `Na pewno usunąć "${restaurant.name}"? Tej operacji nie można cofnąć.`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        setActionLoading('delete');
        const result = await deleteRestaurant(restaurant.id);
        setActionLoading(null);
        if (result.success) { onClose(); onRefresh(); }
        else Alert.alert('Błąd', result.error ?? 'Nie udało się usunąć restauracji.');
      }},
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.createModal}>
          <View style={s.createModalHeader}>
            <Text style={s.createModalTitle}>Szczegóły restauracji</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}><Ionicons name="close" size={22} color={theme.colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={[s.restAvatar, { width: 60, height: 60, backgroundColor: (restaurant.logo_color ?? '#2563EB') + '22' }]}>
                <Text style={[s.restAvatarText, { fontSize: 20, color: restaurant.logo_color ?? '#2563EB' }]}>{restaurant.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={[s.restName, { fontSize: 18, marginTop: 8 }]}>{restaurant.name}</Text>
              <View style={[s.planBadge, { marginTop: 6, backgroundColor: plan.bg }]}><Text style={[s.planText, { color: plan.color }]}>{plan.label}</Text></View>
            </View>

            <View style={s.section}>
              <Text style={s.formLabel}>Informacje podstawowe</Text>
              <View style={[s.settingRow, { backgroundColor: theme.colors.surface, padding: 12 }]}>
                <View style={[s.settingIcon, { backgroundColor: '#2563EB18' }]}><Ionicons name="person" size={16} color="#2563EB" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingLabel}>Właściciel</Text>
                  <Text style={s.settingValue}>{restaurant.owner_name ?? 'Brak'}</Text>
                </View>
              </View>
              <View style={[s.settingRow, { backgroundColor: theme.colors.surface, padding: 12 }]}>
                <View style={[s.settingIcon, { backgroundColor: '#05966918' }]}><Ionicons name="location" size={16} color="#059669" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingLabel}>Adres</Text>
                  <Text style={s.settingValue}>{restaurant.address ?? 'Brak'}</Text>
                </View>
              </View>
              <View style={[s.settingRow, { backgroundColor: theme.colors.surface, padding: 12 }]}>
                <View style={[s.settingIcon, { backgroundColor: '#7C3AED18' }]}><Ionicons name="call" size={16} color="#7C3AED" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingLabel}>Telefon</Text>
                  <Text style={s.settingValue}>{restaurant.phone ?? 'Brak'}</Text>
                </View>
              </View>
              <View style={[s.settingRow, { backgroundColor: theme.colors.surface, padding: 12 }]}>
                <View style={[s.settingIcon, { backgroundColor: '#D9770618' }]}><Ionicons name="calendar" size={16} color="#D97706" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingLabel}>Utworzono</Text>
                  <Text style={s.settingValue}>{new Date(restaurant.created_at).toLocaleDateString('pl-PL')}</Text>
                </View>
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.formLabel}>Statystyki</Text>
              <View style={s.statsRow}>
                <View style={[s.statCard, { flex: 1 }]}>
                  <Text style={[s.statNum, { fontSize: 22, color: '#2563EB' }]}>{restaurant.employee_count}</Text>
                  <Text style={s.statLabel}>Pracowników</Text>
                </View>
                <View style={[s.statCard, { flex: 1 }]}>
                  <Text style={[s.statNum, { fontSize: 22, color: '#059669' }]}>{restaurant.task_count}</Text>
                  <Text style={s.statLabel}>Zadań</Text>
                </View>
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.formLabel}>Akcje supportu</Text>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: '#2563EB', gap: 10 }]}
                onPress={handleEnter}
                disabled={entering || !!actionLoading}
                activeOpacity={0.85}
              >
                {entering
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />}
                <Text style={s.createBtnText}>{entering ? 'Wczytywanie...' : `Wejdź jako wsparcie → ${restaurant.name}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: '#059669', gap: 10, marginTop: 8 }]}
                onPress={handleMarkPaid}
                disabled={!!actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading === 'paid' ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
                <Text style={s.createBtnText}>Oznacz jako opłacone</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: '#D97706', gap: 10, marginTop: 8 }]}
                onPress={handleDisable}
                disabled={!!actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading === 'disable' ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="ban-outline" size={18} color="#fff" />}
                <Text style={s.createBtnText}>Wyłącz dostęp pracownikom</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: '#DC2626', gap: 10, marginTop: 8 }]}
                onPress={handleDelete}
                disabled={!!actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading === 'delete' ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="trash-outline" size={18} color="#fff" />}
                <Text style={s.createBtnText}>Usuń restaurację</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' }}>
                Przejdziesz do dashboardu tej restauracji. Widoczny będzie pomarańczowy pasek wsparcia.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── TAB: Settings ───────────────────────────────────────
function SettingsTab({ promoCodes, onRefresh, userId }: { promoCodes: PromoCode[]; onRefresh: () => void; userId: string }) {
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('10');
  const [promoMaxUses, setPromoMaxUses] = useState('');
  const [promoValidUntil, setPromoValidUntil] = useState('');
  const [loading, setLoading] = useState(false);
  const [referrals, setReferrals] = useState<(Referral & { referrer_name: string; referred_name: string })[]>([]);
  const [refLoading, setRefLoading] = useState(false);

  useEffect(() => {
    setRefLoading(true);
    getAllReferrals().then((data) => { setReferrals(data); setRefLoading(false); });
  }, []);

  const handleMarkDiscount = async (id: string, side: 'referrer' | 'referred' | 'both') => {
    await markReferralDiscountApplied(id, side);
    getAllReferrals().then(setReferrals);
  };

  const handleCreatePromo = async () => {
    if (!promoCode.trim()) { Alert.alert('Błąd', 'Wpisz kod'); return; }
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const result = await createPromoCode(
      promoCode.trim().toUpperCase(),
      parseInt(promoDiscount) || 10,
      today,
      promoValidUntil.trim() || null,
      promoMaxUses ? parseInt(promoMaxUses) : null,
      userId
    );
    setLoading(false);
    if (result) {
      setShowPromoModal(false);
      setPromoCode(''); setPromoDiscount('10'); setPromoMaxUses(''); setPromoValidUntil('');
      onRefresh();
    } else {
      Alert.alert('Błąd', 'Nie udało się utworzyć kodu');
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Text style={s.sectionTitle}>Ustawienia systemu</Text>
      {[
        { label: 'Wersja aplikacji', value: '1.0.0-beta', icon: 'code-slash', color: '#2563EB' },
        { label: 'Backend', value: 'Supabase', icon: 'cloud', color: '#059669' },
        { label: 'Auth provider', value: 'Supabase Auth', icon: 'shield-checkmark', color: '#7C3AED' },
        { label: 'Framework', value: 'React Native + Expo', icon: 'phone-portrait', color: '#DC2626' },
      ].map((item, i) => (
        <View key={i} style={s.settingRow}>
          <View style={[s.settingIcon, { backgroundColor: item.color + '18' }]}><Ionicons name={item.icon as any} size={18} color={item.color} /></View>
          <Text style={s.settingLabel}>{item.label}</Text>
          <Text style={s.settingValue}>{item.value}</Text>
        </View>
      ))}

      {/* ── Referrals ── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Polecenia restauracji</Text>
          <Text style={s.restMeta}>{referrals.length} łącznie</Text>
        </View>
        {refLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 16 }} />
        ) : referrals.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', padding: 20 }}>Brak poleceń</Text>
        ) : (
          referrals.map((ref) => (
            <View key={ref.id} style={[s.restRow, { flexDirection: 'column', gap: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="arrow-forward-circle" size={14} color="#7C3AED" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, flex: 1 }}>
                  {ref.referrer_name} → {ref.referred_name}
                </Text>
                <Text style={s.restMeta}>{ref.referred_at ? new Date(ref.referred_at).toLocaleDateString('pl-PL') : '—'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  onPress={() => handleMarkDiscount(ref.id, 'referrer')}
                  disabled={ref.discount_applied_referrer}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: ref.discount_applied_referrer ? '#D1FAE5' : '#EDE9FE' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={ref.discount_applied_referrer ? 'checkmark-circle' : 'cash-outline'} size={13} color={ref.discount_applied_referrer ? '#059669' : '#7C3AED'} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: ref.discount_applied_referrer ? '#059669' : '#7C3AED' }}>
                    {ref.discount_applied_referrer ? 'Rabat A zastosowany' : 'Zastosuj rabat dla A'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMarkDiscount(ref.id, 'referred')}
                  disabled={ref.discount_applied_referred}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: ref.discount_applied_referred ? '#D1FAE5' : '#EFF6FF' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={ref.discount_applied_referred ? 'checkmark-circle' : 'cash-outline'} size={13} color={ref.discount_applied_referred ? '#059669' : '#2563EB'} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: ref.discount_applied_referred ? '#059669' : '#2563EB' }}>
                    {ref.discount_applied_referred ? 'Rabat B zastosowany' : 'Zastosuj rabat dla B'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Kody promocyjne / polecające</Text>
          <TouchableOpacity onPress={() => setShowPromoModal(true)} activeOpacity={0.7}><Text style={s.sectionLink}>+ Nowy kod</Text></TouchableOpacity>
        </View>
        <View style={{ backgroundColor: '#F5F3FF', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#DDD6FE' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#7C3AED', marginBottom: 4 }}>Jak działa program polecający?</Text>
          <Text style={{ fontSize: 12, color: '#6D28D9', lineHeight: 18 }}>
            1. Tworzysz kod (np. PARTNER20) z % zniżki i opcjonalnym limitem użyć / datą ważności.{'\n'}
            2. Osoba rejestrująca nową restaurację wpisuje kod w formularzu rejestracji.{'\n'}
            3. Kod automatycznie aplikuje rabat na subskrypcję i zwiększa licznik użyć.{'\n'}
            4. Możesz w dowolnym momencie dezaktywować kod przełącznikiem.
          </Text>
        </View>
        {promoCodes.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', padding: 20 }}>Brak kodów</Text>
        ) : (
          promoCodes.map((pc) => (
            <View key={pc.id} style={[s.restRow, { gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#7C3AED', letterSpacing: 1 }}>{pc.code}</Text>
                  <View style={{ backgroundColor: pc.is_active ? '#D1FAE5' : '#F3F4F6', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: pc.is_active ? '#059669' : '#6B7280' }}>{pc.is_active ? 'Aktywny' : 'Wyłączony'}</Text>
                  </View>
                </View>
                <Text style={s.restMeta}>{pc.discount_percent}% rabatu · {pc.used_count ?? 0}/{pc.max_uses ?? '∞'} użyć</Text>
              </View>
              <TouchableOpacity
                onPress={async () => { await togglePromoCode(pc.id!, !pc.is_active); onRefresh(); }}
                style={{ padding: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name={pc.is_active ? 'toggle' : 'toggle-outline'} size={28} color={pc.is_active ? '#059669' : '#6B7280'} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="information-circle" size={16} color="#D97706" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>Tworzenie konta super-admina</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#92400E', lineHeight: 18 }}>
          1. Utwórz konto w Supabase Dashboard{'\n'}
          2. Skopiuj UUID użytkownika{'\n'}
          3. Wykonaj w SQL Editor:{'\n\n'}
          {'  '}INSERT INTO profiles (id, is_super_admin, first_name, last_name,{'\n'}
          {'  '}role, job_title, avatar_color) VALUES{'\n'}
          {'  '}{'(\'<UUID>\', true, \'ShiftApp\', \'Team\', \'owner\', \'Super Admin\', \'#7C3AED\');'}
        </Text>
      </View>

      {/* Promo Code Modal */}
      <Modal visible={showPromoModal} transparent animationType="slide" onRequestClose={() => setShowPromoModal(false)}>
        <View style={s.overlay}>
          <View style={s.createModal}>
            <View style={s.createModalHeader}>
              <Text style={s.createModalTitle}>Nowy kod promocyjny</Text>
              <TouchableOpacity onPress={() => setShowPromoModal(false)} activeOpacity={0.7}><Ionicons name="close" size={22} color={theme.colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.formLabel}>Kod (zostanie zamieniony na wielkie litery)</Text>
              <View style={[s.inputRow, { marginBottom: 14 }]}>
                <Ionicons name="pricetag" size={16} color={theme.colors.textMuted} />
                <TextInput style={s.formInput} value={promoCode} onChangeText={setPromoCode} placeholder="np. LATO2026" placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />
              </View>

              <Text style={s.formLabel}>Rabat (%)</Text>
              <View style={[s.inputRow, { marginBottom: 14 }]}>
                <Ionicons name="pricetag-outline" size={16} color={theme.colors.textMuted} />
                <TextInput style={s.formInput} value={promoDiscount} keyboardType="numeric" onChangeText={setPromoDiscount} placeholder="10" placeholderTextColor={theme.colors.textMuted} />
              </View>

              <Text style={s.formLabel}>Maksymalne użycia (opcjonalne)</Text>
              <View style={[s.inputRow, { marginBottom: 14 }]}>
                <Ionicons name="people" size={16} color={theme.colors.textMuted} />
                <TextInput style={s.formInput} value={promoMaxUses} keyboardType="numeric" onChangeText={setPromoMaxUses} placeholder="np. 100" placeholderTextColor={theme.colors.textMuted} />
              </View>

              <Text style={s.formLabel}>Ważny do (YYYY-MM-DD, opcjonalne)</Text>
              <View style={[s.inputRow, { marginBottom: 20 }]}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                <TextInput style={s.formInput} value={promoValidUntil} onChangeText={setPromoValidUntil} placeholder="np. 2026-12-31" placeholderTextColor={theme.colors.textMuted} />
              </View>

              <TouchableOpacity style={[s.createBtn, loading && { opacity: 0.6 }]} onPress={handleCreatePromo} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                <Text style={s.createBtnText}>{loading ? 'Tworzenie...' : 'Utwórz kod'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background },
  safe: { flex: 1, backgroundColor: theme.colors.background },
  sidebar: { width: 240, backgroundColor: theme.colors.card, borderRightWidth: 1, borderRightColor: theme.colors.border },
  sidebarLogo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  logoSub: { fontSize: 11, color: theme.colors.textMuted },
  sidebarNav: { flex: 1, padding: 12, gap: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  navItemActive: { backgroundColor: theme.colors.primaryLight },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  navLabelActive: { color: theme.colors.primary, fontWeight: '700' },
  navBadge: { backgroundColor: '#DC2626', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  navBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: theme.colors.border, padding: 16, gap: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  userRole: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  logoutText: { fontSize: 13, fontWeight: '700', color: theme.colors.error },
  main: { flex: 1 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  topbarTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  statusText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  contentPad: { padding: 24 },
  mobileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mobileTabs: { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mobileTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mobileTabActive: { borderBottomColor: theme.colors.primary },
  mobileTabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  mobileTabTextActive: { color: theme.colors.primary },
  mobileTabBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, paddingHorizontal: 4, shadowColor: '#1A1D23', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  mobileTabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 4, gap: 3 },
  mobileTabBarItemActive: {},
  mobileTabBarText: { fontSize: 10, fontWeight: '600' },
  mobileTabBarTextActive: { color: theme.colors.primary },
  fabOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', alignItems: 'center' },
  fabMenu: { position: 'absolute', backgroundColor: theme.colors.card, borderRadius: 16, padding: 8, minWidth: 200, ...theme.shadows.medium },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  fabMenuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  fabMenuLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...theme.shadows.fab },
  fabActive: { backgroundColor: '#1a56db' },
  loader: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  loaderText: { fontSize: 14, color: theme.colors.textMuted },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: 110, backgroundColor: theme.colors.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, ...theme.shadows.card },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontSize: 26, fontWeight: '900', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center' },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  sectionLink: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, ...theme.shadows.card },
  restAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  restAvatarText: { fontSize: 13, fontWeight: '800' },
  restName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  restMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  restAddress: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  restStats: { flexDirection: 'row', gap: 8 },
  restStatItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  restStatText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  loginAsBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  planBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  planText: { fontSize: 10, fontWeight: '700' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: 10, padding: 12, ...theme.shadows.card },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityText: { flex: 1, fontSize: 13, color: theme.colors.text },
  activityTime: { fontSize: 11, color: theme.colors.textMuted },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, borderLeftWidth: 4, gap: 12, ...theme.shadows.card },
  activityCardText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  activityTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  activityTypeText: { fontSize: 11, fontWeight: '700' },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: 10, padding: 12, ...theme.shadows.card },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthLabel: { flex: 1, fontSize: 13, color: theme.colors.text },
  healthStatus: { fontSize: 12, fontWeight: '700' },
  searchRow: { position: 'relative', justifyContent: 'center' },
  searchInput: { backgroundColor: theme.colors.card, borderRadius: 12, paddingLeft: 36, paddingRight: 16, paddingVertical: 10, fontSize: 14, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  filterChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff' },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 14, padding: 16, ...theme.shadows.card },
  subCardOverdue: { borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  subName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  subStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  subStatusText: { fontSize: 11, fontWeight: '700' },
  subMeta: { fontSize: 12, color: theme.colors.textSecondary },
  subDays: { fontSize: 11, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 14, ...theme.shadows.card },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  settingValue: { fontSize: 12, color: theme.colors.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  createModal: { backgroundColor: theme.colors.card, borderRadius: 20, padding: 20, width: '100%', maxWidth: 480, maxHeight: '90%' },
  createModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  createModalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  formLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border },
  formInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  planOption: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center' },
  planOptionActive: { borderColor: '#7C3AED', backgroundColor: '#EDE9FE' },
  planOptionText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textAlign: 'center' },
  planOptionTextActive: { color: '#7C3AED' },
  errorText: { fontSize: 13, color: theme.colors.error, marginBottom: 10, fontWeight: '600' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 12 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  codeModal: { backgroundColor: theme.colors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, alignItems: 'center', gap: 10 },
  codeModalTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  codeModalSub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 18 },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EDE9FE', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, borderWidth: 2, borderColor: '#7C3AED', width: '100%', justifyContent: 'center' },
  codeText: { fontSize: 28, fontWeight: '900', color: '#7C3AED', letterSpacing: 6 },
  codeHint: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 16 },
  codeDoneBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  codeDoneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
