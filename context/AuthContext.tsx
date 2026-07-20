import React, { createContext, useContext, useEffect, useState } from 'react';
import { findRestaurantByRefCode, recordReferral } from '../lib/referral';
import type { DbProfile, DbRestaurant } from '../lib/supabase';
import { supabase } from '../lib/supabase';

export type UserRole = 'owner' | 'manager' | 'employee';

export type AuthUser = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  role: UserRole;
  jobTitle: string;
  restaurantId: string | null;
  avatarColor: string;
  onboardingDone: boolean;
  isSuperAdmin: boolean;
  hasChildren: boolean;
  employmentType: string;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string;
  ownerId: string | null;
  plan: 'basic' | 'premium';
  logoColor: string;
  createdAt: string;
};

type AuthContextType = {
  user: AuthUser | null;
  restaurant: Restaurant | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  isManager: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  impersonatedRestaurant: Restaurant | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  joinWithCode: (
    code: string,
    data: { firstName: string; lastName: string; email: string; password: string }
  ) => Promise<string | false>;
  registerRestaurant: (data: {
    restaurantName: string;
    address: string;
    phone: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    refCode?: string;
    gclid?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshRestaurant: () => Promise<void>;
  refreshUser: () => Promise<void>;
  enterRestaurantMode: (restaurantId: string) => Promise<boolean>;
  exitRestaurantMode: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(profile: DbProfile, email: string): AuthUser {
  const firstName = profile.first_name;
  const lastName = profile.last_name;
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return {
    id: profile.id,
    name: `${firstName} ${lastName}`,
    firstName,
    initials,
    email,
    role: profile.role as UserRole,
    jobTitle: profile.job_title,
    restaurantId: profile.restaurant_id ?? null,
    avatarColor: profile.avatar_color,
    onboardingDone: profile.onboarding_done ?? true,
    isSuperAdmin: profile.is_super_admin ?? false,
    hasChildren: (profile as any).has_children ?? false,
    employmentType: profile.employment_type ?? 'full_time',
  };
}

function toRestaurant(r: DbRestaurant): Restaurant {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    phone: r.phone,
    ownerId: r.owner_id,
    plan: r.plan,
    logoColor: r.logo_color,
    createdAt: r.created_at,
  };
}

async function loadUserData(userId: string, email: string): Promise<{ user: AuthUser; restaurant: Restaurant | null } | null> {
  // Pobierz profil bez JOIN
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (pErr || !profile) return null;

  const isSuperAdmin = (profile as DbProfile).is_super_admin === true;
  const restaurantId = (profile as DbProfile).restaurant_id;

  // Enforce account deactivation — a disabled (non super-admin) account has no access.
  if (!isSuperAdmin && (profile as DbProfile).is_active === false) {
    await supabase.auth.signOut();
    return null;
  }

  // Jeśli super admin nie ma restauracji, to jest OK
  if (isSuperAdmin && !restaurantId) {
    return {
      user: toAuthUser(profile as DbProfile, email),
      restaurant: null,
    };
  }

  // Pobierz restaurację osobnym zapytaniem
  let restaurant = null;
  if (restaurantId) {
    const { data: restData } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();
    if (restData) {
      restaurant = toRestaurant(restData as DbRestaurant);
    }
  }

  return {
    user: toAuthUser(profile as DbProfile, email),
    restaurant,
  };
}

let _isRegistering = false;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [impersonatedRestaurant, setImpersonatedRestaurant] = useState<Restaurant | null>(null);
  // Restore session on mount
  useEffect(() => {
    // Fallback: force loading=false after 4s so app never stays stuck
    const fallback = setTimeout(() => setIsLoading(false), 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(fallback);
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setRestaurant(null);
        setHasSession(false);
        setIsLoading(false);
      } else if (session?.user) {
        setHasSession(true);
        setIsLoading(false);
        if (!_isRegistering) {
          loadUserData(session.user.id, session.user.email ?? '').then((result) => {
            if (result) {
              setUser(result.user);
              setRestaurant(result.restaurant);
            } else {
              // No profile found — orphaned auth user, sign out cleanly
              supabase.auth.signOut();
            }
          });
        }
      }
    });

    return () => { subscription.unsubscribe(); clearTimeout(fallback); };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setIsLoading(false);
      const msg = (error.message ?? '').toLowerCase();
      const friendly =
        msg.includes('invalid login') || msg.includes('invalid credentials') ? 'Nieprawidłowy e-mail lub hasło. Sprawdź dane i spróbuj ponownie.' :
        msg.includes('email not confirmed')                                   ? 'Konto nie zostało jeszcze potwierdzone. Sprawdź skrzynkę e-mail.' :
        msg.includes('too many requests') || msg.includes('rate limit')       ? 'Zbyt wiele prób logowania. Odczekaj chwilę i spróbuj ponownie.' :
        msg.includes('user not found')                                        ? 'Nie znaleziono konta z tym adresem e-mail.' :
        msg.includes('network')                                               ? 'Błąd połączenia z internetem. Sprawdź sieć i spróbuj ponownie.' :
        error.message ?? 'Wystąpił błąd. Spróbuj ponownie.';
      return { success: false, error: friendly };
    }
    // Block deactivated accounts with a clear message (loadUserData enforces this too).
    const { data: udata } = await supabase.auth.getUser();
    const uid = udata?.user?.id;
    if (uid) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_active, is_super_admin')
        .eq('id', uid)
        .single();
      if (prof && (prof as any).is_super_admin !== true && (prof as any).is_active === false) {
        await supabase.auth.signOut();
        setIsLoading(false);
        return { success: false, error: 'Twoje konto zostało wyłączone. Skontaktuj się z przełożonym.' };
      }
    }
    // onAuthStateChange will handle setHasSession + loadUserData
    return { success: true };
  };

  const joinWithCode = async (
    code: string,
    data: { firstName: string; lastName: string; email: string; password: string }
  ): Promise<string | false> => {
    setIsLoading(true);

    // 1. Validate invitation code via RPC
    const { data: invData, error: invError } = await supabase
      .rpc('accept_invitation', { p_code: code.toUpperCase() });

    if (invError || invData?.error) { setIsLoading(false); return false; }

    const { restaurant_id, job_title, group_ids } = invData as {
      invitation_id: string;
      restaurant_id: string;
      restaurant_name: string;
      job_title: string;
      group_ids: string[] | null;
    };

    // 2. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
    });

    if (authError || !authData.user) { setIsLoading(false); return false; }

    const userId = authData.user.id;

    // 3. Create profile
    const avatarColors = ['#2196C9','#22C55E','#F97316','#A855F7','#EAB308','#EF4444','#0F172A'];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      restaurant_id,
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      role: 'employee',
      job_title,
      avatar_color: avatarColor,
    });

    if (profileError) { setIsLoading(false); return false; }

    // 4. Mark invitation as used — also assigns the employee to the invitation's groups
    await supabase.rpc('mark_invitation_used', { p_code: code.toUpperCase(), p_user_id: userId, p_group_ids: group_ids ?? [] });

    // 5. Load user data
    const result = await loadUserData(userId, data.email.trim());
    setIsLoading(false);
    if (!result) return false;
    setUser(result.user);
    setRestaurant(result.restaurant);
    return userId;
  };

  const registerRestaurant = async (data: {
    restaurantName: string;
    address: string;
    phone: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    refCode?: string;
    gclid?: string | null;
  }): Promise<{ success: boolean; error?: string }> => {
    _isRegistering = true;
    setIsLoading(true);

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
    });
    if (authError || !authData.user) {
      _isRegistering = false;
      setIsLoading(false);
      const msg = (authError?.message ?? '').toLowerCase();
      console.error('[registerRestaurant] signUp error:', authError?.message);
      const friendly =
        msg.includes('rate limit')                          ? 'Przekroczono limit rejestracji. Odczekaj chwilę i spróbuj ponownie.' :
        msg.includes('already registered')                  ? 'Konto z tym e-mailem już istnieje. Spróbuj się zalogować.' :
        msg.includes('already exists')                      ? 'Konto z tym e-mailem już istnieje. Spróbuj się zalogować.' :
        msg.includes('user already')                        ? 'Konto z tym e-mailem już istnieje. Spróbuj się zalogować.' :
        msg.includes('password')                            ? 'Hasło musi mieć co najmniej 6 znaków.' :
        msg.includes('invalid email')                       ? 'Podaj prawidłowy adres e-mail.' :
        msg.includes('signup')  || msg.includes('sign up') ? 'Rejestracja jest chwilowo niedostępna.' :
        authError?.message ?? 'Nie udało się utworzyć konta.';
      return { success: false, error: friendly };
    }
    const userId = authData.user.id;

    // 2. Create restaurant via SECURITY DEFINER RPC (bypasses RLS)
    const { data: rpcData, error: restError } = await supabase.rpc('create_restaurant_for_owner', {
      p_name: data.restaurantName.trim(),
      p_address: data.address.trim(),
      p_phone: data.phone.trim(),
      p_owner_id: userId,
    });
    const restData = rpcData as { id: string } | null;
    if (restError || !restData?.id) {
      _isRegistering = false;
      setIsLoading(false);
      console.error('[registerRestaurant] restaurant error:', restError?.message);
      return { success: false, error: 'Nie udało się utworzyć restauracji.' };
    }

    // 3. Create owner profile
    const avatarColors = ['#2196C9','#22C55E','#F97316','#A855F7','#EAB308','#EF4444','#0F172A'];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const profilePayload: Record<string, unknown> = {
      id: userId,
      restaurant_id: restData.id,
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      role: 'owner',
      job_title: 'Właściciel',
      avatar_color: avatarColor,
    };
    if (data.gclid) profilePayload.gclid = data.gclid;
    const { error: profileError } = await supabase.from('profiles').insert(profilePayload);
    if (profileError) {
      _isRegistering = false;
      setIsLoading(false);
      return { success: false, error: 'Nie udało się utworzyć profilu.' };
    }

    // 4. Generate ref_code for the new restaurant (segments 1-4 + 10-13 of UUID, guaranteed unique per UUID)
    const idStr = restData.id.replace(/-/g, '');
    const newRefCode = 'REF-' + (idStr.substring(0, 4) + idStr.substring(8, 12)).toUpperCase();
    await supabase.from('restaurants').update({ ref_code: newRefCode }).eq('id', restData.id);

    // 5. Record referral if a valid refCode was provided
    if (data.refCode?.trim()) {
      const referrer = await findRestaurantByRefCode(data.refCode.trim());
      if (referrer && referrer.id !== restData.id) {
        await recordReferral(referrer.id, restData.id);
      }
    }

    // 6. Load user data
    _isRegistering = false;
    const result = await loadUserData(userId, data.email.trim());
    setIsLoading(false);
    if (!result) return { success: false, error: 'Nie udało się załadować danych.' };
    setUser(result.user);
    setRestaurant(result.restaurant);
    setHasSession(true);
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRestaurant(null);
    setImpersonatedRestaurant(null);
  };

  const enterRestaurantMode = async (restaurantId: string): Promise<boolean> => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
    if (error || !data) return false;
    await supabase.from('profiles').update({ active_restaurant_id: restaurantId }).eq('id', user!.id);
    setImpersonatedRestaurant(toRestaurant(data as any));
    return true;
  };

  const exitRestaurantMode = async (): Promise<void> => {
    await supabase.from('profiles').update({ active_restaurant_id: null }).eq('id', user!.id);
    setImpersonatedRestaurant(null);
  };

  const refreshRestaurant = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', user.restaurantId).single();
    if (!error && data) setRestaurant(toRestaurant(data as any));
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const result = await loadUserData(session.user.id, session.user.email ?? '');
    if (result) {
      setUser(result.user);
      setRestaurant(result.restaurant);
    }
  };

  const isOwner = user?.role === 'owner' && !user?.isSuperAdmin;
  const isManager = user?.role === 'manager';
  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const isImpersonating = isSuperAdmin && impersonatedRestaurant !== null;

  // When impersonating, expose the target restaurant as active restaurant
  // and patch user.restaurantId so all tabs work transparently without changes
  const activeRestaurant = isImpersonating ? impersonatedRestaurant : restaurant;
  const activeUser = (isImpersonating && user && impersonatedRestaurant)
    ? { ...user, restaurantId: impersonatedRestaurant.id, role: 'owner' as const }
    : user;

  return (
    <AuthContext.Provider
      value={{ user: activeUser, restaurant: activeRestaurant, isAuthenticated: hasSession, isOwner: isImpersonating ? true : isOwner, isManager: isImpersonating ? false : isManager, isSuperAdmin, isImpersonating, impersonatedRestaurant, isLoading, login, joinWithCode, registerRestaurant, logout, refreshRestaurant, refreshUser, enterRestaurantMode, exitRestaurantMode }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
