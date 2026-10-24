import { OTP_TTL_MINUTES, type OutletCode } from '../../config';
import { maskEmail } from '../../mask';
import { AppError, type OtpError, type OtpPurpose, type Profile } from '../../types';
import type { AuthService } from '../auth';
import { supabase } from './client';

/** Which email a pending code was sent to. Survives a page reload within the same tab. */
interface Pending {
	purpose: OtpPurpose;
	email: string;
	sentAt: number;
}
const PENDING_KEY = 'solu.pending';
function getPending(purpose: OtpPurpose): Pending | null {
	try {
		const p = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null') as Pending | null;
		return p && p.purpose === purpose ? p : null;
	} catch {
		return null;
	}
}
function setPending(purpose: OtpPurpose, email: string) {
	try {
		sessionStorage.setItem(PENDING_KEY, JSON.stringify({ purpose, email, sentAt: Date.now() } satisfies Pending));
	} catch {
		/* ignore */
	}
}

async function loadProfile(userId: string, email: string): Promise<Profile | null> {
	const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
	if (error || !data) return null;
	return {
		id: data.id,
		memberId: data.member_id,
		username: data.username,
		fullName: data.full_name,
		email,
		whatsapp: data.whatsapp,
		outletCode: data.outlet_code as OutletCode,
		createdAt: data.created_at,
		isAdmin: Boolean(data.is_admin)
	};
}

async function emailFor(identifier: string): Promise<string | null> {
	const id = identifier.trim().toLowerCase();
	if (id.includes('@')) return id;
	const { data } = await supabase.rpc('email_for_username', { p_username: id });
	return (data as string | null) ?? null;
}

const OTP_TYPE = { signup: 'signup', reset: 'recovery', email: 'email_change' } as const;

export const supabaseAuth: AuthService = {
	async currentUser() {
		const { data } = await supabase.auth.getSession();
		const u = data.session?.user;
		return u ? loadProfile(u.id, u.email ?? '') : null;
	},

	async usernameAvailable(username) {
		const { data, error } = await supabase.rpc('username_available', { p_username: username.trim() });
		return error ? true : Boolean(data);
	},

	async signUp(input) {
		const email = input.email.trim().toLowerCase();
		if (!(await this.usernameAvailable(input.username))) throw new AppError('username_taken', 'Username taken');
		const { data, error } = await supabase.auth.signUp({
			email,
			password: input.password,
			options: {
				data: {
					username: input.username.trim().toLowerCase(),
					full_name: input.fullName.trim(),
					outlet_code: input.outletCode,
					whatsapp: input.whatsapp.trim()
				}
			}
		});
		if (error) {
			if (/registered|exists/i.test(error.message)) throw new AppError('email_taken', error.message);
			if (/password/i.test(error.message)) throw new AppError('weak_password', error.message);
			if (/profiles_username|username/i.test(error.message)) throw new AppError('username_taken', error.message);
			throw error;
		}
		// For an already-registered email Supabase returns a user with no identities instead of an error.
		if (data.user && data.user.identities?.length === 0) throw new AppError('email_taken', 'Email already registered');
		setPending('signup', email);
		return { maskedEmail: maskEmail(email) };
	},

	async signIn(identifier, password) {
		const email = await emailFor(identifier);
		if (!email) throw new AppError('invalid_credentials', 'Invalid credentials');
		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) {
			if (/not confirmed/i.test(error.message)) {
				setPending('signup', email);
				throw new AppError('email_unconfirmed', maskEmail(email));
			}
			throw new AppError('invalid_credentials', 'Invalid credentials');
		}
		const profile = await loadProfile(data.user.id, data.user.email ?? email);
		if (!profile) throw new AppError('invalid_credentials', 'Profile missing');
		return profile;
	},

	async signOut() {
		await supabase.auth.signOut();
	},

	async requestPasswordReset(identifier) {
		const email = await emailFor(identifier);
		if (!email) return { maskedEmail: 'your email' };
		setPending('reset', email);
		// Supabase answers the same whether or not the account exists; rate-limit errors are ignored here too.
		await supabase.auth.resetPasswordForEmail(email);
		return { maskedEmail: maskEmail(email) };
	},

	async verifyOtp(purpose, code) {
		const pending = getPending(purpose);
		if (!pending || Date.now() - pending.sentAt > OTP_TTL_MINUTES * 60_000) {
			return { ok: false, error: 'expired' as OtpError };
		}
		const { error } = await supabase.auth.verifyOtp({ email: pending.email, token: code, type: OTP_TYPE[purpose] });
		// Supabase gives one message for "wrong" and "expired", so expiry is tracked locally above.
		if (error) return { ok: false, error: 'wrong' as OtpError };
		return { ok: true as const };
	},

	async resendOtp(purpose) {
		const pending = getPending(purpose);
		if (!pending) return;
		if (purpose === 'signup') await supabase.auth.resend({ type: 'signup', email: pending.email });
		else if (purpose === 'reset') await supabase.auth.resetPasswordForEmail(pending.email);
		setPending(purpose, pending.email);
	},

	async resetPassword(newPassword) {
		const { data } = await supabase.auth.getSession();
		if (!data.session) throw new AppError('no_reset_session', 'No verified reset session');
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) throw new AppError('weak_password', error.message);
		await supabase.auth.signOut();
	}
};
