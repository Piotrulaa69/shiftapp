import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = 'https://ugecoqbfvvkvaadtxtiu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8joyS8Hfw80T9J6U-mqleg_0esf67nm';

// On web use localStorage (with SSR guard), on native use AsyncStorage
const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) =>
        typeof localStorage !== 'undefined' ? Promise.resolve(localStorage.getItem(key)) : Promise.resolve(null),
      setItem: (key: string, value: string) =>
        typeof localStorage !== 'undefined' ? Promise.resolve(localStorage.setItem(key, value)) : Promise.resolve(),
      removeItem: (key: string) =>
        typeof localStorage !== 'undefined' ? Promise.resolve(localStorage.removeItem(key)) : Promise.resolve(),
    }
  : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Database types ───────────────────────────────────────────────────────────

export type DbRestaurant = {
  id: string;
  name: string;
  address: string;
  phone: string;
  owner_id: string | null;
  plan: 'basic' | 'premium';
  logo_color: string;
  clock_in_method: 'pin' | 'qr' | 'gps' | 'manual';
  clock_in_window_min: number;
  late_threshold_min: number;
  pay_period_type: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  created_at: string;
};

export type DbProfile = {
  id: string;
  restaurant_id: string | null;
  is_super_admin: boolean;
  first_name: string;
  last_name: string;
  role: 'owner' | 'manager' | 'employee';
  job_title: string;
  avatar_color: string;
  is_active: boolean;
  onboarding_done: boolean;
  phone: string | null;
  photo_url: string | null;
  employment_type: 'full_time' | 'part_time' | 'contract';
  min_hours_weekly: number | null;
  max_hours_weekly: number | null;
  min_hours_monthly: number | null;
  max_hours_monthly: number | null;
  hourly_rate: number | null;
  birth_date: string | null;
  address: string | null;
  pesel: string | null;
  id_series_number: string | null;
  citizenship: string | null;
  nfz_branch: string | null;
  tax_office: string | null;
  pit_electronic: boolean;
  bank_account_number: string | null;
  bank_name: string | null;
  id_card_number: string | null;
  login_pin: string | null;
  login_method: 'pin' | 'qr';
  created_at: string;
};

export type DbQrSessionToken = {
  id: string;
  restaurant_id: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
};

export type DbInvitation = {
  id: string;
  restaurant_id: string;
  code: string;
  created_by: string;
  job_title: string;
  expires_at: string;
  used: boolean;
  used_by: string | null;
  created_at: string;
};

export type DbShift = {
  id: string;
  restaurant_id: string;
  employee_id: string;
  employee_name: string;
  job_title: string;
  start_time: string;
  end_time: string;
  day: string;
  location: string;
  status: 'zaplanowana' | 'do_potwierdzenia' | 'potwierdzona' | 'urlop';
  created_at: string;
};

export type DbTask = {
  id: string;
  restaurant_id: string;
  assigned_to: string | null;
  target_group_id: string | null;
  title: string;
  description: string;
  assigned_time: string;
  scheduled_date: string | null;
  completed: boolean;
  priority: 'wysoki' | 'normalny' | 'niski';
  status: 'do_zrobienia' | 'w_trakcie' | 'czeka_na_zatwierdzenie' | 'zatwierdzone' | 'odrzucone' | 'zamkniete';
  duration_min: number;
  confirmation_type: 'photo' | 'values' | 'description' | null;
  confirmation_config: any | null;
  points: number;
  proof_photo_url: string | null;
  proof_comment: string | null;
  rejection_comment: string | null;
  is_recurring: boolean;
  recurrence_pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom' | null;
  recurrence_days: number[] | null;
  recurrence_week_day: number | null;
  recurrence_month_day: number | null;
  parent_task_id: string | null;
  created_at: string;
};

export type DbTaskInstance = {
  id: string;
  task_id: string;
  employee_id: string | null;
  group_id: string | null;
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
};

export type DbEmployeeGroup = {
  id: string;
  restaurant_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type DbEmployeeGroupAssignment = {
  id: string;
  employee_id: string;
  group_id: string;
  created_at: string;
};

export type DbTraining = {
  id: string;
  restaurant_id: string;
  title: string;
  category: string;
  duration_min: number;
  progress_percent: number;
  required: boolean;
  status: 'w_toku' | 'ukonczone' | 'nierozpoczete';
  points: number;
  material_url: string | null;
  material_type: 'pdf' | 'video' | null;
  assigned_to: string | null;
  assigned_role: string | null;
  assigned_roles: string[];
  deadline: string | null;
  created_at: string;
};

export type DbClockIn = {
  id: string;
  restaurant_id: string;
  shift_id: string;
  employee_id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  method: 'pin' | 'qr' | 'gps' | 'manual';
  gps_lat: number | null;
  gps_lng: number | null;
  late_minutes: number;
  overtime_min: number;
  clock_out_note: string | null;
  status: 'pending' | 'active' | 'completed' | 'auto_closed';
  created_at: string;
};

export type DbAvailability = {
  id: string;
  restaurant_id: string;
  employee_id: string;
  day: string;
  status: 'available' | 'unavailable' | 'partial';
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  slot1_start: string | null;
  slot1_end: string | null;
  slot2_start: string | null;
  slot2_end: string | null;
  created_at: string;
};

export type DbLeaveType = {
  id: string;
  restaurant_id: string;
  name: string;
  days_per_year: number;
  requires_attachment: boolean;
  requires_comment: boolean;
  payment_rate: number;
  category: 'standard' | 'parental' | 'special';
  requires_children: boolean;
  created_at: string;
};

export type DbEmployeeLeaveQuota = {
  id: string;
  employee_id: string;
  year: number;
  total_days: number;
  used_days: number;
  carried_over_days: number;
  created_at: string;
  updated_at: string;
};

export type DbEmployeeLeaveTypeSetting = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  is_enabled: boolean;
  custom_days_per_year: number | null;
  created_at: string;
};

export type DbLeaveRequest = {
  id: string;
  restaurant_id: string;
  employee_id: string;
  leave_type_id: string;
  date_from: string;
  date_to: string;
  days_count: number;
  expected_hours: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  comment: string | null;
  attachment_url: string | null;
  reviewed_by: string | null;
  review_comment: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  responded_at: string | null;
  created_at: string;
};

export type DbAbsence = {
  id: string;
  restaurant_id: string;
  shift_id: string;
  employee_id: string;
  absence_type: 'l4' | 'child_care' | 'force_majeure' | 'other';
  description: string | null;
  attachment_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  created_at: string;
};

export type DbShiftSwap = {
  id: string;
  restaurant_id: string;
  requester_id: string;
  responder_id: string;
  requester_shift: string;
  responder_shift: string | null;
  swap_type: 'swap' | 'give';
  status: 'pending_responder' | 'pending_manager' | 'approved' | 'rejected_responder' | 'rejected_manager' | 'cancelled';
  manager_id: string | null;
  created_at: string;
};

export type DbAnnouncement = {
  id: string;
  restaurant_id: string;
  author_id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  expiry_date: string | null;
  created_at: string;
};

export type DbSubscriptionAdjustment = {
  id: string;
  restaurant_id: string;
  admin_id: string;
  type: 'discount' | 'pause' | 'extension' | 'custom_price';
  value: number | null;
  duration_months: number | null;
  reason: string | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

export type DbPromoCode = {
  id: string;
  code: string;
  type: 'referral' | 'marketing' | 'partner';
  discount_percent: number;
  discount_amount: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

export type DbDocument = {
  id: string;
  restaurant_id: string;
  employee_id: string | null;
  guest_name: string | null;
  name: string;
  doc_type: 'contract' | 'certificate' | 'attestation' | 'other';
  file_url: string | null;
  content: string | null;
  expires_at: string | null;
  status: 'active' | 'expiring' | 'expired';
  uploaded_by: string | null;
  created_at: string;
};

export type DbDocumentTemplate = {
  id: string;
  restaurant_id: string;
  name: string;
  content: string;
  doc_type: string;
  file_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbConversation = {
  id: string;
  restaurant_id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string | null;
  created_at: string;
};

export type DbMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
};

export type DbPointsLedger = {
  id: string;
  restaurant_id: string;
  employee_id: string;
  points: number;
  event_type: string;
  reference_id: string | null;
  description: string | null;
  period_start: string | null;
  created_at: string;
};

export type DbLocation = {
  id: string;
  restaurant_id: string;
  name: string;
  address: string;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_radius_m: number;
  manager_id: string | null;
  created_at: string;
};

export type DbCourse = {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  assigned_roles: string[];
  assigned_group_ids: string[];
  required: boolean;
  is_template: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DbLesson = {
  id: string;
  course_id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type QuizAnswer = { id: string; text: string; correct: boolean };
export type QuizQuestion = { id: string; question: string; answers: QuizAnswer[] };
export type DbTopicQuiz = { questions: QuizQuestion[]; pass_score: number };

export type DbTopic = {
  id: string;
  lesson_id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  content_text: string | null;
  video_url: string | null;
  video_storage_path: string | null;
  video_duration_sec: number | null;
  quiz_data: DbTopicQuiz | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DbTopicProgress = {
  id: string;
  topic_id: string;
  employee_id: string;
  restaurant_id: string;
  completed: boolean;
  completed_at: string | null;
  quiz_score: number | null;
  quiz_passed: boolean;
  created_at: string;
};

export type DbCourseProgress = {
  id: string;
  course_id: string;
  employee_id: string;
  restaurant_id: string;
  progress_percent: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
