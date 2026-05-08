import React, { createContext, useContext, useEffect, useState } from 'react';
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
  restaurantId: string;
  avatarColor: string;
  onboardingDone: boolean;
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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  joinWithCode: (
    code: string,
    data: { firstName: string; lastName: string; email: string; password: string }
  ) => Promise<boolean>;
  logout: () => void;
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
    restaurantId: profile.restaurant_id,
    avatarColor: profile.avatar_color,
    onboardingDone: profile.onboarding_done ?? true,
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

async function loadUserData(userId: string, email: string): Promise<{ user: AuthUser; restaurant: Restaurant } | null> {
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*, restaurants(*)')
    .eq('id', userId)
    .single();

  if (pErr || !profile) return null;

  const restaurant = (profile as any).restaurants;
  if (!restaurant) return null;

  return {
    user: toAuthUser(profile as DbProfile, email),
    restaurant: toRestaurant(restaurant as DbRestaurant),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

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
        // Session is known — unblock navigation immediately, load profile in background
        setHasSession(true);
        setIsLoading(false);
        loadUserData(session.user.id, session.user.email ?? '').then((result) => {
          if (result) {
            setUser(result.user);
            setRestaurant(result.restaurant);
          } else {
            // Profile missing — sign out
            supabase.auth.signOut();
          }
        });
      }
    });

    return () => { subscription.unsubscribe(); clearTimeout(fallback); };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) { setIsLoading(false); return false; }
    setHasSession(true);
    setIsLoading(false);
    const result = await loadUserData(data.user.id, data.user.email ?? '');
    if (!result) { supabase.auth.signOut(); return false; }
    setUser(result.user);
    setRestaurant(result.restaurant);
    return true;
  };

  const joinWithCode = async (
    code: string,
    data: { firstName: string; lastName: string; email: string; password: string }
  ): Promise<boolean> => {
    setIsLoading(true);

    // 1. Validate invitation code via RPC
    const { data: invData, error: invError } = await supabase
      .rpc('accept_invitation', { p_code: code.toUpperCase() });

    if (invError || invData?.error) { setIsLoading(false); return false; }

    const { restaurant_id, job_title } = invData as {
      invitation_id: string;
      restaurant_id: string;
      restaurant_name: string;
      job_title: string;
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

    // 4. Mark invitation as used
    await supabase.rpc('mark_invitation_used', { p_code: code.toUpperCase(), p_user_id: userId });

    // 5. Load user data
    const result = await loadUserData(userId, data.email.trim());
    setIsLoading(false);
    if (!result) return false;
    setUser(result.user);
    setRestaurant(result.restaurant);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRestaurant(null);
  };

  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager';

  return (
    <AuthContext.Provider
      value={{ user, restaurant, isAuthenticated: hasSession, isOwner, isManager, isLoading, login, joinWithCode, logout }}
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
