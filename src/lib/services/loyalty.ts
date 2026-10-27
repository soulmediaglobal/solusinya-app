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
	source: 'stamp' | 'beans';
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
	vouchers: { reward: string; source: 'stamp' | 'beans'; detail: number; status: 'available' | 'active' | 'used' | 'expired'; createdAt: string; expiresAt: string; usedAt: string | null; usedOutlet: string | null }[];
	recent: { id: string; amount: number; outlet: string; createdAt: string }[];
}

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
	recordTransaction(member: string, amountRp: number, outletCode: string): Promise<{ stamps: number; beans: number; rewardUnlocked: string | null }>;
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
}
