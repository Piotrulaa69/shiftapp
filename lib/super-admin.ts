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

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, restaurant_id, first_name, last_name, role, is_super_admin')
    .eq('is_super_admin', false);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, restaurant_id');

  return restaurants.map((r: any) => {
    const restProfiles = (profiles ?? []).filter((p: any) => p.restaurant_id === r.id);
    const restTasks = (tasks ?? []).filter((t: any) => t.restaurant_id === r.id);
    const owner = restProfiles.find((p: any) => p.role === 'owner');
    return {
      id: r.id,
      name: r.name,
      address: r.address ?? '',
      phone: r.phone ?? '',
      plan: r.plan ?? 'basic',
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
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, restaurants(name)')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((s: any) => ({
    ...s,
    restaurant_name: s.restaurants?.name ?? '—',
  }));
}

export async function upsertSubscription(sub: Subscription): Promise<boolean> {
  const { error } = await supabase
    .from('subscriptions')
    .upsert({ ...sub, updated_at: new Date().toISOString() }, { onConflict: 'restaurant_id' });
  if (error) { console.error('upsertSubscription', error); return false; }
  return true;
}

export async function getSubscriptionsOverview(): Promise<{
  total: number; active: number; trial: number; overdue: number; cancelled: number;
  monthly_revenue: number;
}> {
  const { data } = await supabase.from('subscriptions').select('status, amount, billing_period');
  const all = data ?? [];
  const monthly = all.filter((s: any) => s.billing_period === 'monthly' && s.status === 'active').reduce((sum: number, s: any) => sum + (s.amount ?? 0), 0);
  const annual = all.filter((s: any) => s.billing_period === 'annual' && s.status === 'active').reduce((sum: number, s: any) => sum + (s.amount ?? 0) / 12, 0);
  return {
    total: all.length,
    active: all.filter((s: any) => s.status === 'active').length,
    trial: all.filter((s: any) => s.status === 'trial').length,
    overdue: all.filter((s: any) => s.status === 'overdue').length,
    cancelled: all.filter((s: any) => s.status === 'cancelled').length,
    monthly_revenue: Math.round(monthly + annual),
  };
}
