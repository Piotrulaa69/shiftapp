import type { DbProfile } from './supabase';
import { supabase } from './supabase';

export type SchedulePrefs = {
  id?: string;
  restaurant_id: string;
  min_staff_per_shift: number;
  max_hours_per_week: number;
  min_hours_per_week: number;
  shift_start: string;
  shift_end: string;
  max_consecutive_days: number;
  notes?: string;
  // Extended AI prefs (mirrored from RestaurantSettings)
  ai_balance_weekends?: boolean;
  ai_avoid_single_day_gaps?: boolean;
  ai_respect_day_off_requests?: boolean;
  ai_min_hours_per_employee?: number;
  ai_priority_equal_hours?: number;
  ai_priority_preferences?: number;
  // Aliases used when merging from RestaurantSettings
  ai_default_shift_start?: string;
  ai_default_shift_end?: string;
  ai_max_consecutive_days?: number;
};

export type EmpAvail = {
  id?: string;
  employee_id: string;
  restaurant_id: string;
  day_of_week: number; // 0 = Mon … 6 = Sun
  available: boolean;
  preferred_start?: string;
  preferred_end?: string;
  notes?: string;
};

export type GeneratedShift = {
  employee_id: string;
  employee_name: string;
  employee_color: string;
  date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  hours: number;
};

export type GenerationResult = {
  shifts: GeneratedShift[];
  warnings: string[];
  stats: { totalHours: number; coveredDays: number; staffPerDay: number[] };
};

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

function parseHours(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m ?? 0) / 60;
}

export function generateSchedule(
  employees: DbProfile[],
  availability: EmpAvail[],
  leaves: { employee_id: string; start_date: string; end_date: string; status: string }[],
  prefs: SchedulePrefs,
  weekStart: Date
): GenerationResult {
  const shifts: GeneratedShift[] = [];
  const warnings: string[] = [];
  const staffPerDay: number[] = [];

  const COLORS: Record<string, string> = {};
  const PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA'];
  employees.forEach((e, i) => { COLORS[e.id] = e.avatar_color ?? PALETTE[i % PALETTE.length]; });

  const hoursMap: Record<string, number> = {};
  const shiftsMap: Record<string, number> = {};
  const consecutiveMap: Record<string, number> = {};
  const weekendShiftsMap: Record<string, number> = {};
  employees.forEach(e => { hoursMap[e.id] = 0; shiftsMap[e.id] = 0; consecutiveMap[e.id] = 0; weekendShiftsMap[e.id] = 0; });

  const shiftHours = parseHours(prefs.shift_end) - parseHours(prefs.shift_start);
  const maxConsecutive = prefs.max_consecutive_days ?? 5;
  const minHoursPerEmp = prefs.ai_min_hours_per_employee ?? prefs.min_hours_per_week ?? 0;
  const respectDayOff = prefs.ai_respect_day_off_requests !== false;
  const balanceWeekends = prefs.ai_balance_weekends === true;
  const equalHoursPriority = prefs.ai_priority_equal_hours ?? 60;

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIdx);
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = dayIdx >= 5; // Sat=5, Sun=6

    const available = employees.filter(emp => {
      if (hoursMap[emp.id] + shiftHours > prefs.max_hours_per_week) return false;
      if (consecutiveMap[emp.id] >= maxConsecutive) return false;

      const avail = availability.find(a => a.employee_id === emp.id && a.day_of_week === dayIdx);
      if (respectDayOff && avail !== undefined && !avail.available) return false;

      const onLeave = leaves.some(l =>
        l.employee_id === emp.id &&
        l.status === 'approved' &&
        new Date(l.start_date) <= date &&
        new Date(l.end_date) >= date
      );
      if (onLeave) return false;

      // Weekend balancing: skip emp if they have too many weekends relative to others
      if (isWeekend && balanceWeekends) {
        const avgWeekendShifts = Object.values(weekendShiftsMap).reduce((s, v) => s + v, 0) / employees.length;
        if (weekendShiftsMap[emp.id] > avgWeekendShifts + 0.5) return false;
      }

      return true;
    });

    // Sort priority: equal hours (fairness) weighted by priority setting
    available.sort((a, b) => {
      const hoursDiff = hoursMap[a.id] - hoursMap[b.id];
      const shiftsDiff = shiftsMap[a.id] - shiftsMap[b.id];
      // Higher equal hours priority = more weight on hours balance
      return equalHoursPriority >= 50 ? hoursDiff : shiftsDiff;
    });

    const toAssign = available.slice(0, prefs.min_staff_per_shift);

    if (toAssign.length < prefs.min_staff_per_shift) {
      warnings.push(
        `${DAY_NAMES[dayIdx]}: niewystarczająca obsada — ${toAssign.length}/${prefs.min_staff_per_shift} os.`
      );
    }

    staffPerDay.push(toAssign.length);

    for (const emp of toAssign) {
      const avail = availability.find(a => a.employee_id === emp.id && a.day_of_week === dayIdx);
      const start = avail?.preferred_start ?? prefs.shift_start;
      const end = avail?.preferred_end ?? prefs.shift_end;
      const h = parseHours(end) - parseHours(start);

      shifts.push({
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        employee_color: COLORS[emp.id],
        date: dateStr,
        day_of_week: dayIdx,
        start_time: start,
        end_time: end,
        hours: Math.max(h, 0),
      });
      hoursMap[emp.id] += Math.max(h, 0);
      shiftsMap[emp.id] += 1;
      consecutiveMap[emp.id] += 1;
      if (isWeekend) weekendShiftsMap[emp.id] += 1;
    }

    // Reset consecutive counter for employees who didn't work today
    const assignedIds = new Set(toAssign.map(e => e.id));
    for (const emp of employees) {
      if (!assignedIds.has(emp.id)) consecutiveMap[emp.id] = 0;
    }
  }

  const totalHours = shifts.reduce((s, sh) => s + sh.hours, 0);
  const coveredDays = staffPerDay.filter(s => s >= prefs.min_staff_per_shift).length;

  return { shifts, warnings, stats: { totalHours, coveredDays, staffPerDay } };
}

// ── DB helpers ─────────────────────────────────────────

export const DEFAULT_PREFS = (restaurantId: string): SchedulePrefs => ({
  restaurant_id: restaurantId,
  min_staff_per_shift: 2,
  max_hours_per_week: 40,
  min_hours_per_week: 20,
  shift_start: '08:00',
  shift_end: '16:00',
  max_consecutive_days: 5,
});

export async function getSchedulePrefs(restaurantId: string): Promise<SchedulePrefs | null> {
  const { data } = await supabase
    .from('schedule_preferences')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single();
  return data ?? null;
}

export async function upsertSchedulePrefs(prefs: SchedulePrefs): Promise<boolean> {
  const { error } = await supabase
    .from('schedule_preferences')
    .upsert({ ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'restaurant_id' });
  if (error) { console.error('upsertSchedulePrefs', error); return false; }
  return true;
}

export async function getEmployeeAvailability(restaurantId: string): Promise<EmpAvail[]> {
  const { data } = await supabase
    .from('employee_availability')
    .select('*')
    .eq('restaurant_id', restaurantId);
  return data ?? [];
}

export async function upsertEmployeeAvailability(items: EmpAvail[]): Promise<boolean> {
  if (items.length === 0) return true;
  const { error } = await supabase
    .from('employee_availability')
    .upsert(
      items.map(i => ({ ...i, updated_at: new Date().toISOString() })),
      { onConflict: 'employee_id,day_of_week' }
    );
  if (error) { console.error('upsertEmployeeAvailability', error); return false; }
  return true;
}

export async function getApprovedLeaves(restaurantId: string, from: Date, to: Date) {
  const { data } = await supabase
    .from('leave_requests')
    .select('employee_id, start_date, end_date, status')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'approved')
    .gte('end_date', from.toISOString().split('T')[0])
    .lte('start_date', to.toISOString().split('T')[0]);
  return data ?? [];
}
