import { OUTLETS } from './config';

export const rp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
export const outletName = (code: string | null | undefined) => OUTLETS.find((o) => o.code === code)?.name ?? code ?? '';

/** "Today, 18:12" / "Yesterday, 08:47" / "20 Oct, 08:47" */
export function whenLabel(iso: string, now = new Date()) {
	const d = new Date(iso);
	const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
	const diff = Math.round((day(now) - day(d)) / 86_400_000);
	if (diff === 0) return `Today, ${time}`;
	if (diff === 1) return `Yesterday, ${time}`;
	return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
}
export const monthLabel = (iso: string) =>
	new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
export const longDate = (iso: string) =>
	new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export function greeting(now = new Date()) {
	const h = now.getHours();
	return h < 11 ? 'Good morning,' : h < 15 ? 'Good afternoon,' : 'Good evening,';
}
/** Which position on the current 10-stamp card (1-10), 0 when there are none. */
export const cardFill = (stamps: number, perCard = 10) => (stamps <= 0 ? 0 : ((stamps - 1) % perCard) + 1);
