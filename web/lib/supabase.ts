import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and key from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client only if credentials are available, otherwise create a dummy client for build
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

export const createServerSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// Types based on Supabase schema
export type UserRole = 'client' | 'expert' | 'agency_admin';

export interface Profile {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ExpertProfile {
  id: string;
  user_id: string;
  bio: string | null;
  hourly_rate_cents: number;
  currency: string;
  years_experience: number | null;
  is_available: boolean;
  rating: number;
  total_sessions: number;
  total_hours: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: Pick<Profile, 'full_name' | 'avatar_url' | 'email'>;
  skills?: ExpertSkill[];
}

export interface ExpertSkill {
  id: string;
  expert_id: string;
  skill_category_id: string;
  proficiency_level: number;
  skill_category?: SkillCategory;
}

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export type SessionStatus = 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

export interface Session {
  id: string;
  client_id: string;
  expert_id: string;
  requested_at: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  duration_minutes: number;
  session_rate_cents: number;
  total_amount_cents: number;
  commission_amount_cents: number;
  expert_payout_cents: number;
  status: SessionStatus;
  topic: string | null;
  notes: string | null;
  daily_room_url: string | null;
  daily_room_name: string | null;
  client_feedback: string | null;
  client_rating: number | null;
  expert_feedback: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Profile;
  expert?: ExpertProfile;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  sender_id: string;
  message_type: 'text' | 'file' | 'system';
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}

export interface SessionWithDetails extends Session {
  client: Profile;
  expert: ExpertProfile;
  messages?: SessionMessage[];
}

export interface MatchRequest {
  id: string;
  client_id: string;
  session_id: string | null;
  required_skills: string[];
  topic: string;
  description: string | null;
  preferred_duration_minutes: number;
  max_rate_cents: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  session_id: string | null;
  client_id: string;
  expert_id: string | null;
  amount_cents: number;
  commission_amount_cents: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_type: 'session' | 'subscription' | 'refund' | 'payout';
  stripe_payment_intent_id: string | null;
  description: string | null;
  created_at: string;
}
