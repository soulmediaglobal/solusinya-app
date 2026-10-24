import type { AuthService } from './auth';
import type { LoyaltyService } from './loyalty';
import { mockAuth } from './mock/auth';
import { mockLoyalty } from './mock/loyalty';
import { hasSupabase } from './supabase/client';
import { supabaseAuth } from './supabase/auth';
import { supabaseLoyalty } from './supabase/loyalty';

/** Real backend when VITE_SUPABASE_* are set in .env, otherwise the in-browser mock. */
export const isMock = !hasSupabase;
export const auth: AuthService = hasSupabase ? supabaseAuth : mockAuth;
export const loyalty: LoyaltyService = hasSupabase ? supabaseLoyalty : mockLoyalty;
