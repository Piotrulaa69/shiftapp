/**
 * db.ts – Supabase data access layer
 * Replaces the in-memory store.ts for all screens.
 * Every function is scoped to a restaurantId (enforced also by RLS).
 */

import type {
    DbAbsence,
    DbAnnouncement,
    DbAvailability, DbClockIn, DbConversation, DbCourse, DbCourseProgress, DbDocument, DbDocumentTemplate,
    DbEmployeeGroup, DbEmployeeGroupAssignment, DbEmployeeLeaveQuota, DbEmployeeLeaveTypeSetting,
    DbInvitation, DbLeaveRequest, DbLeaveType, DbLesson, DbMessage, DbPointsLedger,
    DbProfile, DbPromoCode, DbRestaurant, DbShift, DbShiftSwap, DbTask,
    DbTopic, DbTopicProgress,
    DbTraining
} from './supabase';
import { supabase } from './supabase';

// Re-export types for screens
export type { DbProfile as AppUser, DbCourse, DbCourseProgress, DbLesson, DbTopic, DbTopicProgress, DbInvitation as Invitation, DbRestaurant as Restaurant, DbShift as Shift, DbTask as Task, DbTraining as Training };

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
    scheduled_date?: string | null;
    priority: 'wysoki' | 'normalny' | 'niski';
    duration_min: number;
    confirmation_type: 'photo' | 'values' | 'description' | null;
    confirmation_config?: any;
    is_recurring?: boolean;
    recurrence_pattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom' | null;
    recurrence_days?: number[] | null;
    recurrence_end_date?: string | null;
    target_group_id?: string | null;
    points?: number;
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

export async function updateTask(
  taskId: string,
  fields: {
    title?: string;
    description?: string;
    assigned_to?: string | null;
    assigned_time?: string;
    scheduled_date?: string | null;
    priority?: 'wysoki' | 'normalny' | 'niski';
    duration_min?: number;
    confirmation_type?: 'photo' | 'values' | 'description' | null;
    confirmation_config?: any;
    is_recurring?: boolean;
    recurrence_pattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom' | null;
    recurrence_days?: number[] | null;
    recurrence_end_date?: string | null;
    target_group_id?: string | null;
    points?: number;
  }
): Promise<DbTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .update(fields)
    .eq('id', taskId)
    .select()
    .single();
  if (error) { console.error('updateTask', error); return null; }
  return data as DbTask;
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
    .not('is_super_admin', 'eq', true) // Wyklucz super adminów z listy pracowników
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

export async function deleteInvitation(id: string): Promise<boolean> {
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  return !error;
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

export async function clockOut(clockInId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase
    .from('clock_ins')
    .update({ clock_out_at: new Date().toISOString(), status: 'completed', clock_out_note: reason ?? null, clock_out_reason: reason ?? null })
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
  const [ay, am] = month.split('-').map(Number);
  const allEndDate = `${month}-${String(new Date(ay, am, 0).getDate()).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .gte('day', month + '-01')
    .lte('day', allEndDate)
    .order('day');
  if (error) { console.error('getAvailabilityAll', error); return []; }
  return data as DbAvailability[];
}

export async function getAvailability(restaurantId: string, employeeId: string, month: string): Promise<DbAvailability[]> {
  const startDate = month + '-01';
  const [y, m] = month.split('-').map(Number);
  const endDate = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
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

const LEAVE_TYPE_DEFAULTS = [
  { name: 'Urlop wypoczynkowy',       days_per_year: 26, requires_attachment: false, requires_comment: false, payment_rate: 100, category: 'standard',  requires_children: false },
  { name: 'L4 – Zwolnienie lekarskie',days_per_year: 0,  requires_attachment: false, requires_comment: false, payment_rate: 80,  category: 'standard',  requires_children: false },
  { name: 'Urlop na żądanie',         days_per_year: 4,  requires_attachment: false, requires_comment: false, payment_rate: 100, category: 'standard',  requires_children: false },
  { name: 'Urlop okolicznościowy',    days_per_year: 2,  requires_attachment: false, requires_comment: true,  payment_rate: 100, category: 'special',   requires_children: false },
  { name: 'Urlop bezpłatny',          days_per_year: 0,  requires_attachment: false, requires_comment: true,  payment_rate: 0,   category: 'standard',  requires_children: false },
  { name: 'Urlop szkoleniowy',        days_per_year: 0,  requires_attachment: false, requires_comment: false, payment_rate: 100, category: 'special',   requires_children: false },
  { name: 'Urlop macierzyński',       days_per_year: 0,  requires_attachment: false, requires_comment: false, payment_rate: 100, category: 'parental',  requires_children: true  },
  { name: 'Urlop ojcowski',           days_per_year: 14, requires_attachment: false, requires_comment: false, payment_rate: 100, category: 'parental',  requires_children: true  },
  { name: 'Urlop rodzicielski',       days_per_year: 0,  requires_attachment: false, requires_comment: false, payment_rate: 70,  category: 'parental',  requires_children: true  },
  { name: 'Urlop opiekuńczy',         days_per_year: 5,  requires_attachment: false, requires_comment: true,  payment_rate: 0,   category: 'parental',  requires_children: true  },
];

export async function getLeaveTypes(restaurantId: string): Promise<DbLeaveType[]> {
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('name');
  if (error) { console.error('getLeaveTypes', error); return []; }
  return data as DbLeaveType[];
}

export async function ensureDefaultLeaveTypes(restaurantId: string): Promise<DbLeaveType[]> {
  const existing = await getLeaveTypes(restaurantId);
  if (existing.length > 0) return existing;
  const { data, error } = await supabase
    .from('leave_types')
    .insert(LEAVE_TYPE_DEFAULTS.map((t) => ({ ...t, restaurant_id: restaurantId })))
    .select();
  if (error) { console.error('ensureDefaultLeaveTypes', error); return []; }
  return (data ?? []) as DbLeaveType[];
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
  fields: { leave_type_id: string; date_from: string; date_to: string; days_count: number; comment?: string; expected_hours?: number },
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
  fields: { leave_type_id?: string; date_from?: string; date_to?: string; days_count?: number; comment?: string; expected_hours?: number },
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
  const { data: swap } = await supabase
    .from('shift_swaps')
    .select('restaurant_id, requester_id, responder_id, requester_shift, responder_shift, swap_type')
    .eq('id', id)
    .single();
  const updates: any = { status };
  if (managerId) updates.manager_id = managerId;
  const { error } = await supabase.from('shift_swaps').update(updates).eq('id', id);
  if (!error && swap) {
    if (status === 'approved') {
      // Actually perform the shift swap / give in the database
      if (swap.swap_type === 'swap' && swap.requester_shift && swap.responder_shift) {
        // Get both shifts
        const { data: reqShift } = await supabase.from('shifts').select('employee_id').eq('id', swap.requester_shift).single();
        const { data: resShift } = await supabase.from('shifts').select('employee_id').eq('id', swap.responder_shift).single();
        if (reqShift && resShift) {
          // Swap employee_id between the two shifts
          await supabase.from('shifts').update({ employee_id: resShift.employee_id }).eq('id', swap.requester_shift);
          await supabase.from('shifts').update({ employee_id: reqShift.employee_id }).eq('id', swap.responder_shift);
        }
      } else if (swap.swap_type === 'give' && swap.requester_shift) {
        // Transfer the shift to the responder
        await supabase.from('shifts').update({ employee_id: swap.responder_id }).eq('id', swap.requester_shift);
      }
      notify(swap.restaurant_id, swap.requester_id, 'swap', 'Wymiana zatwierdzona ✅', 'Manager zatwierdził Twoją prośbę o wymianę zmiany.', id);
      notify(swap.restaurant_id, swap.responder_id, 'swap', 'Wymiana zatwierdzona ✅', 'Manager zatwierdził wymianę zmiany.', id);
    } else if (status === 'rejected_manager') {
      notify(swap.restaurant_id, swap.requester_id, 'swap', 'Wymiana odrzucona', 'Manager odrzucił prośbę o wymianę zmiany.', id);
      notify(swap.restaurant_id, swap.responder_id, 'swap', 'Wymiana odrzucona', 'Manager odrzucił wymianę zmiany.', id);
    } else if (status === 'rejected_responder') {
      notify(swap.restaurant_id, swap.requester_id, 'swap', 'Prośba odrzucona', 'Pracownik odrzucił Twoją prośbę o wymianę zmiany.', id);
    } else if (status === 'cancelled') {
      notify(swap.restaurant_id, swap.responder_id, 'swap', 'Wniosek anulowany', 'Prośba o wymianę zmiany została anulowana.', id);
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
  fields: { employee_id?: string | null; guest_name?: string; name: string; doc_type: string; file_url?: string; content?: string; expires_at?: string; uploaded_by: string },
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

/** Ensure a Supabase Storage URL uses the public (unauthenticated) format. */
export function normalizeStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Already correct format
  if (url.includes('/object/public/')) return url;
  // Fix: /storage/v1/object/{bucket}/... → /storage/v1/object/public/{bucket}/...
  return url.replace('/storage/v1/object/', '/storage/v1/object/public/');
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

// ─── Document Templates ───────────────────────────────────────────────────────

export async function getDocumentTemplates(restaurantId: string): Promise<DbDocumentTemplate[]> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getDocumentTemplates', error); return []; }
  return data as DbDocumentTemplate[];
}

export async function uploadTemplateFile(
  restaurantId: string,
  fileName: string,
  fileUri: string,
  mimeType: string,
): Promise<string | null> {
  try {
    const path = `${restaurantId}/templates/${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('documents').upload(path, blob, { contentType: mimeType, upsert: false });
    if (error) { console.error('uploadTemplateFile', error); return null; }
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('uploadTemplateFile', e);
    return null;
  }
}

export async function createDocumentTemplate(
  restaurantId: string,
  fields: { name: string; content: string; doc_type: string; created_by: string; file_url?: string },
): Promise<DbDocumentTemplate | null> {
  const { data, error } = await supabase
    .from('document_templates')
    .insert({ restaurant_id: restaurantId, ...fields })
    .select()
    .single();
  if (error) { console.error('createDocumentTemplate', error); return null; }
  return data as DbDocumentTemplate;
}

export async function updateDocumentTemplate(
  id: string,
  fields: { name?: string; content?: string; doc_type?: string; file_url?: string },
): Promise<boolean> {
  const { error } = await supabase
    .from('document_templates')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function deleteDocumentTemplate(id: string): Promise<boolean> {
  const { error } = await supabase.from('document_templates').delete().eq('id', id);
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

// ─── Shifts for employee ─────────────────────────────────────────────────────

export async function getShiftsForEmployee(
  restaurantId: string,
  employeeId: string,
  fromDate?: string,
  toDate?: string,
): Promise<DbShift[]> {
  let query = supabase
    .from('shifts')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('employee_id', employeeId)
    .order('day', { ascending: false });
  if (fromDate) query = query.gte('day', fromDate);
  if (toDate) query = query.lte('day', toDate);
  const { data, error } = await query;
  if (error) { console.error('getShiftsForEmployee', error); return []; }
  return data as DbShift[];
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
  const { error } = await supabase.from('tasks').update({
    status: 'do_zrobienia',
    proof_comment: comment ?? null,
    proof_photo_url: null,
  }).eq('id', taskId);
  if (!error && task?.assigned_to) {
    notify(task.restaurant_id, task.assigned_to, 'task', 'Zadanie odrzucone', `Zadanie "${task.title}" zostało odrzucone.${comment ? ' Powód: ' + comment : ''}`, taskId);
  }
  return !error;
}

// ─── Clock-in with PIN ────────────────────────────────────────────────────────

export async function clockInWithPin(
  restaurantId: string, shiftId: string, employeeId: string, pin: string,
): Promise<{ success: boolean; clockIn?: DbClockIn; error?: string }> {
  const { data: shift } = await supabase.from('shifts').select('pin_code').eq('id', shiftId).maybeSingle();
  if (!shift) return { success: false, error: 'Zmiana nie istnieje' };
  if (shift?.pin_code && shift.pin_code !== pin) {
    return { success: false, error: 'Nieprawidłowy PIN' };
  }
  const ci = await clockIn(restaurantId, shiftId, employeeId, 'pin');
  return ci ? { success: true, clockIn: ci } : { success: false, error: 'Błąd rejestracji' };
}

// ─── Task Confirmations ──────────────────────────────────────────────────────

export type TaskConfirmationInput = {
  restaurant_id: string;
  task_id: string;
  employee_id: string;
  confirmation_type: 'photo' | 'values' | 'description';
  photo_url?: string | null;
  photo_notes?: string | null;
  values_data?: any | null;
  description?: string | null;
  checklist_data?: any | null;
};

export async function createTaskConfirmation(input: TaskConfirmationInput): Promise<boolean> {
  const { error } = await supabase.from('task_confirmations').insert(input);
  if (error) { console.error('createTaskConfirmation', error); return false; }
  return true;
}

export async function uploadTaskPhoto(
  restaurantId: string,
  taskId: string,
  fileUri: string,
): Promise<string | null> {
  try {
    const path = `${restaurantId}/tasks/${taskId}_${Date.now()}.jpg`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('documents').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) { console.error('uploadTaskPhoto', error); return null; }
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('uploadTaskPhoto', e);
    return null;
  }
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

export async function updateEmployeeRole(userId: string, role: 'employee' | 'manager'): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) { console.error('updateEmployeeRole', error); return false; }
  return true;
}

export async function updateProfile(
  userId: string,
  fields: Partial<{ first_name: string; last_name: string; phone: string; job_title: string; employment_type: string; min_hours_weekly: number | null; max_hours_weekly: number | null; min_hours_monthly: number | null; max_hours_monthly: number | null; is_active: boolean; hourly_rate: number | null; birth_date: string | null; address: string | null; pesel: string | null; id_series_number: string | null; citizenship: string | null; nfz_branch: string | null; tax_office: string | null; pit_electronic: boolean; bank_account_number: string | null; bank_name: string | null; id_card_number: string | null }>,
): Promise<boolean> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  return !error;
}

// ─── Absences for manager ─────────────────────────────────────────────────────

export async function reviewAbsence(id: string, reviewerId: string, status: 'approved' | 'rejected'): Promise<boolean> {
  const { data: absence } = await supabase.from('absences').select('restaurant_id, employee_id, absence_type, shift_id').eq('id', id).single();
  const { error } = await supabase.from('absences').update({ status, reviewed_by: reviewerId }).eq('id', id);
  if (!error && absence) {
    const approved = status === 'approved';
    notify(absence.restaurant_id, absence.employee_id, 'absence',
      approved ? 'Nieobecność zatwierdzona' : 'Nieobecność odrzucona',
      `Twoje zgłoszenie nieobecności (${absence.absence_type}) zostało ${approved ? 'zatwierdzone' : 'odrzucone'}.`,
      id);
    // If approved, update the shift status to 'urlop'
    if (approved && absence.shift_id) {
      await supabase.from('shifts').update({ status: 'urlop' }).eq('id', absence.shift_id);
    }
  }
  return !error;
}

// ─── Announcements ─────────────────────────────────────────────────────────────

export async function getAnnouncements(restaurantId: string): Promise<DbAnnouncement[]> {
  const { data, error } = await supabase.from('announcements').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
  if (error) { console.error('getAnnouncements', error); return []; }
  return data as DbAnnouncement[];
}

export async function createAnnouncement(
  restaurantId: string,
  authorId: string,
  title: string,
  content: string,
  priority: 'low' | 'normal' | 'high' = 'normal',
  expiryDate: string | null = null,
): Promise<DbAnnouncement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ restaurant_id: restaurantId, author_id: authorId, title, content, priority, expiry_date: expiryDate })
    .select()
    .single();
  if (error) { console.error('createAnnouncement', error); return null; }
  return data as DbAnnouncement;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  return !error;
}

// ─── Employee Groups ─────────────────────────────────────────────────────────

export async function getEmployeeGroups(restaurantId: string): Promise<DbEmployeeGroup[]> {
  const { data, error } = await supabase.from('employee_groups').select('*').eq('restaurant_id', restaurantId).order('name');
  if (error) { console.error('getEmployeeGroups', error); return []; }
  return data as DbEmployeeGroup[];
}

export async function createEmployeeGroup(restaurantId: string, name: string, color?: string): Promise<DbEmployeeGroup | null> {
  const { data, error } = await supabase.from('employee_groups')
    .insert({ restaurant_id: restaurantId, name, color: color || '#2563EB' })
    .select().single();
  if (error) { console.error('createEmployeeGroup', error); return null; }
  return data as DbEmployeeGroup;
}

export async function updateEmployeeGroup(id: string, fields: { name?: string; color?: string }): Promise<boolean> {
  const { error } = await supabase.from('employee_groups').update(fields).eq('id', id);
  return !error;
}

export async function deleteEmployeeGroup(id: string): Promise<boolean> {
  const { error } = await supabase.from('employee_groups').delete().eq('id', id);
  return !error;
}

export async function getEmployeeGroupAssignments(groupId: string): Promise<DbEmployeeGroupAssignment[]> {
  const { data, error } = await supabase.from('employee_group_assignments').select('*').eq('group_id', groupId);
  if (error) { console.error('getEmployeeGroupAssignments', error); return []; }
  return data as DbEmployeeGroupAssignment[];
}

export async function assignEmployeeToGroup(employeeId: string, groupId: string): Promise<boolean> {
  const { error } = await supabase.from('employee_group_assignments')
    .insert({ employee_id: employeeId, group_id: groupId });
  return !error;
}

export async function removeEmployeeFromGroup(employeeId: string, groupId: string): Promise<boolean> {
  const { error } = await supabase.from('employee_group_assignments')
    .delete().eq('employee_id', employeeId).eq('group_id', groupId);
  return !error;
}

export async function getMyGroupIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('employee_group_assignments')
    .select('group_id')
    .eq('employee_id', userId);
  if (error) { console.error('getMyGroupIds', error); return []; }
  return (data ?? []).map((r: any) => r.group_id);
}

export async function getEmployeeGroupsWithMembers(restaurantId: string): Promise<(DbEmployeeGroup & { members: string[] })[]> {
  const groups = await getEmployeeGroups(restaurantId);
  const result = await Promise.all(groups.map(async (g) => {
    const assignments = await getEmployeeGroupAssignments(g.id);
    return { ...g, members: assignments.map(a => a.employee_id) };
  }));
  return result;
}

// ─── Leave Quotas ────────────────────────────────────────────────────────────

export async function getEmployeeLeaveQuota(employeeId: string, year: number): Promise<DbEmployeeLeaveQuota | null> {
  const { data, error } = await supabase.from('employee_leave_quotas')
    .select('*').eq('employee_id', employeeId).eq('year', year).maybeSingle();
  if (error) { console.error('getEmployeeLeaveQuota', error); return null; }
  return data as DbEmployeeLeaveQuota | null;
}

export async function setEmployeeLeaveQuota(
  employeeId: string,
  year: number,
  fields: { total_days?: number; used_days?: number; carried_over_days?: number }
): Promise<boolean> {
  const { error } = await supabase.from('employee_leave_quotas')
    .upsert({ employee_id: employeeId, year, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'employee_id,year' });
  return !error;
}

export async function getEmployeeLeaveTypeSettings(employeeId: string): Promise<DbEmployeeLeaveTypeSetting[]> {
  const { data, error } = await supabase.from('employee_leave_type_settings')
    .select('*').eq('employee_id', employeeId);
  if (error) { console.error('getEmployeeLeaveTypeSettings', error); return []; }
  return data as DbEmployeeLeaveTypeSetting[];
}

export async function setEmployeeLeaveTypeSetting(
  employeeId: string,
  leaveTypeId: string,
  fields: { is_enabled?: boolean; custom_days_per_year?: number | null }
): Promise<boolean> {
  const { error } = await supabase.from('employee_leave_type_settings')
    .upsert({ employee_id: employeeId, leave_type_id: leaveTypeId, ...fields },
      { onConflict: 'employee_id,leave_type_id' });
  return !error;
}

// ─── SuperAdmin Functions ─────────────────────────────────────────────────────

export async function impersonateUser(targetUserId: string): Promise<{ restaurantId: string; role: string } | null> {
  const { data, error } = await supabase.from('profiles')
    .select('restaurant_id, role').eq('id', targetUserId).single();
  if (error || !data) { console.error('impersonateUser', error); return null; }
  return { restaurantId: data.restaurant_id as string, role: data.role as string };
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  return !error;
}

export async function getAllRestaurants(): Promise<DbRestaurant[]> {
  const { data, error } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getAllRestaurants', error); return []; }
  return data as DbRestaurant[];
}

export async function createPromoCode(
  code: string,
  type: 'referral' | 'marketing' | 'partner',
  discountPercent: number,
  adminId: string,
  maxUses?: number,
  validUntil?: string
): Promise<DbPromoCode | null> {
  const { data, error } = await supabase.from('promo_codes')
    .insert({ code, type, discount_percent: discountPercent, created_by: adminId, max_uses: maxUses || null, valid_until: validUntil || null })
    .select().single();
  if (error) { console.error('createPromoCode', error); return null; }
  return data as DbPromoCode;
}

export async function createSubscriptionAdjustment(
  restaurantId: string,
  adminId: string,
  type: 'discount' | 'pause' | 'extension' | 'custom_price',
  value: number,
  durationMonths: number,
  reason?: string
): Promise<boolean> {
  const { error } = await supabase.from('subscription_adjustments')
    .insert({ restaurant_id: restaurantId, admin_id: adminId, type, value, duration_months: durationMonths, reason: reason || null });
  return !error;
}

// ─── Restaurant Settings ──────────────────────────────────────────────────────

export type RestaurantSettings = {
  min_staffing: Record<string, any>;
  availability_contract_all_available: boolean;
  availability_freelance_all_available: boolean;
  availability_require_unavailability_reason: boolean;
  availability_require_manager_approval: boolean;
  availability_freelance_self_report: boolean;
  availability_freelance_no_approval: boolean;
  max_consecutive_days: number;
  min_rest_day_after: number;
  min_hours_between_shifts: number;
  max_hours_weekly: number;
  max_hours_monthly: number;
  prevent_opening_closing: boolean;
  ai_priority_full_staffing: number;
  ai_priority_preferences: number;
  ai_priority_equal_hours: number;
  ai_priority_fixed_shifts: number;
  ai_priority_min_hours: number;
  // Extended AI preferences
  ai_prefer_same_shifts: boolean;
  ai_respect_day_off_requests: boolean;
  ai_balance_weekends: boolean;
  ai_avoid_single_day_gaps: boolean;
  ai_use_shift_types: boolean;
  ai_default_shift_start: string;
  ai_default_shift_end: string;
  ai_min_hours_per_employee: number;
  ai_max_consecutive_days: number;
  ai_notes: string;
};

const DEFAULT_SETTINGS: RestaurantSettings = {
  min_staffing: {},
  availability_contract_all_available: true,
  availability_freelance_all_available: false,
  availability_require_unavailability_reason: true,
  availability_require_manager_approval: true,
  availability_freelance_self_report: true,
  availability_freelance_no_approval: true,
  max_consecutive_days: 5,
  min_rest_day_after: 1,
  min_hours_between_shifts: 11,
  max_hours_weekly: 48,
  max_hours_monthly: 200,
  prevent_opening_closing: true,
  ai_priority_full_staffing: 80,
  ai_priority_preferences: 60,
  ai_priority_equal_hours: 60,
  ai_priority_fixed_shifts: 40,
  ai_priority_min_hours: 40,
  ai_prefer_same_shifts: true,
  ai_respect_day_off_requests: true,
  ai_balance_weekends: true,
  ai_avoid_single_day_gaps: true,
  ai_use_shift_types: false,
  ai_default_shift_start: '08:00',
  ai_default_shift_end: '16:00',
  ai_min_hours_per_employee: 20,
  ai_max_consecutive_days: 5,
  ai_notes: '',
};

export async function getRestaurantSettings(restaurantId: string): Promise<RestaurantSettings> {
  const { data } = await supabase.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).maybeSingle();
  if (!data) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...data } as RestaurantSettings;
}

export async function upsertRestaurantSettings(restaurantId: string, settings: Partial<RestaurantSettings>): Promise<boolean> {
  const { error } = await supabase.from('restaurant_settings').upsert({ restaurant_id: restaurantId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'restaurant_id' });
  return !error;
}

// ─── Shift Types ──────────────────────────────────────────────────────────────

export type ShiftTypeRow = {
  id: string;
  restaurant_id: string;
  name: string;
  color: string;
  start_time: string;
  end_time: string;
  hours: number;
  created_at: string;
};

export async function getShiftTypes(restaurantId: string): Promise<ShiftTypeRow[]> {
  const { data } = await supabase.from('shift_types').select('*').eq('restaurant_id', restaurantId).order('created_at');
  return (data ?? []) as ShiftTypeRow[];
}

export async function upsertShiftType(restaurantId: string, row: Partial<ShiftTypeRow> & { name: string }): Promise<ShiftTypeRow | null> {
  const { data, error } = await supabase.from('shift_types')
    .upsert({ restaurant_id: restaurantId, ...row }, { onConflict: row.id ? 'id' : undefined })
    .select().single();
  if (error) { console.error('upsertShiftType', error); return null; }
  return data as ShiftTypeRow;
}

export async function deleteShiftType(id: string): Promise<boolean> {
  const { error } = await supabase.from('shift_types').delete().eq('id', id);
  return !error;
}

// ─── Review Leave Request with Notes ─────────────────────────────────────────

export async function reviewLeaveRequestWithNotes(
  id: string,
  reviewerId: string,
  status: 'approved' | 'rejected',
  reviewComment?: string,
  adminNotes?: string
): Promise<boolean> {
  const { data: req } = await supabase.from('leave_requests')
    .select('restaurant_id, employee_id, leave_type_id, date_from, date_to, days_count').eq('id', id).single();
  const now = new Date().toISOString();
  const { error } = await supabase.from('leave_requests').update({
    status,
    reviewed_by: reviewerId,
    review_comment: reviewComment || null,
    admin_notes: adminNotes || null,
    reviewed_at: now,
    responded_at: now
  }).eq('id', id);
  if (!error && req) {
    notify(req.restaurant_id, req.employee_id, 'leave',
      status === 'approved' ? 'Wniosek urlopowy zatwierdzony' : 'Wniosek urlopowy odrzucony',
      `Twój wniosek urlopowy (${req.date_from} - ${req.date_to}) został ${status === 'approved' ? 'zatwierdzony' : 'odrzucony'}.${reviewComment ? ' Komentarz: ' + reviewComment : ''}`,
      id);
  }
  return !error;
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function getCourses(restaurantId: string): Promise<DbCourse[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getCourses', error); return []; }
  return data as DbCourse[];
}

export async function createCourse(restaurantId: string, fields: Partial<DbCourse>): Promise<DbCourse | null> {
  const { data, error } = await supabase
    .from('courses')
    .insert({ restaurant_id: restaurantId, ...fields })
    .select()
    .single();
  if (error) { console.error('createCourse', error); return null; }
  return data as DbCourse;
}

export async function updateCourse(courseId: string, fields: Partial<DbCourse>): Promise<boolean> {
  const { error } = await supabase.from('courses').update(fields).eq('id', courseId);
  if (error) { console.error('updateCourse', error); }
  return !error;
}

export async function deleteCourse(courseId: string): Promise<boolean> {
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) { console.error('deleteCourse', error); }
  return !error;
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export async function getLessons(courseId: string): Promise<DbLesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getLessons', error); return []; }
  return data as DbLesson[];
}

export async function createLesson(restaurantId: string, courseId: string, fields: Partial<DbLesson>): Promise<DbLesson | null> {
  const { data, error } = await supabase
    .from('lessons')
    .insert({ restaurant_id: restaurantId, course_id: courseId, ...fields })
    .select()
    .single();
  if (error) { console.error('createLesson', error); return null; }
  return data as DbLesson;
}

export async function updateLesson(lessonId: string, fields: Partial<DbLesson>): Promise<boolean> {
  const { error } = await supabase.from('lessons').update(fields).eq('id', lessonId);
  if (error) { console.error('updateLesson', error); }
  return !error;
}

export async function deleteLesson(lessonId: string): Promise<boolean> {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) { console.error('deleteLesson', error); }
  return !error;
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export async function getTopics(lessonId: string): Promise<DbTopic[]> {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getTopics', error); return []; }
  return data as DbTopic[];
}

export async function createTopic(restaurantId: string, lessonId: string, fields: Partial<DbTopic>): Promise<DbTopic | null> {
  const { data, error } = await supabase
    .from('topics')
    .insert({ restaurant_id: restaurantId, lesson_id: lessonId, ...fields })
    .select()
    .single();
  if (error) { console.error('createTopic', error); return null; }
  return data as DbTopic;
}

export async function updateTopic(topicId: string, fields: Partial<DbTopic>): Promise<boolean> {
  const { error } = await supabase.from('topics').update(fields).eq('id', topicId);
  if (error) { console.error('updateTopic', error); }
  return !error;
}

export async function deleteTopic(topicId: string): Promise<boolean> {
  const { error } = await supabase.from('topics').delete().eq('id', topicId);
  if (error) { console.error('deleteTopic', error); }
  return !error;
}

// ─── Topic / Course progress ──────────────────────────────────────────────────

export async function markTopicCompleted(restaurantId: string, topicId: string, employeeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('topic_progress')
    .upsert({
      topic_id: topicId,
      employee_id: employeeId,
      restaurant_id: restaurantId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'topic_id,employee_id' });
  if (error) { console.error('markTopicCompleted', error); }
  return !error;
}

export async function getTopicProgress(restaurantId: string, employeeId: string): Promise<DbTopicProgress[]> {
  const { data, error } = await supabase
    .from('topic_progress')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('restaurant_id', restaurantId);
  if (error) { console.error('getTopicProgress', error); return []; }
  return data as DbTopicProgress[];
}

export async function getCourseProgress(restaurantId: string, employeeId: string): Promise<DbCourseProgress[]> {
  const { data, error } = await supabase
    .from('course_progress')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('restaurant_id', restaurantId);
  if (error) { console.error('getCourseProgress', error); return []; }
  return data as DbCourseProgress[];
}

export async function upsertCourseProgress(restaurantId: string, courseId: string, employeeId: string, progressPercent: number): Promise<boolean> {
  const completed = progressPercent >= 100;
  const { error } = await supabase
    .from('course_progress')
    .upsert({
      course_id: courseId,
      employee_id: employeeId,
      restaurant_id: restaurantId,
      progress_percent: progressPercent,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'course_id,employee_id' });
  if (error) { console.error('upsertCourseProgress', error); }
  return !error;
}

export async function uploadTopicVideo(restaurantId: string, topicId: string, fileUri: string, fileName: string): Promise<string | null> {
  const path = `${restaurantId}/${topicId}/${fileName}`;
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const { error } = await supabase.storage
    .from('training-videos')
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) { console.error('uploadTopicVideo', error); return null; }
  return path;
}

export async function getTopicVideoUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('training-videos')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

// ─── Kiosk / PIN+QR Login ────────────────────────────────────────────────────

export async function getKioskEmployees(restaurantId: string): Promise<DbProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, job_title, avatar_color, login_method, login_pin, role, is_active')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .not('is_super_admin', 'eq', true)
    .order('first_name');
  if (error) { console.error('getKioskEmployees', error); return []; }
  return data as DbProfile[];
}

export async function kioskLoginByPin(restaurantId: string, pin: string): Promise<DbProfile | null> {
  if (!pin || pin.length < 4) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('login_pin', pin)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as DbProfile;
}

export async function getOrCreateQrToken(restaurantId: string): Promise<string | null> {
  const now = new Date().toISOString();

  // 1. Return existing valid token
  const { data: existing } = await supabase
    .from('qr_session_tokens')
    .select('token, expires_at')
    .eq('restaurant_id', restaurantId)
    .is('used_at', null)
    .gte('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.token) return existing.token;

  // 2. Expire any stale unused token (blocks the unique index)
  await supabase
    .from('qr_session_tokens')
    .update({ used_at: now })
    .eq('restaurant_id', restaurantId)
    .is('used_at', null)
    .lt('expires_at', now);

  // 3. Insert fresh token
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('qr_session_tokens')
    .insert({ restaurant_id: restaurantId, token, expires_at: expiresAt })
    .select('token')
    .single();
  if (error) { console.error('getOrCreateQrToken', error); return null; }
  return data.token;
}

export async function validateAndConsumeQrToken(token: string, employeeId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('qr_session_tokens')
    .update({ used_by: employeeId, used_at: now })
    .eq('token', token)
    .is('used_at', null)
    .gte('expires_at', now)
    .select('id')
    .maybeSingle();
  return !error && !!data;
}

export async function updateEmployeeLoginSettings(
  employeeId: string,
  fields: { login_pin?: string | null; login_method?: 'pin' | 'qr' }
): Promise<boolean> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', employeeId);
  return !error;
}
