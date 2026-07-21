import type { DbAvailability, DbEmployeeGroup, DbProfile } from './supabase';
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

// Flags pulled from RestaurantSettings that decide the DEFAULT availability of
// an employee who has never submitted a specific day's status — must mirror
// (tabs)/availability.tsx's isAlwaysAvailable() exactly, so the AI schedule and
// what a manager sees on the Dostępność screen always agree.
export type AvailabilityDefaults = {
  availability_contract_all_available: boolean;
  availability_freelance_all_available: boolean;
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

function isAlwaysAvailable(emp: DbProfile, defaults: AvailabilityDefaults): boolean {
  const et = (emp as any).employment_type ?? '';
  if ((et === 'full_time' || et === 'part_time') && defaults.availability_contract_all_available) return true;
  if ((et === 'contract' || et === 'freelance' || et === 'b2b' || et === 'zlecenie') && defaults.availability_freelance_all_available) return true;
  return false;
}

export type DayStatus = { status: 'available' | 'partial' | 'unavailable' | null; slot1_start: string | null; slot1_end: string | null };

// Resolve an employee's status for one date, applying the SAME precedence the
// Dostępność screen uses: an explicit record always wins; with no record, fall
// back to the "always available" default for their employment type; otherwise
// unknown (null) — which the generator treats as NOT confirmed/available.
// Exported so the schedule-ai UI can render the exact same status it schedules on.
export function resolveDayStatus(
  empId: string,
  dateStr: string,
  emp: DbProfile,
  availability: DbAvailability[],
  defaults: AvailabilityDefaults
): DayStatus {
  const rec = availability.find(a => a.employee_id === empId && a.day === dateStr);
  if (rec) return { status: rec.status, slot1_start: rec.slot1_start, slot1_end: rec.slot1_end };
  if (isAlwaysAvailable(emp, defaults)) return { status: 'available', slot1_start: null, slot1_end: null };
  return { status: null, slot1_start: null, slot1_end: null };
}

export function generateSchedule(
  employees: DbProfile[],
  availability: DbAvailability[],
  leaves: { employee_id: string; start_date: string; end_date: string; status: string }[],
  prefs: SchedulePrefs,
  weekStart: Date,
  minStaffing: Record<string, any> = {},
  groups: (DbEmployeeGroup & { members: string[] })[] = [],
  availabilityDefaults: AvailabilityDefaults = { availability_contract_all_available: true, availability_freelance_all_available: false }
): GenerationResult {
  const shifts: GeneratedShift[] = [];
  const warnings: string[] = [];
  const staffPerDay: number[] = [];
  const dayFullyCovered: boolean[] = [];

  const COLORS: Record<string, string> = {};
  const PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA'];
  employees.forEach((e, i) => { COLORS[e.id] = e.avatar_color ?? PALETTE[i % PALETTE.length]; });

  const hoursMap: Record<string, number> = {};
  const shiftsMap: Record<string, number> = {};
  const consecutiveMap: Record<string, number> = {};
  const weekendShiftsMap: Record<string, number> = {};
  // How many times each employee was actually a CANDIDATE for some configured
  // target (group or role) this week — used to warn about employees who are
  // structurally never eligible (not in any staffed group/role), instead of
  // silently dropping them with no explanation.
  const eligibleCount: Record<string, number> = {};
  employees.forEach(e => {
    hoursMap[e.id] = 0; shiftsMap[e.id] = 0; consecutiveMap[e.id] = 0; weekendShiftsMap[e.id] = 0; eligibleCount[e.id] = 0;
  });

  const shiftHours = parseHours(prefs.shift_end) - parseHours(prefs.shift_start);
  const maxConsecutive = prefs.max_consecutive_days ?? 5;
  const respectDayOff = prefs.ai_respect_day_off_requests !== false;
  const balanceWeekends = prefs.ai_balance_weekends === true;
  const equalHoursPriority = prefs.ai_priority_equal_hours ?? 60;

  const weeklyConfig: Record<string, number[]> = minStaffing.weekly ?? {};
  const groupsConfig: Record<string, number[]> = minStaffing.groups ?? {};
  const dateExceptions: Record<string, Record<string, number>> = minStaffing.dates ?? {};
  const groupMembers: Record<string, Set<string>> = {};
  groups.forEach(g => { groupMembers[g.id] = new Set(g.members); });

  // Simple flat mode only kicks in when NOTHING has been configured at all —
  // either per-role or per-group. If a restaurant configured groups (the
  // current recommended setup, since job-title-only staffing was replaced by
  // groups), that config is now honoured instead of being silently ignored.
  const hasRoleConfig = Object.values(weeklyConfig).some(arr => Array.isArray(arr) && arr.some(n => n > 0));
  const hasGroupConfig = Object.values(groupsConfig).some(arr => Array.isArray(arr) && arr.some(n => n > 0));
  const useSimpleMode = !hasRoleConfig && !hasGroupConfig;
  const simpleMinStaff = prefs.min_staff_per_shift ?? 2;

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIdx);
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = dayIdx >= 5; // Sat=5, Sun=6

    // Get staffing targets for this day: { targetKey -> count }, plus how to
    // resolve each targetKey to a pool of eligible employees.
    type Target = { key: string; count: number; kind: 'group' | 'role' | 'all' };
    let dayTargets: Target[] = [];
    if (dateExceptions[dateStr]) {
      dayTargets = Object.entries(dateExceptions[dateStr])
        .filter(([, count]) => count > 0)
        .map(([key, count]) => ({ key, count, kind: (groupMembers[key] ? 'group' : 'role') as 'group' | 'role' }));
    } else if (!useSimpleMode) {
      Object.entries(groupsConfig).forEach(([groupId, arr]) => {
        if (arr && arr[dayIdx] > 0) dayTargets.push({ key: groupId, count: arr[dayIdx], kind: 'group' });
      });
      Object.entries(weeklyConfig).forEach(([role, arr]) => {
        if (arr && arr[dayIdx] > 0) dayTargets.push({ key: role, count: arr[dayIdx], kind: 'role' });
      });
    } else {
      dayTargets = [{ key: '_all', count: simpleMinStaff, kind: 'all' }];
    }

    // Resolve each employee's status for this date once.
    const dayStatus: Record<string, DayStatus> = {};
    employees.forEach(emp => { dayStatus[emp.id] = resolveDayStatus(emp.id, dateStr, emp, availability, availabilityDefaults); });

    const available = employees.filter(emp => {
      const empMax = (emp as any).max_hours_weekly ?? prefs.max_hours_per_week;
      if (hoursMap[emp.id] + shiftHours > empMax) return false;
      if (consecutiveMap[emp.id] >= maxConsecutive) return false;

      if (respectDayOff) {
        const st = dayStatus[emp.id].status;
        // unavailable, or no confirmed status at all → do not schedule.
        if (st === 'unavailable' || st === null) return false;
      }

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

    // Assign employees per target (group / role / flat)
    const assignedIds = new Set<string>();
    let totalAssigned = 0;
    let dayCovered = true;

    for (const target of dayTargets) {
      if (target.count <= 0) continue;

      const pool = target.kind === 'all'
        ? available.filter(e => !assignedIds.has(e.id))
        : target.kind === 'group'
        ? available.filter(e => groupMembers[target.key]?.has(e.id) && !assignedIds.has(e.id))
        : available.filter(e => e.job_title === target.key && !assignedIds.has(e.id));

      // Track eligibility (for the "employee never eligible" warning) across
      // ALL employees matching this target, not just those actually available
      // today, so a fully-booked person still counts as "belongs to a staffed group".
      const eligibleToday = target.kind === 'all'
        ? employees
        : target.kind === 'group'
        ? employees.filter(e => groupMembers[target.key]?.has(e.id))
        : employees.filter(e => e.job_title === target.key);
      eligibleToday.forEach(e => { eligibleCount[e.id] += 1; });

      const toAssign = pool.slice(0, target.count);
      toAssign.forEach(e => assignedIds.add(e.id));
      totalAssigned += toAssign.length;

      if (toAssign.length < target.count) {
        dayCovered = false;
        const label = target.kind === 'group' ? (groups.find(g => g.id === target.key)?.name ?? target.key) : target.kind === 'role' ? target.key : '';
        warnings.push(
          `${DAY_NAMES[dayIdx]}${label ? ` (${label})` : ''}: niewystarczająca obsada — ${toAssign.length}/${target.count} os.`
        );
      }

      for (const emp of toAssign) {
        const st = dayStatus[emp.id];
        const usePartialSlot = st.status === 'partial' && st.slot1_start && st.slot1_end;
        const start = usePartialSlot ? st.slot1_start! : prefs.shift_start;
        const end = usePartialSlot ? st.slot1_end! : prefs.shift_end;
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
    }

    staffPerDay.push(totalAssigned);
    dayFullyCovered.push(dayCovered);

    // Reset consecutive counter for employees who didn't work today
    for (const emp of employees) {
      if (!assignedIds.has(emp.id)) consecutiveMap[emp.id] = 0;
    }
  }

  // Surface employees who were structurally never a candidate all week — not a
  // silent omission, but a clear, explainable warning (no group/role target
  // ever covered them, or they never confirmed availability).
  if (!useSimpleMode) {
    const neverEligible = employees.filter(e => eligibleCount[e.id] === 0);
    if (neverEligible.length > 0) {
      const names = neverEligible.map(e => `${e.first_name} ${e.last_name}`).join(', ');
      warnings.push(`Pominięci (brak grupy/stanowiska z zapotrzebowaniem w tym tygodniu): ${names}`);
    }
  }
  const neverScheduled = employees.filter(e => eligibleCount[e.id] > 0 && shiftsMap[e.id] === 0);
  if (neverScheduled.length > 0) {
    const names = neverScheduled.map(e => `${e.first_name} ${e.last_name}`).join(', ');
    warnings.push(`Nie przydzielono żadnej zmiany (brak dostępności lub limit godzin): ${names}`);
  }

  const totalHours = shifts.reduce((s, sh) => s + sh.hours, 0);
  const coveredDays = dayFullyCovered.filter(Boolean).length;

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
