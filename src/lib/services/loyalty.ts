export interface Balance {
	stamps: number;
	beans: number;
	/** all beans ever earned; spending does not lower it (used for levels later) */
	lifetimeBeans: number;
}
export interface LedgerEntry {
	id: string;
	kind: 'stamp' | 'beans';
	delta: number;
	reason: 'transaction' | 'redeem' | 'reward' | 'adjustment';
	createdAt: string;
	amountRp: number | null;
	outletCode: string | null;
}
/** One purchase with what it earned. */
export interface Activity {
	id: string;
	amountRp: number;
	outletCode: string;
	createdAt: string;
	beans: number;
	stamps: number;
}
export interface Promotion {
	id: string;
	kicker: string;
	title: string;
	subtitle: string;
	/** where the background photo is anchored, in percent */
	focusX: number;
	focusY: number;
}
export interface Reward {
	id: string;
	name: string;
	description: string;
	/** null when the reward cannot be bought with beans */
	beansCost: number | null;
}
/** Collecting stamp number `position` on a card unlocks this reward. */
export interface Milestone {
	position: number;
	rewardName: string;
}
export interface Voucher {
	id: string;
	rewardName: string;
	rewardDescription: string;
	source: 'stamp' | 'beans' | 'gift';
	/** stamp position, or beans spent */
	sourceDetail: number;
	status: 'available' | 'active' | 'used';
	expiresAt: string;
	code: string | null;
	codeExpiresAt: string | null;
	usedAt: string | null;
	usedOutlet: string | null;
	createdAt: string;
}
export interface VoucherPeek {
	state: 'valid' | 'used' | 'expired';
	reward: string;
	username: string;
	fullName: string;
	memberId: string;
}
export interface MemberLookup {
	id: string;
	username: string;
	fullName: string;
	memberId: string;
	outletCode: string;
}
export interface AdminTx {
	id: string;
	amountRp: number;
	outletCode: string;
	createdAt: string;
	username: string;
	memberId: string;
}

export interface Level {
	level: number;
	name: string;
	minXp: number;
	perks: string;
}
export interface Sticker {
	id: string;
	name: string;
	/** null for seasonal stickers */
	unlockLevel: number | null;
	season: string | null;
	image: string;
}

/** Admin CRM overview (one database call, see supabase/007_crm.sql). */
export interface CrmDashboard {
	days: number;
	generatedAt: string;
	members: {
		total: number;
		newInPeriod: number;
		activeInPeriod: number;
		dormant30d: number;
		neverVisited: number;
		unverified: number;
		signups: { d: string; n: number }[];
	};
	sales: {
		revenue: number;
		visits: number;
		avgTicket: number;
		prevRevenue: number;
		prevVisits: number;
		byOutlet: { code: string; name: string; revenue: number; visits: number; members: number }[];
		daily: { d: string; revenue: number; visits: number }[];
	};
	segments: {
		levels: { level: number; name: string; members: number }[];
		topSpenders: { username: string; fullName: string; outletCode: string; total: number; visits: number; lastVisit: string }[];
		atRisk: { username: string; fullName: string; whatsapp: string | null; total: number; visits: number; lastVisit: string; daysSince: number }[];
		birthdays: { username: string; fullName: string; whatsapp: string | null; day: number }[];
	};
	rewards: {
		available: number;
		active: number;
		used: number;
		expired: number;
		issuedInPeriod: number;
		usedInPeriod: number;
		bySource: { stamp: number; beans: number };
		byReward: { name: string; issued: number; used: number; expired: number }[];
	};
}

export interface CrmInsights {
	days: number;
	generatedAt: string;
	cohorts: { month: string; size: number; retained: (number | null)[] }[];
	/** d = 1 (Mon) .. 7 (Sun), h = hour 0-23 in Jakarta time */
	heatmap: { d: number; h: number; n: number }[];
	funnel: { registered: number; verified: number; firstVisit: number; repeat: number; completedCard: number };
	ticketHist: { label: string; n: number }[];
	visitsDist: { label: string; n: number }[];
	outletRadar: { code: string; name: string; revenue: number; visits: number; avgTicket: number; members: number; repeatMembers: number; newMembers: number }[];
	crossover: { a: string; b: string; n: number }[];
	scatter: { username: string; visits: number; total: number; daysSince: number; level: number }[];
}

export interface CrmMemberRow {
	username: string;
	fullName: string;
	memberId: string;
	email: string;
	homeOutlet: string;
	createdAt: string;
	level: string;
	xp: number;
	visits: number;
	total: number;
	lastVisit: string | null;
	outlets: number;
}

export interface CrmRadarMetrics {
	frequency: number;
	monetary: number;
	recency: number;
	variety: number;
	loyalty: number;
	engagement: number;
}

export interface CrmMemberDetail {
	profile: {
		username: string;
		fullName: string;
		memberId: string;
		email: string;
		whatsapp: string | null;
		homeOutlet: string;
		createdAt: string;
		birthday: string | null;
		lastSignIn: string | null;
		emailConfirmed: boolean;
		isAdmin: boolean;
		profileComplete: boolean;
		socials: { platform: string; handle: string }[];
	};
	standing: {
		xp: number;
		level: number;
		levelName: string;
		nextLevelName: string | null;
		nextLevelXp: number | null;
		beans: number;
		stamps: number;
		lifetimeBeans: number;
		cardsCompleted: number;
		stampsOnCard: number;
		stampsPerCard: number;
	};
	stats: {
		visits: number;
		total: number;
		avgTicket: number;
		maxTicket: number;
		firstVisit: string | null;
		lastVisit: string | null;
		daysSinceLast: number | null;
		avgGapDays: number | null;
		rank: number;
		spenders: number;
	};
	radar: { member: CrmRadarMetrics; avg: CrmRadarMetrics; max: CrmRadarMetrics };
	byOutlet: { code: string; name: string; visits: number; revenue: number; lastVisit: string | null }[];
	monthly: { m: string; revenue: number; visits: number }[];
	heatmap: { d: number; h: number; n: number }[];
	vouchers: { reward: string; source: 'stamp' | 'beans' | 'gift'; detail: number; status: 'available' | 'active' | 'used' | 'expired'; createdAt: string; expiresAt: string; usedAt: string | null; usedOutlet: string | null }[];
	recent: { id: string; amount: number; outlet: string; createdAt: string }[];
}

/* ------------------------------------------------------------------ CRM v2 (supabase/009 + 010) */
export interface MenuItem { id: string; name: string; category: string; sort: number; active: boolean }

export type SegmentKey = 'champion' | 'loyal' | 'at_risk' | 'big_spender' | 'promising' | 'hibernating' | 'attention' | 'new';
export interface CrmOverview {
	from: string;
	to: string;
	days: number;
	outlet: string | null;
	generatedAt: string;
	kpi: {
		revenue: number; visits: number; activeMembers: number; avgTicket: number; newMembers: number;
		prevRevenue: number; prevVisits: number; prevActiveMembers: number; prevAvgTicket: number; prevNewMembers: number;
		totalMembers: number; repeatRate: number;
	};
	daily: { d: string; revenue: number; visits: number; prevRevenue: number }[];
	byOutlet: { code: string; name: string; revenue: number; visits: number; prevRevenue: number }[];
	week: { revenue: number; prevRevenue: number; visits: number; prevVisits: number };
	forecast: { monthToDate: number; daysElapsed: number; daysInMonth: number; projected: number; prevMonth: number };
	alerts: { level: 'info' | 'warn' | 'bad'; key: string; count: number; text: string }[];
	rewardEconomics: {
		issued: number; used: number; expired: number; costUsed: number; costKnown: boolean;
		byReward: { id: string; name: string; unitCost: number | null; issued: number; used: number }[];
		bySource: { stamp: number; beans: number; gift: number };
	};
	topMenu: { name: string; category: string; qty: number; orders: number }[];
	menuCoverage: number;
	signupSources: { source: string; members: number }[];
	levels: { level: number; name: string; members: number }[];
	birthdays: { username: string; fullName: string; whatsapp: string | null; optIn: boolean; md: string }[];
	optIn: { yes: number; total: number };
}
export interface CrmSegmentRow {
	username: string; fullName: string; outletCode: string | null; whatsapp: string | null; optIn: boolean; signupSource: string | null;
	visits: number; total: number; avgTicket: number; firstVisit: string | null; lastVisit: string | null;
	daysSince: number | null; avgGap: number | null; tags: string[]; openFollowups: number;
	r: number; f: number; m: number; segment: SegmentKey; churnRisk: number; nextVisit: string | null; clv12: number;
}
export interface CrmNote { id: string; body: string; dueOn: string | null; done: boolean; createdAt: string; author: string | null }
export interface CrmMemberExtra {
	optIn: boolean;
	signupSource: string | null;
	percentile: { spend: number; visits: number; members: number };
	predictedNextVisit: string | null;
	avgGapDays: number | null;
	clv12: number;
	ticketTrend: { d: string; amount: number }[];
	favoriteMenu: { name: string; category: string; qty: number; orders: number; last: string }[];
	timeline: { at: string; kind: 'visit' | 'voucher' | 'redeem' | 'note' | 'followup' | 'signup'; text: string }[];
	lookalikes: { username: string; fullName: string; total: number; visits: number }[];
	notes: CrmNote[];
	tags: string[];
}
export interface CrmCampaignSummary {
	id: string; name: string; segment: string | null; createdAt: string; createdBy: string | null;
	recipients: number; sent: number; returned: number; revenueAfter: number;
}
export interface CrmCampaignDetail {
	id: string; name: string; message: string; segment: string | null; createdAt: string;
	recipients: { username: string; fullName: string; whatsapp: string; sentAt: string | null; returned: boolean; revenueAfter: number }[];
}
export interface CrmAuditRow { id: string; admin: string | null; action: string; target: string | null; details: Record<string, unknown>; createdAt: string }

export interface LoyaltyService {
	/** Signed-in member's XP (beans earned + visits + completed cards). */
	xp(): Promise<number>;
	levels(): Promise<Level[]>;
	stickers(): Promise<Sticker[]>;
	/** Balance of the signed-in member. */
	balance(): Promise<Balance>;
	/** Active banners for the Home slider (max 5), in display order. */
	promotions(): Promise<Promotion[]>;
	/** Beans catalog. */
	rewards(): Promise<Reward[]>;
	milestones(): Promise<Milestone[]>;
	/** Signed-in member's vouchers, newest first (all statuses). */
	vouchers(): Promise<Voucher[]>;
	voucher(id: string): Promise<Voucher | null>;
	/** Spends beans on a reward; the voucher lands in My rewards. */
	redeem(rewardId: string): Promise<{ voucherId: string; beansAfter: number }>;
	/** Issues (or returns the still-valid) 10-minute code for a voucher. */
	activate(voucherId: string): Promise<{ code: string; codeExpiresAt: string }>;
	/** Admin: look at a code without using it. */
	peekVoucher(code: string): Promise<VoucherPeek>;
	/** Admin: mark a code as used at an outlet. */
	useVoucher(code: string, outletCode: string): Promise<{ reward: string; username: string; fullName: string }>;
	/** Signed-in member's ledger, newest first. */
	ledger(): Promise<LedgerEntry[]>;
	/** Signed-in member's latest purchases. */
	activity(limit?: number): Promise<Activity[]>;
	/** Admin: find a member by member ID or username. */
	findMember(query: string): Promise<MemberLookup | null>;
	/** Admin: records a transaction. Gives 1 stamp and beans from the amount (rules live in the database). */
	recordTransaction(member: string, amountRp: number, outletCode: string, items?: { id: string; qty: number }[]): Promise<{ stamps: number; beans: number; rewardUnlocked: string | null }>;
	/** Admin: latest transactions across all members. */
	recentTransactions(limit?: number): Promise<AdminTx[]>;
	/** Admin: CRM overview for the last `days` days (1-365). */
	crmDashboard(days: number): Promise<CrmDashboard>;
	/** Admin: behaviour patterns for the CRM Insights page. */
	crmInsights(days: number): Promise<CrmInsights>;
	/** Admin: members with their totals, searchable by name, username, email or member ID. */
	crmMembers(query: string, limit?: number): Promise<CrmMemberRow[]>;
	/** Admin: everything about one member. */
	crmMember(username: string): Promise<CrmMemberDetail>;
	/** Admin: menu list for the cashier picker and the menu manager. */
	menuItems(): Promise<MenuItem[]>;
	/** Admin: create (no id) or update a menu item. */
	saveMenuItem(item: { id?: string; name: string; category: string; sort: number; active: boolean }): Promise<void>;
	/** Admin: filtered overview with period comparison, forecast and alerts. */
	crmOverview(from: string, to: string, outlet: string | null): Promise<CrmOverview>;
	/** Admin: every member with RFM segment, churn risk, predicted next visit and CLV. */
	crmSegments(outlet: string | null): Promise<CrmSegmentRow[]>;
	/** Admin: timeline, favorite menu, percentile, lookalikes, notes and tags for one member. */
	crmMemberExtra(username: string): Promise<CrmMemberExtra>;
	crmAddNote(username: string, body: string, dueOn: string | null): Promise<void>;
	crmSetNoteDone(id: string, done: boolean): Promise<void>;
	crmDeleteNote(id: string): Promise<void>;
	crmSetTags(username: string, tags: string[]): Promise<void>;
	/** Admin: give (or take back, with a negative number) beans. Needs a reason; written to the audit log. */
	crmGrantBeans(username: string, beans: number, reason: string): Promise<number>;
	/** Admin: gift a voucher. Needs a reason; written to the audit log. */
	crmGrantVoucher(username: string, rewardId: string, reason: string): Promise<void>;
	crmSetRewardCost(rewardId: string, cost: number | null): Promise<void>;
	/** Admin: create a WhatsApp campaign. Only members with promo opt-in and a number are added. */
	crmCreateCampaign(name: string, message: string, segment: string | null, usernames: string[]): Promise<{ id: string; recipients: number; skipped: number }>;
	crmMarkSent(campaignId: string, username: string): Promise<void>;
	crmCampaigns(): Promise<CrmCampaignSummary[]>;
	crmCampaign(id: string): Promise<CrmCampaignDetail>;
	crmAudit(limit?: number): Promise<CrmAuditRow[]>;
}
