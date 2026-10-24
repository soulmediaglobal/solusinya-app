export const OUTLETS = [
	{ code: 'DRA', name: 'Dramaga' },
	{ code: 'JAT', name: 'Jatinangor' },
	{ code: 'PAM', name: 'Pamulang' },
	{ code: 'REN', name: 'Bali' }
] as const;

export type OutletCode = (typeof OUTLETS)[number]['code'];

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const MIN_PASSWORD = 8;
