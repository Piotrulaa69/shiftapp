import { supabase } from './supabase';

export interface Referral {
  id: string;
  referrer_restaurant_id: string;
  referred_restaurant_id: string;
  referred_at: string;
  discount_applied_referrer: boolean;
  discount_applied_referred: boolean;
  notes: string | null;
  referred_restaurant?: { name: string; created_at: string };
}

export interface ReferralStats {
  refCode: string | null;
  totalReferrals: number;
  referrals: Referral[];
  referredBy: string | null;
}

/** Get the ref_code and referral stats for a restaurant */
export async function getReferralStats(restaurantId: string): Promise<ReferralStats> {
  const [restRes, referralsRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('ref_code, referred_by_restaurant_id, restaurants!referred_by_restaurant_id(name)')
      .eq('id', restaurantId)
      .single(),
    supabase
      .from('referrals')
      .select('*, referred_restaurant:restaurants!referred_restaurant_id(name, created_at)')
      .eq('referrer_restaurant_id', restaurantId)
      .order('referred_at', { ascending: false }),
  ]);

  const refCode = (restRes.data as any)?.ref_code ?? null;
  const referredByName = (restRes.data as any)?.restaurants?.name ?? null;
  const referrals: Referral[] = (referralsRes.data ?? []) as Referral[];

  return {
    refCode,
    totalReferrals: referrals.length,
    referrals,
    referredBy: referredByName,
  };
}

/** Find a restaurant by its ref_code — used during registration */
export async function findRestaurantByRefCode(code: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('ref_code', code.toUpperCase().trim())
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; name: string };
}

/** Record a referral after a new restaurant registers */
export async function recordReferral(referrerRestaurantId: string, referredRestaurantId: string): Promise<boolean> {
  const { error } = await supabase.from('referrals').insert({
    referrer_restaurant_id: referrerRestaurantId,
    referred_restaurant_id: referredRestaurantId,
  });
  if (error) { console.error('recordReferral', error); return false; }

  // Also mark referred_by on the new restaurant
  await supabase.from('restaurants')
    .update({ referred_by_restaurant_id: referrerRestaurantId })
    .eq('id', referredRestaurantId);

  return true;
}

/** Super-admin: get all referrals across system */
export async function getAllReferrals(): Promise<(Referral & { referrer_name: string; referred_name: string })[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      *,
      referrer:restaurants!referrer_restaurant_id(name),
      referred:restaurants!referred_restaurant_id(name, created_at)
    `)
    .order('referred_at', { ascending: false });
  if (error) { console.error('getAllReferrals', error); return []; }
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    referrer_name: r.referrer?.name ?? '—',
    referred_name: r.referred?.name ?? '—',
  }));
}

/** Super-admin: mark discounts as applied */
export async function markReferralDiscountApplied(
  referralId: string,
  side: 'referrer' | 'referred' | 'both'
): Promise<boolean> {
  const update: Record<string, boolean> = {};
  if (side === 'referrer' || side === 'both') update.discount_applied_referrer = true;
  if (side === 'referred' || side === 'both') update.discount_applied_referred = true;
  const { error } = await supabase.from('referrals').update(update).eq('id', referralId);
  return !error;
}
