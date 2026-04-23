/**
 * db.ts – Supabase data access layer
 * Replaces the in-memory store.ts for all screens.
 * Every function is scoped to a restaurantId (enforced also by RLS).
 */

import type { DbInvitation, DbProfile, DbRestaurant, DbShift, DbTask, DbTraining } from './supabase';
import { supabase } from './supabase';

// Re-export types for screens
export type { DbProfile as AppUser, DbInvitation as Invitation, DbRestaurant as Restaurant, DbShift as Shift, DbTask as Task, DbTraining as Training };

export type ShiftStatus = 'zaplanowana' | 'do_potwierdzenia' | 'potwierdzona' | 'urlop';
export type TaskPriority = 'wysoki' | 'normalny' | 'niski';
export type TaskStatus = 'do_zrobienia' | 'w_trakcie' | 'zamkniete';
export type ConfirmationType = 'photo' | 'values' | 'description';

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function getShifts(restaurantId: string): Promise<DbShift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('day', { ascending: true });
  if (error) { console.error('getShifts', error); return []; }
  return data as DbShift[];
}

export async function getTodayShift(restaurantId: string, userId: string): Promise<DbShift | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('employee_id', userId)
    .eq('day', today)
    .maybeSingle();
  if (error) { console.error('getTodayShift', error); return null; }
  return data as DbShift | null;
}

export async function confirmShift(shiftId: string): Promise<boolean> {
  const { error } = await supabase
    .from('shifts')
    .update({ status: 'potwierdzona' })
    .eq('id', shiftId);
  return !error;
}

export async function createShift(
  restaurantId: string,
  fields: {
    employee_id: string;
    employee_name: string;
    job_title: string;
    day: string;
    start_time: string;
    end_time: string;
    location: string;
    status: 'zaplanowana' | 'do_potwierdzenia' | 'potwierdzona' | 'urlop';
  }
): Promise<DbShift | null> {
  const { data, error } = await supabase
    .from('shifts')
    .insert({ restaurant_id: restaurantId, ...fields })
    .select()
    .single();
  if (error) { console.error('createShift', error); return null; }
  return data as DbShift;
}

export async function deleteShift(shiftId: string): Promise<boolean> {
  const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
  return !error;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getTasks(restaurantId: string): Promise<DbTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getTasks', error); return []; }
  return data as DbTask[];
}

export async function toggleTask(taskId: string, completed: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update({ completed, status: completed ? 'zamkniete' : 'do_zrobienia' })
    .eq('id', taskId);
  return !error;
}

export async function createTask(
  restaurantId: string,
  fields: {
    title: string;
    description: string;
    assigned_to: string | null;
    assigned_time: string;
    priority: 'wysoki' | 'normalny' | 'niski';
    duration_min: number;
    confirmation_type: 'photo' | 'values' | 'description' | null;
  }
): Promise<DbTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ restaurant_id: restaurantId, completed: false, status: 'do_zrobienia', ...fields })
    .select()
    .single();
  if (error) { console.error('createTask', error); return null; }
  return data as DbTask;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  return !error;
}

// ─── Trainings ────────────────────────────────────────────────────────────────

export async function getTrainings(restaurantId: string): Promise<DbTraining[]> {
  const { data, error } = await supabase
    .from('trainings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getTrainings', error); return []; }
  return data as DbTraining[];
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function getEmployees(restaurantId: string): Promise<DbProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getEmployees', error); return []; }
  return data as DbProfile[];
}

export async function removeEmployee(profileId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', profileId);
  return !error;
}

// ─── Invitations ──────────────────────────────────────────────────────────────

export async function getInvitations(restaurantId: string): Promise<DbInvitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getInvitations', error); return []; }
  return data as DbInvitation[];
}

export async function generateInvitation(
  restaurantId: string,
  createdBy: string,
  jobTitle: string
): Promise<DbInvitation | null> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('invitations')
    .insert({ restaurant_id: restaurantId, code, created_by: createdBy, job_title: jobTitle, expires_at: expiresAt })
    .select()
    .single();
  if (error) { console.error('generateInvitation', error); return null; }
  return data as DbInvitation;
}

export async function findInvitationByCode(code: string): Promise<DbInvitation | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('used', false)
    .ilike('code', code.trim())
    .maybeSingle();
  if (error) { console.error('findInvitation', error); return null; }
  return data as DbInvitation | null;
}

// ─── Restaurant ───────────────────────────────────────────────────────────────

export async function getRestaurant(restaurantId: string): Promise<DbRestaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();
  if (error) { console.error('getRestaurant', error); return null; }
  return data as DbRestaurant;
}

export async function updateRestaurant(
  restaurantId: string,
  updates: Partial<Pick<DbRestaurant, 'name' | 'address' | 'phone'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', restaurantId);
  return !error;
}
