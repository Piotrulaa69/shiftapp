/**
 * db.ts – Supabase data access layer
 * Replaces the in-memory store.ts for all screens.
 * Every function is scoped to a restaurantId (enforced also by RLS).
 */

import type {
    DbAbsence, DbAvailability, DbClockIn, DbConversation, DbDocument,
    DbInvitation, DbLeaveRequest, DbLeaveType, DbMessage, DbPointsLedger,
    DbProfile, DbRestaurant, DbShift, DbShiftSwap, DbTask, DbTraining,
} from './supabase';
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

// ─── Clock-ins ───────────────────────────────────────────────────────────────

export async function clockIn(
  restaurantId: string,
  shiftId: string,
  employeeId: string,
  method: 'pin' | 'qr' | 'gps' | 'manual',
  gpsLat?: number,
  gpsLng?: number,
): Promise<DbClockIn | null> {
  const { data, error } = await supabase
    .from('clock_ins')
    .insert({
      restaurant_id: restaurantId,
      shift_id: shiftId,
      employee_id: employeeId,
      clock_in_at: new Date().toISOString(),
      method,
      gps_lat: gpsLat ?? null,
      gps_lng: gpsLng ?? null,
      status: 'active',
    })
    .select()
    .single();
  if (error) { console.error('clockIn', error); return null; }
  return data as DbClockIn;
}

export async function clockOut(clockInId: string, note?: string): Promise<boolean> {
  const { error } = await supabase
    .from('clock_ins')
    .update({ clock_out_at: new Date().toISOString(), status: 'completed', clock_out_note: note ?? null })
    .eq('id', clockInId);
  return !error;
}

export async function getActiveClockIn(shiftId: string): Promise<DbClockIn | null> {
  const { data, error } = await supabase
    .from('clock_ins')
    .select('*')
    .eq('shift_id', shiftId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) { console.error('getActiveClockIn', error); return null; }
  return data as DbClockIn | null;
}

export async function getClockIns(restaurantId: string, date?: string): Promise<DbClockIn[]> {
  let q = supabase.from('clock_ins').select('*').eq('restaurant_id', restaurantId);
  if (date) q = q.gte('clock_in_at', date + 'T00:00:00').lte('clock_in_at', date + 'T23:59:59');
  const { data, error } = await q.order('clock_in_at', { ascending: false });
  if (error) { console.error('getClockIns', error); return []; }
  return data as DbClockIn[];
}

// ─── Availability ────────────────────────────────────────────────────────────

export async function getAvailability(restaurantId: string, employeeId: string, month: string): Promise<DbAvailability[]> {
  const startDate = month + '-01';
  const endDate = month + '-31';
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('employee_id', employeeId)
    .gte('day', startDate)
    .lte('day', endDate)
    .order('day');
  if (error) { console.error('getAvailability', error); return []; }
  return data as DbAvailability[];
}

export async function setAvailability(
  restaurantId: string,
  employeeId: string,
  day: string,
  status: 'available' | 'unavailable' | 'partial',
  slots?: { slot1_start?: string; slot1_end?: string; slot2_start?: string; slot2_end?: string },
): Promise<boolean> {
  const { error } = await supabase
    .from('availability')
    .upsert({
      restaurant_id: restaurantId,
      employee_id: employeeId,
      day,
      status,
      ...(slots ?? {}),
    }, { onConflict: 'employee_id,day' });
  return !error;
}

// ─── Leave Types ─────────────────────────────────────────────────────────────

export async function getLeaveTypes(restaurantId: string): Promise<DbLeaveType[]> {
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('name');
  if (error) { console.error('getLeaveTypes', error); return []; }
  return data as DbLeaveType[];
}

// ─── Leave Requests ──────────────────────────────────────────────────────────

export async function getLeaveRequests(restaurantId: string, employeeId?: string): Promise<DbLeaveRequest[]> {
  let q = supabase.from('leave_requests').select('*, leave_types(name)').eq('restaurant_id', restaurantId);
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) { console.error('getLeaveRequests', error); return []; }
  return data as DbLeaveRequest[];
}

export async function createLeaveRequest(
  restaurantId: string,
  employeeId: string,
  fields: { leave_type_id: string; date_from: string; date_to: string; days_count: number; comment?: string },
): Promise<DbLeaveRequest | null> {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({ restaurant_id: restaurantId, employee_id: employeeId, ...fields })
    .select()
    .single();
  if (error) { console.error('createLeaveRequest', error); return null; }
  return data as DbLeaveRequest;
}

export async function reviewLeaveRequest(
  id: string, reviewerId: string, status: 'approved' | 'rejected', comment?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('leave_requests')
    .update({ status, reviewed_by: reviewerId, review_comment: comment ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

// ─── Absences ────────────────────────────────────────────────────────────────

export async function createAbsence(
  restaurantId: string,
  fields: { shift_id: string; employee_id: string; absence_type: string; description?: string },
): Promise<DbAbsence | null> {
  const { data, error } = await supabase
    .from('absences')
    .insert({ restaurant_id: restaurantId, ...fields })
    .select()
    .single();
  if (error) { console.error('createAbsence', error); return null; }
  return data as DbAbsence;
}

export async function getAbsences(restaurantId: string): Promise<DbAbsence[]> {
  const { data, error } = await supabase.from('absences').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
  if (error) { console.error('getAbsences', error); return []; }
  return data as DbAbsence[];
}

// ─── Shift Swaps ─────────────────────────────────────────────────────────────

export async function createShiftSwap(
  restaurantId: string,
  fields: { requester_id: string; responder_id: string; requester_shift: string; responder_shift?: string; swap_type: 'swap' | 'give' },
): Promise<DbShiftSwap | null> {
  const { data, error } = await supabase
    .from('shift_swaps')
    .insert({ restaurant_id: restaurantId, ...fields })
    .select()
    .single();
  if (error) { console.error('createShiftSwap', error); return null; }
  return data as DbShiftSwap;
}

export async function getShiftSwaps(restaurantId: string): Promise<DbShiftSwap[]> {
  const { data, error } = await supabase.from('shift_swaps').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
  if (error) { console.error('getShiftSwaps', error); return []; }
  return data as DbShiftSwap[];
}

export async function updateSwapStatus(id: string, status: string, managerId?: string): Promise<boolean> {
  const updates: any = { status };
  if (managerId) updates.manager_id = managerId;
  const { error } = await supabase.from('shift_swaps').update(updates).eq('id', id);
  return !error;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocuments(restaurantId: string, employeeId?: string): Promise<DbDocument[]> {
  let q = supabase.from('documents').select('*').eq('restaurant_id', restaurantId);
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) { console.error('getDocuments', error); return []; }
  return data as DbDocument[];
}

export async function createDocument(
  restaurantId: string,
  fields: { employee_id: string; name: string; doc_type: string; file_url?: string; expires_at?: string; uploaded_by: string },
): Promise<DbDocument | null> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ restaurant_id: restaurantId, ...fields })
    .select()
    .single();
  if (error) { console.error('createDocument', error); return null; }
  return data as DbDocument;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  return !error;
}

// ─── Conversations + Messages ────────────────────────────────────────────────

export async function getConversations(userId: string): Promise<(DbConversation & { other_profile?: DbProfile })[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  if (error) { console.error('getConversations', error); return []; }
  return data as DbConversation[];
}

export async function getOrCreateConversation(restaurantId: string, userA: string, userB: string): Promise<DbConversation | null> {
  const a = userA < userB ? userA : userB;
  const b = userA < userB ? userB : userA;
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('participant_a', a)
    .eq('participant_b', b)
    .maybeSingle();
  if (existing) return existing as DbConversation;
  const { data, error } = await supabase
    .from('conversations')
    .insert({ restaurant_id: restaurantId, participant_a: a, participant_b: b })
    .select()
    .single();
  if (error) { console.error('getOrCreateConversation', error); return null; }
  return data as DbConversation;
}

export async function getMessages(conversationId: string, limit = 50): Promise<DbMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getMessages', error); return []; }
  return (data as DbMessage[]).reverse();
}

export async function sendMessage(conversationId: string, senderId: string, body: string, imageUrl?: string): Promise<DbMessage | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body, image_url: imageUrl ?? null })
    .select()
    .single();
  if (error) { console.error('sendMessage', error); return null; }
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  return data as DbMessage;
}

export async function markMessagesRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

// ─── Points ──────────────────────────────────────────────────────────────────

export async function addPoints(
  restaurantId: string,
  employeeId: string,
  points: number,
  eventType: string,
  referenceId?: string,
  description?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('points_ledger')
    .insert({ restaurant_id: restaurantId, employee_id: employeeId, points, event_type: eventType, reference_id: referenceId ?? null, description: description ?? null });
  return !error;
}

export async function getPointsForEmployee(restaurantId: string, employeeId: string): Promise<DbPointsLedger[]> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getPointsForEmployee', error); return []; }
  return data as DbPointsLedger[];
}

export async function getTeamPoints(restaurantId: string): Promise<{ employee_id: string; total: number }[]> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('employee_id, points')
    .eq('restaurant_id', restaurantId);
  if (error) { console.error('getTeamPoints', error); return []; }
  const map: Record<string, number> = {};
  (data ?? []).forEach((r: any) => { map[r.employee_id] = (map[r.employee_id] ?? 0) + r.points; });
  return Object.entries(map).map(([employee_id, total]) => ({ employee_id, total })).sort((a, b) => b.total - a.total);
}
