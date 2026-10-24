import type { Voucher } from './services/loyalty';

export type VoucherState = 'available' | 'active' | 'used' | 'expired';

/** What a voucher is right now, taking the clock into account. */
export function voucherState(v: Voucher, now = Date.now()): VoucherState {
	if (v.status === 'used') return 'used';
	if (new Date(v.expiresAt).getTime() < now) return 'expired';
	if (v.status === 'active' && v.codeExpiresAt && new Date(v.codeExpiresAt).getTime() > now) return 'active';
	return 'available';
}
/** Vouchers the member can still use (shown in My rewards). */
export const isUsable = (v: Voucher, now = Date.now()) => {
	const s = voucherState(v, now);
	return s === 'available' || s === 'active';
};
export const sourceLabel = (v: Voucher) =>
	v.source === 'stamp' ? `FROM STAMP ${v.sourceDetail}` : `REDEEMED WITH ${v.sourceDetail} BEANS`;
export const sourceNote = (v: Voucher) =>
	v.source === 'stamp' ? `Unlocked with ${v.sourceDetail} stamps` : v.rewardDescription;
export const expiryLabel = (iso: string) =>
	'Expires ' + new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
