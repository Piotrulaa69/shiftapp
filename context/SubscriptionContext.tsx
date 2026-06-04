import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type SubscriptionStatus = 'trial' | 'active' | 'overdue' | 'cancelled' | 'paused' | null;

export type SubscriptionInfo = {
  status: SubscriptionStatus;
  plan: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  isTrialExpired: boolean;
  hasActiveAccess: boolean;
};

type SubContextType = {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const DEFAULT_INFO: SubscriptionInfo = {
  status: 'trial',
  plan: 'basic',
  trialEndsAt: null,
  trialDaysLeft: null,
  isTrialExpired: false,
  hasActiveAccess: true,
};

const SubContext = createContext<SubContextType>({
  subscription: DEFAULT_INFO,
  loading: false,
  refresh: async () => {},
});

function calcTrialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, restaurant } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.restaurantId) {
      setSubscription(DEFAULT_INFO);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions_api')
      .select('*')
      .eq('restaurant_id', user.restaurantId)
      .maybeSingle();

    if (error || !data) {
      // No subscription row — derive trial from restaurant.created_at
      const createdAt = restaurant?.createdAt ?? new Date().toISOString();
      const trialEnd = new Date(createdAt);
      trialEnd.setDate(trialEnd.getDate() + 30);
      const trialEndsAt = trialEnd.toISOString().slice(0, 10);
      const daysLeft = calcTrialDaysLeft(trialEndsAt);
      setSubscription({
        status: 'trial',
        plan: 'basic',
        trialEndsAt,
        trialDaysLeft: daysLeft,
        isTrialExpired: (daysLeft ?? 1) <= 0,
        hasActiveAccess: (daysLeft ?? 1) > 0,
      });
    } else {
      const daysLeft = calcTrialDaysLeft(data.trial_ends_at);
      const isTrialExpired = data.status === 'trial' && (daysLeft ?? 1) <= 0;
      const hasActiveAccess =
        data.status === 'active' ||
        (data.status === 'trial' && (daysLeft ?? 1) > 0);
      setSubscription({
        status: data.status as SubscriptionStatus,
        plan: data.plan,
        trialEndsAt: data.trial_ends_at,
        trialDaysLeft: daysLeft,
        isTrialExpired,
        hasActiveAccess,
      });
    }
    setLoading(false);
  }, [user?.restaurantId, restaurant?.createdAt]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SubContext.Provider value={{ subscription, loading, refresh }}>
      {children}
    </SubContext.Provider>
  );
};

export const useSubscription = () => useContext(SubContext);
