import type { Activity, LedgerEntry, LoyaltyService } from '../loyalty';

/** Without Supabase (no .env) the app shows sample data so screens can be built and checked offline. Admin tools are disabled. */
const day = 86_400_000;
const at = (daysAgo: number, hour: number, min: number) => {
	const d = new Date(Date.now() - daysAgo * day);
	d.setHours(hour, min, 0, 0);
	return d.toISOString();
};
const buys = [
	{ id: 'p1', rp: 38000, d: at(0, 18, 12) },
	{ id: 'p2', rp: 45000, d: at(4, 8, 47) },
	{ id: 'p3', rp: 52000, d: at(7, 16, 20) },
	{ id: 'p4', rp: 61000, d: at(11, 9, 5) }
];
const ledger = ([
	...buys.flatMap((b): LedgerEntry[] => [
		{ id: b.id + 'b', kind: 'beans', delta: b.rp / 1000, reason: 'transaction', createdAt: b.d, amountRp: b.rp, outletCode: 'DRA' },
		{ id: b.id + 's', kind: 'stamp', delta: 1, reason: 'transaction', createdAt: b.d, amountRp: b.rp, outletCode: 'DRA' }
	]),
	{ id: 'r1', kind: 'beans', delta: -100, reason: 'redeem', createdAt: at(8, 10, 30), amountRp: null, outletCode: null }
] as LedgerEntry[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const mockLoyalty: LoyaltyService = {
	async balance() {
		const sum = (k: string) => ledger.filter((e) => e.kind === k).reduce((a, e) => a + e.delta, 0);
		return {
			stamps: sum('stamp'),
			beans: sum('beans'),
			lifetimeBeans: ledger.filter((e) => e.kind === 'beans' && e.delta > 0).reduce((a, e) => a + e.delta, 0)
		};
	},
	async ledger() {
		return ledger;
	},
	async activity(limit = 5) {
		return buys.slice(0, limit).map(
			(b): Activity => ({ id: b.id, amountRp: b.rp, outletCode: 'DRA', createdAt: b.d, beans: b.rp / 1000, stamps: 1 })
		);
	},
	async findMember() {
		return null;
	},
	async recordTransaction() {
		throw new Error('Connect Supabase to record transactions.');
	},
	async recentTransactions() {
		return [];
	}
};
