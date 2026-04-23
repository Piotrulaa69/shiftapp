import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = 'https://ugecoqbfvvkvaadtxtiu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8joyS8Hfw80T9J6U-mqleg_0esf67nm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
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
  created_at: string;
};

export type DbProfile = {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'employee';
  job_title: string;
  avatar_color: string;
  is_active: boolean;
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
  status: 'do_zrobienia' | 'w_trakcie' | 'zamkniete';
  duration_min: number;
  confirmation_type: 'photo' | 'values' | 'description' | null;
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
  created_at: string;
};
