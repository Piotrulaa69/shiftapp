import type { ShiftTypeRow } from './db';
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
  ai_prefer_same_shifts?: boolean;
  ai_use_shift_types?: boolean;
  ai_min_hours_per_employee?: number;
  ai_priority_equal_hours?: number;
  ai_priority_preferences?: number;
  // Aliases used when merging from RestaurantSettings
  ai_default_shift_start?: string;
  ai_default_shift_end?: string;
  ai_max_consecutive_days?: number;
  // Hard scheduling rules (mirrored from RestaurantSettings — the actual
  // editable source; schedule_preferences.max_hours_per_week etc. are never
  // exposed in any UI, so these overrides are what real restaurants configure).
  min_hours_between_shifts?: number;
  min_rest_day_after?: number;
  prevent_opening_closing?: boolean;
  max_hours_monthly?: number;
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
  shift_type_id?: string;
  shift_type_name?: string;
};

export type GenerationResult = {
  shifts: GeneratedShift[];
  warnings: string[];
  stats: { totalHours: number; coveredDays: number; staffPerDay: number[] };
};

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const MS_PER_HOUR = 3_600_000;

function parseHours(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m ?? 0) / 60;
}

// Exported for callers that need to sum existing shift hours (e.g. month-to-date
// totals for monthly-cap awareness) using the same time parsing as the generator.
export function hoursBetween(start: string, end: string): number {
  return Math.max(parseHours(end) - parseHours(start), 0);
}

function toDateTime(dateStr: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, m ?? 0, 0, 0);
  return d;
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

type Target = { key: string; count: number; kind: 'group' | 'role' | 'all' };

export function generateSchedule(
  employees: DbProfile[],
  availability: DbAvailability[],
  leaves: { employee_id: string; start_date: string; end_date: string; status: string }[],
  prefs: SchedulePrefs,
  weekStart: Date,
  minStaffing: Record<string, any> = {},
  groups: (DbEmployeeGroup & { members: string[] })[] = [],
  availabilityDefaults: AvailabilityDefaults = { availability_contract_all_available: true, availability_freelance_all_available: false },
  shiftTypes: ShiftTypeRow[] = [],
  monthToDateHours: Record<string, number> = {}
): GenerationResult {
  const shifts: GeneratedShift[] = [];
  const warnings: string[] = [];
  const staffPerDay: number[] = [];
  const dayFullyCovered: boolean[] = [];
  const warnedEmptyTargets = new Set<string>();

  const COLORS: Record<string, string> = {};
  const PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA'];
  employees.forEach((e, i) => { COLORS[e.id] = e.avatar_color ?? PALETTE[i % PALETTE.length]; });

  const hoursMap: Record<string, number> = {};
  const shiftsMap: Record<string, number> = {};
  const consecutiveMap: Record<string, number> = {};
  const weekendShiftsMap: Record<string, number> = {};
  const forcedRestRemaining: Record<string, number> = {};
  const lastShiftEnd: Record<string, Date | null> = {};
  const lastShiftTypeId: Record<string, string | null> = {};
  // How many times each employee was actually a CANDIDATE for some configured
  // target (group or role) this week — used to warn about employees who are
  // structurally never eligible (not in any staffed group/role), instead of
  // silently dropping them with no explanation.
  const eligibleCount: Record<string, number> = {};
  employees.forEach(e => {
    hoursMap[e.id] = 0; shiftsMap[e.id] = 0; consecutiveMap[e.id] = 0; weekendShiftsMap[e.id] = 0;
    forcedRestRemaining[e.id] = 0; lastShiftEnd[e.id] = null; lastShiftTypeId[e.id] = null; eligibleCount[e.id] = 0;
  });

  const shiftHours = parseHours(prefs.shift_end) - parseHours(prefs.shift_start);
  const maxConsecutive = prefs.max_consecutive_days ?? 5;
  const minRestDayAfter = prefs.min_rest_day_after ?? 1;
  const minHoursBetweenShifts = prefs.min_hours_between_shifts ?? 11;
  const preventOpeningClosing = prefs.prevent_opening_closing !== false;
  const respectDayOff = prefs.ai_respect_day_off_requests !== false;
  const balanceWeekends = prefs.ai_balance_weekends === true;
  const avoidSingleDayGaps = prefs.ai_avoid_single_day_gaps === true;
  const preferSameShiftType = prefs.ai_prefer_same_shifts !== false;
  const equalHoursPriority = prefs.ai_priority_equal_hours ?? 60;
  const restaurantMaxMonthly = prefs.max_hours_monthly;

  const weeklyConfig: Record<string, number[]> = minStaffing.weekly ?? {};
  const groupsConfig: Record<string, number[]> = minStaffing.groups ?? {};
  const dateExceptions: Record<string, Record<string, number>> = minStaffing.dates ?? {};
  const groupMembers: Record<string, Set<string>> = {};
  groups.forEach(g => { groupMembers[g.id] = new Set(g.members); });
  const groupName: Record<string, string> = {};
  groups.forEach(g => { groupName[g.id] = g.name; });

  // Simple flat mode only kicks in when NOTHING has been configured at all —
  // either per-role or per-group. If a restaurant configured groups (the
  // current recommended setup, since job-title-only staffing was replaced by
  // groups), that config is now honoured instead of being silently ignored.
  const hasRoleConfig = Object.values(weeklyConfig).some(arr => Array.isArray(arr) && arr.some(n => n > 0));
  const hasGroupConfig = Object.values(groupsConfig).some(arr => Array.isArray(arr) && arr.some(n => n > 0));
  const useSimpleMode = !hasRoleConfig && !hasGroupConfig;
  const simpleMinStaff = prefs.min_staff_per_shift ?? 2;

  // ── Shift types: real named blocks (e.g. "Rano" 8-16, "Popołudnie" 14-22) if
  // configured & enabled, otherwise a single synthetic block using the
  // restaurant's default shift time — the rest of the algorithm always
  // iterates "shift types" so both modes share one code path.
  const useRealShiftTypes = prefs.ai_use_shift_types === true && shiftTypes.length > 0;
  const effectiveShiftTypes: ShiftTypeRow[] = useRealShiftTypes
    ? [...shiftTypes].sort((a, b) => parseHours(a.start_time) - parseHours(b.start_time))
    : [{ id: '_default', restaurant_id: prefs.restaurant_id, name: '', color: '', start_time: prefs.shift_start, end_time: prefs.shift_end, hours: shiftHours, created_at: '' }];
  const openingTypeId = effectiveShiftTypes[0]?.id;
  const closingTypeId = effectiveShiftTypes[effectiveShiftTypes.length - 1]?.id;

  function effectiveMinHours(emp: DbProfile): number {
    return (emp as any).min_hours_weekly ?? prefs.ai_min_hours_per_employee ?? prefs.min_hours_per_week ?? 0;
  }

  function distributeAcrossShiftTypes(count: number): number[] {
    const n = effectiveShiftTypes.length;
    if (n <= 1) return [count];
    const base = Math.floor(count / n);
    const remainder = count % n;
    return effectiveShiftTypes.map((_, i) => base + (i < remainder ? 1 : 0));
  }

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIdx);
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = dayIdx >= 5; // Sat=5, Sun=6

    // Who worked yesterday (for "avoid single-day gap" continuity bias) and
    // who closed last night (for the opening/closing guard).
    const workedYesterday = new Set<string>(employees.filter(e => lastShiftTypeId[e.id] !== null && consecutiveMap[e.id] > 0).map(e => e.id));
    const closedLastNight = new Set<string>(employees.filter(e => lastShiftTypeId[e.id] === closingTypeId && consecutiveMap[e.id] > 0).map(e => e.id));

    // Staffing targets for this day.
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

    // Day-level eligibility — everything that does NOT depend on which
    // specific shift-type slot is being filled.
    const dayEligibleIds = new Set(employees.filter(emp => {
      if (forcedRestRemaining[emp.id] > 0) return false;
      if (consecutiveMap[emp.id] >= maxConsecutive) return false;

      if (respectDayOff) {
        const st = dayStatus[emp.id].status;
        if (st === 'unavailable' || st === null) return false;
      }

      const onLeave = leaves.some(l =>
        l.employee_id === emp.id &&
        l.status === 'approved' &&
        new Date(l.start_date) <= date &&
        new Date(l.end_date) >= date
      );
      if (onLeave) return false;

      if (isWeekend && balanceWeekends) {
        const avgWeekendShifts = Object.values(weekendShiftsMap).reduce((s, v) => s + v, 0) / employees.length;
        if (weekendShiftsMap[emp.id] > avgWeekendShifts + 0.5) return false;
      }

      return true;
    }).map(e => e.id));

    const assignedIds = new Set<string>();
    let totalAssigned = 0;
    let dayCovered = true;

    for (const target of dayTargets) {
      if (target.count <= 0) continue;

      const eligibleForTarget = target.kind === 'all'
        ? employees
        : target.kind === 'group'
        ? employees.filter(e => groupMembers[target.key]?.has(e.id))
        : employees.filter(e => e.job_title === target.key);

      if (target.kind !== 'all' && eligibleForTarget.length === 0) {
        const warnKey = `${target.kind}:${target.key}`;
        if (!warnedEmptyTargets.has(warnKey)) {
          warnedEmptyTargets.add(warnKey);
          const label = target.kind === 'group' ? (groupName[target.key] ?? target.key) : target.key;
          warnings.push(`"${label}" nie ma przypisanych pracowników — zapotrzebowanie nie może zostać uzupełnione.`);
        }
      }
      eligibleForTarget.forEach(e => { eligibleCount[e.id] += 1; });

      const counts = distributeAcrossShiftTypes(target.count);
      let assignedForTarget = 0;

      effectiveShiftTypes.forEach((st, stIdx) => {
        const need = counts[stIdx];
        if (need <= 0) return;

        const pool = eligibleForTarget.filter(emp => {
          if (!dayEligibleIds.has(emp.id)) return false;
          if (assignedIds.has(emp.id)) return false;

          const empMax = (emp as any).max_hours_weekly ?? prefs.max_hours_per_week;
          if (hoursMap[emp.id] + st.hours > empMax) return false;

          const empMaxMonthly = (emp as any).max_hours_monthly ?? restaurantMaxMonthly;
          if (empMaxMonthly) {
            const mtd = monthToDateHours[emp.id] ?? 0;
            if (mtd + hoursMap[emp.id] + st.hours > empMaxMonthly) return false;
          }

          const status = dayStatus[emp.id];
          if (status.status === 'partial') {
            if (useRealShiftTypes) {
              // Must be able to cover the WHOLE named shift block.
              if (!status.slot1_start || !status.slot1_end) return false;
              if (status.slot1_start > st.start_time || status.slot1_end < st.end_time) return false;
            }
            // else: no real shift types — their own declared slot IS the shift, always fits.
          }

          // Minimum rest between shifts (also organically prevents clopening
          // even when the explicit toggle below wouldn't otherwise apply).
          const candidateStart = toDateTime(dateStr, st.start_time);
          const last = lastShiftEnd[emp.id];
          if (last && (candidateStart.getTime() - last.getTime()) < minHoursBetweenShifts * MS_PER_HOUR) return false;

          if (preventOpeningClosing && effectiveShiftTypes.length > 1 && st.id === openingTypeId && closedLastNight.has(emp.id)) return false;

          return true;
        });

        pool.sort((a, b) => {
          // 1. Under their minimum-hours commitment → prioritise (correctness).
          const aUnder = hoursMap[a.id] < effectiveMinHours(a) ? 0 : 1;
          const bUnder = hoursMap[b.id] < effectiveMinHours(b) ? 0 : 1;
          if (aUnder !== bUnder) return aUnder - bUnder;

          // 2. Fairness — equalise hours or shift count depending on priority setting.
          const hoursDiff = hoursMap[a.id] - hoursMap[b.id];
          const shiftsDiff = shiftsMap[a.id] - shiftsMap[b.id];
          const fairness = equalHoursPriority >= 50 ? hoursDiff : shiftsDiff;
          if (fairness !== 0) return fairness;

          // 3. Soft preference: keep people on the same named shift block week to week.
          if (preferSameShiftType && effectiveShiftTypes.length > 1) {
            const aSame = lastShiftTypeId[a.id] === st.id ? 0 : 1;
            const bSame = lastShiftTypeId[b.id] === st.id ? 0 : 1;
            if (aSame !== bSame) return aSame - bSame;
          }

          // 4. Soft preference: avoid isolated single days off.
          if (avoidSingleDayGaps) {
            const aStreak = workedYesterday.has(a.id) ? 0 : 1;
            const bStreak = workedYesterday.has(b.id) ? 0 : 1;
            if (aStreak !== bStreak) return aStreak - bStreak;
          }

          return 0;
        });

        const toAssign = pool.slice(0, need);
        toAssign.forEach(e => assignedIds.add(e.id));
        assignedForTarget += toAssign.length;

        for (const emp of toAssign) {
          const status = dayStatus[emp.id];
          const usesOwnSlot = !useRealShiftTypes && status.status === 'partial' && status.slot1_start && status.slot1_end;
          const start = usesOwnSlot ? status.slot1_start! : st.start_time;
          const end = usesOwnSlot ? status.slot1_end! : st.end_time;
          const h = Math.max(parseHours(end) - parseHours(start), 0);

          shifts.push({
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            employee_color: COLORS[emp.id],
            date: dateStr,
            day_of_week: dayIdx,
            start_time: start,
            end_time: end,
            hours: h,
            shift_type_id: useRealShiftTypes ? st.id : undefined,
            shift_type_name: useRealShiftTypes ? st.name : undefined,
          });
          hoursMap[emp.id] += h;
          shiftsMap[emp.id] += 1;
          consecutiveMap[emp.id] += 1;
          lastShiftEnd[emp.id] = toDateTime(dateStr, end);
          lastShiftTypeId[emp.id] = st.id;
          if (isWeekend) weekendShiftsMap[emp.id] += 1;

          if (consecutiveMap[emp.id] >= maxConsecutive) {
            forcedRestRemaining[emp.id] = Math.max(forcedRestRemaining[emp.id], minRestDayAfter);
          }
        }
      });

      totalAssigned += assignedForTarget;
      if (assignedForTarget < target.count) {
        dayCovered = false;
        const label = target.kind === 'group' ? (groupName[target.key] ?? target.key) : target.kind === 'role' ? target.key : '';
        warnings.push(
          `${DAY_NAMES[dayIdx]}${label ? ` (${label})` : ''}: niewystarczająca obsada — ${assignedForTarget}/${target.count} os.`
        );
      }
    }

    staffPerDay.push(totalAssigned);
    dayFullyCovered.push(dayCovered);

    // End-of-day bookkeeping: reset streaks for anyone who didn't work, and
    // count down forced rest for anyone serving it.
    for (const emp of employees) {
      if (!assignedIds.has(emp.id)) consecutiveMap[emp.id] = 0;
      if (forcedRestRemaining[emp.id] > 0) forcedRestRemaining[emp.id] -= 1;
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
  const underMin = employees.filter(e => {
    const min = effectiveMinHours(e);
    return min > 0 && hoursMap[e.id] > 0 && hoursMap[e.id] < min;
  });
  if (underMin.length > 0) {
    const list = underMin.map(e => `${e.first_name} ${e.last_name} (${hoursMap[e.id]}h/${effectiveMinHours(e)}h)`).join(', ');
    warnings.push(`Poniżej minimalnej liczby godzin: ${list}`);
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
