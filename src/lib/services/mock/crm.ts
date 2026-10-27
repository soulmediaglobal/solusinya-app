import type { CrmInsights, CrmMemberDetail, CrmMemberRow } from '../loyalty';

/** Sample CRM data so the screens can be built and checked without Supabase. */
const day = 86_400_000;
const CODES = ['DRA', 'JAT', 'PAM', 'REN'];
const NAMES = ['Dramaga', 'Jatinangor', 'Pamulang', 'Bali'];
const LEVELS = ['Green Bean', 'Light Roast', 'Medium Roast', 'Dark Roast', 'Solu Legend'];
const FIRST = ['Arthur', 'Ray', 'Tomy', 'Dinda', 'Bima', 'Sari', 'Fajar', 'Maya', 'Rizky', 'Nadia', 'Galih', 'Putri', 'Andra', 'Lestari', 'Yoga', 'Citra', 'Dewa', 'Kirana', 'Hendra', 'Salsa', 'Wahyu', 'Intan', 'Reza', 'Mira'];
const LAST = ['Nandra', 'Nocturne', 'Mitra', 'Kusuma', 'Ramadhan', 'Wulandari', 'Hidayat', 'Putri', 'Aditya', 'Fitri'];

function rng(seed: number) {
	let s = (seed * 7919 + 12345) % 2147483647;
	const next = () => ((s = (s * 16807) % 2147483647) / 2147483647);
	for (let i = 0; i < 6; i++) next(); // small seeds start with tiny values, so warm up
	return next;
}
const iso = (ago: number) => new Date(Date.now() - ago * day).toISOString();

interface M {
	row: CrmMemberRow;
	whatsapp: string;
	birthday: string | null;
	byOutlet: number[];
	spend: number[];
}
const members: M[] = Array.from({ length: 24 }, (_, i) => {
	const r = rng(100 + i * 13);
	const visits = Math.round(r() * r() * 70) + (i % 5 === 4 ? 0 : 2);
	const home = i % 4;
	const byOutlet = CODES.map((_, k) => (k === home ? Math.round(visits * (0.5 + r() * 0.3)) : 0));
	let left = visits - byOutlet[home];
	for (let k = 0; left > 0; k = (k + 1) % 4) if (k !== home) { const take = Math.min(left, Math.round(r() * 4) + 1); byOutlet[k] += take; left -= take; }
	const spend = byOutlet.map((v) => v * (60000 + Math.round(r() * 60000)));
	const total = spend.reduce((a, b) => a + b, 0);
	const xp = Math.round(total / 1000 + visits * 10 + Math.floor(visits / 10) * 100);
	const level = xp >= 3000 ? 4 : xp >= 1500 ? 3 : xp >= 600 ? 2 : xp >= 200 ? 1 : 0;
	const username = (FIRST[i] + '.' + LAST[i % LAST.length][0]).toLowerCase();
	return {
		row: {
			username, fullName: FIRST[i] + ' ' + LAST[i % LAST.length], memberId: `SK-${CODES[home]}-${(100000 + i * 7919).toString(36).toUpperCase().slice(0, 6)}`,
			email: username.replace('.', '') + '@email.com', homeOutlet: CODES[home], createdAt: iso(20 + i * 7), level: LEVELS[level], xp, visits, total,
			lastVisit: visits ? iso(Math.round(r() * (i % 3 === 0 ? 70 : 12))) : null, outlets: byOutlet.filter((v) => v > 0).length
		},
		whatsapp: '6281200000' + String(100 + i), birthday: i % 3 === 0 ? `1994-10-${String(3 + i).padStart(2, '0')}` : null, byOutlet, spend
	};
});

export function mockMembers(q: string, limit = 100): CrmMemberRow[] {
	const s = q.trim().toLowerCase();
	return members
		.map((m) => m.row)
		.filter((r) => !s || [r.username, r.fullName, r.email, r.memberId].some((v) => v.toLowerCase().includes(s)))
		.sort((a, b) => b.total - a.total)
		.slice(0, limit);
}

export function mockMember(username: string): CrmMemberDetail {
	const m = members.find((x) => x.row.username === username) ?? members[0];
	const r = rng(7 + m.row.visits);
	const { row } = m;
	const levelIdx = LEVELS.indexOf(row.level);
	const thresholds = [0, 200, 600, 1500, 3000];
	const monthly = Array.from({ length: 12 }, (_, k) => {
		const d = new Date();
		d.setMonth(d.getMonth() - (11 - k));
		const v = k < 12 - Math.min(12, Math.ceil(row.visits / 4)) ? 0 : Math.round(row.visits / 8 + r() * 4);
		return { m: d.toISOString().slice(0, 7), visits: v, revenue: v * (row.visits ? Math.round(row.total / row.visits) : 0) };
	});
	const heatmap: { d: number; h: number; n: number }[] = [];
	for (let d = 1; d <= 7; d++) for (let h = 7; h <= 21; h++) { const n = Math.round(r() * r() * (h >= 15 && h <= 18 ? 4 : 2) * (d >= 6 ? 1.4 : 1)); if (n) heatmap.push({ d, h, n }); }
	const status = ['used', 'used', 'expired', 'available', 'available', 'used'] as const;
	const rewards = ['Free drink', 'Free size upgrade', 'Free cookie', 'Coffee beans 200g'];
	const rowMax = Math.max(...members.map((x) => x.row.visits));
	const radarOf = (v: number, mo: number, rec: number, va: number, lo: number, en: number) => ({ frequency: v, monetary: mo, recency: rec, variety: va, loyalty: lo, engagement: en });
	const avgV = members.reduce((a, x) => a + x.row.visits, 0) / members.length;
	const avgM = members.reduce((a, x) => a + x.row.total, 0) / members.length;
	return {
		profile: {
			username: row.username, fullName: row.fullName, memberId: row.memberId, email: row.email, whatsapp: m.whatsapp, homeOutlet: row.homeOutlet, createdAt: row.createdAt,
			birthday: m.birthday, lastSignIn: iso(1), emailConfirmed: true, isAdmin: false, profileComplete: Boolean(m.birthday),
			socials: [{ platform: 'discord', handle: row.username }, { platform: 'instagram', handle: row.username }]
		},
		standing: {
			xp: row.xp, level: levelIdx + 1, levelName: row.level, nextLevelName: LEVELS[levelIdx + 1] ?? null, nextLevelXp: thresholds[levelIdx + 1] ?? null,
			beans: Math.round(row.total / 1000 / 2), stamps: row.visits, lifetimeBeans: Math.round(row.total / 1000), cardsCompleted: Math.floor(row.visits / 10), stampsOnCard: row.visits % 10, stampsPerCard: 10
		},
		stats: {
			visits: row.visits, total: row.total, avgTicket: row.visits ? Math.round(row.total / row.visits) : 0, maxTicket: Math.round((row.total / Math.max(1, row.visits)) * 2.4),
			firstVisit: iso(15 + members.indexOf(m) * 6), lastVisit: row.lastVisit, daysSinceLast: row.lastVisit ? Math.round((Date.now() - new Date(row.lastVisit).getTime()) / day) : null,
			avgGapDays: row.visits > 1 ? 3.4 : null, rank: mockMembers('').findIndex((x) => x.username === row.username) + 1, spenders: members.length
		},
		radar: {
			member: radarOf(row.visits, row.total, row.lastVisit ? Math.max(0, 100 - (Math.round((Date.now() - new Date(row.lastVisit).getTime()) / day) * 100) / 90) : 0, row.outlets, Math.floor(row.visits / 5), 2 + (m.birthday ? 1 : 0)),
			avg: radarOf(avgV, avgM, 62, 2.1, 3.2, 1.6),
			max: radarOf(rowMax, Math.max(...members.map((x) => x.row.total)), 100, 4, 14, 5)
		},
		byOutlet: CODES.map((code, k) => ({ code, name: NAMES[k], visits: m.byOutlet[k], revenue: m.spend[k], lastVisit: m.byOutlet[k] ? iso(1 + k * 6) : null })),
		monthly,
		heatmap,
		vouchers: Array.from({ length: Math.min(8, Math.max(2, Math.floor(row.visits / 4))) }, (_, k) => ({
			reward: rewards[k % 4], source: k % 2 ? 'beans' : 'stamp', detail: k % 2 ? 100 + k * 50 : 5 + (k % 2) * 5, status: status[k % status.length],
			createdAt: iso(10 + k * 12), expiresAt: iso(-20 + k * 12), usedAt: status[k % status.length] === 'used' ? iso(8 + k * 12) : null, usedOutlet: status[k % status.length] === 'used' ? CODES[k % 4] : null
		})),
		recent: Array.from({ length: Math.min(12, row.visits) }, (_, k) => ({ id: 'x' + k, amount: 45000 + ((k * 37000) % 120000), outlet: CODES[(k + members.indexOf(m)) % 4], createdAt: iso(k * 3 + 0.2) }))
	};
}

export function mockInsights(days: number): CrmInsights {
	const r = rng(21);
	const heatmap: CrmInsights['heatmap'] = [];
	for (let d = 1; d <= 7; d++) for (let h = 7; h <= 22; h++) {
		const peak = Math.exp(-Math.pow((h - 16.5) / 2.6, 2)) + 0.55 * Math.exp(-Math.pow((h - 9) / 1.6, 2));
		heatmap.push({ d, h, n: Math.round(peak * (d >= 6 ? 26 : 15) * (0.7 + r() * 0.6)) });
	}
	const outletRadar = CODES.map((code, k) => {
		const f = [1, 0.62, 0.45, 0.2][k];
		const visits = Math.round(260 * f * (days / 30));
		return { code, name: NAMES[k], revenue: visits * (62000 + k * 6000), visits, avgTicket: 62000 + k * 6000, members: Math.round(visits * 0.45), repeatMembers: Math.round(visits * (0.2 - k * 0.02)), newMembers: Math.round(34 * f * (days / 30)) };
	});
	const crossover: CrmInsights['crossover'] = [];
	CODES.forEach((a, i) => CODES.forEach((b, j) => crossover.push({ a, b, n: i === j ? [96, 58, 41, 19][i] : Math.round(10 / (1 + Math.abs(i - j)) + r() * 6) })));
	return {
		days, generatedAt: new Date().toISOString(),
		cohorts: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((month, i) => {
			const size = 44 - i * 3;
			return { month, size, retained: Array.from({ length: 6 }, (_, k) => (k > 5 - i ? null : Math.round(size * (k === 0 ? 0.72 : 0.62 * Math.pow(0.86, k - 1) * (0.9 + r() * 0.2))))) };
		}),
		heatmap,
		funnel: { registered: 318, verified: 291, firstVisit: 247, repeat: 164, completedCard: 53 },
		ticketHist: [['< 25rb', 18], ['25-50rb', 126], ['50-75rb', 238], ['75-100rb', 141], ['100-150rb', 83], ['150-200rb', 31], ['200rb+', 12]].map(([label, n]) => ({ label: label as string, n: n as number })),
		visitsDist: [['1 visit', 83], ['2-3', 61], ['4-6', 44], ['7-10', 31], ['11-20', 19], ['21+', 9]].map(([label, n]) => ({ label: label as string, n: n as number })),
		outletRadar, crossover,
		scatter: members.map((m) => ({ username: m.row.username, visits: m.row.visits, total: m.row.total, daysSince: m.row.lastVisit ? Math.round((Date.now() - new Date(m.row.lastVisit).getTime()) / day) : 90, level: LEVELS.indexOf(m.row.level) + 1 }))
	};
}
