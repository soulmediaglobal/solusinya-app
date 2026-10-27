import { OTP_TTL_MINUTES } from '../../config';
import { AppError, type OtpError, type OtpPurpose, type Profile, type SignUpInput, type Social } from '../../types';
import type { AuthService } from '../auth';
import { maskEmail } from '../../mask';

/** Demo OTP rules: 123456 is correct, 000000 behaves as expired, anything else is wrong. */
export const DEMO_OTP = '123456';
export const DEMO_EXPIRED_OTP = '000000';

interface StoredUser extends Profile {
	password: string;
}
interface Db {
	users: StoredUser[];
	sessionUserId: string | null;
	otp: { purpose: OtpPurpose; userId: string | null; expiresAt: number } | null;
	resetVerified: boolean;
	resetUserId: string | null;
	pendingSignupId?: string | null;
	pendingEmail?: string | null;
	socials?: Record<string, Social[]>;
}

const KEY = 'solu.mock.db.v1';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function load(): Db {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) return JSON.parse(raw) as Db;
	} catch {
		/* storage unavailable: fall through to an empty db */
	}
	return { users: [], sessionUserId: null, otp: null, resetVerified: false, resetUserId: null };
}
function save(db: Db) {
	try {
		localStorage.setItem(KEY, JSON.stringify(db));
	} catch {
		/* ignore */
	}
}
function strip(u: StoredUser): Profile {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { password: _pw, ...profile } = u;
	return profile;
}
function memberId(outlet: string, taken: Set<string>) {
	for (;;) {
		let s = '';
		for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
		const id = `SK-${outlet}-${s}`;
		if (!taken.has(id)) return id;
	}
}

export const mockAuth: AuthService = {
	async currentUser() {
		const db = load();
		const u = db.users.find((x) => x.id === db.sessionUserId);
		return u ? strip(u) : null;
	},

	async usernameAvailable(username) {
		await wait(150);
		const n = username.trim().toLowerCase();
		return !load().users.some((u) => u.username === n);
	},

	async signUp(input: SignUpInput) {
		await wait();
		const db = load();
		const username = input.username.trim().toLowerCase();
		const email = input.email.trim().toLowerCase();
		if (db.users.some((u) => u.username === username)) throw new AppError('username_taken', 'Username taken');
		if (db.users.some((u) => u.email === email)) throw new AppError('email_taken', 'Email already registered');
		const user: StoredUser = {
			id: crypto.randomUUID(),
			memberId: memberId(input.outletCode, new Set(db.users.map((u) => u.memberId))),
			username,
			fullName: input.fullName.trim(),
			email,
			whatsapp: input.whatsapp.trim() || null,
			outletCode: input.outletCode,
			createdAt: new Date().toISOString(),
			isAdmin: false,
			birthday: null,
			avatar: null,
			marketingOptIn: false,
			password: input.password
		};
		db.users.push(user);
		db.pendingSignupId = user.id;
		db.otp = { purpose: 'signup', userId: user.id, expiresAt: Date.now() + OTP_TTL_MINUTES * 60_000 };
		save(db);
		return { maskedEmail: maskEmail(email) };
	},

	async signIn(identifier, password) {
		await wait();
		const db = load();
		const id = identifier.trim().toLowerCase();
		const u = db.users.find((x) => x.username === id || x.email === id);
		if (!u || u.password !== password) throw new AppError('invalid_credentials', 'Invalid credentials');
		db.sessionUserId = u.id;
		save(db);
		return strip(u);
	},

	async signOut() {
		const db = load();
		db.sessionUserId = null;
		save(db);
	},

	async requestPasswordReset(identifier) {
		await wait();
		const db = load();
		const id = identifier.trim().toLowerCase();
		const u = db.users.find((x) => x.username === id || x.email === id);
		db.otp = { purpose: 'reset', userId: u?.id ?? null, expiresAt: Date.now() + OTP_TTL_MINUTES * 60_000 };
		db.resetVerified = false;
		db.resetUserId = u?.id ?? null;
		save(db);
		if (import.meta.env.DEV) console.info(`[mock] reset code: ${DEMO_OTP}`);
		return { maskedEmail: u ? maskEmail(u.email) : id.includes('@') ? maskEmail(id) : 'your email' };
	},

	async verifyOtp(purpose, code) {
		await wait(200);
		const db = load();
		if (!db.otp || db.otp.purpose !== purpose) return { ok: false, error: 'expired' as OtpError };
		if (code === DEMO_EXPIRED_OTP || Date.now() > db.otp.expiresAt) return { ok: false, error: 'expired' as OtpError };
		if (code !== DEMO_OTP) return { ok: false, error: 'wrong' as OtpError };
		if (purpose === 'reset') db.resetVerified = true;
		if (purpose === 'signup') db.sessionUserId = db.pendingSignupId ?? null;
		if (purpose === 'email') {
			const me = db.users.find((x) => x.id === db.sessionUserId);
			if (me && db.pendingEmail) me.email = db.pendingEmail;
			db.pendingEmail = null;
		}
		db.otp = null;
		save(db);
		return { ok: true as const };
	},

	async resendOtp(purpose) {
		await wait();
		const db = load();
		db.otp = { purpose, userId: db.otp?.userId ?? null, expiresAt: Date.now() + OTP_TTL_MINUTES * 60_000 };
		save(db);
	},

	async resetPassword(newPassword) {
		await wait();
		const db = load();
		if (!db.resetVerified) throw new AppError('no_reset_session', 'No verified reset session');
		// Same outcome whether or not the account exists, so nothing leaks.
		const u = db.users.find((x) => x.id === db.resetUserId);
		if (u) u.password = newPassword;
		db.resetVerified = false;
		db.resetUserId = null;
		save(db);
	},

	async updateProfile(input) {
		await wait();
		const db = load();
		const me = db.users.find((x) => x.id === db.sessionUserId);
		if (!me) throw new AppError('not_signed_in', 'Not signed in');
		const username = input.username.trim().toLowerCase();
		if (db.users.some((u) => u.id !== me.id && u.username === username)) throw new AppError('username_taken', 'Username taken');
		me.fullName = input.fullName.trim();
		me.username = username;
		me.whatsapp = input.whatsapp.trim() || null;
		save(db);
		return strip(me);
	},

	async setBirthday(iso) {
		await wait();
		const db = load();
		const me = db.users.find((x) => x.id === db.sessionUserId);
		if (!me) throw new AppError('not_signed_in', 'Not signed in');
		if (me.birthday) throw new Error('birthday already set');
		me.birthday = iso;
		save(db);
		return strip(me);
	},

	async setMarketingOptIn(value) {
		await wait(100);
		const db = load();
		const me = db.users.find((x) => x.id === db.sessionUserId);
		if (!me) throw new AppError('not_signed_in', 'Not signed in');
		me.marketingOptIn = value;
		save(db);
		return strip(me);
	},

	async setAvatar(dataUrl) {
		await wait(100);
		const db = load();
		const me = db.users.find((x) => x.id === db.sessionUserId);
		if (!me) throw new AppError('not_signed_in', 'Not signed in');
		me.avatar = dataUrl;
		save(db);
		return strip(me);
	},

	async changePassword(current, next) {
		await wait();
		const db = load();
		const me = db.users.find((x) => x.id === db.sessionUserId);
		if (!me) throw new AppError('not_signed_in', 'Not signed in');
		if (me.password !== current) throw new AppError('wrong_password', 'Wrong password');
		me.password = next;
		save(db);
	},

	async requestEmailChange(newEmail) {
		await wait();
		const db = load();
		const email = newEmail.trim().toLowerCase();
		if (db.users.some((u) => u.email === email)) throw new AppError('email_taken', 'Email already registered');
		db.pendingEmail = email;
		db.otp = { purpose: 'email', userId: db.sessionUserId, expiresAt: Date.now() + OTP_TTL_MINUTES * 60_000 };
		save(db);
		return { maskedEmail: maskEmail(email) };
	},

	async deleteAccount(password) {
		await wait();
		const db = load();
		const me = db.users.find((x) => x.id === db.sessionUserId);
		if (!me) throw new AppError('not_signed_in', 'Not signed in');
		if (me.password !== password) throw new AppError('wrong_password', 'Wrong password');
		db.users = db.users.filter((u) => u.id !== me.id);
		db.sessionUserId = null;
		save(db);
	},

	async socials() {
		const db = load();
		return (db.socials?.[db.sessionUserId ?? ''] ?? []) as Social[];
	},

	async saveSocials(list) {
		await wait();
		const db = load();
		if (!db.sessionUserId) throw new AppError('not_signed_in', 'Not signed in');
		db.socials = { ...(db.socials ?? {}), [db.sessionUserId]: list };
		save(db);
	}
};
