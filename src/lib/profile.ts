import type { Profile } from './types';

export interface Completeness {
	done: number;
	total: 2;
	complete: boolean;
	/** what is still missing, in plain words */
	missing: string[];
}
/** A profile is complete once it has a WhatsApp number and a birthday. The database enforces the same rule on rewards. */
export function completeness(p: Pick<Profile, 'whatsapp' | 'birthday'>): Completeness {
	const missing: string[] = [];
	if (!p.whatsapp) missing.push('WhatsApp number');
	if (!p.birthday) missing.push('birthday');
	return { done: 2 - missing.length, total: 2, complete: missing.length === 0, missing };
}
export function initials(name: string) {
	const w = name.trim().split(/\s+/).filter(Boolean);
	return ((w[0]?.[0] ?? '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase() || '?';
}
/** Resizes a picked photo to a 256px square JPEG data URL (about 15 to 30 KB). */
export async function photoToAvatar(file: File): Promise<string> {
	const bmp = await createImageBitmap(file);
	const size = 256;
	const c = document.createElement('canvas');
	c.width = c.height = size;
	const g = c.getContext('2d')!;
	const side = Math.min(bmp.width, bmp.height);
	g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
	bmp.close();
	return c.toDataURL('image/jpeg', 0.82);
}
