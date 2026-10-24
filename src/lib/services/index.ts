import { mockAuth } from './mock/auth';
import type { AuthService } from './auth';

// Swap this export for the Supabase implementation when the backend is wired up.
export const auth: AuthService = mockAuth;
