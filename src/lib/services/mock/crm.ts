import type { CrmAuditRow, CrmCampaignDetail, CrmCampaignSummary, CrmInsights, CrmMemberDetail, CrmMemberExtra, CrmMemberRow, CrmNote, CrmOverview, CrmSegmentRow, MenuItem, SegmentKey } from '../loyalty';

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

/* ------------------------------------------------------------------ v2 (offline samples with in-memory state) */
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * day).toISOString().slice(0, 10);

export const mockMenu: MenuItem[] = [
	['Es Kopi Susu', 'Drinks'], ['Americano', 'Drinks'], ['Latte', 'Drinks'], ['Matcha Latte', 'Drinks'], ['V60', 'Drinks'], ['Croissant', 'Food'], ['Cookies', 'Food']
].map(([name, category], i) => ({ id: 'menu' + i, name, category, sort: i, active: true }));

const tags = new Map<string, string[]>([[members[0].row.username, ['vip']], [members[3].row.username, ['kopi-susu', 'mahasiswa']]]);
const notes = new Map<string, CrmNote[]>([[members[0].row.username, [{ id: 'n1', body: 'Suka duduk dekat jendela, selalu pesan V60.', dueOn: null, done: false, createdAt: iso(9), author: 'tomy.sm' }]]]);
const optIn = new Map<string, boolean>(members.map((m, i) => [m.row.username, i % 3 !== 0]));
const audit: CrmAuditRow[] = [{ id: 'a0', admin: 'raynocturne', action: 'beans.grant', target: members[1].row.username, details: { beans: 50, reason: 'Kompensasi pesanan salah' }, createdAt: iso(2) }];
const campaigns: (CrmCampaignDetail & { sentBy: Record<string, string> })[] = [];
const log = (action: string, target: string | null, details: Record<string, unknown>) =>
	audit.unshift({ id: 'a' + Date.now() + Math.random(), admin: 'raynocturne', action, target, details, createdAt: new Date().toISOString() });

const SOURCES = ['instagram', 'friend', 'store_qr', 'tiktok', 'other'];
function segmentOf(r: number, f: number, m: number, visits: number): SegmentKey {
	if (!visits) return 'new';
	if (r >= 4 && f >= 4) return 'champion';
	if (f >= 4 && r >= 3) return 'loyal';
	if (r <= 2 && f >= 3) return 'at_risk';
	if (m >= 4 && f <= 3) return 'big_spender';
	if (r >= 4 && f <= 2) return 'promising';
	if (r <= 2) return 'hibernating';
	return 'attention';
}
export function mockSegments(outlet: string | null): CrmSegmentRow[] {
	const list = members.filter((m) => !outlet || m.row.homeOutlet === outlet);
	const rank = (vals: number[], v: number) => 1 + Math.min(4, Math.floor((5 * vals.filter((x) => x < v).length) / Math.max(1, vals.length)));
	const days = list.map((m) => (m.row.lastVisit ? Math.round((Date.now() - new Date(m.row.lastVisit).getTime()) / day) : 999));
	return list
		.map((m, i): CrmSegmentRow => {
			const { row } = m;
			const ds = row.lastVisit ? days[i] : null;
			const r = row.visits ? 6 - rank(days.map((d) => -d).map((d) => -d), days[i]) : 0;
			const f = row.visits ? rank(list.map((x) => x.row.visits), row.visits) : 0;
			const mo = row.visits ? rank(list.map((x) => x.row.total), row.total) : 0;
			const gap = row.visits > 1 ? Math.max(2, Math.round(60 / Math.max(2, row.visits / 2))) : null;
			const risk = !row.visits ? 0 : Math.min(100, Math.round((100 * ((ds ?? 0) / Math.max(7, gap ?? 30))) / 2.5));
			return {
				username: row.username, fullName: row.fullName, outletCode: row.homeOutlet, whatsapp: m.whatsapp, optIn: optIn.get(row.username) ?? false,
				signupSource: SOURCES[i % SOURCES.length], visits: row.visits, total: row.total, avgTicket: row.visits ? Math.round(row.total / row.visits) : 0,
				firstVisit: row.visits ? iso(30 + i * 5) : null, lastVisit: row.lastVisit, daysSince: ds, avgGap: gap, tags: tags.get(row.username) ?? [],
				openFollowups: (notes.get(row.username) ?? []).filter((n) => n.dueOn && !n.done).length,
				r, f, m: mo, segment: segmentOf(r, f, mo, row.visits), churnRisk: risk,
				nextVisit: row.visits >= 3 && gap && row.lastVisit ? addDays(row.lastVisit.slice(0, 10), gap) : null,
				clv12: row.visits ? Math.round((row.total / row.visits) * (row.visits / 90) * 360) : 0
			};
		})
		.sort((a, b) => b.total - a.total);
}

export function mockOverview(from: string, to: string, outlet: string | null): CrmOverview {
	const span = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / day) + 1);
	const r = rng(33 + span);
	const f = outlet ? [1, 0.62, 0.45, 0.2][CODES.indexOf(outlet)] * 0.5 : 1;
	const daily = Array.from({ length: span }, (_, i) => {
		const visits = Math.round((8 + r() * 22) * f);
		return { d: addDays(from, i), visits, revenue: visits * (45000 + Math.round(r() * 50000)), prevRevenue: Math.round((8 + r() * 22) * f) * (45000 + Math.round(r() * 50000)) * 0.9 };
	});
	const revenue = daily.reduce((a, x) => a + x.revenue, 0);
	const visits = daily.reduce((a, x) => a + x.visits, 0);
	const share = [0.46, 0.27, 0.19, 0.08];
	const mtd = Math.round(revenue * 0.9);
	return {
		from, to, days: span, outlet, generatedAt: new Date().toISOString(),
		kpi: {
			revenue, visits, activeMembers: Math.round(visits * 0.55), avgTicket: Math.round(revenue / Math.max(1, visits)), newMembers: Math.round(span * 1.4 * f), totalMembers: Math.round(318 * (outlet ? share[CODES.indexOf(outlet)] : 1)), repeatRate: 61,
			prevRevenue: Math.round(revenue * 0.88), prevVisits: Math.round(visits * 0.93), prevActiveMembers: Math.round(visits * 0.5), prevAvgTicket: Math.round((revenue / Math.max(1, visits)) * 0.96), prevNewMembers: Math.round(span * 1.2 * f)
		},
		daily,
		byOutlet: CODES.map((code, i) => ({ code, name: NAMES[i], revenue: Math.round(revenue * share[i]), visits: Math.round(visits * share[i]), prevRevenue: Math.round(revenue * share[i] * (0.8 + i * 0.1)) })),
		week: { revenue: Math.round(revenue * 0.25), prevRevenue: Math.round(revenue * 0.31), visits: Math.round(visits * 0.25), prevVisits: Math.round(visits * 0.28) },
		forecast: { monthToDate: mtd, daysElapsed: 17, daysInMonth: 31, projected: Math.round((mtd / 17) * 31), prevMonth: Math.round(mtd * 1.5) },
		alerts: [
			{ level: 'bad', key: 'revenue_drop', count: 1, text: 'Omzet 7 hari terakhir turun lebih dari 20% dibanding 7 hari sebelumnya' },
			{ level: 'warn', key: 'quiet_outlet', count: 1, text: '1 outlet tanpa transaksi 3 hari terakhir' },
			{ level: 'warn', key: 'overdue_regulars', count: 7, text: '7 member rutin terlambat datang lebih dari 2x kebiasaannya' },
			{ level: 'warn', key: 'followups_due', count: 2, text: '2 tindak lanjut jatuh tempo' },
			{ level: 'info', key: 'vouchers_expiring', count: 9, text: '9 voucher akan kedaluwarsa dalam 7 hari' },
			{ level: 'info', key: 'birthdays', count: 3, text: '3 member ulang tahun dalam 7 hari' }
		],
		rewardEconomics: {
			issued: 74, used: 58, expired: 11, costUsed: 58 * 9500, costKnown: true,
			byReward: [{ id: 'r1', name: 'Free drink', unitCost: 11000, issued: 30, used: 26 }, { id: 'r2', name: 'Free size upgrade', unitCost: 3000, issued: 22, used: 18 }, { id: 'r3', name: 'Free cookie', unitCost: 6000, issued: 16, used: 11 }, { id: 'r4', name: 'Coffee beans 200g', unitCost: 45000, issued: 6, used: 3 }],
			bySource: { stamp: 38, beans: 30, gift: 6 }
		},
		topMenu: mockMenu.slice(0, 6).map((m, i) => ({ name: m.name, category: m.category, qty: Math.round((140 - i * 19) * f), orders: Math.round((100 - i * 13) * f) })),
		menuCoverage: 54,
		signupSources: [['instagram', 118], ['friend', 82], ['store_qr', 64], ['tiktok', 31], ['unknown', 23]].map(([source, members]) => ({ source: source as string, members: members as number })),
		levels: [{ level: 1, name: 'Green Bean', members: 201 }, { level: 2, name: 'Light Roast', members: 71 }, { level: 3, name: 'Medium Roast', members: 29 }, { level: 4, name: 'Dark Roast', members: 13 }, { level: 5, name: 'Solu Legend', members: 4 }],
		birthdays: members.filter((m) => m.birthday).slice(0, 5).map((m, i) => ({ username: m.row.username, fullName: m.row.fullName, whatsapp: m.whatsapp, optIn: i % 2 === 0, md: `10-${String(28 + (i % 3)).padStart(2, '0')}` })),
		optIn: { yes: 187, total: 318 }
	};
}

export function mockMemberExtra(username: string): CrmMemberExtra {
	const m = members.find((x) => x.row.username === username) ?? members[0];
	const seg = mockSegments(null).find((x) => x.username === m.row.username)!;
	const r = rng(5 + m.row.visits);
	const list = [...members].sort((a, b) => b.row.total - a.row.total);
	const idx = list.indexOf(m);
	const base = m.row.visits ? Math.round(m.row.total / m.row.visits) : 0;
	return {
		optIn: optIn.get(m.row.username) ?? false,
		signupSource: seg.signupSource,
		percentile: { spend: Math.round((100 * (list.length - 1 - idx)) / list.length), visits: Math.round((100 * members.filter((x) => x.row.visits < m.row.visits).length) / members.length), members: members.length },
		predictedNextVisit: seg.nextVisit,
		avgGapDays: seg.avgGap,
		clv12: seg.clv12,
		ticketTrend: Array.from({ length: Math.min(20, m.row.visits) }, (_, k) => ({ d: addDays(today(), -(19 - k) * 3), amount: Math.round(base * (0.6 + r() * 0.9) * (1 + k / 60)) })),
		favoriteMenu: m.row.visits ? mockMenu.slice(0, 5).map((it, i) => ({ name: it.name, category: it.category, qty: Math.max(1, Math.round((m.row.visits / 2) * (1 - i * 0.2) * (0.6 + r() * 0.6))), orders: Math.max(1, Math.round((m.row.visits / 3) * (1 - i * 0.2))), last: iso(i * 4) })).sort((a, b) => b.qty - a.qty) : [],
		timeline: [
			{ at: iso(1), kind: 'visit', text: `Belanja Rp ${base} di Dramaga` }, { at: iso(3), kind: 'voucher', text: 'Dapat voucher Free drink (stamp)' },
			{ at: iso(8), kind: 'redeem', text: 'Memakai voucher Free cookie' }, { at: iso(20), kind: 'visit', text: `Belanja Rp ${Math.round(base * 1.3)} di Jatinangor` }, { at: m.row.createdAt, kind: 'signup', text: 'Bergabung di Solu Club' }
		],
		lookalikes: list.filter((x) => x !== m).sort((a, b) => Math.abs(a.row.total - m.row.total) - Math.abs(b.row.total - m.row.total)).slice(0, 5).map((x) => ({ username: x.row.username, fullName: x.row.fullName, total: x.row.total, visits: x.row.visits })),
		notes: notes.get(m.row.username) ?? [],
		tags: tags.get(m.row.username) ?? []
	};
}

export const mockActions = {
	menu: () => mockMenu.map((x) => ({ ...x })),
	saveMenu(item: { id?: string; name: string; category: string; sort: number; active: boolean }) {
		const hit = mockMenu.find((x) => x.id === item.id);
		if (hit) Object.assign(hit, item);
		else mockMenu.push({ ...item, id: 'menu' + Date.now() });
	},
	addNote(username: string, body: string, dueOn: string | null) {
		notes.set(username, [{ id: 'n' + Date.now(), body, dueOn, done: false, createdAt: new Date().toISOString(), author: 'raynocturne' }, ...(notes.get(username) ?? [])]);
		log(dueOn ? 'followup.add' : 'note.add', username, { due: dueOn });
	},
	noteDone(id: string, done: boolean) { for (const l of notes.values()) for (const n of l) if (n.id === id) n.done = done; },
	deleteNote(id: string) { for (const [k, l] of notes) notes.set(k, l.filter((n) => n.id !== id)); },
	setTags(username: string, t: string[]) { tags.set(username, [...new Set(t.map((x) => x.trim().toLowerCase()).filter(Boolean))].slice(0, 8)); log('tags.set', username, { tags: t }); },
	grantBeans(username: string, beans: number, reason: string) { log('beans.grant', username, { beans, reason }); return 100 + beans; },
	grantVoucher(username: string, rewardId: string, reason: string) { log('voucher.grant', username, { reward: rewardId, reason }); },
	createCampaign(name: string, message: string, segment: string | null, usernames: string[]) {
		const rows = mockSegments(null).filter((x) => usernames.includes(x.username) && x.optIn && x.whatsapp);
		const id = 'c' + Date.now();
		campaigns.unshift({ id, name, message, segment, createdAt: new Date().toISOString(), sentBy: {}, recipients: rows.map((x) => ({ username: x.username, fullName: x.fullName, whatsapp: x.whatsapp!, sentAt: null, returned: false, revenueAfter: 0 })) });
		log('campaign.create', null, { name, recipients: rows.length });
		return { id, recipients: rows.length, skipped: usernames.length - rows.length };
	},
	markSent(id: string, username: string) {
		const c = campaigns.find((x) => x.id === id);
		const rcp = c?.recipients.find((x) => x.username === username);
		if (rcp && !rcp.sentAt) rcp.sentAt = new Date().toISOString();
	},
	campaigns(): CrmCampaignSummary[] {
		return campaigns.map((c) => ({ id: c.id, name: c.name, segment: c.segment, createdAt: c.createdAt, createdBy: 'raynocturne', recipients: c.recipients.length, sent: c.recipients.filter((x) => x.sentAt).length, returned: 0, revenueAfter: 0 }));
	},
	campaign(id: string): CrmCampaignDetail {
		const c = campaigns.find((x) => x.id === id);
		if (!c) throw new Error('campaign not found');
		return c;
	},
	audit: () => audit.map((x) => ({ ...x }))
};
