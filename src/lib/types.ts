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
			| 'weak_password',
		message: string
	) {
		super(message);
	}
}
