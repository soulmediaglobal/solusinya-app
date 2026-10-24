import { MIN_PASSWORD } from './config';

export const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function usernameError(v: string): string {
	const u = v.trim().toLowerCase();
	if (!u) return 'Choose a username.';
	if (!USERNAME_RE.test(u)) return 'Use 3–20 letters, numbers, dots or underscores.';
	return '';
}
export function emailError(v: string): string {
	if (!v.trim()) return 'Enter your email.';
	return EMAIL_RE.test(v.trim()) ? '' : 'Enter a valid email address.';
}
export function passwordError(v: string): string {
	if (!v) return 'Enter a password.';
	return v.length >= MIN_PASSWORD ? '' : `Use at least ${MIN_PASSWORD} characters.`;
}
