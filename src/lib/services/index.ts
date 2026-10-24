import type { AuthService } from './auth';
import { mockAuth } from './mock/auth';
import { hasSupabase } from './supabase/client';
import { supabaseAuth } from './supabase/auth';

/** Real backend when VITE_SUPABASE_* are set in .env, otherwise the in-browser mock. */
export const isMock = !hasSupabase;
export const auth: AuthService = hasSupabase ? supabaseAuth : mockAuth;
