import { OTP_TTL_MINUTES, type OutletCode } from '../../config';
import { maskEmail } from '../../mask';
import { AppError, type OtpError, type OtpPurpose, type Profile, type Social, type SocialPlatform } from '../../types';
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

const CACHE_KEY = 'solu.profile';
function cached(userId: string): Profile | null {
	try {
		const p = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Profile | null;
		return p && p.id === userId ? p : null;
	} catch {
		return null;
	}
}
async function loadProfile(userId: string, email: string): Promise<Profile | null> {
	const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
	// Offline or a network hiccup: show the last known profile instead of looking signed out.
	if (error) return cached(userId);
	if (!data) return null;
	const profile = toProfile(data, email);
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
	} catch {
		/* ignore */
	}
	return profile;
}
function toProfile(data: Record<string, unknown>, email: string): Profile {
	return {
		id: data.id as string,
		memberId: data.member_id as string,
		username: data.username as string,
		fullName: data.full_name as string,
		email,
		whatsapp: (data.whatsapp as string | null) ?? null,
		outletCode: data.outlet_code as OutletCode,
		createdAt: data.created_at as string,
		isAdmin: Boolean(data.is_admin),
		birthday: (data.birthday as string | null) ?? null,
		avatar: (data.avatar as string | null) ?? null,
		marketingOptIn: Boolean(data.marketing_opt_in)
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
					whatsapp: input.whatsapp.trim(),
					source: input.source ?? ''
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
		try {
			localStorage.removeItem(CACHE_KEY);
		} catch {
			/* ignore */
		}
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
	},

	async updateProfile(input) {
		const { data: sess } = await supabase.auth.getSession();
		const u = sess.session?.user;
		if (!u) throw new AppError('not_signed_in', 'Not signed in');
		const { error } = await supabase
			.from('profiles')
			.update({ full_name: input.fullName.trim(), username: input.username.trim().toLowerCase(), whatsapp: input.whatsapp.trim() || null })
			.eq('id', u.id);
		if (error) {
			if (error.code === '23505') throw new AppError('username_taken', 'Username taken');
			throw error;
		}
		return (await loadProfile(u.id, u.email ?? '')) as Profile;
	},

	async setBirthday(iso) {
		const { data: sess } = await supabase.auth.getSession();
		const u = sess.session?.user;
		if (!u) throw new AppError('not_signed_in', 'Not signed in');
		const { error } = await supabase.rpc('set_birthday', { p_date: iso });
		if (error) throw error;
		return (await loadProfile(u.id, u.email ?? '')) as Profile;
	},

	async setMarketingOptIn(value) {
		const { data: sess } = await supabase.auth.getSession();
		const u = sess.session?.user;
		if (!u) throw new AppError('not_signed_in', 'Not signed in');
		const { error } = await supabase.rpc('set_marketing_opt_in', { p_value: value });
		if (error) throw error;
		return (await loadProfile(u.id, u.email ?? '')) as Profile;
	},

	async setAvatar(dataUrl) {
		const { data: sess } = await supabase.auth.getSession();
		const u = sess.session?.user;
		if (!u) throw new AppError('not_signed_in', 'Not signed in');
		const { error } = await supabase.from('profiles').update({ avatar: dataUrl }).eq('id', u.id);
		if (error) throw error;
		return (await loadProfile(u.id, u.email ?? '')) as Profile;
	},

	async changePassword(current, next) {
		const { data: sess } = await supabase.auth.getSession();
		const email = sess.session?.user.email;
		if (!email) throw new AppError('not_signed_in', 'Not signed in');
		const check = await supabase.auth.signInWithPassword({ email, password: current });
		if (check.error) throw new AppError('wrong_password', 'Wrong password');
		const { error } = await supabase.auth.updateUser({ password: next });
		if (error) throw new AppError('weak_password', error.message);
	},

	async requestEmailChange(newEmail) {
		const email = newEmail.trim().toLowerCase();
		const { error } = await supabase.auth.updateUser({ email });
		if (error) {
			if (/registered|exists|already/i.test(error.message)) throw new AppError('email_taken', error.message);
			throw error;
		}
		setPending('email', email);
		return { maskedEmail: maskEmail(email) };
	},

	async deleteAccount(password) {
		const { data: sess } = await supabase.auth.getSession();
		const email = sess.session?.user.email;
		if (!email) throw new AppError('not_signed_in', 'Not signed in');
		const check = await supabase.auth.signInWithPassword({ email, password });
		if (check.error) throw new AppError('wrong_password', 'Wrong password');
		const { error } = await supabase.rpc('delete_my_account');
		if (error) throw error;
		await this.signOut();
	},

	async socials() {
		const { data: sess } = await supabase.auth.getSession();
		const id = sess.session?.user.id;
		if (!id) return [];
		const { data } = await supabase.from('social_accounts').select('platform, handle').eq('user_id', id);
		return (data ?? []).map((r): Social => ({ platform: r.platform as SocialPlatform, handle: r.handle }));
	},

	async saveSocials(list) {
		const { data: sess } = await supabase.auth.getSession();
		const id = sess.session?.user.id;
		if (!id) throw new AppError('not_signed_in', 'Not signed in');
		const keep = list.map((s) => s.platform);
		const del = supabase.from('social_accounts').delete().eq('user_id', id);
		const { error: e1 } = keep.length ? await del.not('platform', 'in', `(${keep.join(',')})`) : await del;
		if (e1) throw e1;
		if (list.length) {
			const { error: e2 } = await supabase
				.from('social_accounts')
				.upsert(list.map((s) => ({ user_id: id, platform: s.platform, handle: s.handle.trim() })), { onConflict: 'user_id,platform' });
			if (e2) throw e2;
		}
	}
};
