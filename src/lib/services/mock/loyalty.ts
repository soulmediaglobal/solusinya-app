import type { Activity, LedgerEntry, Level, Sticker, LoyaltyService, Milestone, Promotion, Reward, Voucher } from '../loyalty';

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
	{ id: 'p4', rp: 61000, d: at(11, 9, 5) },
	{ id: 'p5', rp: 70000, d: at(14, 10, 15) },
	{ id: 'p6', rp: 60000, d: at(16, 17, 40) },
	{ id: 'p7', rp: 60000, d: at(19, 11, 0) }
];
const ledger = ([
	...buys.flatMap((b): LedgerEntry[] => [
		{ id: b.id + 'b', kind: 'beans', delta: b.rp / 1000, reason: 'transaction', createdAt: b.d, amountRp: b.rp, outletCode: 'DRA' },
		{ id: b.id + 's', kind: 'stamp', delta: 1, reason: 'transaction', createdAt: b.d, amountRp: b.rp, outletCode: 'DRA' }
	]),
	{ id: 'r1', kind: 'beans', delta: -100, reason: 'redeem', createdAt: at(8, 10, 30), amountRp: null, outletCode: null }
] as LedgerEntry[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const levelList: Level[] = [
	{ level: 1, name: 'Green Bean', minXp: 0, perks: 'Starter stickers' },
	{ level: 2, name: 'Light Roast', minXp: 200, perks: 'Level 2 stickers · Discord role' },
	{ level: 3, name: 'Medium Roast', minXp: 600, perks: 'More stickers · Discord role' },
	{ level: 4, name: 'Dark Roast', minXp: 1500, perks: 'Early access to new menu' },
	{ level: 5, name: 'Solu Legend', minXp: 3000, perks: 'Legend sticker · event invites' }
];
const stickerLevels = [1, 1, 2, 3, 3, 3, 4, 4, 4, 5, 5, null];
const stickerList: Sticker[] = stickerLevels.map((l, i) => ({
	id: 's' + i,
	name: i === 0 ? 'Solu says hi' : i === 1 ? 'Cheers!' : i === 2 ? 'Good morning' : l === null ? 'Season 1 sticker' : `Sticker ${i + 1}`,
	unlockLevel: l,
	season: l === null ? 'Season 1' : null,
	image: '/img/solu-wave.png'
}));
const promos: Promotion[] = [
	{ id: '1', kicker: 'WEEKEND', title: 'Double stamps', subtitle: 'Every Saturday and Sunday', focusX: 12, focusY: 50 },
	{ id: '2', kicker: 'NEW MENU', title: 'Seasonal brew is here', subtitle: 'Try it at Dramaga this month', focusX: 80, focusY: 40 },
	{ id: '3', kicker: 'BRING YOUR OWN', title: 'Tumbler day', subtitle: 'Bring a tumbler, get a free shot', focusX: 35, focusY: 70 },
	{ id: '4', kicker: 'MEMBERS ONLY', title: 'Birthday treat', subtitle: 'Add your birthday to unlock', focusX: 65, focusY: 20 },
	{ id: '5', kicker: 'COMING SOON', title: 'New outlet opening', subtitle: 'Be the first to know', focusX: 95, focusY: 60 }
];

const rewardsCatalog: Reward[] = [
	{ id: 'r1', name: 'Free cookie', description: 'Any cookie in store', beansCost: 100 },
	{ id: 'r2', name: 'Free size upgrade', description: 'Upgrade any drink one size', beansCost: 150 },
	{ id: 'r3', name: 'Free drink', description: 'Any drink on the menu', beansCost: 300 },
	{ id: 'r4', name: 'Coffee beans 200g', description: 'One bag of house beans', beansCost: 600 }
];
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
const vouchers: Voucher[] = [
	{ id: 'v1', rewardName: 'Free size upgrade', rewardDescription: 'Upgrade any drink one size', source: 'stamp', sourceDetail: 5, status: 'available', expiresAt: iso(30 * day), code: null, codeExpiresAt: null, usedAt: null, usedOutlet: null, createdAt: iso(-6 * day) },
	{ id: 'v2', rewardName: 'Free cookie', rewardDescription: 'Any cookie in store', source: 'beans', sourceDetail: 100, status: 'available', expiresAt: iso(14 * day), code: null, codeExpiresAt: null, usedAt: null, usedOutlet: null, createdAt: iso(-8 * day) }
];
const sum = (k: string) => ledger.filter((e) => e.kind === k).reduce((a, e) => a + e.delta, 0);

export const mockLoyalty: LoyaltyService = {
	async xp() {
		return ledger.filter((e) => e.kind === 'beans' && e.delta > 0).reduce((n, e) => n + e.delta, 0) + 10 * buys.length;
	},
	async levels() {
		return levelList;
	},
	async stickers() {
		return stickerList;
	},
	async promotions() {
		return promos;
	},
	async rewards() {
		return rewardsCatalog;
	},
	async milestones(): Promise<Milestone[]> {
		return [
			{ position: 5, rewardName: 'Free size upgrade' },
			{ position: 10, rewardName: 'Free drink' }
		];
	},
	async vouchers() {
		return vouchers.map((v) => ({ ...v }));
	},
	async voucher(id) {
		const v = vouchers.find((x) => x.id === id);
		return v ? { ...v } : null;
	},
	async redeem(rewardId) {
		const r = rewardsCatalog.find((x) => x.id === rewardId);
		if (!r || r.beansCost === null) throw new Error('reward not available');
		if (sum('beans') < r.beansCost) throw new Error('not enough beans');
		ledger.unshift({ id: 'rd' + Date.now(), kind: 'beans', delta: -r.beansCost, reason: 'redeem', createdAt: new Date().toISOString(), amountRp: null, outletCode: null });
		const id = 'v' + Date.now();
		vouchers.unshift({ id, rewardName: r.name, rewardDescription: r.description, source: 'beans', sourceDetail: r.beansCost, status: 'available', expiresAt: iso(30 * day), code: null, codeExpiresAt: null, usedAt: null, usedOutlet: null, createdAt: new Date().toISOString() });
		return { voucherId: id, beansAfter: sum('beans') };
	},
	async activate(voucherId) {
		const v = vouchers.find((x) => x.id === voucherId);
		if (!v) throw new Error('voucher not found');
		if (v.status === 'active' && v.codeExpiresAt && new Date(v.codeExpiresAt).getTime() > Date.now()) {
			return { code: v.code!, codeExpiresAt: v.codeExpiresAt };
		}
		v.status = 'active';
		v.code = 'SOLU-48K2';
		v.codeExpiresAt = iso(10 * 60_000);
		// Demo: pretend the cashier scans the code a few seconds later.
		setTimeout(() => {
			v.status = 'used';
			v.usedAt = new Date().toISOString();
			v.usedOutlet = 'DRA';
		}, 7000);
		return { code: v.code, codeExpiresAt: v.codeExpiresAt };
	},
	async peekVoucher() {
		throw new Error('Connect Supabase to validate codes.');
	},
	async useVoucher() {
		throw new Error('Connect Supabase to validate codes.');
	},
	async balance() {
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
