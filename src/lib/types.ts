import type { OutletCode } from './config';

export interface Profile {
	id: string;
	memberId: string; // SK-<outlet code>-<6 chars>
	username: string;
	fullName: string;
	email: string;
	whatsapp: string | null;
	outletCode: OutletCode;
	createdAt: string; // ISO
	isAdmin: boolean;
	/** ISO date (YYYY-MM-DD); once set it cannot be changed */
	birthday: string | null;
	/** small JPEG as a data URL */
	avatar: string | null;
}

export const SOCIALS = [
	{ key: 'discord', label: 'Discord', xp: 30, placeholder: 'username' },
	{ key: 'instagram', label: 'Instagram', xp: 10, placeholder: '@username' },
	{ key: 'tiktok', label: 'TikTok', xp: 10, placeholder: '@username' },
	{ key: 'telegram', label: 'Telegram', xp: 10, placeholder: '@username' },
	{ key: 'facebook', label: 'Facebook', xp: 10, placeholder: 'name or profile link' }
] as const;
export type SocialPlatform = (typeof SOCIALS)[number]['key'];
export interface Social {
	platform: SocialPlatform;
	handle: string;
}

export interface SignUpInput {
	username: string;
	fullName: string;
	email: string;
	outletCode: OutletCode;
	whatsapp: string;
	password: string;
}

export type OtpPurpose = 'signup' | 'reset' | 'email';
export type OtpError = 'wrong' | 'expired';

export class AppError extends Error {
	constructor(
		public code:
			| 'username_taken'
			| 'email_taken'
			| 'invalid_credentials'
			| 'not_signed_in'
			| 'email_unconfirmed'
			| 'no_reset_session'
			| 'weak_password'
			| 'wrong_password',
		message: string
	) {
		super(message);
	}
}
