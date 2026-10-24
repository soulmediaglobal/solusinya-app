import type { OtpError, OtpPurpose, Profile, SignUpInput } from '../types';

/**
 * Contract for everything the auth screens need.
 * The mock implementation runs in the browser (localStorage);
 * the Supabase implementation will satisfy the same interface.
 */
export interface AuthService {
	currentUser(): Promise<Profile | null>;
	usernameAvailable(username: string): Promise<boolean>;
	signUp(input: SignUpInput): Promise<Profile>;
	signIn(username: string, password: string): Promise<Profile>;
	signOut(): Promise<void>;
	/** Sends a 6-digit code to the account email. Never reveals whether the account exists. */
	requestPasswordReset(identifier: string): Promise<{ maskedEmail: string }>;
	/** Verifies a code. Wrong codes can be retried without limit. */
	verifyOtp(purpose: OtpPurpose, code: string): Promise<{ ok: true } | { ok: false; error: OtpError }>;
	resendOtp(purpose: OtpPurpose): Promise<void>;
	/** Only valid after a successful `verifyOtp('reset', ...)`. */
	resetPassword(newPassword: string): Promise<void>;
}
