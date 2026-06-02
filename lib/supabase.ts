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
  max_hours_weekly: number | null;
  max_hours_monthly: number | null;
  created_at: string;
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
  title: string;
  description: string;
  assigned_time: string;
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
  is_cyclic: boolean;
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
  reviewed_at: string | null;
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
  status: 'pending_responder' | 'pending_manager' | 'approved' | 'rejected_responder' | 'rejected_manager';
  manager_id: string | null;
  created_at: string;
};

export type DbDocument = {
  id: string;
  restaurant_id: string;
  employee_id: string;
  name: string;
  doc_type: 'contract' | 'certificate' | 'attestation' | 'other';
  file_url: string | null;
  expires_at: string | null;
  status: 'active' | 'expiring' | 'expired';
  uploaded_by: string | null;
  created_at: string;
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
