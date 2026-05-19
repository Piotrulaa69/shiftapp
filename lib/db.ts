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
export type TaskStatus = 'do_zrobienia' | 'w_trakcie' | 'czeka_na_zatwierdzenie' | 'zatwierdzone' | 'odrzucone' | 'zamkniete';
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
  const shift = data as DbShift;
  notify(restaurantId, shift.employee_id, 'shift', 'Nowa zmiana', `Zaplanowano Ci zmianę na ${shift.day} (${shift.start_time}–${shift.end_time})`, shift.id);
  return shift;
}

export async function deleteShift(shiftId: string): Promise<boolean> {
  const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
  return !error;
}

export async function updateShift(
  shiftId: string,
  fields: Partial<{
    day: string;
    start_time: string;
    end_time: string;
    location: string;
    status: 'zaplanowana' | 'do_potwierdzenia' | 'potwierdzona' | 'urlop';
    employee_id: string;
    employee_name: string;
    job_title: string;
  }>
): Promise<DbShift | null> {
  const { data, error } = await supabase
    .from('shifts')
    .update(fields)
    .eq('id', shiftId)
    .select()
    .single();
  if (error) { console.error('updateShift', error); return null; }
  return data as DbShift;
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
  const task = data as DbTask;
  if (task.assigned_to) {
    notify(restaurantId, task.assigned_to, 'task', 'Nowe zadanie', `Przydzielono Ci zadanie: ${task.title}`, task.id);
  }
  return task;
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

export async function createTraining(
  restaurantId: string,
  fields: {
    title: string;
    category: string;
    duration_min: number;
    required: boolean;
    points: number;
    material_url: string | null;
    material_type: 'pdf' | 'video' | null;
    assigned_roles: string[];
    deadline: string | null;
  }
): Promise<DbTraining | null> {
  const { data, error } = await supabase
    .from('trainings')
    .insert({
      restaurant_id: restaurantId,
      status: 'nierozpoczete',
      progress_percent: 0,
      assigned_to: null,
      ...fields,
    })
    .select()
    .single();
  if (error) { console.error('createTraining', error); return null; }
  return data as DbTraining;
}

export async function updateTraining(
  trainingId: string,
  fields: Partial<{
    title: string;
    category: string;
    duration_min: number;
    required: boolean;
    points: number;
    material_url: string | null;
    material_type: 'pdf' | 'video' | null;
    assigned_roles: string[];
    deadline: string | null;
  }>
): Promise<boolean> {
  const { error } = await supabase.from('trainings').update(fields).eq('id', trainingId);
  if (error) { console.error('updateTraining', error); }
  return !error;
}

export async function deleteTraining(trainingId: string): Promise<boolean> {
  const { error } = await supabase.from('trainings').delete().eq('id', trainingId);
  if (error) { console.error('deleteTraining', error); }
  return !error;
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function getEmployees(restaurantId: string): Promise<DbProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
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

export async function getAvailabilityAll(restaurantId: string, month: string): Promise<DbAvailability[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .gte('day', month + '-01')
    .lte('day', month + '-31')
    .order('day');
  if (error) { console.error('getAvailabilityAll', error); return []; }
  return data as DbAvailability[];
}

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
  const req = data as DbLeaveRequest;
  const { data: emp } = await supabase.from('profiles').select('first_name, last_name').eq('id', employeeId).single();
  const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Pracownik';
  notifyManagers(restaurantId, 'leave', 'Nowy wniosek urlopowy', `${empName} złożył wniosek na ${req.date_from}–${req.date_to} (${req.days_count} dni)`, req.id);
  return req;
}

export async function reviewLeaveRequest(
  id: string, reviewerId: string, status: 'approved' | 'rejected', comment?: string,
): Promise<boolean> {
  const { data: req } = await supabase.from('leave_requests').select('restaurant_id, employee_id, date_from, date_to').eq('id', id).single();
  const { error } = await supabase
    .from('leave_requests')
    .update({ status, reviewed_by: reviewerId, review_comment: comment ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (!error && req) {
    const approved = status === 'approved';
    notify(req.restaurant_id, req.employee_id, 'leave',
      approved ? 'Urlop zatwierdzony ✅' : 'Urlop odrzucony',
      `Twój wniosek urlopowy ${req.date_from}–${req.date_to} został ${approved ? 'zatwierdzony' : 'odrzucony'}.${comment ? ' Powód: ' + comment : ''}`,
      id);
  }
  return !error;
}

export async function updateLeaveRequest(
  id: string,
  fields: { leave_type_id?: string; date_from?: string; date_to?: string; days_count?: number; comment?: string },
): Promise<boolean> {
  const { error } = await supabase.from('leave_requests').update(fields).eq('id', id);
  return !error;
}

export async function deleteLeaveRequest(id: string): Promise<boolean> {
  const { error } = await supabase.from('leave_requests').delete().eq('id', id);
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
  const absence = data as DbAbsence;
  const { data: emp } = await supabase.from('profiles').select('first_name, last_name').eq('id', fields.employee_id).single();
  const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Pracownik';
  notifyManagers(restaurantId, 'absence', 'Zgłoszenie nieobecności', `${empName} zgłosił nieobecność: ${fields.absence_type}`, absence.id);
  return absence;
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
  if (error) {
    console.error('createShiftSwap error:', error);
    return null;
  }
  const swap = data as DbShiftSwap;
  const { data: req } = await supabase.from('profiles').select('first_name, last_name').eq('id', fields.requester_id).single();
  const reqName = req ? `${req.first_name} ${req.last_name}` : 'Pracownik';
  notify(restaurantId, fields.responder_id, 'swap', 'Prośba o wymianę zmiany', `${reqName} prosi Cię o wymianę zmiany.`, swap.id);
  return swap;
}

export async function getShiftSwaps(restaurantId: string): Promise<DbShiftSwap[]> {
  const { data, error } = await supabase.from('shift_swaps').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
  if (error) { console.error('getShiftSwaps', error); return []; }
  return data as DbShiftSwap[];
}

export async function updateSwapStatus(id: string, status: string, managerId?: string): Promise<boolean> {
  const { data: swap } = await supabase.from('shift_swaps').select('restaurant_id, requester_id, responder_id').eq('id', id).single();
  const updates: any = { status };
  if (managerId) updates.manager_id = managerId;
  const { error } = await supabase.from('shift_swaps').update(updates).eq('id', id);
  if (!error && swap) {
    if (status === 'accepted') {
      notify(swap.restaurant_id, swap.requester_id, 'swap', 'Wymiana zaakceptowana ✅', 'Twoja prośba o wymianę zmiany została zaakceptowana.', id);
    } else if (status === 'rejected') {
      notify(swap.restaurant_id, swap.requester_id, 'swap', 'Wymiana odrzucona', 'Twoja prośba o wymianę zmiany została odrzucona.', id);
    } else if (status === 'pending_manager') {
      notifyManagers(swap.restaurant_id, 'swap', 'Wymiana zmiany do zatwierdzenia', 'Pracownicy uzgodnili wymianę zmiany — wymagane zatwierdzenie.', id);
    }
  }
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

export async function updateDocument(
  id: string,
  fields: { name?: string; doc_type?: string; file_url?: string; expires_at?: string | null; status?: string },
): Promise<boolean> {
  const { error } = await supabase.from('documents').update(fields).eq('id', id);
  return !error;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  return !error;
}

export async function uploadDocumentFile(
  restaurantId: string,
  fileName: string,
  fileUri: string,
  mimeType: string,
): Promise<string | null> {
  try {
    const ext = fileName.split('.').pop() ?? 'bin';
    const path = `${restaurantId}/${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('documents').upload(path, blob, { contentType: mimeType, upsert: false });
    if (error) { console.error('uploadDocumentFile', error); return null; }
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('uploadDocumentFile', e);
    return null;
  }
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

// ─── Shifts by date ───────────────────────────────────────────────────────────

export async function getShiftsForDate(restaurantId: string, date: string): Promise<DbShift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('day', date)
    .order('start_time');
  if (error) { console.error('getShiftsForDate', error); return []; }
  return data as DbShift[];
}

// ─── Manager pending counts ───────────────────────────────────────────────────

export async function getPendingCounts(restaurantId: string): Promise<{
  leaveRequests: number; absences: number; swaps: number; taskApprovals: number;
}> {
  const [lrRes, absRes, swapRes, taskRes] = await Promise.all([
    supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'pending'),
    supabase.from('absences').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'pending'),
    supabase.from('shift_swaps').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'pending_manager'),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'czeka_na_zatwierdzenie'),
  ]);
  return {
    leaveRequests: lrRes.count ?? 0,
    absences: absRes.count ?? 0,
    swaps: swapRes.count ?? 0,
    taskApprovals: taskRes.count ?? 0,
  };
}

// ─── Task approval flow ───────────────────────────────────────────────────────

export async function submitTaskForApproval(taskId: string, proofPhotoUrl?: string, proofComment?: string): Promise<boolean> {
  const { data: task } = await supabase.from('tasks').select('restaurant_id, title, assigned_to').eq('id', taskId).single();
  const { error } = await supabase.from('tasks').update({
    status: 'czeka_na_zatwierdzenie',
    proof_photo_url: proofPhotoUrl ?? null,
    proof_comment: proofComment ?? null,
  }).eq('id', taskId);
  if (!error && task) {
    notifyManagers(task.restaurant_id, 'task', 'Zadanie do zatwierdzenia', `Pracownik ukończył zadanie: ${task.title}`, taskId);
  }
  return !error;
}

export async function approveTask(
  taskId: string, restaurantId: string, employeeId: string, points: number,
): Promise<boolean> {
  const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
  const { error } = await supabase.from('tasks').update({ status: 'zatwierdzone', completed: true }).eq('id', taskId);
  if (error) return false;
  if (points > 0) await addPoints(restaurantId, employeeId, points, 'task_completed', taskId, 'Zadanie zatwierdzone');
  notify(restaurantId, employeeId, 'task', 'Zadanie zatwierdzone ✅', `Twoje zadanie "${task?.title ?? ''}" zostało zatwierdzone. +${points} pkt!`, taskId);
  return true;
}

export async function rejectTask(taskId: string, comment?: string): Promise<boolean> {
  const { data: task } = await supabase.from('tasks').select('restaurant_id, title, assigned_to').eq('id', taskId).single();
  const { error } = await supabase.from('tasks').update({ status: 'odrzucone', proof_comment: comment ?? null }).eq('id', taskId);
  if (!error && task?.assigned_to) {
    notify(task.restaurant_id, task.assigned_to, 'task', 'Zadanie odrzucone', `Zadanie "${task.title}" zostało odrzucone.${comment ? ' Powód: ' + comment : ''}`, taskId);
  }
  return !error;
}

// ─── Clock-in with PIN ────────────────────────────────────────────────────────

export async function clockInWithPin(
  restaurantId: string, shiftId: string, employeeId: string, pin: string,
): Promise<{ success: boolean; clockIn?: DbClockIn; error?: string }> {
  const { data: shift } = await supabase.from('shifts').select('pin_code').eq('id', shiftId).single();
  if (shift?.pin_code && shift.pin_code !== pin) {
    return { success: false, error: 'Nieprawidłowy PIN' };
  }
  const ci = await clockIn(restaurantId, shiftId, employeeId, 'pin');
  return ci ? { success: true, clockIn: ci } : { success: false, error: 'Błąd rejestracji' };
}

// ─── Quiz Questions ───────────────────────────────────────────────────────────

export type DbQuizQuestion = {
  id: string;
  training_id: string;
  restaurant_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
  created_at: string;
};

export async function getQuizQuestions(trainingId: string): Promise<DbQuizQuestion[]> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('training_id', trainingId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getQuizQuestions', error); return []; }
  return (data ?? []) as DbQuizQuestion[];
}

export async function createQuizQuestion(
  restaurantId: string,
  trainingId: string,
  fields: { question: string; options: string[]; correct_index: number; explanation?: string; sort_order?: number },
): Promise<DbQuizQuestion | null> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({ restaurant_id: restaurantId, training_id: trainingId, ...fields })
    .select()
    .single();
  if (error) { console.error('createQuizQuestion', error); return null; }
  return data as DbQuizQuestion;
}

export async function updateQuizQuestion(
  id: string,
  fields: Partial<{ question: string; options: string[]; correct_index: number; explanation: string; sort_order: number }>,
): Promise<boolean> {
  const { error } = await supabase.from('quiz_questions').update(fields).eq('id', id);
  return !error;
}

export async function deleteQuizQuestion(id: string): Promise<boolean> {
  const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
  return !error;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type AppNotificationType = 'shift' | 'task' | 'leave' | 'swap' | 'absence' | 'system';

export async function notify(
  restaurantId: string,
  userId: string,
  type: AppNotificationType,
  title: string,
  body: string,
  referenceId?: string,
): Promise<void> {
  await supabase.from('notifications').insert({
    restaurant_id: restaurantId,
    user_id: userId,
    type,
    title,
    body,
    reference_id: referenceId ?? null,
  });
}

export async function notifyManagers(
  restaurantId: string,
  type: AppNotificationType,
  title: string,
  body: string,
  referenceId?: string,
): Promise<void> {
  const { data: managers } = await supabase
    .from('profiles')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .in('role', ['owner', 'manager'])
    .eq('is_active', true);
  if (!managers?.length) return;
  await supabase.from('notifications').insert(
    managers.map((m) => ({
      restaurant_id: restaurantId,
      user_id: m.id,
      type,
      title,
      body,
      reference_id: referenceId ?? null,
    }))
  );
}

export async function getNotifications(userId: string): Promise<any[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function markNotifRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markNotifUnread(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: false }).eq('id', id);
}

export async function markAllNotifsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function deleteNotifDb(id: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', id);
}

// ─── Notification preferences ─────────────────────────────────────────────────

export async function getNotifPrefs(userId: string): Promise<Record<string, string> | null> {
  const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
  return data ?? null;
}

export async function upsertNotifPrefs(userId: string, prefs: Record<string, string>): Promise<boolean> {
  const { error } = await supabase.from('notification_preferences')
    .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' });
  return !error;
}

// ─── Update profile ────────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  fields: Partial<{ first_name: string; last_name: string; phone: string; job_title: string; employment_type: string; max_hours_weekly: number | null; max_hours_monthly: number | null; is_active: boolean }>,
): Promise<boolean> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  return !error;
}

// ─── Absences for manager ─────────────────────────────────────────────────────

export async function reviewAbsence(id: string, reviewerId: string, status: 'approved' | 'rejected'): Promise<boolean> {
  const { data: absence } = await supabase.from('absences').select('restaurant_id, employee_id, absence_type').eq('id', id).single();
  const { error } = await supabase.from('absences').update({ status, reviewed_by: reviewerId }).eq('id', id);
  if (!error && absence) {
    const approved = status === 'approved';
    notify(absence.restaurant_id, absence.employee_id, 'absence',
      approved ? 'Nieobecność zatwierdzona' : 'Nieobecność odrzucona',
      `Twoje zgłoszenie nieobecności (${absence.absence_type}) zostało ${approved ? 'zatwierdzone' : 'odrzucone'}.`,
      id);
  }
  return !error;
}
