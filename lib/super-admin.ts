import { supabase } from './supabase';

// ── Subscription types ─────────────────────────────────

export type SubscriptionStatus = 'trial' | 'active' | 'overdue' | 'cancelled' | 'paused';
export type BillingPeriod = 'monthly' | 'annual';

export type Subscription = {
  id?: string;
  restaurant_id: string;
  plan: 'basic' | 'premium' | 'enterprise';
  status: SubscriptionStatus;
  billing_period: BillingPeriod;
  amount: number;
  currency: string;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  last_payment_date?: string | null;
  next_payment_date?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type RestaurantWithStats = {
  id: string;
  name: string;
  address: string;
  phone: string;
  plan: string;
  logo_color: string;
  created_at: string;
  employee_count: number;
  task_count: number;
  owner_name: string | null;
};

export type SystemStats = {
  total_restaurants: number;
  total_users: number;
  total_tasks: number;
  new_this_month: number;
};

export async function getAllRestaurantsWithStats(): Promise<RestaurantWithStats[]> {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !restaurants) return [];

  const [{ data: profiles }, { data: tasks }, { data: subs }] = await Promise.all([
    supabase.from('profiles').select('id, restaurant_id, first_name, last_name, role, is_super_admin').eq('is_super_admin', false),
    supabase.from('tasks').select('id, restaurant_id'),
    supabase.from('subscriptions').select('restaurant_id, plan, status'),
  ]);

  return restaurants.map((r: any) => {
    const restProfiles = (profiles ?? []).filter((p: any) => p.restaurant_id === r.id);
    const restTasks = (tasks ?? []).filter((t: any) => t.restaurant_id === r.id);
    const owner = restProfiles.find((p: any) => p.role === 'owner');
    const sub = (subs ?? []).find((s: any) => s.restaurant_id === r.id);
    return {
      id: r.id,
      name: r.name,
      address: r.address ?? '',
      phone: r.phone ?? '',
      plan: sub?.plan ?? r.plan ?? 'basic',
      logo_color: r.logo_color ?? theme.primary,
      created_at: r.created_at,
      employee_count: restProfiles.length,
      task_count: restTasks.length,
      owner_name: owner ? `${owner.first_name} ${owner.last_name}` : null,
    };
  });
}

const theme = { primary: '#2563EB' };

export async function getSystemStats(): Promise<SystemStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ count: restCount }, { count: userCount }, { count: taskCount }, { count: newCount }] =
    await Promise.all([
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_super_admin', false),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    ]);

  return {
    total_restaurants: restCount ?? 0,
    total_users: userCount ?? 0,
    total_tasks: taskCount ?? 0,
    new_this_month: newCount ?? 0,
  };
}

export async function getRecentActivity(): Promise<{ type: string; text: string; time: string; color: string }[]> {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, created_at, restaurant_id')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  const items: { type: string; text: string; time: string; color: string }[] = [];

  (restaurants ?? []).forEach((r: any) => {
    items.push({ type: 'restaurant', text: `Nowa restauracja: ${r.name}`, time: r.created_at, color: '#059669' });
  });

  (tasks ?? []).forEach((t: any) => {
    items.push({ type: 'task', text: `Nowe zadanie: ${t.title}`, time: t.created_at, color: '#2563EB' });
  });

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
}

// ── Create restaurant + owner invite ──────────────────

// ── Promo Code types ────────────────────────────────────

export type PromoCode = {
  id?: string;
  code: string;
  discount_percent: number;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_by: string;
  created_at?: string;
};

// ── Impersonation ──────────────────────────────────────

export async function impersonateRestaurant(
  superAdminId: string,
  restaurantId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('impersonateRestaurant called', { superAdminId, restaurantId });
  
  // Ustaw active_restaurant_id dla super admina
  const { error } = await supabase
    .from('profiles')
    .update({ active_restaurant_id: restaurantId })
    .eq('id', superAdminId);

  if (error) {
    console.error('impersonateRestaurant error', error);
    return { success: false, error: error.message };
  }

  console.log('impersonateRestaurant success - active_restaurant_id set');
  return { success: true };
}

export async function exitRestaurantMode(
  superAdminId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('exitRestaurantMode called', { superAdminId });
  
  // Wyczyść active_restaurant_id
  const { error } = await supabase
    .from('profiles')
    .update({ active_restaurant_id: null })
    .eq('id', superAdminId);

  if (error) {
    console.error('exitRestaurantMode error', error);
    return { success: false, error: error.message };
  }

  console.log('exitRestaurantMode success - active_restaurant_id cleared');
  return { success: true };
}

// ── Password Reset ───────────────────────────────────────

export async function resetEmployeePassword(
  employeeId: string,
  newPassword: string
): Promise<boolean> {
  const { error } = await supabase.auth.admin.updateUserById(employeeId, { password: newPassword });
  if (error) { console.error('resetEmployeePassword', error); return false; }
  return true;
}

// ── Promo Codes ─────────────────────────────────────────

export async function createPromoCode(
  code: string,
  discountPercent: number,
  validFrom: string,
  validUntil: string | null,
  maxUses: number | null,
  createdBy: string
): Promise<PromoCode | null> {
  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      code: code.toUpperCase(),
      type: 'referral',
      discount_percent: discountPercent,
      valid_from: validFrom,
      valid_until: validUntil,
      max_uses: maxUses,
      created_by: createdBy,
      is_active: true,
      used_count: 0,
    })
    .select()
    .single();
  if (error) { console.error('createPromoCode', error); return null; }
  return data as PromoCode;
}

export async function getPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getPromoCodes', error); return []; }
  return (data as PromoCode[]) || [];
}

export async function togglePromoCode(codeId: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('promo_codes')
    .update({ is_active: isActive })
    .eq('id', codeId);
  return !error;
}

// ── Subscription Adjustments ─────────────────────────────

export async function adjustSubscription(
  restaurantId: string,
  adjustmentType: 'pause' | 'resume' | 'discount' | 'extend_trial',
  reason: string,
  adjustedBy: string,
  discountPercent?: number,
  newPeriodEnd?: string
): Promise<boolean> {
  const { error } = await supabase.from('subscription_adjustments').insert({
    restaurant_id: restaurantId,
    adjustment_type: adjustmentType,
    reason,
    adjusted_by: adjustedBy,
    discount_percent: discountPercent || null,
    new_period_end: newPeriodEnd || null,
  });
  if (error) { console.error('adjustSubscription', error); return false; }
  return true;
}

export async function applyPromoToSubscription(
  restaurantId: string,
  promoCodeId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .rpc('apply_promo_code', { p_restaurant_id: restaurantId, p_promo_code_id: promoCodeId });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Create restaurant + owner invite ──────────────────

export async function createRestaurantWithInvite(
  superAdminId: string,
  data: { name: string; address: string; phone: string; plan: 'basic' | 'premium' }
): Promise<{ restaurant_id: string; invite_code: string } | { error: string }> {
  // 1. Create restaurant
  const { data: rest, error: restErr } = await supabase
    .from('restaurants')
    .insert({ name: data.name.trim(), address: data.address.trim(), phone: data.phone.trim(), plan: data.plan })
    .select()
    .single();

  if (restErr || !rest) return { error: restErr?.message ?? 'Nie udało się utworzyć restauracji.' };

  // 2. Create owner invitation (7-day expiry)
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: invErr } = await supabase
    .from('invitations')
    .insert({ restaurant_id: rest.id, code, created_by: superAdminId, job_title: 'Właściciel', expires_at: expiresAt });

  if (invErr) return { error: invErr.message };

  // 3. Create trial subscription automatically
  await supabase.from('subscriptions').insert({
    restaurant_id: rest.id,
    plan: data.plan,
    status: 'trial',
    billing_period: 'monthly',
    amount: data.plan === 'premium' ? 199.00 : 99.00,
    currency: 'PLN',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  return { restaurant_id: rest.id, invite_code: code };
}

// ── Subscriptions ─────────────────────────────────────

export async function getSubscriptions(): Promise<(Subscription & { restaurant_name: string })[]> {
  const [{ data: subs, error }, { data: rests }] = await Promise.all([
    supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
    supabase.from('restaurants').select('id, name, plan, created_at').order('created_at', { ascending: false }),
  ]);

  if (error) { console.error('getSubscriptions error:', error.message); }

  const allSubs = subs ?? [];
  const allRests = rests ?? [];

  const nameMap: Record<string, string> = {};
  allRests.forEach((r: any) => { nameMap[r.id] = r.name; });

  const real = allSubs.map((s: any) => ({
    ...s,
    restaurant_name: nameMap[s.restaurant_id] ?? '—',
  }));

  // Add virtual trial entries for restaurants with no subscription row
  const subsRestIds = new Set(allSubs.map((s: any) => s.restaurant_id));
  const virtual = allRests
    .filter((r: any) => !subsRestIds.has(r.id) && (r.plan === 'basic' || !r.plan))
    .map((r: any) => ({
      id: null,
      restaurant_id: r.id,
      restaurant_name: r.name,
      plan: 'basic',
      status: 'trial' as const,
      amount: 0,
      currency: 'PLN',
      billing_period: 'monthly',
      next_payment_date: null,
      trial_ends_at: null,
      last_payment_date: null,
      notes: null,
      created_at: r.created_at,
    }));

  return [...real, ...virtual];
}

export async function upsertSubscription(sub: Subscription & { restaurant_name?: string }): Promise<boolean> {
  // Strip computed/joined fields that don't exist as columns
  const { restaurant_name, restaurants, ...rest } = sub as any;
  const fields: any = {
    plan: rest.plan,
    status: rest.status,
    billing_period: rest.billing_period,
    amount: rest.amount,
    currency: rest.currency ?? 'PLN',
    notes: rest.notes ?? null,
    next_payment_date: rest.next_payment_date ?? null,
    trial_ends_at: rest.trial_ends_at ?? null,
    last_payment_date: rest.last_payment_date ?? null,
    updated_at: new Date().toISOString(),
  };

  // Check if subscription exists for this restaurant
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('restaurant_id', rest.restaurant_id)
    .maybeSingle();

  let error: any;
  if (existing?.id) {
    ({ error } = await supabase
      .from('subscriptions')
      .update(fields)
      .eq('id', existing.id));
  } else {
    ({ error } = await supabase
      .from('subscriptions')
      .insert({ restaurant_id: rest.restaurant_id, ...fields }));
  }

  if (error) { console.error('upsertSubscription error:', error.message, error.code, error.details); return false; }
  await supabase.from('restaurants').update({ plan: rest.plan }).eq('id', rest.restaurant_id);
  return true;
}

export async function updateRestaurant(
  restaurantId: string,
  data: { name?: string; address?: string; phone?: string; plan?: string }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('restaurants')
    .update(data)
    .eq('id', restaurantId);
  if (error) { console.error('updateRestaurant', error); return { success: false, error: error.message }; }
  return { success: true };
}

export async function deleteRestaurant(restaurantId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('restaurants').delete().eq('id', restaurantId);
  if (error) { console.error('deleteRestaurant', error); return { success: false, error: error.message }; }
  return { success: true };
}

export async function disableRestaurantAccounts(restaurantId: string, disabled: boolean): Promise<boolean> {
  const { error } = await supabase.from('profiles')
    .update({ is_active: !disabled })
    .eq('restaurant_id', restaurantId)
    .neq('role', 'owner');
  if (error) { console.error('disableRestaurantAccounts', error); return false; }
  return true;
}

export async function markSubscriptionPaid(restaurantId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  let error: any;
  if (existing?.id) {
    ({ error } = await supabase.from('subscriptions')
      .update({ status: 'active', last_payment_date: today, next_payment_date: nextMonth })
      .eq('id', existing.id));
  } else {
    ({ error } = await supabase.from('subscriptions').insert({
      restaurant_id: restaurantId,
      plan: 'basic',
      status: 'active',
      billing_period: 'monthly',
      amount: 99.00,
      currency: 'PLN',
      last_payment_date: today,
      next_payment_date: nextMonth,
    }));
  }

  if (error) { console.error('markSubscriptionPaid', error); return false; }
  return true;
}

export async function getSubscriptionsOverview(): Promise<{
  total: number; active: number; trial: number; overdue: number; cancelled: number;
  monthly_revenue: number;
}> {
  const [{ data: subsData }, { data: restsData }] = await Promise.all([
    supabase.from('subscriptions').select('status, plan, amount, billing_period, restaurant_id'),
    supabase.from('restaurants').select('id, plan'),
  ]);
  const subs = subsData ?? [];
  const rests = restsData ?? [];

  // Restaurants with no subscription row — treat as trial if plan='basic' (or no plan)
  const subsRestIds = new Set(subs.map((s: any) => s.restaurant_id));
  const noSubTrials = rests.filter((r: any) => !subsRestIds.has(r.id) && (r.plan === 'basic' || !r.plan)).length;

  const isTrial = (s: any) => s.status === 'trial' || s.plan === 'basic';
  const isActive = (s: any) => s.status === 'active' && s.plan !== 'basic';
  const monthly = subs.filter((s: any) => s.billing_period === 'monthly' && isActive(s)).reduce((sum: number, s: any) => sum + (s.amount ?? 0), 0);
  const annual = subs.filter((s: any) => s.billing_period === 'annual' && isActive(s)).reduce((sum: number, s: any) => sum + (s.amount ?? 0) / 12, 0);
  return {
    total: subs.length + noSubTrials,
    active: subs.filter(isActive).length,
    trial: subs.filter(isTrial).length + noSubTrials,
    overdue: subs.filter((s: any) => s.status === 'overdue').length,
    cancelled: subs.filter((s: any) => s.status === 'cancelled').length,
    monthly_revenue: Math.round(monthly + annual),
  };
}
